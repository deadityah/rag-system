import io
import pytest
from pypdf import PdfWriter
from pypdf.generic import DecodedStreamObject, DictionaryObject, NameObject

from app.services.pdf_parser import (
    EmptyFileError,
    FileTooLargeError,
    InvalidPDFError,
    PDFCorruptedError,
    PageLimitExceededError,
    ScannedPDFError,
    clean_page_text,
    parse_pdf,
    validate_pdf_bytes,
)


def create_test_pdf_bytes(pages_text: list[str]) -> bytes:
    """Helper to synthesize valid PDF bytes with specified text on each page."""
    writer = PdfWriter()
    font_dict = DictionaryObject({
        NameObject('/Type'): NameObject('/Font'),
        NameObject('/Subtype'): NameObject('/Type1'),
        NameObject('/BaseFont'): NameObject('/Helvetica'),
    })
    resources = DictionaryObject({
        NameObject('/Font'): DictionaryObject({
            NameObject('/F1'): font_dict
        })
    })

    for text in pages_text:
        page = writer.add_blank_page(width=612, height=792)
        page[NameObject('/Resources')] = resources
        if text:
            safe_text = text.replace('\\', '\\\\').replace('(', '\\(').replace(')', '\\)')
            stream_data = f"BT /F1 12 Tf 72 700 Td ({safe_text}) Tj ET".encode('latin-1', 'replace')
            stream_obj = DecodedStreamObject()
            stream_obj.set_data(stream_data)
            page[NameObject('/Contents')] = stream_obj

    buf = io.BytesIO()
    writer.write(buf)
    return buf.getvalue()


# ---------------------------------------------------------------------------
# Tests for validate_pdf_bytes
# ---------------------------------------------------------------------------


def test_validate_pdf_bytes_real_small_pdf_accepted():
    """A real small PDF must be accepted by validate_pdf_bytes."""
    pdf_bytes = create_test_pdf_bytes(["A concise page of text."])
    total_pages, reader = validate_pdf_bytes(pdf_bytes)
    assert total_pages == 1
    assert reader is not None
    assert len(reader.pages) == 1


def test_validate_pdf_bytes_plain_text_rejected():
    """Plain text bytes with a .pdf name must be rejected with 'Only PDF files are supported.'"""
    plain_text_bytes = b"This is just plain text disguised with a .pdf extension."
    with pytest.raises(InvalidPDFError) as exc_info:
        validate_pdf_bytes(plain_text_bytes)
    assert exc_info.value.message == "Only PDF files are supported."
    assert exc_info.value.status_code == 400


def test_validate_pdf_bytes_empty_file_rejected():
    """An empty file (0 bytes) must be rejected with 'The file is empty.'"""
    with pytest.raises(EmptyFileError) as exc_info:
        validate_pdf_bytes(b"")
    assert exc_info.value.message == "The file is empty."
    assert exc_info.value.status_code == 400


def test_validate_pdf_bytes_corrupted_pdf_rejected():
    """Bytes that start with %PDF- but are cut off or corrupted must be rejected with 'could not be read'."""
    corrupted_bytes = b"%PDF-1.4\n%trailer\n<< broken unparseable binary gibberish >>\n"
    with pytest.raises(PDFCorruptedError) as exc_info:
        validate_pdf_bytes(corrupted_bytes)
    assert "could not be read" in exc_info.value.message
    assert exc_info.value.status_code == 400


def test_validate_pdf_bytes_over_10mb_rejected():
    """A file over 10 MB must be rejected with 'That file is larger than 10 MB.'"""
    # 10 MB + 1 byte
    oversized_bytes = b"%PDF-1.4\n" + b"0" * (10 * 1024 * 1024 + 1)
    with pytest.raises(FileTooLargeError) as exc_info:
        validate_pdf_bytes(oversized_bytes)
    assert exc_info.value.message == "That file is larger than 10 MB."
    assert exc_info.value.status_code == 413


def test_validate_pdf_bytes_page_limit_exceeded():
    """A PDF with over 100 pages must be rejected with 'PDFs can have up to 100 pages.'"""
    writer = PdfWriter()
    for _ in range(101):
        writer.add_blank_page(width=100, height=100)
    buf = io.BytesIO()
    writer.write(buf)
    pdf_bytes = buf.getvalue()

    with pytest.raises(PageLimitExceededError) as exc_info:
        validate_pdf_bytes(pdf_bytes, max_pages=100)
    assert exc_info.value.message == "PDFs can have up to 100 pages."
    assert exc_info.value.status_code == 413


# ---------------------------------------------------------------------------
# Tests for clean_page_text and parse_pdf
# ---------------------------------------------------------------------------


def test_clean_page_text_hyphenation_and_breaks():
    """clean_page_text should reconnect hyphenated words and normalize newlines."""
    raw = "This is an informa-\ntion retrieval system.\n\nIt handles broken line-\nbreaks cleanly."
    cleaned = clean_page_text(raw)
    assert "information" in cleaned
    assert "linebreaks" in cleaned
    assert "\n\n" in cleaned


def test_clean_page_text_collapses_whitespace():
    """clean_page_text should collapse excessive spaces and tabs."""
    raw = "Word1     Word2\t\t\tWord3"
    cleaned = clean_page_text(raw)
    assert cleaned == "Word1 Word2 Word3"


def test_parse_valid_pdf():
    """A normal multi-page text PDF should parse into pages with 1-based indices."""
    page1 = "This is the first page of our DocuMind test document with plenty of text."
    page2 = "This is the second page of our document containing further detailed explanations."
    pdf_bytes = create_test_pdf_bytes([page1, page2])

    total_pages, pages = parse_pdf(pdf_bytes, min_text_chars=50)
    assert total_pages == 2
    assert len(pages) == 2
    assert pages[0]["page_number"] == 1
    assert "first page" in pages[0]["text"]
    assert pages[1]["page_number"] == 2
    assert "second page" in pages[1]["text"]


def test_reject_scanned_image_pdf():
    """A PDF with less than 100 characters total text must raise ScannedPDFError."""
    blank_pdf = create_test_pdf_bytes([""])
    with pytest.raises(ScannedPDFError) as exc_info:
        parse_pdf(blank_pdf, min_text_chars=100)
    assert "scanned image" in exc_info.value.message
