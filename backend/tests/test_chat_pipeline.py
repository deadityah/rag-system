"""Tests for Phase 5 chat pipeline, prompts, LLM service, and SSE streaming."""

import io
import json
import uuid
import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.prompts import (
    NOT_FOUND_REPLY,
    QUESTION_REWRITE_PROMPT,
    SYSTEM_PROMPT,
    format_context,
    format_history_for_rewrite,
)
from app.utils.rate_limit import reset_rate_limits
from tests.test_pdf_parser import create_test_pdf_bytes

client = TestClient(app)


def test_prompts_match_specification():
    """Validates that prompt strings match docs/03-PROMPTS.md exact text."""
    assert "You are DocuMind, a careful assistant that answers questions using ONLY the document excerpts provided below." in SYSTEM_PROMPT
    assert "Cite your sources inside the answer. After each claim, add the source in this format: (filename, p. N)." in SYSTEM_PROMPT
    assert "<context>\n{context}\n</context>" in SYSTEM_PROMPT

    assert "Given the chat history and the user's latest question, rewrite the latest question" in QUESTION_REWRITE_PROMPT
    assert "CHAT HISTORY:\n{history}\n\nLATEST QUESTION:\n{question}\n\nSTANDALONE QUESTION:" in QUESTION_REWRITE_PROMPT

    assert NOT_FOUND_REPLY == "I couldn't find that in your documents. Try rephrasing your question, or upload a document that covers this topic."


def test_format_context():
    """Validates context block formatting per excerpt."""
    chunks = [
        {"filename": "doc1.pdf", "page_number": 2, "content": "Text from page 2"},
        {"filename": "doc2.pdf", "page_number": 5, "content": "Text from page 5"},
    ]
    formatted = format_context(chunks)
    assert "[Source 1 | file: doc1.pdf | page: 2]\nText from page 2" in formatted
    assert "[Source 2 | file: doc2.pdf | page: 5]\nText from page 5" in formatted


def test_format_history_for_rewrite():
    """Validates history formatting limiting to last 6 messages."""
    history = [
        {"role": "user", "content": f"msg {i}"}
        for i in range(10)
    ]
    formatted = format_history_for_rewrite(history, max_messages=6)
    lines = formatted.strip().split("\n")
    assert len(lines) == 6
    assert lines[0] == "User: msg 4"
    assert lines[-1] == "User: msg 9"


def test_chat_missing_session_header_returns_400():
    """POST /api/chat without X-Session-Id header returns 400."""
    resp = client.post("/api/chat", json={"question": "What is DocuMind?"})
    assert resp.status_code == 400
    assert "X-Session-Id" in resp.json()["message"]


def test_chat_question_too_long_returns_422():
    """POST /api/chat with question > 1000 characters returns 422."""
    session_id = f"test-{uuid.uuid4()}"
    resp = client.post(
        "/api/chat",
        headers={"X-Session-Id": session_id},
        json={"question": "a" * 1001},
    )
    assert resp.status_code == 422


def test_chat_rate_limiting():
    """POST /api/chat enforces 30 questions/hour per session limit and returns 429 on 31st."""
    reset_rate_limits()
    session_id = f"rate-limit-unit-{uuid.uuid4()}"

    for i in range(30):
        resp = client.post(
            "/api/chat",
            headers={"X-Session-Id": session_id},
            json={"question": f"Question {i}"},
        )
        assert resp.status_code == 200

    resp_31 = client.post(
        "/api/chat",
        headers={"X-Session-Id": session_id},
        json={"question": "Question 31"},
    )
    assert resp_31.status_code == 429
    assert resp_31.json()["message"] == "Too many requests. Please wait a bit."


def test_unrelated_question_yields_not_found_shortcut():
    """Unrelated question with no matching context yields sources [], not found token, and done with timings."""
    reset_rate_limits()
    session_id = f"unrelated-{uuid.uuid4()}"

    events = []
    with client.stream(
        "POST",
        "/api/chat",
        headers={"X-Session-Id": session_id},
        json={"question": "who won the world cup?"},
    ) as resp:
        assert resp.status_code == 200
        current_event = None
        for line in resp.iter_lines():
            if not line:
                continue
            if line.startswith("event: "):
                current_event = line[len("event: "):].strip()
            elif line.startswith("data: "):
                events.append((current_event, json.loads(line[len("data: "):])))
                current_event = None

    # Check order of events:
    event_names = [e[0] for e in events]
    assert event_names == ["sources", "token", "done"]

    # 1. First event is sources and it arrives before tokens
    assert events[0][0] == "sources"
    assert events[0][1] == []

    # 2. Token is NOT_FOUND_REPLY
    assert events[1][0] == "token"
    assert events[1][1]["text"] == NOT_FOUND_REPLY

    # 3. Done event has timings
    assert events[2][0] == "done"
    done_data = events[2][1]
    assert "latency_ms" in done_data
    assert "first_token_ms" in done_data
    assert done_data["chunks_used"] == 0


def test_relevant_question_streams_answer_with_citations():
    """Uploads a PDF with architecture info on page 3 and verifies streaming answer with citation."""
    reset_rate_limits()
    session_id = f"citation-test-{uuid.uuid4()}"

    p1 = "DocuMind Document AI Overview. Platform for indexing and search." * 4
    p2 = "DocuMind Specs. Limits are 100 pages and 10 MB per document." * 4
    p3 = "DocuMind System Architecture. Utilizes PostgreSQL with pgvector hosted on Supabase for vector similarity search." * 4

    pdf_bytes = create_test_pdf_bytes([p1, p2, p3])
    up_resp = client.post(
        "/api/documents",
        headers={"X-Session-Id": session_id},
        files={"file": ("tech_manual.pdf", io.BytesIO(pdf_bytes), "application/pdf")},
    )
    assert up_resp.status_code == 201

    try:
        events = []
        tokens = []
        with client.stream(
            "POST",
            "/api/chat",
            headers={"X-Session-Id": session_id},
            json={"question": "What database does the system architecture utilize?"},
        ) as resp:
            assert resp.status_code == 200
            current_event = None
            for line in resp.iter_lines():
                if not line:
                    continue
                if line.startswith("event: "):
                    current_event = line[len("event: "):].strip()
                elif line.startswith("data: "):
                    data_obj = json.loads(line[len("data: "):])
                    events.append((current_event, data_obj))
                    if current_event == "token":
                        tokens.append(data_obj.get("text", ""))
                    current_event = None

        event_names = [e[0] for e in events]
        assert "sources" in event_names
        assert "token" in event_names
        assert "done" in event_names

        # The first event must be sources (before any tokens)
        assert events[0][0] == "sources"
        sources_list = events[0][1]
        assert len(sources_list) > 0
        assert any(s["filename"] == "tech_manual.pdf" for s in sources_list)
        assert any(s["page"] == 3 for s in sources_list)

        # Done event has timings
        done_event = [e for e in events if e[0] == "done"][0]
        assert "latency_ms" in done_event[1]
        assert "first_token_ms" in done_event[1]
        assert done_event[1]["chunks_used"] > 0

        # Answer text contains citation like (tech_manual.pdf, p. 3)
        full_answer = "".join(tokens)
        assert "PostgreSQL" in full_answer or "Supabase" in full_answer
        assert "(tech_manual.pdf, p. 3)" in full_answer

    finally:
        # Cleanup
        client.delete(f"/api/documents/{up_resp.json()['id']}", headers={"X-Session-Id": session_id})
