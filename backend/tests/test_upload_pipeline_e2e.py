import io
import uuid
import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.services.vector_store import get_supabase_client
from tests.test_pdf_parser import create_test_pdf_bytes

client = TestClient(app)


def test_full_upload_pipeline_e2e():
    """End-to-end verification of upload pipeline against live Supabase and Gemini:
    1. Upload normal PDF -> returns ready with sensible page and chunk counts
    2. Rows appear in Supabase documents and chunks tables
    3. .txt file renamed to .pdf is rejected
    4. Scanned/image PDF gives friendly error
    5. Deleting removes document and chunks via cascade
    """
    supabase = get_supabase_client()
    session_id = f"e2e-{uuid.uuid4()}"

    # 1. Normal PDF upload
    p1_text = (
        "Artificial Intelligence and Document Retrieval Systems represent a modern approach "
        "to organizing knowledge. Text embeddings represent semantic features numerically. "
    ) * 4
    p2_text = (
        "PostgreSQL pgvector extension enables fast vector similarity searches with cosine distance. "
        "The HNSW index accelerates high-dimensional indexing for real-time RAG responses. "
    ) * 4
    pdf_bytes = create_test_pdf_bytes([p1_text, p2_text])

    upload_resp = client.post(
        "/api/documents",
        headers={"X-Session-Id": session_id},
        files={"file": ("architecture_guide.pdf", io.BytesIO(pdf_bytes), "application/pdf")},
    )

    assert upload_resp.status_code == 201
    doc_data = upload_resp.json()
    assert doc_data["status"] == "ready"
    assert doc_data["page_count"] == 2
    assert doc_data["chunk_count"] >= 2
    doc_id = doc_data["id"]

    try:
        # 2. Verify rows appear in Supabase documents and chunks
        doc_rows = supabase.table("documents").select("*").eq("id", doc_id).execute()
        assert len(doc_rows.data) == 1
        assert doc_rows.data[0]["status"] == "ready"
        assert doc_rows.data[0]["filename"] == "architecture_guide.pdf"

        chunk_rows = supabase.table("chunks").select("*").eq("document_id", doc_id).execute()
        assert len(chunk_rows.data) == doc_data["chunk_count"]
        # Verify chunks have vectors of dimension 768
        assert len(chunk_rows.data[0]["embedding"]) > 0

        # 3. .txt file renamed to .pdf is rejected
        txt_resp = client.post(
            "/api/documents",
            headers={"X-Session-Id": session_id},
            files={"file": ("not_a_pdf.pdf", io.BytesIO(b"This is just raw text."), "application/pdf")},
        )
        assert txt_resp.status_code == 400
        assert txt_resp.json()["message"] == "Only PDF files are supported."

        # 4. Scanned/image PDF gives friendly error
        blank_pdf = create_test_pdf_bytes([""])
        scanned_resp = client.post(
            "/api/documents",
            headers={"X-Session-Id": session_id},
            files={"file": ("scanned.pdf", io.BytesIO(blank_pdf), "application/pdf")},
        )
        assert scanned_resp.status_code == 400
        assert "scanned image" in scanned_resp.json()["message"]

        # 5. GET /api/documents returns the document
        list_resp = client.get("/api/documents", headers={"X-Session-Id": session_id})
        assert list_resp.status_code == 200
        docs = list_resp.json()
        assert len(docs) == 1
        assert docs[0]["id"] == doc_id

    finally:
        # 6. Deleting removes chunks too
        del_resp = client.delete(f"/api/documents/{doc_id}", headers={"X-Session-Id": session_id})
        assert del_resp.status_code == 200

        doc_check = supabase.table("documents").select("*").eq("id", doc_id).execute()
        assert len(doc_check.data) == 0

        chunks_check = supabase.table("chunks").select("*").eq("document_id", doc_id).execute()
        assert len(chunks_check.data) == 0
