# DocuMind Architecture Diagrams

This document illustrates the end-to-end data flow and system architecture for **DocuMind**.

---

## 1. System Overview

```mermaid
flowchart TD
    subgraph Frontend["Frontend (Vercel)"]
        UI["Next.js 15 App Router"]
        DotBg["Liquid Glass UI + Dot Canvas"]
        SSEHook["useChat Hook (SSE Reader)"]
    end

    subgraph Backend["Backend (Render)"]
        FastAPI["FastAPI (Python 3.11)"]
        Parser["PDF Parser (pypdf)"]
        Chunker["Sliding Window Chunker"]
        RAGPipeline["RAG Pipeline"]
        Quota["In-Memory Rate & Quota Limits"]
    end

    subgraph External["External Cloud Services"]
        GeminiEmbed["Gemini embedding-001 (768d)"]
        GeminiChat["Gemini Flash (Chat Stream)"]
        Supabase["Supabase Postgres + pgvector"]
    end

    UI -->|PDF Upload / Chat| FastAPI
    FastAPI --> Parser --> Chunker --> GeminiEmbed
    GeminiEmbed -->|Vectors| Supabase
    FastAPI --> RAGPipeline
    RAGPipeline -->|Vector Search| Supabase
    RAGPipeline -->|Prompt + Context| GeminiChat
    GeminiChat -->|SSE Stream| SSEHook --> UI
```

---

## 2. Ingestion Pipeline (Upload Flow)

Runs once per uploaded PDF document:

```mermaid
sequenceDiagram
    autonumber
    actor User as User Browser
    participant API as FastAPI Backend
    participant Parser as PDF Parser
    participant Chunker as Text Chunker
    participant Gemini as Google Gemini API
    participant DB as Supabase pgvector

    User->>API: POST /api/documents (PDF file + X-Session-Id)
    API->>API: Validate file size (<= 10MB) and %PDF- header
    API->>Parser: Extract clean text page-by-page
    Parser-->>API: Extracted pages with page numbers
    API->>API: Verify text density (reject scanned PDFs)
    API->>Chunker: Split pages (~800 chars, 120 overlap)
    Chunker-->>API: Chunks with true page metadata
    API->>Gemini: Batch embed chunks (task_type=RETRIEVAL_DOCUMENT)
    Gemini-->>API: 768-dimensional normalized vectors
    API->>DB: Insert document record & chunk vectors
    DB-->>API: Insertion confirmed
    API-->>User: 201 Created (id, filename, page_count, chunk_count)
```

---

## 3. Query & Retrieval Pipeline (Question Flow)

Runs for every user question:

```mermaid
sequenceDiagram
    autonumber
    actor User as User Browser
    participant API as FastAPI Backend
    participant LLM as Gemini Rewriter
    participant Embed as Gemini Embeddings
    participant DB as Supabase pgvector
    participant Chat as Gemini Flash Streamer

    User->>API: POST /api/chat (question, history, X-Session-Id)
    API->>API: Check hourly rate limits & daily AI quota

    alt History Exists
        API->>LLM: Rewrite follow-up into standalone query
        LLM-->>API: Standalone query string
    else No History
        API->>API: Use original user question
    end

    API->>Embed: Embed search query (task_type=RETRIEVAL_QUERY)
    Embed-->>API: 768-dimensional query vector
    API->>DB: match_chunks RPC (query_vector, session_id, top_k=5)
    DB-->>API: Top 5 chunks with similarity scores

    alt Best Similarity < 0.60 or No Chunks
        API-->>User: SSE "sources": []
        API-->>User: SSE "token": "I couldn't find that in your documents..."
        API-->>User: SSE "done": (fast path, zero LLM tokens used)
    else Best Similarity >= 0.60
        API-->>User: SSE "sources": [filename, page, score, snippet]
        API->>API: Assemble system prompt with grounded context
        API->>Chat: Stream answer with citation requirements
        loop Token Stream
            Chat-->>API: Token chunk
            API-->>User: SSE "token": {text}
        end
        API-->>User: SSE "done": {latency_ms, first_token_ms, chunks_used}
    end
```
