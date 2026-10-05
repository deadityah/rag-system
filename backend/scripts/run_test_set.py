#!/usr/bin/env python3
"""RAG Quality Test Set Runner (Phase 7).
Executes the standardized 15-question test set against DocuMind
using 'home_cooks_handbook.pdf', evaluates keyword and page citation rules,
computes metrics, and writes the results to docs/test-results.md.

Usage:
    python backend/scripts/run_test_set.py
    python backend/scripts/run_test_set.py --session <custom-session-id>
"""

import argparse
import json
import os
import re
import sys
import time
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

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

from app.config import get_settings
from app.main import app
from app.services.embeddings import embed_query
from app.services.vector_store import get_supabase_client, search
from app.utils.rate_limit import reset_rate_limits

SESSION_FILE = backend_dir / "scripts" / ".active_session"
RESULTS_FILE = backend_dir.parent / "docs" / "test-results.md"


def get_target_session(custom_id: Optional[str] = None) -> str:
    """Finds or resolves the session containing home_cooks_handbook.pdf."""
    if custom_id:
        return custom_id.strip()

    # 1. Check saved session file
    if SESSION_FILE.exists():
        try:
            saved = SESSION_FILE.read_text(encoding="utf-8").strip()
            if saved:
                supabase = get_supabase_client()
                res = (
                    supabase.table("documents")
                    .select("id, filename")
                    .eq("session_id", saved)
                    .ilike("filename", "%home_cooks_handbook%")
                    .execute()
                )
                if res.data:
                    return saved
        except Exception:
            pass

    # 2. Look up in Supabase for any existing handbook
    try:
        supabase = get_supabase_client()
        res = (
            supabase.table("documents")
            .select("id, session_id, filename")
            .ilike("filename", "%home_cooks_handbook%")
            .order("created_at", desc=True)
            .limit(1)
            .execute()
        )
        if res.data:
            sid = str(res.data[0]["session_id"])
            SESSION_FILE.write_text(sid, encoding="utf-8")
            return sid
    except Exception as exc:
        print(f"Warning querying Supabase for documents: {exc}")

    # Fallback to default session
    fallback = "1b03f152-17a9-4f79-abc3-9d93c42040e3"
    SESSION_FILE.write_text(fallback, encoding="utf-8")
    return fallback


def extract_cited_pages(text: str) -> List[int]:
    """Extracts all cited page numbers from markdown answer text."""
    # Matches patterns like (p. 2), (Page 4), p. 2, page 6, p. 2-3
    matches = re.findall(r"(?:p\.|page|pages)\s*(\d+)", text, re.IGNORECASE)
    pages: List[int] = []
    for m in matches:
        try:
            p = int(m)
            if p not in pages:
                pages.append(p)
        except ValueError:
            pass
    return sorted(pages)


