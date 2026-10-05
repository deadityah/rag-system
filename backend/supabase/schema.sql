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
