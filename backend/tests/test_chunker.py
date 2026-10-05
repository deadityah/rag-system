import pytest
from app.services.chunker import chunk_document, split_page_into_chunks


def test_tiny_page_preserved_as_single_chunk():
    """A page under target size (~800 chars) should be kept as a single chunk if >= 40 chars."""
    text = "This is a single page document with moderate length describing artificial intelligence architecture."
    assert 40 <= len(text) <= 800
    chunks = split_page_into_chunks(text, target_size=800, min_chunk_size=40)
    assert len(chunks) == 1
    assert chunks[0] == text


def test_skip_chunk_under_40_chars():
    """Chunks with fewer than 40 characters must be skipped."""
    text = "Short text."
    assert len(text) < 40
    chunks = split_page_into_chunks(text, min_chunk_size=40)
    assert len(chunks) == 0


def test_multi_page_document_preserves_page_numbers():
    """Chunks must retain their 1-based page numbers and have sequential chunk indices."""
    pages = [
        {"page_number": 1, "text": "First page content introducing the document topic and outline."},
        {"page_number": 2, "text": "Second page discussing implementation details and pipeline execution."},
        {"page_number": 3, "text": "Third page summarizing evaluation metrics and conclusions."},
    ]
    chunks = chunk_document(pages, min_chunk_size=40)
    assert len(chunks) == 3
    assert chunks[0]["page_number"] == 1
    assert chunks[0]["chunk_index"] == 0
    assert chunks[1]["page_number"] == 2
    assert chunks[1]["chunk_index"] == 1
    assert chunks[2]["page_number"] == 3
    assert chunks[2]["chunk_index"] == 2


def test_chunk_size_and_overlap():
    """Long text is split into chunks of ~800 characters with ~120 overlap, never cut mid-word."""
    paragraph = (
        "The retrieval-augmented generation pipeline extracts unstructured information from PDF files. "
        "It segments text into manageable chunks and computes semantic embeddings for similarity retrieval. "
        "Each chunk preserves contextual metadata such as the exact page number for accurate citations. "
    )
    long_text = (paragraph * 10).strip()
    assert len(long_text) > 2000

    chunks = split_page_into_chunks(long_text, target_size=800, target_overlap=120, min_chunk_size=40)
    assert len(chunks) > 1

    for chunk in chunks:
        # No chunk should drastically exceed target_size
        assert len(chunk) <= 850
        # No chunk is under min_chunk_size
        assert len(chunk) >= 40
        # Verify chunk doesn't start or end with broken words
        assert not chunk.startswith(" ")
        assert not chunk.endswith(" ")

    # Check overlap between consecutive chunks
    for i in range(len(chunks) - 1):
        c1 = chunks[i]
        c2 = chunks[i + 1]
        # End of c1 should overlap with start of c2
        words_c1 = c1.split()
        words_c2 = c2.split()
        overlap_words = set(words_c1[-5:]).intersection(set(words_c2[:10]))
        assert len(overlap_words) > 0, f"Expected word overlap between chunk {i} and {i+1}"


def test_paragraph_split_priority():
    """Paragraph breaks (\\n\\n) should be preferred over sentence or word splits."""
    p1 = "Alpha paragraph discussing database schemas. " * 12
    p2 = "Beta paragraph discussing API routers and endpoints. " * 12
    combined = f"{p1.strip()}\n\n{p2.strip()}"
    
    chunks = split_page_into_chunks(combined, target_size=800, target_overlap=120, min_chunk_size=40)
    assert len(chunks) >= 2
    # First chunk should end around the paragraph boundary
    assert "Alpha paragraph" in chunks[0]


def test_never_cuts_mid_word():
    """Ensures words are preserved wholly across chunks."""
    sentence = "Supercalifragilisticexpialidocious " * 40
    chunks = split_page_into_chunks(sentence, target_size=800, target_overlap=120, min_chunk_size=40)
    for chunk in chunks:
        words = chunk.split()
        for word in words:
            assert word == "Supercalifragilisticexpialidocious"
