import io
import logging
import re
from typing import Any, Dict, List, Tuple
from pypdf import PdfReader
from pypdf.errors import PdfReadError

logger = logging.getLogger(__name__)


class PDFParserError(Exception):
    """Base exception for PDF parsing and validation errors."""

    def __init__(self, message: str, status_code: int = 400):
        super().__init__(message)
        self.message = message
        self.status_code = status_code


class EmptyFileError(PDFParserError):
    """Raised when uploaded file contains 0 bytes."""

    def __init__(self, message: str = "The file is empty."):
        super().__init__(message=message, status_code=400)


class FileTooLargeError(PDFParserError):
    """Raised when file exceeds max size limit (10 MB)."""

    def __init__(self, message: str = "That file is larger than 10 MB."):
        super().__init__(message=message, status_code=413)


class InvalidPDFError(PDFParserError):
    """Raised when file does not contain %PDF- magic bytes in first 1024 bytes."""

    def __init__(self, message: str = "Only PDF files are supported."):
        super().__init__(message=message, status_code=400)


class PDFCorruptedError(PDFParserError):
    """Raised when PDF structure is broken, corrupted, or password-protected."""

    def __init__(
        self,
        message: str = "This PDF could not be read. It may be damaged or password-protected.",
    ):
        super().__init__(message=message, status_code=400)


class PageLimitExceededError(PDFParserError):
    """Raised when PDF exceeds max pages limit (100 pages)."""

    def __init__(self, message: str = "PDFs can have up to 100 pages."):
        super().__init__(message=message, status_code=413)


class ScannedPDFError(PDFParserError):
    """Raised when a real PDF has insufficient extractable text (e.g. scanned image)."""

    def __init__(
        self,
        message: str = "This PDF looks like a scanned image. Please upload a text-based PDF.",
    ):
        super().__init__(message=message, status_code=400)


def validate_pdf_bytes(
    pdf_bytes: bytes,
    max_file_size: int = 10 * 1024 * 1024,
    max_pages: int = 100,
) -> Tuple[int, PdfReader]:
    """Validates raw binary content in strict required order before any database operation.

    We inspect real bytes rather than trusting file extensions or content-type headers,
    as both can easily be spoofed (e.g., renaming a .txt file to .pdf).

    Required check order:
    a. File has zero bytes -> 400 "The file is empty."
    b. Size over 10 MB -> 413 "That file is larger than 10 MB."
    c. First 1024 bytes do not contain b"%PDF-" -> 400 "Only PDF files are supported."
    d. pypdf cannot open it (corrupted or password-protected) -> 400 "This PDF could not be read. It may be damaged or password-protected."
    e. Page count over 100 -> 413 "PDFs can have up to 100 pages."
    """
    # a. File has zero bytes -> 400 "The file is empty."
    # The word "empty" must only be used for a file with 0 bytes.
    if not pdf_bytes or len(pdf_bytes) == 0:
        logger.warning("PDF validation failed: file has 0 bytes.")
        raise EmptyFileError("The file is empty.")

    # b. Size over 10 MB -> 413 "That file is larger than 10 MB."
    if len(pdf_bytes) > max_file_size:
        logger.warning(
            f"PDF validation failed: file size {len(pdf_bytes)} bytes exceeds limit {max_file_size} bytes."
        )
        raise FileTooLargeError("That file is larger than 10 MB.")

    # c. First 1024 bytes do not contain b"%PDF-" -> 400 "Only PDF files are supported."
    # A text file with content has bytes, so it fails here, never at "empty" or "scanned".
    if b"%PDF-" not in pdf_bytes[:1024]:
        logger.warning("PDF validation failed: %PDF- magic bytes not found in first 1024 bytes.")
        raise InvalidPDFError("Only PDF files are supported.")

    # d. pypdf cannot open it (corrupted or password-protected) -> 400 friendly message
    try:
        stream = io.BytesIO(pdf_bytes)
        reader = PdfReader(stream)

        # Check for encrypted or password-protected PDFs
        if reader.is_encrypted:
            try:
                decrypted = reader.decrypt("")
                if not decrypted:
                    logger.warning("PDF is password-protected and cannot be decrypted without credentials.")
                    raise PDFCorruptedError(
                        "This PDF could not be read. It may be damaged or password-protected."
                    )
            except Exception as decrypt_err:
                logger.warning(f"Error attempting to decrypt PDF: {decrypt_err}")
                raise PDFCorruptedError(
                    "This PDF could not be read. It may be damaged or password-protected."
                ) from decrypt_err

        total_pages = len(reader.pages)
        if total_pages == 0:
            logger.warning("PDF reader returned 0 pages.")
            raise PDFCorruptedError(
                "This PDF could not be read. It may be damaged or password-protected."
            )

    except PDFParserError:
        raise
    except Exception as exc:
        logger.warning(f"pypdf failed to open or parse PDF: {exc}")
        raise PDFCorruptedError(
            "This PDF could not be read. It may be damaged or password-protected."
        ) from exc

    # e. Page count over 100 -> 413 "PDFs can have up to 100 pages."
    if total_pages > max_pages:
        logger.warning(f"PDF page count {total_pages} exceeds max limit of {max_pages} pages.")
        raise PageLimitExceededError("PDFs can have up to 100 pages.")

    return total_pages, reader


