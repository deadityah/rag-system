# 04 — Backend Spec (FastAPI + Supabase)

## 1. Dependencies (`requirements.txt`)

- `fastapi`
- `uvicorn[standard]`
- `python-multipart` (file upload)
- `pydantic` and `pydantic-settings`
- `google-genai` (Gemini SDK)
- `supabase`
- `pypdf`
- `numpy` (vector normalizing)
- `python-dotenv`

Pin versions after the first successful install.

## 2. Database (`backend/supabase/schema.sql`)

The owner runs this once in the Supabase SQL Editor.

```sql
-- Turn on vector search
create extension if not exists vector;

-- One row per uploaded PDF
create table documents (
  id uuid primary key default gen_random_uuid(),
  session_id text not null,
  filename text not null,
  page_count int not null,
  chunk_count int not null default 0,
  status text not null default 'processing',  -- processing | ready | failed
  created_at timestamptz not null default now()
);

-- One row per text piece
create table chunks (
  id uuid primary key default gen_random_uuid(),
  document_id uuid not null references documents(id) on delete cascade,
  session_id text not null,
  page_number int not null,
  chunk_index int not null,
  content text not null,
  embedding vector(768) not null,
  created_at timestamptz not null default now()
);

create index chunks_session_idx on chunks (session_id);
create index chunks_doc_idx on chunks (document_id);
create index chunks_embedding_idx on chunks using hnsw (embedding vector_cosine_ops);
create index documents_session_idx on documents (session_id);

-- Security: block public access. Only the backend (service key) can read/write.
alter table documents enable row level security;
alter table chunks enable row level security;

-- Search function: returns the most similar chunks for one session
create or replace function match_chunks(
  query_embedding vector(768),
  match_session text,
  match_count int default 5,
  doc_ids uuid[] default null
)
returns table (
  id uuid,
  document_id uuid,
  filename text,
  page_number int,
  content text,
  similarity float
)
language sql stable
as $$
  select
    c.id,
    c.document_id,
    d.filename,
    c.page_number,
    c.content,
    1 - (c.embedding <=> query_embedding) as similarity
  from chunks c
  join documents d on d.id = c.document_id
  where c.session_id = match_session
    and d.status = 'ready'
    and (doc_ids is null or c.document_id = any(doc_ids))
  order by c.embedding <=> query_embedding
  limit match_count;
$$;
```

`<=>` is cosine distance. `1 - distance` = similarity.

## 3. API endpoints

All endpoints (except health) require header `X-Session-Id` (UUID string). If missing → `400`.

### `GET /api/health`
Returns `{"status": "ok"}`. Used to wake the server and for uptime checks.

### `POST /api/documents`
- Body: `multipart/form-data` with field `file`.
- Steps: validate → create `documents` row (`processing`) → parse → chunk → embed (in batches) → insert chunks → set status `ready`.
- If any step fails: set status `failed`, delete partial chunks, return a clear error.
- Success `201`:
```json
{ "id": "uuid", "filename": "report.pdf", "page_count": 12, "chunk_count": 38, "status": "ready" }
```
- Errors: `400` not a PDF / empty text, `413` too big or too many pages, `409` document limit reached, `422` bad request, `500` unexpected.
- If the PDF has almost no text (likely scanned), return `400` with message: "This PDF looks like a scanned image. Please upload a text-based PDF."

### `GET /api/documents`
Returns the session's documents, newest first.

### `DELETE /api/documents/{id}`
Deletes the document (chunks delete automatically). Only if it belongs to the session. `404` otherwise.

### `POST /api/chat` (streaming)
- Body:
```json
{
  "question": "string (max 1000 chars)",
  "history": [{"role": "user" | "assistant", "content": "string"}],
  "document_ids": ["uuid"]   // optional; empty = search all session documents
}
```
- Response: `text/event-stream` (SSE). Events in order:

| Event | Data (JSON) | When |
|---|---|---|
| `sources` | `[{"filename": "...", "page": 4, "similarity": 0.62, "snippet": "first 200 chars"}]` | Right after retrieval, before the answer |
| `token` | `{"text": "..."}` | Many times, as the model writes |
| `done` | `{"latency_ms": 1840, "first_token_ms": 520, "chunks_used": 5}` | Once at the end |
| `error` | `{"message": "friendly text"}` | If something fails mid-way |

