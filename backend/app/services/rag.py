"""RAG service pipeline for question answering over uploaded documents.
Follows specs in docs/03-PROMPTS.md and docs/04-BACKEND-SPEC.md.
"""

import asyncio
import json
import logging
import time
from typing import Any, AsyncGenerator, Dict, List

from app.config import get_settings
from app.models import ChatRequest
from app.prompts import NOT_FOUND_REPLY, build_system_prompt
from app.services.embeddings import GeminiRateLimitError, embed_query
from app.services.llm import rewrite_question, stream_answer
from app.services.vector_store import search
from app.utils.quota import DailyAiLimitError

logger = logging.getLogger(__name__)


def sse_event(event_name: str, data: Any) -> str:
    """Formats event name and JSON data as an SSE string block."""
    return f"event: {event_name}\ndata: {json.dumps(data)}\n\n"


async def answer_question(
    session_id: str,
    request: ChatRequest,
) -> AsyncGenerator[str, None]:
    """Async generator executing the RAG pipeline and yielding SSE events:
    1. If history exists -> rewrite question; otherwise use original.
    2. Embed query (using async thread to avoid blocking).
    3. Search top chunks in the session via vector_store.search.
    4. If no chunks or best similarity < threshold -> yield sources ([]),
       fixed 'not found' text as token, and done. Stop.
    5. Yield sources event with file, page, similarity, snippet.
    6. Build system prompt with context excerpts.
    7. Stream tokens -> yield token events, recording first-token latency.
    8. Yield done event with timings and chunk count.
    9. On exception -> yield error event with user-friendly message.
    """
    settings = get_settings()
    start_time = time.perf_counter()
    first_token_ms: int | None = None

    try:
        original_question = request.question.strip()

        # Step 1: Question rewrite (if history exists)
        if request.history:
            search_query = await rewrite_question(request.history, original_question)
        else:
            search_query = original_question

        # Step 2: Embed search query
        query_vector = await asyncio.to_thread(embed_query, search_query)

        # Step 3: Vector search
        chunks: List[Dict[str, Any]] = await asyncio.to_thread(
            search,
            session_id=session_id,
            query_vector=query_vector,
            top_k=settings.top_k,
            doc_ids=request.document_ids,
        )

        best_similarity = (
            max((float(c.get("similarity", 0.0)) for c in chunks), default=0.0)
            if chunks
            else 0.0
        )

        # Step 4: "Not found" shortcut (skip LLM if no chunks or similarity < threshold)
        if not chunks or best_similarity < settings.similarity_threshold:
            yield sse_event("sources", [])

            now_ms = int((time.perf_counter() - start_time) * 1000)
            first_token_ms = now_ms

            yield sse_event("token", {"text": NOT_FOUND_REPLY})

            latency_ms = int((time.perf_counter() - start_time) * 1000)
            yield sse_event(
                "done",
                {
                    "latency_ms": latency_ms,
                    "first_token_ms": first_token_ms,
                    "chunks_used": 0,
                },
            )
            return

        # Step 5: Format and yield sources event (before tokens)
        sources_payload = [
            {
                "filename": chunk.get("filename", "unknown.pdf"),
                "page": chunk.get("page_number", 1),
                "similarity": round(float(chunk.get("similarity", 0.0)), 3),
                "snippet": chunk.get("content", "").strip()[:200],
            }
            for chunk in chunks
        ]
        yield sse_event("sources", sources_payload)

        # Step 6: Build system prompt with context excerpts
        system_prompt = build_system_prompt(chunks)

        # Step 7: Stream tokens from Gemini
        token_count = 0
        async for token_piece in stream_answer(
            system_prompt=system_prompt,
            history=request.history,
            question=original_question,
        ):
            if first_token_ms is None:
                first_token_ms = int((time.perf_counter() - start_time) * 1000)

            token_count += 1
            yield sse_event("token", {"text": token_piece})

        # Step 8: Yield done event with timings
        end_time = time.perf_counter()
        latency_ms = int((end_time - start_time) * 1000)
        if first_token_ms is None:
            first_token_ms = latency_ms

        yield sse_event(
            "done",
            {
                "latency_ms": latency_ms,
                "first_token_ms": first_token_ms,
                "chunks_used": len(chunks),
            },
        )

    except DailyAiLimitError as exc:
        logger.warning(f"Daily AI limit reached during chat answer: {exc}")
        yield sse_event(
            "error",
            {"message": exc.message},
        )
    except GeminiRateLimitError:
        logger.warning("Gemini rate limit encountered during chat answer.")
        yield sse_event(
            "error",
            {"message": "The AI service is busy. Please try again in a moment."},
        )
    except Exception as exc:
        logger.error(f"Unexpected error in chat pipeline: {type(exc).__name__}: {exc}")
        yield sse_event(
            "error",
            {"message": "Something went wrong on our side. Please try again."},
        )
