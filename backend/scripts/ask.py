#!/usr/bin/env python3
"""CLI test script to ask questions against the DocuMind chat pipeline.
Supports streaming SSE output directly in the terminal with source citations,
timings, rate limit checks, and sample document seeding.

Usage:
    python backend/scripts/ask.py "What database does DocuMind use?"
    python backend/scripts/ask.py "who won the world cup?"
    python backend/scripts/ask.py --test-limit
    python backend/scripts/ask.py --upload sample.pdf "Summarize this document"
"""

import argparse
import io
import json
import os
import sys
import uuid
from pathlib import Path
from typing import Any, Dict, List, Optional

if sys.platform == "win32":
    try:
        sys.stdout.reconfigure(encoding="utf-8")
    except Exception:
        pass

# Ensure backend root is on sys.path
backend_dir = Path(__file__).resolve().parent.parent
if str(backend_dir) not in sys.path:
    sys.path.insert(0, str(backend_dir))

import httpx
from fastapi.testclient import TestClient

from app.main import app
from app.services.vector_store import count_documents, get_supabase_client
from tests.test_pdf_parser import create_test_pdf_bytes

SESSION_FILE = backend_dir / "scripts" / ".active_session"


def get_or_create_session(force_new: bool = False, custom_id: Optional[str] = None) -> str:
    """Gets the active session ID, reusing previous one if available."""
    if custom_id:
        return custom_id.strip()

    if not force_new and SESSION_FILE.exists():
        try:
            saved_id = SESSION_FILE.read_text(encoding="utf-8").strip()
            if saved_id:
                return saved_id
        except Exception:
            pass

    new_id = f"terminal-session-{uuid.uuid4().hex[:8]}"
    try:
        SESSION_FILE.write_text(new_id, encoding="utf-8")
    except Exception:
        pass
    return new_id


def seed_sample_document(session_id: str, client: Any, is_in_process: bool = True) -> str:
    """Uploads a 3-page sample PDF containing specific architecture details on page 3."""
    print("Seeding sample document (documind_guide.pdf, 3 pages)...")

    p1 = (
        "DocuMind System Overview. DocuMind is an intelligent document search and retrieval "
        "augmented generation platform designed for real-time document interrogation. "
        "It ingests PDF files, validates their integrity, and generates vector representations. "
    ) * 3

    p2 = (
        "DocuMind Ingestion and Processing Limits. Uploaded PDFs are constrained to a maximum "
        "of 100 pages and 10 MB per file. Text is extracted cleanly using pypdf and partitioned "
        "into 800 character chunks with a 120 character sliding window overlap. "
    ) * 3

    p3 = (
        "DocuMind Architecture and Database Design. The backend system architecture utilizes "
        "PostgreSQL with pgvector hosted on Supabase for vector similarity search. The hybrid "
        "RAG pipeline uses Google Gemini 768-dimensional normalized embeddings to perform semantic "
        "matching and retrieve context for the answer generation model. "
    ) * 3

    pdf_bytes = create_test_pdf_bytes([p1, p2, p3])
    files = {"file": ("documind_guide.pdf", io.BytesIO(pdf_bytes), "application/pdf")}
    headers = {"X-Session-Id": session_id}

    if is_in_process:
        resp = client.post("/api/documents", headers=headers, files=files)
    else:
        resp = client.post("/api/documents", headers=headers, files={"file": ("documind_guide.pdf", pdf_bytes, "application/pdf")})

    if resp.status_code == 201:
        doc = resp.json()
        print(f"Sample uploaded successfully: {doc['filename']} ({doc['page_count']} pages, {doc['chunk_count']} chunks)")
        return doc["id"]
    else:
        print(f"Failed to seed sample document: {resp.status_code} {resp.text}")
        return ""


def upload_custom_file(session_id: str, file_path: str, client: Any, is_in_process: bool = True) -> bool:
    """Uploads a user-provided PDF file."""
    path = Path(file_path)
    if not path.is_file():
        print(f"Error: File not found: {file_path}")
        return False

    with open(path, "rb") as f:
        file_bytes = f.read()

    headers = {"X-Session-Id": session_id}
    if is_in_process:
        resp = client.post("/api/documents", headers=headers, files={"file": (path.name, io.BytesIO(file_bytes), "application/pdf")})
    else:
        resp = client.post("/api/documents", headers=headers, files={"file": (path.name, file_bytes, "application/pdf")})

    if resp.status_code == 201:
        doc = resp.json()
        print(f"Uploaded: {doc['filename']} ({doc['page_count']} pages, {doc['chunk_count']} chunks)")
        return True
    else:
        print(f"Upload failed: {resp.status_code} {resp.text}")
        return False


def run_rate_limit_test(session_id: str, client: Any, is_in_process: bool = True) -> None:
    """Sends 31 requests rapidly to demonstrate the 30 questions/hour rate limit enforcement."""
    print(f"\n--- Testing Rate Limit (30 questions/hr limit for session {session_id}) ---")
    headers = {"X-Session-Id": session_id}
    body = {"question": "Ping question for rate limit test"}

    for i in range(1, 33):
        if is_in_process:
            resp = client.post("/api/chat", headers=headers, json=body)
        else:
            resp = client.post("/api/chat", headers=headers, json=body)

        if resp.status_code == 429:
            data = resp.json()
            message = data.get("detail") or data.get("message")
            print(f"Request {i:02d}: [HTTP 429] Limit message -> \"{message}\"")
            print("Rate limit test PASSED: Limit message appeared after 30 questions.")
            return
        elif resp.status_code == 200:
            print(f"Request {i:02d}: [HTTP 200 OK]")
        else:
            print(f"Request {i:02d}: [HTTP {resp.status_code}] {resp.text}")

    print("Rate limit test finished without hitting 429.")


