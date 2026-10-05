import time
from functools import lru_cache
from typing import List, Optional
import numpy as np
from google import genai
from google.genai import types

from app.config import get_settings
from app.utils.quota import DailyAiLimitError, check_and_increment_embed_quota


class GeminiRateLimitError(Exception):
    """Raised when Gemini API rate limit or quota is exhausted."""

    def __init__(
        self,
        message: str = "The AI service is busy. Please try again in a moment.",
    ):
        super().__init__(message)
        self.message = message
        self.status_code = 429


class EmbeddingsError(Exception):
    """Raised when embedding generation fails."""

    def __init__(self, message: str = "Failed to generate embeddings."):
        super().__init__(message)
        self.message = message


def get_gemini_client() -> genai.Client:
    """Returns a Google GenAI client bound to the current execution context."""
    settings = get_settings()
    if not settings.gemini_api_key:
        raise ValueError("GEMINI_API_KEY is not configured in environment.")
    return genai.Client(api_key=settings.gemini_api_key)


def normalize_vector(vec: List[float]) -> List[float]:
    """Normalizes vector to unit length (L2 norm = 1.0)."""
    arr = np.array(vec, dtype=np.float32)
    norm = np.linalg.norm(arr)
    if norm > 0:
        arr = arr / norm
    return arr.tolist()


def _call_with_retry(fn, *args, **kwargs):
    """Executes an API call with exponential backoff on 429 rate limit errors (1s, 2s, 4s)."""
    delays = [1.0, 2.0, 4.0]
    last_exc = None

    for attempt in range(len(delays) + 1):
        try:
            return fn(*args, **kwargs)
        except Exception as exc:
            last_exc = exc
            err_str = str(exc).lower()
            code = getattr(exc, "code", None)
            is_rate_limit = (
                code == 429
                or "429" in err_str
                or "resource_exhausted" in err_str
                or "quota" in err_str
                or "rate limit" in err_str
            )
            if is_rate_limit and attempt < len(delays):
                time.sleep(delays[attempt])
                continue
            if is_rate_limit:
                raise GeminiRateLimitError() from exc
            raise EmbeddingsError(f"Embedding error: {exc}") from exc

    if last_exc:
        raise GeminiRateLimitError() from last_exc


def embed_documents(
    texts: List[str],
    client: Optional[genai.Client] = None,
) -> List[List[float]]:
    """Embeds a list of document chunk texts in batches of up to 100.

    Uses task_type='RETRIEVAL_DOCUMENT' and normalizes each vector to length 1.
    """
    if not texts:
        return []

    settings = get_settings()
    genai_client = client or get_gemini_client()
    all_vectors: List[List[float]] = []
    batch_size = 100

    num_batches = (len(texts) + batch_size - 1) // batch_size
    if not check_and_increment_embed_quota(num_batches):
        raise DailyAiLimitError()

    for i in range(0, len(texts), batch_size):
        batch = texts[i:i + batch_size]
        response = _call_with_retry(
            genai_client.models.embed_content,
            model=settings.gemini_embed_model,
            contents=batch,
            config=types.EmbedContentConfig(
                task_type="RETRIEVAL_DOCUMENT",
                output_dimensionality=settings.embed_dimensions,
            ),
        )

        for emb in response.embeddings:
            all_vectors.append(normalize_vector(emb.values))

    return all_vectors


def embed_query(
    text: str,
    client: Optional[genai.Client] = None,
) -> List[float]:
    """Embeds a search query string.

    Uses task_type='RETRIEVAL_QUERY' and normalizes the vector to length 1.
    """
    if not text:
        return []

    if not check_and_increment_embed_quota(1):
        raise DailyAiLimitError()

    settings = get_settings()
    genai_client = client or get_gemini_client()

    response = _call_with_retry(
        genai_client.models.embed_content,
        model=settings.gemini_embed_model,
        contents=text,
        config=types.EmbedContentConfig(
            task_type="RETRIEVAL_QUERY",
            output_dimensionality=settings.embed_dimensions,
        ),
    )

    if not response.embeddings:
        raise EmbeddingsError("No embedding returned from Gemini.")

    return normalize_vector(response.embeddings[0].values)
