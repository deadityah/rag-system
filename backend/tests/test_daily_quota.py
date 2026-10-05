"""Tests for daily quota protection (GEMINI_DAILY_LIMIT and EMBED_DAILY_LIMIT)."""

import pytest
from fastapi.testclient import TestClient

from app.config import get_settings
from app.main import app
from app.utils.quota import (
    DAILY_LIMIT_MESSAGE,
    DailyAiLimitError,
    check_and_increment_chat_quota,
    check_and_increment_embed_quota,
    is_chat_daily_limit_reached,
    is_embed_daily_limit_reached,
    reset_daily_quotas,
)

client = TestClient(app)


@pytest.fixture(autouse=True)
def clean_quota():
    reset_daily_quotas()
    yield
    reset_daily_quotas()


def test_chat_quota_tracking_and_limit():
    settings = get_settings()
    original_limit = settings.gemini_daily_limit
    try:
        settings.gemini_daily_limit = 3

        assert check_and_increment_chat_quota() is True
        assert check_and_increment_chat_quota() is True
        assert check_and_increment_chat_quota() is True
        assert is_chat_daily_limit_reached() is True

        # 4th request must be blocked
        assert check_and_increment_chat_quota() is False

        # Endpoint check
        response = client.post(
            "/api/chat",
            json={"question": "Test question after limit"},
            headers={"X-Session-Id": "test-session-quota-1"},
        )
        assert response.status_code == 429
        data = response.json()
        assert data["detail"] == DAILY_LIMIT_MESSAGE
        assert data["message"] == DAILY_LIMIT_MESSAGE
    finally:
        settings.gemini_daily_limit = original_limit


def test_embed_quota_tracking_and_limit():
    settings = get_settings()
    original_limit = settings.embed_daily_limit
    try:
        settings.embed_daily_limit = 2

        assert check_and_increment_embed_quota(1) is True
        assert check_and_increment_embed_quota(1) is True
        assert is_embed_daily_limit_reached() is True

        # Next request must be blocked
        assert check_and_increment_embed_quota(1) is False

        # Endpoint check
        response = client.post(
            "/api/documents",
            headers={"X-Session-Id": "test-session-quota-2"},
            files={"file": ("dummy.pdf", b"%PDF-1.4 mock content", "application/pdf")},
        )
        assert response.status_code == 429
        data = response.json()
        assert data["detail"] == DAILY_LIMIT_MESSAGE
        assert data["message"] == DAILY_LIMIT_MESSAGE
    finally:
        settings.embed_daily_limit = original_limit


def test_daily_ai_limit_error_message():
    err = DailyAiLimitError()
    assert str(err) == DAILY_LIMIT_MESSAGE
    assert err.message == DAILY_LIMIT_MESSAGE
    assert err.status_code == 429
