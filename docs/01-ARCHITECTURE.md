# 01 — Architecture

## 1. Tech stack

| Part | Choice | Why |
|---|---|---|
| Frontend | Next.js (App Router) + TypeScript + Tailwind CSS | Owner's web dev strength; easy on Vercel |
| Backend | Python 3.11+ with FastAPI | Standard for AI Engineer jobs |
| LLM (answers) | Google Gemini via `google-genai` SDK | Free tier on AI Studio |
| Embeddings | Gemini embedding model (`gemini-embedding-001`), **768 dimensions** | Same provider, one API key |
| Vector database | Supabase Postgres + `pgvector` | Free tier, plain SQL, popular in industry |
| PDF reading | `pypdf` (or `pymupdf` if pypdf fails) | Gives text **per page**, needed for citations |
| Streaming | Server-Sent Events (SSE) from FastAPI | Simple, works in browsers |
| Hosting | Vercel (frontend), Render (backend) | Both have free plans |

> Model names change often. Read model names from environment variables (`GEMINI_CHAT_MODEL`, `GEMINI_EMBED_MODEL`). Defaults are in `04-BACKEND-SPEC.md`. If a default is retired, tell the owner to pick a current one from Google AI Studio.

## 2. Folder structure

```
documind/
├── README.md                  # setup guide (later replaced by public README)
├── .gitignore
├── docs/                      # these instruction files
├── reference/                 # liquidglass.md, repeleffect.md
│
├── backend/
│   ├── requirements.txt
│   ├── .env.example
│   ├── Dockerfile
│   ├── supabase/
│   │   └── schema.sql         # tables + search function
│   └── app/
│       ├── main.py            # FastAPI app, CORS, router registration
│       ├── config.py          # reads env variables (one place only)
│       ├── models.py          # Pydantic request/response models
│       ├── routers/
│       │   ├── documents.py   # upload, list, delete
│       │   ├── chat.py        # streaming chat endpoint
│       │   └── health.py      # health check
│       ├── services/
│       │   ├── pdf_parser.py  # PDF -> list of (page_number, text)
│       │   ├── chunker.py     # text -> chunks with page numbers
│       │   ├── embeddings.py  # text -> vectors (Gemini)
│       │   ├── vector_store.py# save/search/delete in Supabase
│       │   ├── llm.py         # Gemini streaming generation
│       │   └── rag.py         # ties everything: question -> answer
│       ├── prompts.py         # all prompt text (from 03-PROMPTS.md)
│       └── utils/
│           └── rate_limit.py  # simple per-session limits
│
└── frontend/
    ├── package.json
    ├── .env.example
    ├── next.config.ts
    └── src/
        ├── app/
        │   ├── layout.tsx
        │   ├── page.tsx       # main (and only) page
        │   └── globals.css    # design tokens + glass styles
        ├── components/
        │   ├── background/DotBackground.tsx   # from repeleffect.md
        │   ├── ui/GlassPanel.tsx              # from liquidglass.md
        │   ├── ui/GlassButton.tsx
        │   ├── ui/GlassInput.tsx
        │   ├── layout/Sidebar.tsx
        │   ├── layout/NavBar.tsx
        │   ├── documents/UploadZone.tsx
        │   ├── documents/DocumentList.tsx
        │   ├── chat/ChatWindow.tsx
        │   ├── chat/MessageBubble.tsx
        │   ├── chat/ChatInput.tsx
        │   └── chat/AiLoading.tsx
        ├── hooks/
        │   ├── useSession.ts      # anonymous session id
        │   ├── useDocuments.ts
        │   └── useChat.ts         # streaming logic
        └── lib/
            ├── api.ts             # all calls to backend
            ├── sse.ts             # SSE stream reader
            └── types.ts
```

## 3. How it works (data flow)

### A. Upload flow (runs once per PDF)

```
Browser  --PDF-->  FastAPI
                     1. Check file (type, size, page limit)
                     2. pdf_parser: read text page by page
                     3. chunker: cut into ~800-character pieces (keep page number)
                     4. embeddings: turn each chunk into a 768-number vector
                     5. vector_store: save chunks + vectors in Supabase
                   <-- document info (id, name, pages, chunks)
```

### B. Question flow (runs for every question)

```
Browser  --question + session_id + history-->  FastAPI
          1. (If chat history exists) rewrite the question to stand alone
          2. embed the question into a vector
          3. Supabase: find the top 5 most similar chunks (this session only)
          4. If best similarity is too low -> answer "not found" (no LLM call)
          5. Build prompt: rules + chunks + question
          6. Gemini streams the answer
          Browser <-- SSE events: sources, token, token, ... , done
```

## 4. Session model (no login in v1)

- On first visit the browser creates a random `session_id` (UUID) and stores it in `localStorage`.
- Every API call sends it in the header `X-Session-Id`.
- Documents and chunks are saved with that `session_id`. Searches only look inside the same session.
- This keeps visitors' files separate **without** a login system.
- **Honest limit:** this is not real security. Anyone who has the id can see those files. Tell this in the public README. Real login is a future upgrade.

## 5. Safety limits (protect the free tiers)

| Limit | Value |
|---|---|
| Max file size | 10 MB |
| Max pages per PDF | 100 |
| Max documents per session | 5 |
| Max questions per session per hour | 30 |
| Max question length | 1000 characters |
| Allowed file type | `application/pdf` only (check the real file, not just the name) |

## 6. Environment variables

**backend/.env.example**
```
GEMINI_API_KEY=
GEMINI_CHAT_MODEL=gemini-2.5-flash
GEMINI_EMBED_MODEL=gemini-embedding-001
EMBED_DIMENSIONS=768
SUPABASE_URL=
SUPABASE_SERVICE_KEY=
ALLOWED_ORIGINS=http://localhost:3000
```

**frontend/.env.example**
```
NEXT_PUBLIC_API_URL=http://localhost:8000
```

> `SUPABASE_SERVICE_KEY` is secret. It lives **only** in the backend.
