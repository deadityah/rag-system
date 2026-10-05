from functools import lru_cache
from typing import Any, Dict, List, Optional
from supabase import create_client, Client

from app.config import get_settings


@lru_cache
def get_supabase_client() -> Client:
    """Returns a cached Supabase client using configuration settings."""
    settings = get_settings()
    if not settings.supabase_url or not settings.supabase_service_key:
        raise ValueError(
            "SUPABASE_URL and SUPABASE_SERVICE_KEY must be configured in environment."
        )
    return create_client(settings.supabase_url, settings.supabase_service_key)


def create_document(
    session_id: str,
    filename: str,
    page_count: int,
    chunk_count: int = 0,
    status: str = "processing",
    client: Optional[Client] = None,
) -> Dict[str, Any]:
    """Inserts a new document record into the documents table."""
    supabase = client or get_supabase_client()
    payload = {
        "session_id": session_id,
        "filename": filename,
        "page_count": page_count,
        "chunk_count": chunk_count,
        "status": status,
    }
    response = supabase.table("documents").insert(payload).execute()
    if response.data and len(response.data) > 0:
        return response.data[0]
    raise RuntimeError("Failed to insert document record into Supabase.")


def update_document_status(
    document_id: str,
    session_id: str,
    status: str,
    chunk_count: Optional[int] = None,
    client: Optional[Client] = None,
) -> Optional[Dict[str, Any]]:
    """Updates the status and optional chunk_count of a document."""
    supabase = client or get_supabase_client()
    update_data: Dict[str, Any] = {"status": status}
    if chunk_count is not None:
        update_data["chunk_count"] = chunk_count

    response = (
        supabase.table("documents")
        .update(update_data)
        .eq("id", document_id)
        .eq("session_id", session_id)
        .execute()
    )
    return response.data[0] if response.data else None


def insert_chunks(
    document_id: str,
    session_id: str,
    chunks: List[Dict[str, Any]],
    vectors: List[List[float]],
    batch_size: int = 100,
    client: Optional[Client] = None,
) -> int:
    """Inserts chunks with embeddings in batches of 100."""
    if len(chunks) != len(vectors):
        raise ValueError(
            f"Chunk count ({len(chunks)}) does not match vector count ({len(vectors)})."
        )
    if not chunks:
        return 0

    supabase = client or get_supabase_client()
    records: List[Dict[str, Any]] = []
    for chunk, vector in zip(chunks, vectors):
        records.append({
            "document_id": document_id,
            "session_id": session_id,
            "page_number": chunk["page_number"],
            "chunk_index": chunk["chunk_index"],
            "content": chunk["content"],
            "embedding": vector,
        })

    total_inserted = 0
    for i in range(0, len(records), batch_size):
        batch = records[i:i + batch_size]
        response = supabase.table("chunks").insert(batch).execute()
        total_inserted += len(response.data) if response.data else len(batch)

    return total_inserted


def search(
    session_id: str,
    query_vector: List[float],
    top_k: int = 5,
    doc_ids: Optional[List[str]] = None,
    client: Optional[Client] = None,
) -> List[Dict[str, Any]]:
    """Calls match_chunks RPC to retrieve top_k most similar chunks for a session."""
    supabase = client or get_supabase_client()
    params: Dict[str, Any] = {
        "query_embedding": query_vector,
        "match_session": session_id,
        "match_count": top_k,
    }
    if doc_ids:
        params["doc_ids"] = doc_ids

    response = supabase.rpc("match_chunks", params).execute()
    return response.data or []


def list_documents(
    session_id: str,
    client: Optional[Client] = None,
) -> List[Dict[str, Any]]:
    """Retrieves all documents belonging to a session, ordered by newest first."""
    supabase = client or get_supabase_client()
    response = (
        supabase.table("documents")
        .select("*")
        .eq("session_id", session_id)
        .order("created_at", desc=True)
        .execute()
    )
    return response.data or []


def get_document(
    session_id: str,
    document_id: str,
    client: Optional[Client] = None,
) -> Optional[Dict[str, Any]]:
    """Retrieves a single document by ID scoped to the session."""
    supabase = client or get_supabase_client()
    response = (
        supabase.table("documents")
        .select("*")
        .eq("session_id", session_id)
        .eq("id", document_id)
        .limit(1)
        .execute()
    )
    return response.data[0] if response.data else None


def delete_document(
    session_id: str,
    document_id: str,
    client: Optional[Client] = None,
) -> bool:
    """Deletes a document by ID scoped to the session. Cascades to chunks."""
    supabase = client or get_supabase_client()
    response = (
        supabase.table("documents")
        .delete()
        .eq("session_id", session_id)
        .eq("id", document_id)
        .execute()
    )
    return bool(response.data)


def count_documents(
    session_id: str,
    client: Optional[Client] = None,
) -> int:
    """Counts total documents for a session."""
    supabase = client or get_supabase_client()
    response = (
        supabase.table("documents")
        .select("id", count="exact")
        .eq("session_id", session_id)
        .execute()
    )
    return response.count if response.count is not None else len(response.data or [])


def delete_chunks_for_document(
    document_id: str,
    session_id: str,
    client: Optional[Client] = None,
) -> int:
    """Deletes all chunks belonging to a document and session (used during failure rollback)."""
    supabase = client or get_supabase_client()
    response = (
        supabase.table("chunks")
        .delete()
        .eq("document_id", document_id)
        .eq("session_id", session_id)
        .execute()
    )
    return len(response.data) if response.data else 0
