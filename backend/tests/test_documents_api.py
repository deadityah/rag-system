import io
import uuid
from unittest.mock import patch
import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.services.vector_store import get_supabase_client
from tests.test_pdf_parser import create_test_pdf_bytes

client = TestClient(app)


def test_missing_session_header_returns_400():
    """Endpoints require X-Session-Id header; missing header must return 400."""
    response = client.get("/api/documents")
    assert response.status_code == 400
    assert "X-Session-Id" in response.json()["detail"]


def test_upload_non_pdf_file_returns_400():
    """Uploading a non-pdf file must return 400 'Only PDF files are supported.'"""
    session_id = str(uuid.uuid4())
    fake_txt = io.BytesIO(b"Hello world text file")
    response = client.post(
        "/api/documents",
        headers={"X-Session-Id": session_id},
        files={"file": ("notes.txt", fake_txt, "text/plain")},
    )
    assert response.status_code == 400
    assert response.json()["message"] == "Only PDF files are supported."


def test_upload_txt_renamed_to_pdf_returns_400():
    """A .txt file renamed to .pdf must be rejected with 400 'Only PDF files are supported.'"""
    session_id = str(uuid.uuid4())
    fake_txt_as_pdf = io.BytesIO(b"Just plain text disguised as a PDF file.")
    response = client.post(
        "/api/documents",
        headers={"X-Session-Id": session_id},
        files={"file": ("fake_document.pdf", fake_txt_as_pdf, "application/pdf")},
    )
    assert response.status_code == 400
    assert response.json()["message"] == "Only PDF files are supported."


def test_upload_empty_file_returns_400():
    """An empty file (0 bytes) must be rejected with 400 'The file is empty.'"""
    session_id = str(uuid.uuid4())
    response = client.post(
        "/api/documents",
        headers={"X-Session-Id": session_id},
        files={"file": ("empty.pdf", io.BytesIO(b""), "application/pdf")},
    )
    assert response.status_code == 400
    assert response.json()["message"] == "The file is empty."


def test_upload_corrupted_pdf_returns_friendly_error():
    """A corrupted file starting with %PDF- must return 400 'This PDF could not be read. It may be damaged or password-protected.'"""
    session_id = str(uuid.uuid4())
    corrupted_data = b"%PDF-1.4\nCorrupted binary junk that fails pypdf parser"
    response = client.post(
        "/api/documents",
        headers={"X-Session-Id": session_id},
        files={"file": ("corrupted.pdf", io.BytesIO(corrupted_data), "application/pdf")},
    )
    assert response.status_code == 400
    assert "could not be read" in response.json()["message"]


def test_upload_scanned_or_image_pdf_returns_friendly_error():
    """A PDF with fewer than 100 characters must return 400 with friendly scanned message."""
    session_id = str(uuid.uuid4())
    # Blank PDF with no extractable text
    blank_pdf_bytes = create_test_pdf_bytes([""])
    response = client.post(
        "/api/documents",
        headers={"X-Session-Id": session_id},
        files={"file": ("scanned.pdf", io.BytesIO(blank_pdf_bytes), "application/pdf")},
    )
    assert response.status_code == 400
    assert "scanned image" in response.json()["message"]


def test_document_limit_exceeded_returns_409():
    """Uploading when session already has 5 documents returns 409 limit error."""
    session_id = str(uuid.uuid4())
    with patch("app.routers.documents.count_documents", return_value=5):
        valid_pdf_bytes = create_test_pdf_bytes([
            "Page 1 has lots of text describing system architecture and pipelines in great detail. " * 3
        ])
        response = client.post(
            "/api/documents",
            headers={"X-Session-Id": session_id},
            files={"file": ("extra.pdf", io.BytesIO(valid_pdf_bytes), "application/pdf")},
        )
        assert response.status_code == 409
        assert response.json()["message"] == "You can keep up to 5 documents. Delete one to add another."


def test_delete_non_existent_document_returns_404():
    """Deleting a non-existent document or one from another session returns 404."""
    session_id = str(uuid.uuid4())
    random_doc_id = str(uuid.uuid4())
    response = client.delete(
        f"/api/documents/{random_doc_id}",
        headers={"X-Session-Id": session_id},
    )
    assert response.status_code == 404
    assert response.json()["message"] == "Document not found."


def test_upload_hello_txt_renamed_to_hello_pdf_rejected_without_db_row():
    """Sends the bytes of a text file named 'hello.pdf' to the upload endpoint and asserts:
    - status code 400
    - message is exactly 'Only PDF files are supported.'
    - no row was created in documents
    """
    session_id = f"test-hello-{uuid.uuid4()}"
    text_content = b"Hello world! This is a plain text file pretending to be hello.pdf."

    response = client.post(
        "/api/documents",
        headers={"X-Session-Id": session_id},
        files={"file": ("hello.pdf", io.BytesIO(text_content), "application/pdf")},
    )

    assert response.status_code == 400
    assert response.json()["message"] == "Only PDF files are supported."

    # Verify no row was created in documents table
    supabase = get_supabase_client()
    doc_rows = (
        supabase.table("documents")
        .select("*")
        .eq("session_id", session_id)
        .execute()
    )
    assert len(doc_rows.data) == 0, "No document row should be created for a rejected non-PDF file."
