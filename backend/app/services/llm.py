"""LLM service providing standalone question rewriting and streaming answers.
Follows specs in docs/03-PROMPTS.md and docs/04-BACKEND-SPEC.md.
"""

import asyncio
import logging
from typing import Any, AsyncGenerator, List, Optional
from google.genai import types

from app.config import get_settings
from app.prompts import (
    QUESTION_REWRITE_PROMPT,
    format_history_for_rewrite,
)
from app.services.embeddings import GeminiRateLimitError, get_gemini_client
from app.utils.quota import DailyAiLimitError, check_and_increment_chat_quota

logger = logging.getLogger(__name__)


def _is_rate_limit(exc: Exception) -> bool:
    """Helper to detect Gemini 429/quota/503 high demand errors."""
    err_str = str(exc).lower()
    code = getattr(exc, "code", None)
    return (
        code in (429, 503)
        or "429" in err_str
        or "503" in err_str
        or "resource_exhausted" in err_str
        or "quota" in err_str
        or "rate limit" in err_str
        or "unavailable" in err_str
        or "high demand" in err_str
    )


def _get_models_to_try(primary_model: str) -> List[str]:
    """Builds a prioritized list of fallback models."""
    models = [primary_model]
    fallbacks = ["gemini-flash-lite-latest", "gemini-3.1-flash-lite"]
    for m in fallbacks:
        if m not in models:
            models.append(m)
    return models


async def rewrite_question(history: List[Any], question: str) -> str:
    """Rewrites a follow-up question into a standalone question using chat history.

    - Skip if there is no history (saves quota and time).
    - Temperature 0.0 for stability.
    - Non-streaming.
    """
    if not history:
        return question

    history_text = format_history_for_rewrite(history, max_messages=6)
    if not history_text.strip():
        return question

    prompt = QUESTION_REWRITE_PROMPT.format(
        history=history_text,
        question=question.strip(),
    )

    if not check_and_increment_chat_quota():
        raise DailyAiLimitError()

    settings = get_settings()
    client = get_gemini_client()
    models_to_try = _get_models_to_try(settings.gemini_chat_model)

    last_exc = None
    for model_name in models_to_try:
        for attempt in range(2):
            try:
                response = await client.aio.models.generate_content(
                    model=model_name,
                    contents=prompt,
                    config=types.GenerateContentConfig(
                        temperature=0.0,
                        automatic_function_calling=types.AutomaticFunctionCallingConfig(
                            disable=True
                        ),
                    ),
                )
                rewritten = response.text.strip() if response.text else ""
                # Strip accidental surrounding quotes from model output
                if (rewritten.startswith('"') and rewritten.endswith('"')) or (
                    rewritten.startswith("'") and rewritten.endswith("'")
                ):
                    rewritten = rewritten[1:-1].strip()

                return rewritten if rewritten else question

            except Exception as exc:
                last_exc = exc
                if _is_rate_limit(exc) and attempt == 0:
                    await asyncio.sleep(1.0)
                    continue
                logger.warning(
                    f"Question rewrite failed on model {model_name}: {exc}."
                )
                break

    if last_exc and _is_rate_limit(last_exc):
        raise GeminiRateLimitError() from last_exc

    logger.warning(
        f"All models failed for question rewrite ({last_exc}). Using original question."
    )
    return question


def _build_contents_from_history_and_question(
    history: List[Any], question: str, max_messages: int = 6
) -> List[types.Content]:
    """Builds Gemini Content messages from up to the last 6 messages plus the question."""
    contents: List[types.Content] = []
    recent_history = history[-max_messages:] if history else []

    for msg in recent_history:
        if isinstance(msg, dict):
            role_val = msg.get("role", "user")
            content_val = msg.get("content", "")
        else:
            role_val = getattr(msg, "role", "user")
            content_val = getattr(msg, "content", "")

        gemini_role = "user" if role_val == "user" else "model"
        if content_val and content_val.strip():
            contents.append(
                types.Content(
                    role=gemini_role,
                    parts=[types.Part.from_text(text=content_val.strip())],
                )
            )

    # Append current question
    contents.append(
        types.Content(
            role="user",
            parts=[types.Part.from_text(text=question.strip())],
        )
    )
    return contents


async def stream_answer(
    system_prompt: str,
    history: List[Any],
    question: str,
) -> AsyncGenerator[str, None]:
    """Streams the answer tokens from Gemini using the system instruction and context.

    - Uses temperature 0.2, max_output_tokens 1024.
    - Last 6 messages of history sent to model.
    - Yields text chunks as they arrive.
    - Supports model fallback and retry on temporary high-demand / 503 / 429 errors.
    """
    if not check_and_increment_chat_quota():
        raise DailyAiLimitError()

    settings = get_settings()
    client = get_gemini_client()

    contents = _build_contents_from_history_and_question(
        history=history,
        question=question,
        max_messages=6,
    )

    models_to_try = _get_models_to_try(settings.gemini_chat_model)
    last_exc = None
    stream_started = False

    for model_name in models_to_try:
        for attempt in range(2):
            try:
                response_stream = await client.aio.models.generate_content_stream(
                    model=model_name,
                    contents=contents,
                    config=types.GenerateContentConfig(
                        system_instruction=system_prompt,
                        temperature=0.2,
                        max_output_tokens=1024,
                        automatic_function_calling=types.AutomaticFunctionCallingConfig(
                            disable=True
                        ),
                    ),
                )

                async for chunk in response_stream:
                    if chunk.text:
                        stream_started = True
                        yield chunk.text

                return

            except Exception as exc:
                last_exc = exc
                if stream_started:
                    # If we already yielded tokens, re-raise directly
                    if _is_rate_limit(exc):
                        raise GeminiRateLimitError() from exc
                    raise

                if _is_rate_limit(exc) and attempt == 0:
                    logger.warning(
                        f"Stream busy on model {model_name} (attempt {attempt + 1}), waiting 1s..."
                    )
                    await asyncio.sleep(1.0)
                    continue

                logger.warning(
                    f"Stream generation failed with model {model_name}: {exc}. Trying fallback..."
                )
                break

    if last_exc:
        if _is_rate_limit(last_exc):
            raise GeminiRateLimitError() from last_exc
        raise last_exc
