"""Tests for CORS ALLOWED_ORIGINS comma-separated parsing and preflight/response headers."""

from fastapi.testclient import TestClient

from app.config import Settings
from app.main import app
from app.routers.documents import get_session_id
from fastapi import Request


def test_cors_origins_parsing():
    s = Settings(
        allowed_origins="\"http://localhost:3000\", 'https://documind.vercel.app/', https://documind-preview.vercel.app/// "
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

    # Test OPTIONS preflight to /api/documents
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
    allow_headers = response_opt.headers.get("access-control-allow-headers", "").lower()
    assert "content-type" in allow_headers
    assert "x-session-id" in allow_headers
    allow_methods = response_opt.headers.get("access-control-allow-methods", "")
    assert "POST" in allow_methods
    assert "OPTIONS" in allow_methods


def test_cors_preflight_with_lowercase_headers():
    client = TestClient(app)
    response_opt = client.options(
        "/api/documents",
        headers={
            "Origin": "http://localhost:3000",
            "Access-Control-Request-Method": "POST",
            "Access-Control-Request-Headers": "content-type, x-session-id",
        },
    )
    assert response_opt.status_code == 200
    assert response_opt.headers.get("access-control-allow-origin") == "http://localhost:3000"


def test_get_session_id_dependency_bypasses_options_request():
    # Construct mock request with OPTIONS method
    scope = {"type": "http", "method": "OPTIONS", "headers": []}
    req = Request(scope)
    # Should not raise HTTPException 400 even when header is None
    session_id = get_session_id(request=req, x_session_id=None)
    assert session_id == ""