def stream_chat(
    session_id: str,
    question: str,
    client: Any,
    is_in_process: bool = True,
    history: Optional[List[Dict[str, str]]] = None,
) -> None:
    """Executes chat request and parses SSE events in real-time."""
    headers = {"X-Session-Id": session_id}
    payload = {
        "question": question,
        "history": history or [],
    }

    print(f"\n[Session ID]: {session_id}")
    print(f"[Question]:   {question}")

    try:
        if is_in_process:
            stream_context = client.stream("POST", "/api/chat", headers=headers, json=payload)
        else:
            stream_context = client.stream("POST", "/api/chat", headers=headers, json=payload, timeout=60.0)

        with stream_context as resp:
            if resp.status_code == 429:
                err_data = resp.json()
                msg = err_data.get("detail") or err_data.get("message") or resp.text
                print(f"\n[Rate Limit 429]: {msg}")
                return

            if resp.status_code != 200:
                print(f"\n[HTTP Error {resp.status_code}]: {resp.text}")
                return

            current_event = None
            first_token_seen = False

            for raw_line in resp.iter_lines():
                if isinstance(raw_line, bytes):
                    line = raw_line.decode("utf-8")
                else:
                    line = raw_line

                line = line.rstrip("\r\n")
                if not line:
                    continue

                if line.startswith("event: "):
                    current_event = line[len("event: "):].strip()
                    continue

                if line.startswith("data: "):
                    data_str = line[len("data: "):]
                    try:
                        data = json.loads(data_str)
                    except Exception:
                        data = data_str

                    if current_event == "sources":
                        print(f"\n[event: sources] (arrived before tokens):")
                        if isinstance(data, list) and data:
                            for src in data:
                                fname = src.get("filename", "unknown")
                                page = src.get("page", "?")
                                sim = src.get("similarity", 0.0)
                                print(f"  * {fname} (p. {page}, similarity: {sim:.3f})")
                        else:
                            print("  * None (similarity below threshold or no documents)")

                    elif current_event == "token":
                        if not first_token_seen:
                            first_token_seen = True
                            print("\n[event: token stream]:")
                        token_text = data.get("text", "") if isinstance(data, dict) else str(data)
                        sys.stdout.write(token_text)
                        sys.stdout.flush()

                    elif current_event == "done":
                        print(f"\n\n[event: done]:")
                        if isinstance(data, dict):
                            print(f"  * Latency:     {data.get('latency_ms', '?')} ms")
                            print(f"  * First Token: {data.get('first_token_ms', '?')} ms")
                            print(f"  * Chunks Used: {data.get('chunks_used', '?')}")
                        else:
                            print(f"  * Data: {data}")

                    elif current_event == "error":
                        err_msg = data.get("message", "") if isinstance(data, dict) else str(data)
                        print(f"\n[event: error]: {err_msg}")

                    current_event = None

    except httpx.ConnectError:
        print("\nError: Could not connect to API server.")
    except Exception as exc:
        print(f"\nUnexpected error during stream: {exc}")


def main():
    parser = argparse.ArgumentParser(description="Test DocuMind Chat Pipeline from Terminal")
    parser.add_argument("question", nargs="?", help="Question to ask the DocuMind assistant")
    parser.add_argument("-s", "--session-id", help="Explicit session ID to use")
    parser.add_argument("-n", "--new-session", action="store_true", help="Start a new session")
    parser.add_argument("--upload", help="Upload a PDF file before asking")
    parser.add_argument("--seed-sample", action="store_true", help="Seed a 3-page sample PDF")
    parser.add_argument("--test-limit", action="store_true", help="Run 31 requests to verify rate limiting")
    parser.add_argument("--url", default="http://127.0.0.1:8000", help="Backend API server URL")

    args = parser.parse_args()

    session_id = get_or_create_session(force_new=args.new_session, custom_id=args.session_id)

    # Determine whether to use HTTP client against running server or in-process TestClient
    is_in_process = False
    try:
        check_resp = httpx.get(f"{args.url}/api/health", timeout=1.0)
        if check_resp.status_code == 200:
            client = httpx.Client(base_url=args.url)
            print(f"Connected to live DocuMind server at {args.url}")
        else:
            raise ConnectionError()
    except Exception:
        print(f"No running server at {args.url}; running in-process via FastAPI TestClient.")
        client = TestClient(app)
        is_in_process = True

    # Handle explicit sample seed
    if args.seed_sample:
        seed_sample_document(session_id, client, is_in_process)

    # Handle upload
    if args.upload:
        upload_custom_file(session_id, args.upload, client, is_in_process)

    # Handle rate limit test
    if args.test_limit:
        run_rate_limit_test(session_id, client, is_in_process)
        return

    # If no question provided and not just seeding/uploading
    question = args.question
    if not question:
        if args.seed_sample or args.upload:
            print("Setup completed.")
            return
        # Default question for convenience
        question = "What database does DocuMind use according to the architecture?"

    # Check if session has any documents; if none, auto-seed sample doc for instant testing
    try:
        doc_count = count_documents(session_id)
        if doc_count == 0 and not args.upload:
            print("No documents found in session. Auto-seeding 3-page sample document...")
            seed_sample_document(session_id, client, is_in_process)
    except Exception as exc:
        print(f"Warning: Could not check document count: {exc}")

    # Stream the chat answer
    stream_chat(session_id, question, client, is_in_process)


if __name__ == "__main__":
    main()
