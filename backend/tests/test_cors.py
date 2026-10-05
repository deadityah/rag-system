"""Tests for CORS ALLOWED_ORIGINS comma-separated parsing and preflight/response headers."""

from fastapi.testclient import TestClient

from app.config import Settings, get_settings
from app.main import app


def test_cors_origins_parsing():
    s = Settings(
        allowed_origins="http://localhost:3000, https://documind.vercel.app, https://documind-preview.vercel.app/ "
    )
    assert s.cors_origins == [
        "http://localhost:3000",
        "https://documind.vercel.app",
        "https://documind-preview.vercel.app",
    ]


def test_cors_middleware_allows_configured_origins():
    client = TestClient(app)

    # Test GET with Origin header
    response = client.get(
        "/api/health",
        headers={"Origin": "http://localhost:3000"},
    )
    assert response.status_code == 200
    assert response.headers.get("access-control-allow-origin") == "http://localhost:3000"

    # Test OPTIONS preflight
    response_opt = client.options(
        "/api/documents",
        headers={
            "Origin": "http://localhost:3000",
            "Access-Control-Request-Method": "POST",
            "Access-Control-Request-Headers": "Content-Type, X-Session-Id",
        },
    )
    assert response_opt.status_code == 200
    assert response_opt.headers.get("access-control-allow-origin") == "http://localhost:3000"
