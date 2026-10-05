import logging
from typing import List, Optional
from fastapi import APIRouter, Depends, File, Header, HTTPException, Request, UploadFile, status

from app.models import DocumentResponse
from app.services.chunker import chunk_document
from app.services.embeddings import GeminiRateLimitError, embed_documents
from app.services.pdf_parser import (
    EmptyFileError,
    FileTooLargeError,
    InvalidPDFError,
    PDFCorruptedError,
    PageLimitExceededError,
    PDFParserError,
    ScannedPDFError,
    extract_pdf_pages,
    validate_pdf_bytes,
)
from app.services.vector_store import (
    count_documents,
    create_document,
    delete_chunks_for_document,
    delete_document,
    insert_chunks,
    list_documents,
    update_document_status,
)
from app.utils.quota import (
    DAILY_LIMIT_MESSAGE,
    DailyAiLimitError,
    is_embed_daily_limit_reached,
)
from app.utils.rate_limit import check_upload_rate_limit

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/documents", tags=["documents"])

MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024  # 10 MB
MAX_DOCUMENTS_PER_SESSION = 5


def get_session_id(
    request: Request,
    x_session_id: Optional[str] = Header(None, alias="X-Session-Id"),
) -> str:
    """Extracts and validates X-Session-Id header. Missing header yields 400.
    Bypasses validation on OPTIONS requests (CORS preflight requests do not carry custom headers).
    """
    if request.method == "OPTIONS":
        return ""
    if not x_session_id or not x_session_id.strip():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="X-Session-Id header is required.",
        )
    return x_session_id.strip()


@router.post(
    "",
    response_model=DocumentResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Upload and process a PDF document",
)
async def upload_document(
    file: UploadFile = File(...),
    session_id: str = Depends(get_session_id),
):
    """Uploads a PDF, validates raw bytes in strict order, extracts text,
    chunks, computes embeddings, and stores chunks in Supabase vector store.
    """
    # 1. Global daily quota protection (EMBED_DAILY_LIMIT)
    if is_embed_daily_limit_reached():
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail=DAILY_LIMIT_MESSAGE,
        )

    # 2. Rate limiting check (10 uploads/hour per session)
    if not check_upload_rate_limit(session_id):
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Too many requests. Please wait a bit.",
        )

    # 2. Document count check (max 5 per session)
    doc_count = count_documents(session_id)
    if doc_count >= MAX_DOCUMENTS_PER_SESSION:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="You can keep up to 5 documents. Delete one to add another.",
        )

    # 3. Filename extension and Content-Type check (quick preliminary step)
    filename = file.filename or ""
    if not filename.lower().endswith(".pdf"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Only PDF files are supported.",
        )

    if file.content_type and file.content_type.lower() not in (
        "application/pdf",
        "application/x-pdf",
        "application/octet-stream",
    ):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Only PDF files are supported.",
        )

    # 4. Read file bytes
    try:
        content = await file.read()
    except Exception as exc:
        logger.error(f"Failed to read uploaded file: {exc}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Only PDF files are supported.",
        )

    # 5. Validate real bytes FIRST in required order BEFORE creating any documents row:
    #    a. File has zero bytes -> 400 "The file is empty."
    #    b. Size over 10 MB -> 413 "That file is larger than 10 MB."
    #    c. First 1024 bytes do not contain b"%PDF-" -> 400 "Only PDF files are supported."
    #    d. pypdf cannot open it (corrupted or password-protected) -> 400 "This PDF could not be read. It may be damaged or password-protected."
    #    e. Page count over 100 -> 413 "PDFs can have up to 100 pages."
    try:
        total_pages, reader = validate_pdf_bytes(
            content,
            max_file_size=MAX_FILE_SIZE_BYTES,
            max_pages=100,
        )
    except PDFParserError as exc:
        logger.warning(f"validate_pdf_bytes failed for '{filename}': {exc.message}")
        raise HTTPException(
            status_code=exc.status_code,
            detail=exc.message,
        )

    # Text extraction and scanned-PDF check (applies ONLY to real PDFs that passed validate_pdf_bytes):
    try:
        pages = extract_pdf_pages(reader, min_text_chars=100)
    except PDFParserError as exc:
        logger.warning(f"extract_pdf_pages failed for '{filename}': {exc.message}")
        raise HTTPException(
            status_code=exc.status_code,
            detail=exc.message,
        )

    # 6. Only after ALL validation checks pass, create the documents row
    doc = create_document(
        session_id=session_id,
        filename=filename,
        page_count=total_pages,
        chunk_count=0,
        status="processing",
    )
    doc_id = doc["id"]

    # 7. Chunk, embed, and store vectors
    try:
        chunks = chunk_document(pages)
        if not chunks:
            raise ScannedPDFError("This PDF looks like a scanned image. Please upload a text-based PDF.")

        chunk_texts = [c["content"] for c in chunks]
        vectors = embed_documents(chunk_texts)

        insert_chunks(
            document_id=doc_id,
            session_id=session_id,
            chunks=chunks,
            vectors=vectors,
        )

        update_document_status(
            document_id=doc_id,
            session_id=session_id,
            status="ready",
            chunk_count=len(chunks),
        )

        return DocumentResponse(
            id=doc_id,
            filename=filename,
            page_count=total_pages,
            chunk_count=len(chunks),
            status="ready",
        )

    except Exception as exc:
        logger.error(f"Document processing failed for {doc_id}: {exc}")
        # Failure rollback: mark document failed and delete any partial chunks
        try:
            update_document_status(
                document_id=doc_id,
                session_id=session_id,
                status="failed",
            )
            delete_chunks_for_document(
                document_id=doc_id,
                session_id=session_id,
            )
        except Exception as cleanup_exc:
            logger.error(f"Cleanup failed for document {doc_id}: {cleanup_exc}")

        if isinstance(exc, DailyAiLimitError):
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail=exc.message,
            )
        if isinstance(exc, GeminiRateLimitError):
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail=exc.message,
            )
        if isinstance(exc, ScannedPDFError):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=exc.message,
            )
        if isinstance(exc, HTTPException):
            raise exc

        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Something went wrong on our side. Please try again.",
        )


@router.get(
    "",
    response_model=List[DocumentResponse],
    status_code=status.HTTP_200_OK,
    summary="List all documents for the current session",
)
def get_documents(
    session_id: str = Depends(get_session_id),
):
    """Returns the session's documents ordered by newest first."""
    docs = list_documents(session_id=session_id)
    return [
        DocumentResponse(
            id=str(d["id"]),
            filename=d["filename"],
            page_count=d["page_count"],
            chunk_count=d["chunk_count"],
            status=d["status"],
        )
        for d in docs
    ]


@router.delete(
    "/{document_id}",
    status_code=status.HTTP_200_OK,
    summary="Delete a document by ID",
)
def remove_document(
    document_id: str,
    session_id: str = Depends(get_session_id),
):
    """Deletes the document scoped to the session. Cascades to chunks."""
    deleted = delete_document(session_id=session_id, document_id=document_id)
    if not deleted:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Document not found.",
        )
    return {"message": "Document deleted successfully.", "id": document_id}