SSE headers: `Cache-Control: no-cache`, `Connection: keep-alive`, `X-Accel-Buffering: no`.

## 4. RAG pipeline (services)

### `pdf_parser.py`
- Input: PDF bytes. Output: list of `{page_number (starting at 1), text}`.
- Clean text: fix broken line breaks inside sentences, collapse repeated spaces, remove empty pages.
- If total text under ~100 characters → treat as scanned.

### `chunker.py`
- Split **inside each page** (so every chunk has one true page number).
- Prefer to split at paragraph, then sentence, then word boundaries. Never cut mid-word.
- Target ~800 characters, ~120 overlap. Skip chunks under 40 characters.
- Output: list of `{page_number, chunk_index, content}`.
- Tiny pages: keep as one chunk.

### `embeddings.py`
- `embed_documents(texts)` → batches of up to 100, task type `RETRIEVAL_DOCUMENT`.
- `embed_query(text)` → task type `RETRIEVAL_QUERY`.
- Request `EMBED_DIMENSIONS` (768). Normalize each vector (length 1).
- Retry up to 3 times with waiting (1s, 2s, 4s) on rate-limit errors (`429`). If still failing → friendly error.

### `vector_store.py`
- `insert_chunks(document_id, session_id, chunks, vectors)` — insert in batches of 100.
- `search(session_id, query_vector, top_k, doc_ids)` — calls the `match_chunks` function via RPC.
- `list_documents`, `get_document`, `delete_document`, `count_documents`.
- Every query **must** filter by `session_id`.

### `llm.py`
- `rewrite_question(history, question)` — non-streaming, temp 0.
- `stream_answer(system_prompt, history, question)` — yields text pieces as they arrive.
- Run blocking SDK calls so they do not freeze the server (use the async client or a thread).

### `rag.py`
Main function `answer_question(session_id, request)` as an async generator that yields SSE events:

1. If history exists → rewrite question; otherwise use the original.
2. Embed query.
3. Search top 5 in the session.
4. If no chunks or best similarity < threshold → yield `sources` (empty), the fixed "not found" text as `token` events, `done`. Stop.
5. Yield `sources`.
6. Build the system prompt with the context (see `03-PROMPTS.md`).
7. Stream tokens → yield `token` events. Track first-token time.
8. Yield `done` with timings.
9. Wrap in try/except → yield `error` event on failure.

> The **original** question (not the rewritten one) is what the model answers. The rewritten one is only for searching.

## 5. Rate limiting (`utils/rate_limit.py`)

- Simple in-memory counter per session: 30 questions per hour; 10 uploads per hour.
- Return `429` with message "Too many requests. Please wait a bit."
- Add a comment noting this resets when the server restarts and would use Redis in production.

## 6. CORS

Allow origins from `ALLOWED_ORIGINS` (comma-separated). Allow methods `GET, POST, DELETE, OPTIONS` and headers `Content-Type, X-Session-Id`.

## 7. Logging

- Log: request id, endpoint, status, time taken, counts (chunks, tokens).
- **Never log** file contents, full questions, or API keys.

## 8. Error messages (user-friendly)

| Cause | Message |
|---|---|
| Not a PDF | "Only PDF files are supported." |
| Too big | "That file is larger than 10 MB." |
| Too many pages | "PDFs can have up to 100 pages." |
| Scanned PDF | "This PDF looks like a scanned image. Please upload a text-based PDF." |
| Limit reached | "You can keep up to 5 documents. Delete one to add another." |
| Gemini rate limit | "The AI service is busy. Please try again in a moment." |
| Unknown | "Something went wrong on our side. Please try again." |

## 9. Dockerfile (for Render)

- Base: `python:3.11-slim`
- Install requirements, copy `app/`, run `uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000}`.

## 10. Backend tests (`backend/tests/`)

Write simple `pytest` tests for:
- `chunker` (sizes, overlap, page numbers kept)
- `pdf_parser` (using a small sample PDF)
- `/api/health`
- Session header missing → `400`