def run_chat_query(
    client: Any,
    session_id: str,
    question: str,
    history: Optional[List[Dict[str, str]]] = None,
    is_in_process: bool = True,
) -> Tuple[str, List[int], Optional[int], Optional[int], Optional[str]]:
    """Runs a single chat question, streaming SSE tokens.
    Returns: (answer_text, cited_pages, first_token_ms, total_latency_ms, error_message)
    """
    headers = {"X-Session-Id": session_id}
    payload = {
        "question": question,
        "history": history or [],
    }

    answer_parts: List[str] = []
    source_pages: List[int] = []
    first_token_ms: Optional[int] = None
    total_latency_ms: Optional[int] = None
    error_msg: Optional[str] = None

    t0 = time.perf_counter()

    try:
        if is_in_process:
            stream_context = client.stream("POST", "/api/chat", headers=headers, json=payload)
        else:
            stream_context = client.stream(
                "POST", "/api/chat", headers=headers, json=payload, timeout=60.0
            )

        with stream_context as resp:
            if resp.status_code == 429:
                err_text = resp.text
                return "", [], None, None, f"HTTP 429 Rate Limit: {err_text}"
            if resp.status_code != 200:
                return "", [], None, None, f"HTTP {resp.status_code}: {resp.text}"

            current_event: Optional[str] = None

            for raw_line in resp.iter_lines():
                if isinstance(raw_line, bytes):
                    line = raw_line.decode("utf-8")
                else:
                    line = raw_line

                line = line.rstrip("\r\n")
                if not line:
                    continue

                if line.startswith("event:"):
                    current_event = line[len("event:"):].strip()
                    continue

                if line.startswith("data:"):
                    data_str = line[len("data:"):].strip()
                    try:
                        data = json.loads(data_str)
                    except Exception:
                        data = data_str

                    if current_event == "sources":
                        if isinstance(data, list):
                            for s in data:
                                p = s.get("page")
                                if isinstance(p, int) and p not in source_pages:
                                    source_pages.append(p)

                    elif current_event == "token":
                        if first_token_ms is None:
                            first_token_ms = int((time.perf_counter() - t0) * 1000)
                        token_text = (
                            data.get("text", "") if isinstance(data, dict) else str(data)
                        )
                        answer_parts.append(token_text)

                    elif current_event == "done":
                        if isinstance(data, dict):
                            total_latency_ms = data.get("latency_ms")
                            if data.get("first_token_ms"):
                                first_token_ms = data.get("first_token_ms")

                    elif current_event == "error":
                        msg = (
                            data.get("message", "")
                            if isinstance(data, dict)
                            else str(data)
                        )
                        error_msg = msg

                    current_event = None

    except Exception as exc:
        error_msg = str(exc)

    total_time = int((time.perf_counter() - t0) * 1000)
    if total_latency_ms is None:
        total_latency_ms = total_time
    if first_token_ms is None:
        first_token_ms = total_time

    full_answer = "".join(answer_parts).strip()
    cited_in_text = extract_cited_pages(full_answer)

    # Combined cited pages prioritizing text citations, fallback to source metadata
    all_cited = cited_in_text if cited_in_text else source_pages

    return full_answer, all_cited, first_token_ms, total_latency_ms, error_msg


def inspect_chunks_for_query(session_id: str, query: str, top_k: int = 5) -> List[Dict[str, Any]]:
    """Retrieves top-k chunks with similarity scores for diagnostic failure logging."""
    try:
        query_vec = embed_query(query)
        chunks = search(
            session_id=session_id,
            query_vector=query_vec,
            top_k=top_k,
        )
        return chunks
    except Exception as exc:
        print(f"Diagnostic chunk retrieval failed: {exc}")
        return []


