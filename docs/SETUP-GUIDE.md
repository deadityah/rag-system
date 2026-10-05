# DocuMind — Your Step-by-Step Guide

This guide is for **you**. Follow the steps in order. Tick each box when done.
Do not skip the "Check" parts. They save you time later.

**Time needed:** about 2–4 days, with a few hours per day.

---

## What you are building

A website where you upload a PDF and chat with it. The AI answers only from your PDF and tells you the page. Answers appear live, like typing.

**Your stack:** Next.js (frontend) + Python FastAPI (backend) + Supabase (database) + Gemini (AI).

---

## Step 0 — Put the kit in the right place

- [ ] Make a folder on your computer called `documind`.
- [ ] Copy everything from this kit into it. You should see:
  ```
  documind/
  ├── README.md
  ├── docs/        (7 files, 00 to 06)
  └── reference/   (empty for now)
  ```
- [ ] Put your two files inside `reference/`:
  - `liquidglass.md`
  - `repeleffect.md`

**Check:** the `reference` folder has exactly these 2 files. Without them, the design will not match your style.

---

## Step 1 — Install the tools

- [ ] **Node.js** version 20 or newer → https://nodejs.org
- [ ] **Python** version 3.11 or newer → https://python.org
- [ ] **Git** → https://git-scm.com
- [ ] **Antigravity** (you already have it)

**Check** (open a terminal and type each one):
```
node -v
python --version
git --version
```
Each one should print a version number. (On some computers, use `python3 --version`.)

---

## Step 2 — Make your free accounts

- [ ] **GitHub** → https://github.com (to save your code)
- [ ] **Google AI Studio** → https://aistudio.google.com (Gemini key)
- [ ] **Supabase** → https://supabase.com (database)
- [ ] **Vercel** → https://vercel.com (frontend hosting; sign in with GitHub)
- [ ] **Render** → https://render.com (backend hosting; sign in with GitHub)

---

## Step 3 — Get your Gemini API key

- [ ] Go to Google AI Studio → **Get API key** → create a key.
- [ ] Copy it and save it in a safe note for now.

**Rules for keys:**
- Never post a key in a chat, screenshot, or on GitHub.
- If a key leaks, delete it and make a new one.

---

## Step 4 — Set up Supabase (database)

- [ ] Click **New project**. Name it `documind`. Choose a strong database password and save it. Pick the region closest to you.
- [ ] Wait until the project is ready (1–2 minutes).
- [ ] Go to **Project Settings → API**. Copy these two values:
  - **Project URL** → this is `SUPABASE_URL`
  - **service_role key** → this is `SUPABASE_SERVICE_KEY` (secret! backend only!)

> Do **not** use the `anon` key. Do **not** put the service key in the frontend.

The SQL setup comes later, in Phase 3. The agent will create the file for you.

---

## Step 5 — Open the project in Antigravity

- [ ] Open the `documind` folder in Antigravity.
- [ ] Paste this as your **first message**:

```
Read docs/00-START-HERE.md first. Then read every file it lists, including the two files in the reference folder. Do not write any code yet.

When you finish reading, tell me in 5 short bullet points what you understood, and ask me any questions you have. Then wait.
```

**Check:** the agent should list: RAG app, Next.js + FastAPI, Gemini, Supabase pgvector, glass UI, build one phase at a time. If it misses something big, tell it to re-read that file.

---

## Step 6 — Build phase by phase

For each phase, paste the message, wait, then do the **Check** list. Only say "next" when all checks pass.

### Phase 1 — Project setup
- [ ] Paste: `Start Phase 1 from docs/06-BUILD-PLAN.md. Stop when done.`
- [ ] Make your env files. In `backend/`, copy `.env.example` to `.env` and fill in:
  - `GEMINI_API_KEY`
  - `SUPABASE_URL`
  - `SUPABASE_SERVICE_KEY`
- [ ] In `frontend/`, copy `.env.example` to `.env.local`.

**Check:**
- [ ] `http://localhost:8000/api/health` shows `{"status":"ok"}`
- [ ] `http://localhost:3000` opens a page
- [ ] `.env` is listed in `.gitignore`

### Phase 2 — The design
- [ ] Paste: `Start Phase 2. Use my reference files for the glass and dot effects. Use fake data for now.`

**Check:**
- [ ] Dots move away from your mouse
- [ ] Panels look like glass
- [ ] Resize the browser to phone size. It still looks good
- [ ] If something looks different from your reference files, say exactly what is different and ask for a fix

### Phase 3 — Database
- [ ] Paste: `Start Phase 3.`
- [ ] Open Supabase → **SQL Editor** → **New query**.
- [ ] Copy everything from `backend/supabase/schema.sql` and paste it. Click **Run**.
- [ ] Run the agent's `check_db.py` script.

**Check:**
- [ ] Supabase **Table Editor** shows two tables: `documents` and `chunks`
- [ ] The script prints "DB OK"

### Phase 4 — Upload a PDF
- [ ] Paste: `Start Phase 4.`

**Check (test with real files):**
- [ ] A normal PDF uploads and shows pages and chunks
- [ ] Look in Supabase Table Editor. You see rows in both tables
- [ ] Rename a `.txt` file to `.pdf` and upload it. It is rejected
- [ ] Delete the document. The rows disappear

### Phase 5 — Chat (backend)
- [ ] Paste: `Start Phase 5.`

**Check:**
- [ ] The terminal test prints a streamed answer
- [ ] The answer has citations like `(file.pdf, p. 3)`
- [ ] Ask something not in the PDF. You get "I couldn't find that in your documents."

### Phase 6 — Connect it all
- [ ] Paste: `Start Phase 6.`

**Check:**
- [ ] Upload a PDF in the website
- [ ] Ask a question. The answer types live
- [ ] Press **Stop** during an answer. It stops
- [ ] Ask a follow-up like "explain that simply". It understands
- [ ] Turn off the backend. The website shows a friendly error

### Phase 7 — Measure quality (very important for interviews)
- [ ] Choose **one PDF** you know well (a report, a book chapter, a manual).
- [ ] Paste: `Start Phase 7. I will use this PDF: <name>. Write the 15 test questions and the test script.`
- [ ] Read the questions. Check the "expected answers" are really right. Fix wrong ones.

**Check:**
- [ ] You can say a real number, like "12 out of 13 correct"
- [ ] `docs/TUNING-NOTES.md` exists

### Phase 8 — Put it online
- [ ] Push the code to GitHub (ask the agent: `Help me push this to a new GitHub repo. Make sure .env files are not included.`).
- [ ] **Backend on Render:** New → Web Service → connect repo → root directory `backend` → runtime Docker. Add the 3 secret values and `ALLOWED_ORIGINS`.
- [ ] **Frontend on Vercel:** New Project → connect repo → root directory `frontend`. Add `NEXT_PUBLIC_API_URL` = your Render URL.
- [ ] Go back to Render. Set `ALLOWED_ORIGINS` = your Vercel URL. Redeploy.

**Check:**
- [ ] Open the Vercel link on your phone. Upload and chat work
- [ ] Open browser DevTools → Network. You do not see any secret key
- [ ] First load is slow? That is normal on Render's free plan (it sleeps). The app shows a "waking up" message

### Phase 9 — Portfolio polish
- [ ] Paste: `Start Phase 9.`
- [ ] Take 2–3 good screenshots.
- [ ] Record a 1–2 minute video: upload → ask → live answer → page citation → "not found" example.
- [ ] Put the live link, video, and GitHub link on your portfolio site and LinkedIn.

---

## Step 7 — Final check before you call it done

- [ ] Live link works for a stranger (ask a friend to try)
- [ ] README has: picture, live link, how it works, quality numbers, honest limits
- [ ] No keys anywhere in GitHub (search the repo for `AIza` and `service_role`)
- [ ] You can answer the interview questions below out loud

---

## Interview questions you must be able to answer

Practice saying these in simple English.

1. **What is RAG and why use it instead of just asking the AI?**
   The AI does not know your private files. RAG finds the right parts of your file first. Then the AI answers from those parts. This lowers made-up answers.
2. **What is an embedding?**
   A list of numbers that shows the meaning of a text. Similar meanings have similar numbers.
3. **Why do you split documents into chunks?**
   Small pieces are easier to match to a question. They also save cost and keep the AI focused.
4. **Why 800 characters and 120 overlap? What happens if chunks are too big or too small?**
   Use your Phase 7 notes to answer with real results.
5. **What is cosine similarity?**
   A score that tells how close two meanings are.
6. **How do you stop the AI from making things up?**
   Strict prompt, low temperature, a similarity limit, and required citations.
7. **What is prompt injection?**
   Text in a document that tries to give the AI new orders. Our prompt treats documents as data, not orders.
8. **Why stream the answer?**
   The user sees words at once, so it feels fast.
9. **Why is your session system not real security?**
   Anyone with the session id can see those files. Real login is the fix.
10. **How did you test quality? What number did you get?**
    Use your Phase 7 result.

---

## If something breaks

1. Copy the **exact error message**.
2. Tell the agent: what you did, what you expected, what happened, and paste the error.
3. Common problems:
   - **CORS error** → `ALLOWED_ORIGINS` is wrong or missing the exact URL.
   - **Gemini 429 error** → free limit reached. Wait a minute.
   - **Gemini model not found** → the model name is old. Open AI Studio, copy a current model name, and update `GEMINI_CHAT_MODEL` in `.env`.
   - **Python packages missing** → activate the virtual environment first.
   - **Answers are bad** → go back to Phase 7 and tune settings.

---

## What comes next

After DocuMind, we start **Project 2: ResearchPilot** (AI agents). Save your Phase 7 test set. We will reuse it in Project 4 (EvalLab).
