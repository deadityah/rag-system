# 07 — RAG Quality Test Set

This test suite evaluates DocuMind's RAG pipeline against `home_cooks_handbook.pdf` (7 pages, 15 indexed chunks).

It contains **15 standardized questions** across three categories:
- **Group A (10 questions):** Factual questions with definitive answers grounded in specific pages of the document.
- **Group B (3 questions):** Off-topic questions not present in the document to verify hallucination refusal behavior.
- **Group C (2 questions):** Conversational follow-up questions that require multi-turn context rewriting using chat history.

---

## Test Set Definition Table

| # | Group | Question | Preceding Context (Chat History) | Expected Keyword(s) | Expected Page | Evaluation Rule |
|---|---|---|---|---|---|---|
| **1** | A | What temperature should chicken reach? | None | `"165"` | Page 2 | PASS if answer contains `"165"` and cites Page 2 |
| **2** | A | What is the danger zone for bacteria? | None | `"40"` AND `"140"` | Page 2 | PASS if answer contains `"40"` and `"140"` and cites Page 2 |
| **3** | A | How long can cooked food stay out? | None | `"2 hours"` | Page 2 | PASS if answer contains `"2 hours"` and cites Page 2 |
| **4** | A | How much salt should I add to pasta water? | None | `"1 tablespoon"` | Page 3 | PASS if answer contains `"1 tablespoon"` and cites Page 3 |
| **5** | A | How much spaghetti is in the tomato pasta recipe? | None | `"400"` | Page 4 | PASS if answer contains `"400"` and cites Page 4 |
| **6** | A | How long do I simmer the tomato sauce? | None | `"12"` AND `"15"` | Page 4 | PASS if answer contains `"12"` and `"15"` and cites Page 4 |
| **7** | A | Why is day-old rice best for fried rice? | None | `"dry"` | Page 5 | PASS if answer contains `"dry"` and cites Page 5 |
| **8** | A | How long can raw chicken pieces stay in the freezer? | None | `"4 months"` | Page 6 | PASS if answer contains `"4 months"` and cites Page 6 |
| **9** | A | How long do cooked rice and pasta last in the fridge? | None | `"3 to 4 days"` | Page 6 | PASS if answer contains `"3 to 4 days"` and cites Page 6 |
| **10** | A | How many calories are in 1 gram of fat? | None | `"9"` | Page 7 | PASS if answer contains `"9"` and cites Page 7 |
| **11** | B | What is the capital of France? | None | `"couldn't find that in your documents"` | N/A | PASS if answer refuses politely without outside hallucination |
| **12** | B | What is the recipe for chocolate cake? | None | `"couldn't find that in your documents"` | N/A | PASS if answer refuses politely without outside hallucination |
| **13** | B | Who won the cricket world cup? | None | `"couldn't find that in your documents"` | N/A | PASS if answer refuses politely without outside hallucination |
| **14** | C | What about fish? | User: "What temperature should chicken reach?"<br>Assistant: [Answer to Q1] | `"145"` | Page 2 | PASS if answer contains `"145"` and cites Page 2 |
| **15** | C | How long does the sauce take? | User: "How much spaghetti is in the tomato pasta recipe?"<br>Assistant: [Answer to Q5] | `"12"` | Page 4 | PASS if answer contains `"12"` and cites Page 4 |

---

## Pass / Fail Criteria

1. **Groups A & C (Factual & Follow-ups):**
   - **Keyword Match:** The answer must include the required target phrase/numbers (case-insensitive).
   - **Page Citation:** The answer must explicitly cite the expected page number (e.g., `p. 2`, `page 2`).

2. **Group B (Off-Topic Refusals):**
   - **Refusal Match:** The response must state that the information was not found in the documents (containing `"couldn't find that in your documents"`). Outside hallucinations are strictly considered a FAIL.