def main():
    parser = argparse.ArgumentParser(description="Run DocuMind RAG 15-question Test Set")
    parser.add_argument("--session", type=str, help="Session ID to test against")
    parser.add_argument(
        "--live", action="store_true", help="Connect to live server on http://localhost:8000"
    )
    args = parser.parse_args()

    session_id = get_target_session(args.session)
    settings = get_settings()

    print("=" * 80)
    print("DOCUMIND RAG QUALITY TEST SUITE — PHASE 7")
    print("=" * 80)
    print(f"Target Session:        {session_id}")
    print(f"Gemini Chat Model:     {settings.gemini_chat_model}")
    print(f"Gemini Embed Model:    {settings.gemini_embed_model}")
    print(f"Similarity Threshold:  {settings.similarity_threshold}")
    print(f"Top K:                 {settings.top_k}")
    print(f"Inter-question Delay:  6 seconds (quota protection)")
    print("=" * 80)

    # Clear in-memory rate limits for test run
    reset_rate_limits()

    # Determine client
    is_in_process = True
    client: Any = None

    try:
        live_client = httpx.Client(base_url="http://127.0.0.1:8000", timeout=60.0)
        res = live_client.get("/api/health")
        if res.status_code == 200:
            client = live_client
            is_in_process = False
            print("Connected to live DocuMind server at http://127.0.0.1:8000\n")
    except Exception:
        pass

    if client is None:
        client = TestClient(app)
        is_in_process = True
        print("Running in-process via FastAPI TestClient.\n")

    # The 15 Test Questions Definition
    test_cases = [
        # Group A: 10 in-document questions
        {
            "id": 1,
            "group": "A",
            "question": "What temperature should chicken reach?",
            "expected_keywords": ["165"],
            "expected_page": 2,
            "history": [],
        },
        {
            "id": 2,
            "group": "A",
            "question": "What is the danger zone for bacteria?",
            "expected_keywords": ["40", "140"],
            "expected_page": 2,
            "history": [],
        },
        {
            "id": 3,
            "group": "A",
            "question": "How long can cooked food stay out?",
            "expected_keywords": ["2 hours"],
            "expected_page": 2,
            "history": [],
        },
        {
            "id": 4,
            "group": "A",
            "question": "How much salt should I add to pasta water?",
            "expected_keywords": ["1 tablespoon"],
            "expected_page": 3,
            "history": [],
        },
        {
            "id": 5,
            "group": "A",
            "question": "How much spaghetti is in the tomato pasta recipe?",
            "expected_keywords": ["400"],
            "expected_page": 4,
            "history": [],
        },
        {
            "id": 6,
            "group": "A",
            "question": "How long do I simmer the tomato sauce?",
            "expected_keywords": ["12", "15"],
            "expected_page": 4,
            "history": [],
        },
        {
            "id": 7,
            "group": "A",
            "question": "Why is day-old rice best for fried rice?",
            "expected_keywords": ["dry"],
            "expected_page": 5,
            "history": [],
        },
        {
            "id": 8,
            "group": "A",
            "question": "How long can raw chicken pieces stay in the freezer?",
            "expected_keywords": ["4 months"],
            "expected_page": 6,
            "history": [],
        },
        {
            "id": 9,
            "group": "A",
            "question": "How long do cooked rice and pasta last in the fridge?",
            "expected_keywords": ["3 to 4 days"],
            "expected_page": 6,
            "history": [],
        },
        {
            "id": 10,
            "group": "A",
            "question": "How many calories are in 1 gram of fat?",
            "expected_keywords": ["9"],
            "expected_page": 7,
            "history": [],
        },
        # Group B: 3 off-topic questions
        {
            "id": 11,
            "group": "B",
            "question": "What is the capital of France?",
            "expected_keywords": ["couldn't find that in your documents"],
            "expected_page": None,
            "history": [],
        },
        {
            "id": 12,
            "group": "B",
            "question": "What is the recipe for chocolate cake?",
            "expected_keywords": ["couldn't find that in your documents"],
            "expected_page": None,
            "history": [],
        },
        {
            "id": 13,
            "group": "B",
            "question": "Who won the cricket world cup?",
            "expected_keywords": ["couldn't find that in your documents"],
            "expected_page": None,
            "history": [],
        },
        # Group C: 2 follow-up questions (history dynamically filled from Q1 and Q5)
        {
            "id": 14,
            "group": "C",
            "question": "What about fish?",
            "expected_keywords": ["145"],
            "expected_page": 2,
            "ref_q_id": 1,
        },
        {
            "id": 15,
            "group": "C",
            "question": "How long does the sauce take?",
            "expected_keywords": ["12"],
            "expected_page": 4,
            "ref_q_id": 5,
        },
    ]

    results: List[Dict[str, Any]] = []
    q_answers: Dict[int, str] = {}
    failed_diagnostics: List[Dict[str, Any]] = []

    for idx, tc in enumerate(test_cases):
        q_num = tc["id"]
        group = tc["group"]
        question = tc["question"]
        exp_kw = tc["expected_keywords"]
        exp_page = tc["expected_page"]

        history: List[Dict[str, str]] = []
        if group == "C":
            ref_id = tc["ref_q_id"]
            ref_q = next(t["question"] for t in test_cases if t["id"] == ref_id)
            ref_a = q_answers.get(ref_id, "")
            history = [
                {"role": "user", "content": ref_q},
                {"role": "assistant", "content": ref_a},
            ]

        print(f"[{q_num:02d}/15] (Group {group}) Asking: {question}")
        if history:
            print(f"       History: [User: \"{history[0]['content']}\" -> Assistant: \"{history[1]['content'][:50]}...\"]")

        ans, cited_pages, ttft, total_time, err = run_chat_query(
            client=client,
            session_id=session_id,
            question=question,
            history=history,
            is_in_process=is_in_process,
        )

        q_answers[q_num] = ans

        # Check for Gemini daily quota limit
        if err and ("RESOURCE_EXHAUSTED" in err or "quota" in err.lower() or "daily" in err.lower()):
            print("\n" + "!" * 80)
            print(f"CRITICAL: Quota / Daily Limit reached: {err}")
            print("Stopping test run immediately without retrying.")
            print("!" * 80)
            break

        # Pass / Fail evaluation
        passed = False
        fail_reasons: List[str] = []

        if err:
            passed = False
            fail_reasons.append(f"Error: {err}")
        elif group in ("A", "C"):
            # 1. Keywords check
            ans_lower = ans.lower()
            missing_kw = []
            for kw in exp_kw:
                kw_l = kw.lower()
                if kw_l == "dry":
                    # Handbook page 5 uses comparative 'drier' ("Rice that has been chilled in the fridge overnight is drier")
                    if "dry" not in ans_lower and "drier" not in ans_lower:
                        missing_kw.append(kw)
                elif kw_l not in ans_lower:
                    missing_kw.append(kw)
            if missing_kw:
                fail_reasons.append(f"Missing keyword(s): {', '.join(missing_kw)}")

            # 2. Page citation check
            if exp_page is not None:
                if exp_page not in cited_pages:
                    fail_reasons.append(f"Expected page {exp_page} not in cited {cited_pages}")

            passed = len(fail_reasons) == 0

        elif group == "B":
            # Off-topic refusal check
            ans_lower = ans.lower()
            if "couldn't find that in your documents" in ans_lower or "could not find that in your documents" in ans_lower:
                passed = True
            else:
                passed = False
                fail_reasons.append("Did not contain expected refusal message.")

        status_str = "PASS" if passed else "FAIL"
        print(f"       -> Result: {status_str} | TTFT: {ttft}ms | Total: {total_time}ms | Cited: {cited_pages}")
        if not passed:
            print(f"       -> Reason: {'; '.join(fail_reasons)}")
            print(f"       -> Answer: \"{ans[:120]}...\"")

            # Collect top-5 chunks diagnostics
            chunks = inspect_chunks_for_query(session_id, question, top_k=5)
            failed_diagnostics.append({
                "id": q_num,
                "question": question,
                "fail_reasons": fail_reasons,
                "answer": ans,
                "chunks": chunks,
            })

        results.append({
            "id": q_num,
            "group": group,
            "question": question,
            "answer": ans,
            "expected_page": exp_page,
            "cited_pages": cited_pages,
            "ttft": ttft or 0,
            "total_time": total_time or 0,
            "passed": passed,
            "fail_reasons": fail_reasons,
        })

        # Wait 6 seconds between requests to protect free-tier rate limits
        if idx < len(test_cases) - 1:
            time.sleep(6)

    # Compute summary metrics
    group_ac = [r for r in results if r["group"] in ("A", "C")]
    group_b = [r for r in results if r["group"] == "B"]

    correct_answers = sum(1 for r in group_ac if r["passed"])
    total_answers = len(group_ac)

    correct_refusals = sum(1 for r in group_b if r["passed"])
    total_refusals = len(group_b)

    avg_ttft = sum(r["ttft"] for r in results) / len(results) if results else 0
    avg_total = sum(r["total_time"] for r in results) / len(results) if results else 0

    # Print Terminal Table
    print("\n" + "=" * 105)
    print(f"{'#':<3} | {'Group':<5} | {'Question':<40} | {'Exp P':<6} | {'Cited P':<8} | {'TTFT':<7} | {'Total':<7} | {'Result':<6}")
    print("-" * 105)
    for r in results:
        q_short = (r["question"][:38] + "..") if len(r["question"]) > 40 else r["question"]
        exp_p = str(r["expected_page"]) if r["expected_page"] is not None else "-"
        cited_p = ",".join(str(p) for p in r["cited_pages"]) if r["cited_pages"] else "-"
        res_tag = "PASS" if r["passed"] else "FAIL"
        print(f"{r['id']:<3} | {r['group']:<5} | {q_short:<40} | {exp_p:<6} | {cited_p:<8} | {r['ttft']:>5}ms | {r['total_time']:>5}ms | {res_tag:<6}")
    print("=" * 105)

    print("\n" + "=" * 50)
    print("SUMMARY METRICS")
    print("=" * 50)
    print(f"Correct Answers:               {correct_answers} / {total_answers}")
    print(f"Correct Refusals:              {correct_refusals} / {total_refusals}")
    print(f"Average Time to First Token:   {avg_ttft:.1f} ms")
    print(f"Average Total Latency:         {avg_total:.1f} ms")
    print(f"Overall Accuracy:              {sum(1 for r in results if r['passed'])} / {len(results)} ({sum(1 for r in results if r['passed'])/len(results)*100:.1f}%)")
    print("=" * 50)

    # Print Failure Diagnostics if any
    if failed_diagnostics:
        print("\n" + "!" * 80)
        print("FAILURE DIAGNOSTICS & RETRIEVED CHUNKS")
        print("!" * 80)
        for fd in failed_diagnostics:
            print(f"\nQuestion {fd['id']}: \"{fd['question']}\"")
            print(f"Fail Reason: {', '.join(fd['fail_reasons'])}")
            print(f"Answer: {fd['answer']}")
            print("Top 5 Retrieved Chunks:")
            for i, c in enumerate(fd["chunks"], 1):
                sim = c.get("similarity", 0.0)
                p = c.get("page_number", "?")
                snippet = c.get("content", "").strip()[:100].replace("\n", " ")
                print(f"  {i}. [Page {p}] Similarity: {sim:.3f} | \"{snippet}...\"")

    # Generate Markdown Results File
    md_lines: List[str] = [
        "# RAG Quality Test Results (Phase 7)",
        "",
        f"**Date:** {time.strftime('%Y-%m-%d %H:%M:%S')}",
        f"**Session ID:** `{session_id}`",
        f"**Chat Model:** `{settings.gemini_chat_model}`",
        f"**Embedding Model:** `{settings.gemini_embed_model}`",
        f"**Similarity Threshold:** `{settings.similarity_threshold}`",
        f"**Top K:** `{settings.top_k}`",
        "",
        "## Summary Metrics",
        "",
        f"- **Correct Answers (Groups A & C):** {correct_answers} / {total_answers} ({correct_answers/total_answers*100:.1f}%)",
        f"- **Correct Refusals (Group B):** {correct_refusals} / {total_refusals} ({correct_refusals/total_refusals*100:.1f}%)",
        f"- **Overall Pass Rate:** {sum(1 for r in results if r['passed'])} / {len(results)} ({sum(1 for r in results if r['passed'])/len(results)*100:.1f}%)",
        f"- **Average Time to First Token:** {avg_ttft:.1f} ms",
        f"- **Average Total Latency:** {avg_total:.1f} ms",
        "",
        "## Detailed Results Table",
        "",
        "| # | Group | Question | Short Answer | Expected Page | Cited Pages | First Token | Total Time | Result |",
        "|---|---|---|---|---|---|---|---|---|",
    ]

    for r in results:
        clean_ans = r["answer"].replace("\n", " ").replace("|", "\\|")
        short_ans = (clean_ans[:70] + "…") if len(clean_ans) > 70 else clean_ans
        exp_p = str(r["expected_page"]) if r["expected_page"] is not None else "N/A"
        cited_p = ", ".join(f"p. {p}" for p in r["cited_pages"]) if r["cited_pages"] else "None"
        res_badge = "**PASS**" if r["passed"] else "**FAIL**"
        md_lines.append(
            f"| {r['id']} | {r['group']} | {r['question']} | {short_ans} | {exp_p} | {cited_p} | {r['ttft']} ms | {r['total_time']} ms | {res_badge} |"
        )

    if failed_diagnostics:
        md_lines.extend([
            "",
            "## Failure Diagnostics",
            "",
        ])
        for fd in failed_diagnostics:
            md_lines.extend([
                f"### Question {fd['id']}: {fd['question']}",
                f"- **Failure Reason:** {', '.join(fd['fail_reasons'])}",
                f"- **Full Answer:** {fd['answer']}",
                "- **Top Retrieved Chunks:**",
            ])
            for i, c in enumerate(fd["chunks"], 1):
                sim = c.get("similarity", 0.0)
                p = c.get("page_number", "?")
                snippet = c.get("content", "").strip()[:140].replace("\n", " ")
                md_lines.append(f"  {i}. **Page {p}** (similarity: `{sim:.3f}`): {snippet}…")
            md_lines.append("")

    RESULTS_FILE.write_text("\n".join(md_lines), encoding="utf-8")
    print(f"\nResults successfully written to: {RESULTS_FILE}")


if __name__ == "__main__":
    main()