def clean_page_text(text: str) -> str:
    """Cleans extracted page text:
    - Normalizes line breaks and whitespace
    - Reconnects hyphenated words broken across line wraps (e.g. "con-\\nnect" -> "connect")
    - Collapses single newlines within paragraphs into spaces
    - Preserves double newlines for paragraph breaks
    - Collapses repeated spaces and tabs
    """
    if not text:
        return ""

    # Normalize carriage returns
    text = text.replace("\r\n", "\n").replace("\r", "\n")

    # Fix hyphenated words broken across line wraps (e.g. "informa-\ntion" -> "information")
    text = re.sub(r'(\b\w+)-\n(\w+\b)', r'\1\2', text)

    # Split into paragraphs by two or more newlines
    raw_paragraphs = re.split(r'\n{2,}', text)
    cleaned_paragraphs: List[str] = []

    for para in raw_paragraphs:
        # Convert single newlines inside paragraph to space
        para_clean = re.sub(r'\n+', ' ', para)
        # Collapse multiple spaces or tabs into a single space
        para_clean = re.sub(r'[ \t]+', ' ', para_clean).strip()
        if para_clean:
            cleaned_paragraphs.append(para_clean)

    return "\n\n".join(cleaned_paragraphs)


def extract_pdf_pages(
    reader: PdfReader,
    min_text_chars: int = 100,
) -> List[Dict[str, Any]]:
    """Extracts cleaned text page-by-page from a validated PDF reader.

    The scanned-PDF message ("looks like a scanned image") must ONLY appear
    for a REAL PDF that has no text (< min_text_chars characters). Never for a non-PDF.
    """
    extracted_pages: List[Dict[str, Any]] = []
    total_chars = 0

    for idx, page in enumerate(reader.pages, start=1):
        try:
            raw_text = page.extract_text() or ""
        except Exception as exc:
            logger.warning(f"Text extraction failed on page {idx}: {exc}")
            raw_text = ""

        cleaned = clean_page_text(raw_text)
        if cleaned:
            extracted_pages.append({
                "page_number": idx,
                "text": cleaned,
            })
            total_chars += len(cleaned)

    # Scanned PDF check: ONLY applies to real PDFs that have insufficient text
    if total_chars < min_text_chars:
        logger.warning(
            f"Real PDF has insufficient extractable text ({total_chars} chars < {min_text_chars})."
        )
        raise ScannedPDFError("This PDF looks like a scanned image. Please upload a text-based PDF.")

    return extracted_pages


def parse_pdf(
    pdf_bytes: bytes,
    max_file_size: int = 10 * 1024 * 1024,
    max_pages: int = 100,
    min_text_chars: int = 100,
) -> Tuple[int, List[Dict[str, Any]]]:
    """Validates raw PDF bytes and extracts cleaned text page-by-page.

    Performs validate_pdf_bytes first, then extract_pdf_pages.
    """
    total_pages, reader = validate_pdf_bytes(
        pdf_bytes,
        max_file_size=max_file_size,
        max_pages=max_pages,
    )
    pages = extract_pdf_pages(reader, min_text_chars=min_text_chars)
    return total_pages, pages
