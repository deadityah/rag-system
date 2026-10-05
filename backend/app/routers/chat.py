"""Chat router exposing POST /api/chat with Server-Sent Events (SSE).
Follows specs in docs/03-PROMPTS.md and docs/04-BACKEND-SPEC.md.
"""

import logging
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import StreamingResponse

from app.models import ChatRequest
from app.routers.documents import get_session_id
from app.services.rag import answer_question
from app.utils.quota import DAILY_LIMIT_MESSAGE, is_chat_daily_limit_reached
from app.utils.rate_limit import check_question_rate_limit

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/chat", tags=["chat"])


@router.post("", summary="Stream chat response using RAG")
async def chat(
    request: ChatRequest,
    session_id: str = Depends(get_session_id),
):
    """Processes a user question, searches relevant document chunks,
    and streams the answer with citations and metrics via SSE.
    """
    # 1. Global daily quota protection (GEMINI_DAILY_LIMIT)
    if is_chat_daily_limit_reached():
        logger.warning("Daily chat quota limit reached. Blocking request.")
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail=DAILY_LIMIT_MESSAGE,
        )

    # 2. Per-session hourly rate limiting: max 30 questions per hour per session
    if not check_question_rate_limit(session_id):
        logger.warning(f"Rate limit exceeded for session: {session_id}")
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Too many requests. Please wait a bit.",
        )

    return StreamingResponse(
        answer_question(session_id, request),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )
