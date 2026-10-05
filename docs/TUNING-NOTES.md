# 07 — RAG Tuning Notes & Evaluation Findings

This document records the empirical results, evaluation methodology, and tuning analysis conducted during Phase 7 over `home_cooks_handbook.pdf` (7 pages, 15 indexed chunks).

---

## 1. Baseline Configuration

- **Chat Model:** `gemini-3.5-flash-lite` (selected after `gemini-3.8-flash` hit the 20 requests/day free tier quota ceiling)
- **Embedding Model:** `gemini-embedding-001` (768-dimensional normalized vectors)
- **Similarity Threshold:** `0.60`
- **Top K Chunks (`top_k`):** `5`
- **Chunk Size / Overlap:** `800` characters / `120` character sliding window
- **Database:** Supabase PostgreSQL with `pgvector` (`match_chunks` RPC function)
- **Rate Limit Delay:** 6-second inter-question cooldown to protect free tier RPM

---

## 2. Test Run Comparison: Before vs After

| Metric | Run 1 (Strict Exact Substring) | Run 2 (Morphological Match) |
|---|---|---|
| **Group A (In-Document)** | 9 / 10 (90.0%) | 10 / 10 (100.0%) |
| **Group B (Off-Topic Refusals)** | 3 / 3 (100.0%) | 3 / 3 (100.0%) |
| **Group C (Follow-Up Questions)** | 2 / 2 (100.0%) | 2 / 2 (100.0%) |
| **Overall Accuracy** | **14 / 15 (93.3%)** | **15 / 15 (100.0%)** |
| **Average Time to First Token** | 2,614.8 ms | 2,754.1 ms |
| **Average Total Latency** | 2,730.1 ms | 3,059.3 ms |

---

## 3. Analysis & Tuning Findings

### A. Question 7 Analysis: "Why is day-old rice best for fried rice?"
- **Retrieved Chunks:**
  1. Chunk index 6 (Page 5, similarity: `0.679`)
  2. Chunk index 7 (Page 5, similarity: `0.622`)
- **Document Text (Page 5):**
  > *"Why Day-Old Rice Works Best: Freshly cooked rice is soft and sticky, so it turns mushy in the pan. Rice that has been chilled in the fridge overnight is **drier** and the grains stay separate."*
- **Model Answer:**
  > *"Freshly cooked rice is soft and sticky, which causes it to turn mushy in the pan (home_cooks_handbook.pdf, p. 5). Chilled overnight rice is **drier**, allowing the grains to stay separate (home_cooks_handbook.pdf, p. 5)."*
- **Diagnostic Finding:**
  The retrieval pipeline worked with 100% precision—Rank 1 chunk was the exact target section from Page 5, and the model faithfully quoted the comparative adjective *"drier"* from the text.
  In Run 1, an exact substring check for the lemma `"dry"` failed because `"dry"` is not a substring of `"drier"` (`y` inflected to `i`).
- **Tuning Action:**
  Adjusted the keyword evaluator to support the inflected form (`"dry"` or `"drier"`). No changes to `top_k` (5) or `similarity_threshold` (0.60) were required because the retrieval scores (`0.679` and `0.622`) were well above the 0.60 threshold.

### B. Similarity Threshold (0.60) Validation
- **Refusal Behavior (Group B):**
  - Question 11 (*"What is the capital of France?"*): Top similarity was below 0.60.
  - Question 12 (*"What is the recipe for chocolate cake?"*): Top similarity was below 0.60.
  - Question 13 (*"Who won the cricket world cup?"*): Top similarity was below 0.60.
- **Outcome:** All 3 questions cleanly hit the fast-path shortcut `if not chunks or best_similarity < settings.similarity_threshold: yield sse_event("token", {"text": NOT_FOUND_REPLY})`, bypassing LLM generation in ~1,150 ms with zero hallucination and zero wasted LLM tokens.
- **Conclusion:** The `similarity_threshold = 0.60` is optimal. Lowering it (e.g. to 0.50) would risk retrieving weakly related cooking chunks for off-topic questions, while raising it (e.g. to 0.70) would risk rejecting valid queries (such as Q5 with similarity `0.64`).

### C. Conversational History & Question Rewriting (Group C)
- **Question 14 (*"What about fish?"*):**
  Preceding Q1 was *"What temperature should chicken reach?"*.
  Backend rewrote the query into a standalone question (*"What safe internal temperature should fish reach?"*), successfully retrieving Page 2 chunks (internal temperature `145°F`, p. 2) and answering with the exact citation.
- **Question 15 (*"How long does the sauce take?"*):**
  Preceding Q5 was *"How much spaghetti is in the tomato pasta recipe?"*.
  Backend rewrote the query into standalone format (*"How long do you simmer the tomato sauce in the pasta recipe?"*), retrieving Page 4 chunks (simmer time `12 to 15 minutes`, p. 4) and citing Page 4.

---

## 4. Final Configuration Decision

| Parameter | Final Value | Reason |
|---|---|---|
| `gemini_chat_model` | `gemini-3.5-flash-lite` | High speed (~2.7s TTFT), reliable citation adherence, available free-tier quota |
| `gemini_embed_model` | `gemini-embedding-001` | High semantic separation between relevant recipes and general knowledge |
| `embed_dimensions` | `768` | Matches Gemini embedding model dimensionality with unit L2 normalization |
| `similarity_threshold` | `0.60` | Perfect discrimination: 100% on-topic recall, 100% off-topic rejection |
| `top_k` | `5` | Provides sufficient context coverage without exceeding model context window |
