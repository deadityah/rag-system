# 06 — Build Plan (Phases)

> **Rule for the agent:** build ONE phase, then stop. Report: what was built, how to run it, and the checklist to test. Wait for the owner to say "next".

---

## Phase 1 — Project setup

**Build**
- Create the folder structure from `01-ARCHITECTURE.md`.
- Backend: virtual environment, `requirements.txt`, FastAPI app with `/api/health`, CORS, `config.py` reading env vars, `.env.example`.
- Frontend: Next.js app, Tailwind, Inter font, `.env.example`.
- Root `.gitignore` (ignore `.env`, `node_modules`, `.venv`, `__pycache__`, `.next`).

**Done when**
- [ ] `uvicorn` starts and `http://localhost:8000/api/health` returns `{"status":"ok"}`
- [ ] `npm run dev` opens `http://localhost:3000`
- [ ] No real keys in any committed file

---

## Phase 2 — UI shell (no backend yet)

**Build**
- Read `reference/liquidglass.md` and `reference/repeleffect.md` first.
- `DotBackground`, `GlassPanel`, `GlassButton`, `GlassInput`.
- Layout: sidebar + chat panel (desktop), drawer (mobile).
- Use **fake data** for documents and messages so every state in the design file can be seen.

**Done when**
- [ ] Dots move away from the cursor and ease back smoothly
- [ ] Glass panels look like the reference (blur, highlights)
- [ ] Fallback glass works in a non-Chromium browser (or looks acceptable)
- [ ] Mobile layout works at 390px width
- [ ] Reduced-motion setting turns off the dot movement
- [ ] Page stays smooth (no lag) while moving the mouse

---

## Phase 3 — Database

**Build**
- `backend/supabase/schema.sql` exactly as in `04-BACKEND-SPEC.md`.
- Supabase client in `vector_store.py` (functions can be simple for now).
- A small script `backend/scripts/check_db.py` that inserts one fake vector, searches for it, then deletes it.

**Done when**
- [ ] Owner ran the SQL with no errors
- [ ] `check_db.py` prints "DB OK"

---

## Phase 4 — Upload pipeline

**Build**
- `pdf_parser`, `chunker`, `embeddings`, `vector_store` insert.
- Endpoints: `POST /api/documents`, `GET /api/documents`, `DELETE /api/documents/{id}`.
- Validation and limits from `01-ARCHITECTURE.md`.
- `pytest` tests for chunker and parser.

**Done when**
- [ ] Uploading a normal PDF returns `ready` with sensible page and chunk counts
- [ ] Rows appear in Supabase `documents` and `chunks`
- [ ] A `.txt` file renamed to `.pdf` is rejected
- [ ] A scanned/image PDF gives the friendly error
- [ ] Deleting removes chunks too
- [ ] `pytest` passes

---

## Phase 5 — Chat pipeline (backend)

**Build**
- `prompts.py` (exact text from `03-PROMPTS.md`), `llm.py`, `rag.py`, `POST /api/chat` with SSE.
- Rate limiting.
- A script `backend/scripts/ask.py "question"` to test from the terminal.

**Done when**
- [ ] Terminal test streams an answer with citations like `(file.pdf, p. 3)`
- [ ] An unrelated question ("who won the world cup?") gets the "couldn't find" reply
- [ ] The first `sources` event arrives before tokens
- [ ] The `done` event has timings
- [ ] After 30 questions in an hour, the limit message appears

---

## Phase 6 — Connect frontend to backend

**Build**
- `useSession`, `api.ts`, `sse.ts`, `useDocuments`, `useChat`.
- Replace fake data with real data.
- All states from the design file: upload steps, errors, streaming, stop, jump-to-latest, cold-start note.

**Done when**
- [ ] Upload a PDF in the UI → appears in the list
- [ ] Ask a question → answer types out live
- [ ] Stop button works and keeps partial text
- [ ] Follow-up question ("explain that more simply") works using history
- [ ] Refreshing the page keeps documents (same session) but clears chat
- [ ] Errors show friendly messages, never raw errors
- [ ] SSE parser tests pass

---

## Phase 7 — Quality check

**Build**
- Create `docs/test-set.md` with **15 questions** based on a sample PDF the owner chooses: 10 questions with known answers (and the page where the answer is), 3 questions whose answers are NOT in the PDF, 2 follow-up questions.
- Create `backend/scripts/run_test_set.py` that runs all 15 and prints a table: question, answer, expected page, cited pages, pass/fail guess, time.
- Tune `top_k`, chunk size, and the similarity threshold using the results. Record the final values and the reason.

**Done when**
- [ ] The table prints
- [ ] Owner can state a real number, for example "answers 12 of 13 questions correctly, refuses 3 of 3 off-topic"
- [ ] Settings changes are written in `docs/TUNING-NOTES.md`

> This test set will be reused later in Project 4 (EvalLab).

---

## Phase 8 — Deploy

**Build**
- Backend `Dockerfile` (see spec). Deploy to Render as a Web Service.
- Frontend deploy to Vercel (root directory: `frontend`).
- Set env vars on both. Set `ALLOWED_ORIGINS` to the Vercel URL. Set `NEXT_PUBLIC_API_URL` to the Render URL.
- Add a note on cold starts (free Render sleeps after inactivity).

**Done when**
- [ ] Live Vercel link works end to end
- [ ] CORS errors are gone
- [ ] No secret keys visible in the browser's network tab or page source

---

## Phase 9 — Portfolio polish

**Build**
- Move the setup `README.md` to `docs/SETUP-GUIDE.md`.
- Write a new public `README.md`: one-line pitch, screenshot/GIF, live link, features, tech stack table, architecture diagram (Mermaid), how RAG works in simple words, the quality numbers from Phase 7, limits and honest notes (anonymous sessions are not real security, free-tier cold starts, text PDFs only), "What I learned", "Next steps".
- Add an MIT license.

**Done when**
- [ ] A stranger can understand the project in 30 seconds from the README

---

## Phase 10 — Optional upgrades (only if the owner asks)

1. Source cards with page and quote in the UI (data is already sent by `sources` event)
2. Login with Supabase Auth + real per-user storage
3. Cost and speed tracker
4. Scanned PDF support (OCR)
5. Hybrid search (keyword + vector) and re-ranking
6. Docx / web page upload
