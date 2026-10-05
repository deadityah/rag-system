"""Daily request limit tracking for Gemini chat and embedding API calls.
Protects API quota by blocking Gemini requests once the daily threshold is met.

NOTE: This in-memory implementation resets when the server restarts or
when the UTC date rolls over. Production environments would use Redis
(e.g., INCR with EXPIREAT / midnight TTL) or a persistent database
to track usage across multiple worker processes and server restarts.
"""

from datetime import datetime, timezone
import logging
import threading
from typing import Any, Dict

from app.config import get_settings

logger = logging.getLogger(__name__)

DAILY_LIMIT_MESSAGE = "This demo has reached its daily AI limit. Please try again tomorrow."


class DailyAiLimitError(Exception):
    """Raised when the daily request limit for Gemini chat or embeddings is reached."""

    def __init__(self, message: str = DAILY_LIMIT_MESSAGE):
        super().__init__(message)
        self.message = message
        self.status_code = 429


class DailyQuotaTracker:
    """Thread-safe in-memory daily quota counter."""

    def __init__(self) -> None:
        self._lock = threading.Lock()
        self._current_date = datetime.now(timezone.utc).date()
        self._chat_count = 0
        self._embed_count = 0

    def _rollover_if_new_day(self) -> None:
        """Resets counters at midnight UTC."""
        today = datetime.now(timezone.utc).date()
        if today != self._current_date:
            self._current_date = today
            self._chat_count = 0
            self._embed_count = 0

    def check_and_increment_chat(self) -> bool:
        """Checks if a Gemini chat model request is allowed under GEMINI_DAILY_LIMIT.
        Returns True and increments the counter if permitted.
        Returns False without calling Gemini if limit is reached.
        """
        settings = get_settings()
        limit = settings.gemini_daily_limit
        with self._lock:
            self._rollover_if_new_day()
            if self._chat_count >= limit:
                logger.warning(
                    f"Chat daily quota limit reached ({self._chat_count}/{limit})."
                )
                return False
            self._chat_count += 1
            return True

    def check_and_increment_embed(self, count: int = 1) -> bool:
        """Checks if Gemini embedding request(s) are allowed under EMBED_DAILY_LIMIT.
        Returns True and increments the counter if permitted.
        Returns False without calling Gemini if limit is reached.
        """
        settings = get_settings()
        limit = settings.embed_daily_limit
        with self._lock:
            self._rollover_if_new_day()
            if self._embed_count + count > limit:
                logger.warning(
                    f"Embedding daily quota limit reached ({self._embed_count} + {count} > {limit})."
                )
                return False
            self._embed_count += count
            return True

    def is_chat_limit_reached(self) -> bool:
        """Returns True if the chat daily limit is reached."""
        settings = get_settings()
        with self._lock:
            self._rollover_if_new_day()
            return self._chat_count >= settings.gemini_daily_limit

    def is_embed_limit_reached(self) -> bool:
        """Returns True if the embedding daily limit is reached."""
        settings = get_settings()
        with self._lock:
            self._rollover_if_new_day()
            return self._embed_count >= settings.embed_daily_limit

    def get_stats(self) -> Dict[str, Any]:
        """Returns current daily usage and configured limits."""
        settings = get_settings()
        with self._lock:
            self._rollover_if_new_day()
            return {
                "date": str(self._current_date),
                "chat_count": self._chat_count,
                "chat_limit": settings.gemini_daily_limit,
                "embed_count": self._embed_count,
                "embed_limit": settings.embed_daily_limit,
            }

    def reset(self) -> None:
        """Resets counters (used for testing)."""
        with self._lock:
            self._chat_count = 0
            self._embed_count = 0
            self._current_date = datetime.now(timezone.utc).date()


_quota_tracker = DailyQuotaTracker()


def check_and_increment_chat_quota() -> bool:
    """Enforces GEMINI_DAILY_LIMIT for chat model calls."""
    return _quota_tracker.check_and_increment_chat()


def check_and_increment_embed_quota(count: int = 1) -> bool:
    """Enforces EMBED_DAILY_LIMIT for embedding calls."""
    return _quota_tracker.check_and_increment_embed(count)


def is_chat_daily_limit_reached() -> bool:
    return _quota_tracker.is_chat_limit_reached()


def is_embed_daily_limit_reached() -> bool:
    return _quota_tracker.is_embed_limit_reached()


def reset_daily_quotas() -> None:
    _quota_tracker.reset()


def get_daily_quota_stats() -> Dict[str, Any]:
    return _quota_tracker.get_stats()
