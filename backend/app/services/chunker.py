import re
from typing import Any, Dict, List, Optional


def split_page_into_chunks(
    text: str,
    target_size: int = 800,
    target_overlap: int = 120,
    min_chunk_size: int = 40,
) -> List[str]:
    """Splits single-page text into chunks targetting ~800 characters with ~120 overlap.

    Splits prioritizing paragraph breaks (\\n\\n), then sentence endings (.!?),
    then word boundaries (whitespace). Never cuts mid-word.
    Skips chunks under min_chunk_size characters. Tiny pages (under target_size)
    are preserved as a single chunk if >= min_chunk_size.
    """
    cleaned = text.strip()
    if not cleaned:
        return []

    # If the entire page fits within target_size, keep as one chunk if >= min_chunk_size
    if len(cleaned) <= target_size:
        return [cleaned] if len(cleaned) >= min_chunk_size else []

    chunks: List[str] = []
    start = 0
    text_len = len(cleaned)

    while start < text_len:
        remaining = text_len - start

        # If remaining text fits within target_size
        if remaining <= target_size:
            tail = cleaned[start:].strip()
            if len(tail) >= min_chunk_size:
                chunks.append(tail)
            break

        max_end = start + target_size
        min_search = start + (target_size // 2)

        split_pos = -1

        # 1. Paragraph boundary in the search window
        para_matches = [m.start() for m in re.finditer(r'\n{2,}', cleaned[min_search:max_end])]
        if para_matches:
            split_pos = min_search + para_matches[-1]
        else:
            # 2. Sentence boundary in the search window (.!? followed by space or newline)
            sent_matches = [m.end() for m in re.finditer(r'[.!?][ \n]+', cleaned[min_search:max_end])]
            if sent_matches:
                split_pos = min_search + sent_matches[-1]
            else:
                # 3. Word boundary in the search window
                word_matches = [m.start() for m in re.finditer(r'\s+', cleaned[min_search:max_end])]
                if word_matches:
                    split_pos = min_search + word_matches[-1]
                else:
                    # Fallback: look backwards from max_end to start + 1 for any whitespace
                    any_space = [m.start() for m in re.finditer(r'\s+', cleaned[start + 1:max_end])]
                    if any_space:
                        split_pos = (start + 1) + any_space[-1]
                    else:
                        # Pathological edge case: single uninterrupted string > target_size
                        split_pos = max_end

        chunk = cleaned[start:split_pos].strip()
        if len(chunk) >= min_chunk_size:
            chunks.append(chunk)

        # Calculate overlap starting point for next chunk
        ideal_overlap = split_pos - target_overlap
        if ideal_overlap <= start:
            # Cannot do overlap without regressing or stalling
            start = split_pos
        else:
            # Find a clean boundary near ideal_overlap (sentence or word start)
            search_start = max(start + 1, ideal_overlap - 40)
            search_end = min(split_pos - 1, ideal_overlap + 40)
            next_start = -1

            sent_matches = [m.end() for m in re.finditer(r'[.!?][ \n]+', cleaned[search_start:search_end])]
            if sent_matches:
                next_start = search_start + sent_matches[-1]
            else:
                word_matches = [m.start() for m in re.finditer(r'\s+', cleaned[search_start:search_end])]
                if word_matches:
                    candidate = search_start + word_matches[-1]
                    # Advance past whitespace so the next chunk starts on a word
                    while candidate < split_pos and cleaned[candidate].isspace():
                        candidate += 1
                    next_start = candidate

            if next_start <= start or next_start >= split_pos:
                # Scan forward from ideal_overlap to find next word boundary
                candidate = ideal_overlap
                while candidate < split_pos and not cleaned[candidate].isspace():
                    candidate += 1
                while candidate < split_pos and cleaned[candidate].isspace():
                    candidate += 1
                next_start = candidate if candidate < split_pos else split_pos

            start = next_start if next_start > start else split_pos

        # Advance past any leading whitespace for the new start
        while start < text_len and cleaned[start].isspace():
            start += 1

    return chunks


def chunk_document(
    pages: List[Dict[str, Any]],
    target_size: int = 800,
    target_overlap: int = 120,
    min_chunk_size: int = 40,
) -> List[Dict[str, Any]]:
    """Chunks all pages of a document while preserving 1-based page numbers.

    Args:
        pages: List of {"page_number": int, "text": str}.
        target_size: Target characters per chunk (~800).
        target_overlap: Overlap in characters (~120).
        min_chunk_size: Skip chunks smaller than this threshold (40).

    Returns:
        List of dicts: {"page_number": int, "chunk_index": int, "content": str}.
    """
    all_chunks: List[Dict[str, Any]] = []
    chunk_index = 0

    for page in pages:
        page_num = page["page_number"]
        page_text = page.get("text", "")

        page_chunks = split_page_into_chunks(
            page_text,
            target_size=target_size,
            target_overlap=target_overlap,
            min_chunk_size=min_chunk_size,
        )

        for chunk_text in page_chunks:
            all_chunks.append({
                "page_number": page_num,
                "chunk_index": chunk_index,
                "content": chunk_text,
            })
            chunk_index += 1

    return all_chunks
