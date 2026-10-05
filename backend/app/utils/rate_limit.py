import time
from collections import defaultdict
from typing import Dict, List

# In-memory rate limiting store:
# Session ID -> List of action timestamps.
# NOTE: This resets when the server restarts and would use Redis in production.
_upload_timestamps: Dict[str, List[float]] = defaultdict(list)
_question_timestamps: Dict[str, List[float]] = defaultdict(list)

MAX_UPLOADS_PER_HOUR = 10
MAX_QUESTIONS_PER_HOUR = 30
ONE_HOUR_SECONDS = 3600.0


def check_upload_rate_limit(session_id: str) -> bool:
    """Checks and records an upload attempt.
    Returns True if permitted, False if limit reached (10 uploads/hour).
    """
    now = time.time()
    cutoff = now - ONE_HOUR_SECONDS
    timestamps = [t for t in _upload_timestamps[session_id] if t > cutoff]
    _upload_timestamps[session_id] = timestamps

    if len(timestamps) >= MAX_UPLOADS_PER_HOUR:
        return False

    timestamps.append(now)
    return True


def check_question_rate_limit(session_id: str) -> bool:
    """Checks and records a question attempt.
    Returns True if permitted, False if limit reached (30 questions/hour).
    """
    now = time.time()
    cutoff = now - ONE_HOUR_SECONDS
    timestamps = [t for t in _question_timestamps[session_id] if t > cutoff]
    _question_timestamps[session_id] = timestamps

    if len(timestamps) >= MAX_QUESTIONS_PER_HOUR:
        return False

    timestamps.append(now)
    return True


def reset_rate_limits() -> None:
    """Helper for tests to clear in-memory rate limit stores."""
    _upload_timestamps.clear()
    _question_timestamps.clear()
