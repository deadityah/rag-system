import sys
import uuid
from pathlib import Path

# Ensure backend root is on sys.path
backend_dir = Path(__file__).resolve().parent.parent
if str(backend_dir) not in sys.path:
    sys.path.insert(0, str(backend_dir))

from app.config import get_settings
from app.services.vector_store import (
    create_document,
    delete_document,
    get_supabase_client,
    insert_chunks,
    search,
)


def run_check():
    settings = get_settings()
    if not settings.supabase_url or not settings.supabase_service_key:
        print("ERROR: SUPABASE_URL and SUPABASE_SERVICE_KEY must be set in .env")
        sys.exit(1)

    client = get_supabase_client()
    session_id = f"test-check-db-{uuid.uuid4()}"
    fake_vector = [0.0] * settings.embed_dimensions
    fake_vector[0] = 1.0  # Unit vector for cosine similarity test

    doc_id = None
    try:
        # 1. Insert fake document
        doc = create_document(
            session_id=session_id,
            filename="check_db_test.pdf",
            page_count=1,
            chunk_count=1,
            status="ready",
            client=client,
        )
        doc_id = doc["id"]

        # 2. Insert fake chunk with embedding vector
        fake_chunk = {
            "page_number": 1,
            "chunk_index": 0,
            "content": "DocuMind database connectivity and vector search verification chunk.",
        }
        insert_chunks(
            document_id=doc_id,
            session_id=session_id,
            chunks=[fake_chunk],
            vectors=[fake_vector],
            client=client,
        )

        # 3. Search for vector using match_chunks RPC
        results = search(
            session_id=session_id,
            query_vector=fake_vector,
            top_k=1,
            client=client,
        )

        if not results:
            raise AssertionError("Vector search returned no results for inserted fake vector.")

        match = results[0]
        if match.get("document_id") != doc_id:
            raise AssertionError(
                f"Search returned unexpected document_id: {match.get('document_id')}, expected: {doc_id}"
            )

        # 4. Delete document (cascades to chunks)
        deleted = delete_document(session_id=session_id, document_id=doc_id, client=client)
        if not deleted:
            raise AssertionError(f"Failed to delete test document {doc_id}.")

        # 5. Verify chunk cascade deletion
        remaining = (
            client.table("chunks")
            .select("id")
            .eq("document_id", doc_id)
            .execute()
        )
        if remaining.data:
            raise AssertionError("Chunks were not removed after document cascade deletion.")

        # If everything passes:
        print("DB OK")

    except Exception as e:
        # Check for missing table/rpc error
        err_msg = str(e)
        if "PGRST205" in err_msg or "Could not find the table" in err_msg or "Could not find the function" in err_msg:
            print("ERROR: Supabase tables or functions not found.")
            print("Please run backend/supabase/schema.sql in the Supabase SQL Editor first.")
            print(f"Details: {err_msg}")
        else:
            print(f"ERROR: {e}")
        # Clean up document if it was created
        if doc_id:
            try:
                delete_document(session_id=session_id, document_id=doc_id, client=client)
            except Exception:
                pass
        sys.exit(1)


if __name__ == "__main__":
    run_check()
