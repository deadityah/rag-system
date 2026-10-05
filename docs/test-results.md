# RAG Quality Test Results (Phase 7)

**Date:** 2026-10-05 12:23:41
**Session ID:** `1b03f152-17a9-4f79-abc3-9d93c42040e3`
**Chat Model:** `gemini-3.5-flash-lite`
**Embedding Model:** `gemini-embedding-001`
**Similarity Threshold:** `0.6`
**Top K:** `5`

## Summary Metrics

- **Correct Answers (Groups A & C):** 12 / 12 (100.0%)
- **Correct Refusals (Group B):** 3 / 3 (100.0%)
- **Overall Pass Rate:** 15 / 15 (100.0%)
- **Average Time to First Token:** 2754.1 ms
- **Average Total Latency:** 3059.3 ms

## Detailed Results Table

| # | Group | Question | Short Answer | Expected Page | Cited Pages | First Token | Total Time | Result |
|---|---|---|---|---|---|---|---|---|
| 1 | A | What temperature should chicken reach? | Chicken should reach an internal temperature of **165°F (74°C)** (home… | 2 | p. 2 | 3665 ms | 4064 ms | **PASS** |
| 2 | A | What is the danger zone for bacteria? | The danger zone is the temperature range where bacteria grow fastest (… | 2 | p. 2 | 2881 ms | 4046 ms | **PASS** |
| 3 | A | How long can cooked food stay out? | * Never leave cooked food out for more than **2 hours** (home_cooks_ha… | 2 | p. 2 | 2928 ms | 3105 ms | **PASS** |
| 4 | A | How much salt should I add to pasta water? | You should use about **1 tablespoon of salt for every 4 liters of wate… | 3 | p. 3 | 2994 ms | 3226 ms | **PASS** |
| 5 | A | How much spaghetti is in the tomato pasta recipe? | The tomato pasta recipe uses **400 g** of spaghetti or penne (home_coo… | 4 | p. 4 | 2534 ms | 2611 ms | **PASS** |
| 6 | A | How long do I simmer the tomato sauce? | You simmer the tomato sauce for **12 to 15 minutes** (home_cooks_handb… | 4 | p. 4 | 2429 ms | 2575 ms | **PASS** |
| 7 | A | Why is day-old rice best for fried rice? | * Freshly cooked rice is soft and sticky and will turn mushy in the pa… | 5 | p. 5 | 2772 ms | 3060 ms | **PASS** |
| 8 | A | How long can raw chicken pieces stay in the freezer? | Raw chicken pieces can stay in the freezer for **4 months** (home_cook… | 6 | p. 6 | 3459 ms | 4157 ms | **PASS** |
| 9 | A | How long do cooked rice and pasta last in the fridge? | Cooked rice and pasta last for **3 to 4 days** in the refrigerator (ho… | 6 | p. 6 | 2799 ms | 3552 ms | **PASS** |
| 10 | A | How many calories are in 1 gram of fat? | There are **9 calories** in 1 gram of fat (home_cooks_handbook.pdf, p.… | 7 | p. 7 | 2923 ms | 3309 ms | **PASS** |
| 11 | B | What is the capital of France? | I couldn't find that in your documents. Try rephrasing your question, … | N/A | None | 1162 ms | 1162 ms | **PASS** |
| 12 | B | What is the recipe for chocolate cake? | I couldn't find that in your documents. Try rephrasing your question, … | N/A | None | 1119 ms | 1119 ms | **PASS** |
| 13 | B | Who won the cricket world cup? | I couldn't find that in your documents. Try rephrasing your question, … | N/A | None | 1170 ms | 1170 ms | **PASS** |
| 14 | C | What about fish? | Fish and shellfish should reach an internal temperature of **145°F (63… | 2 | p. 2 | 4202 ms | 4342 ms | **PASS** |
| 15 | C | How long does the sauce take? | The crushed tomatoes, salt, pepper, and oregano should simmer for **12… | 4 | p. 4 | 4275 ms | 4392 ms | **PASS** |