# 00 — START HERE (Master Instructions for the AI Coding Agent)

> **Reader:** the AI coding agent (Antigravity). Read this file first. Then read every file listed below **before writing any code**.

## 1. What we are building

**DocuMind** is a RAG (Retrieval-Augmented Generation) web app.

- A user uploads PDF files.
- The user asks questions in a chat.
- The AI answers **only from the uploaded documents**.
- Answers **stream** word by word (typing effect).
- Every answer names the file and page it came from.

This is a portfolio project. Code quality, clear structure, and clear comments matter. The owner must be able to **explain every part in a job interview**, so keep the code simple and readable. No clever tricks.

## 2. Files to read (in this order)

| # | File | What it contains |
|---|---|---|
| 1 | `docs/01-ARCHITECTURE.md` | Tech stack, folder structure, data flow |
| 2 | `docs/02-DESIGN-SYSTEM.md` | UI rules (glassmorphism + dot background) |
| 3 | `docs/03-PROMPTS.md` | All AI prompts and AI settings |
| 4 | `docs/04-BACKEND-SPEC.md` | API endpoints, database, RAG pipeline |
| 5 | `docs/05-FRONTEND-SPEC.md` | Pages, components, streaming logic |
| 6 | `docs/06-BUILD-PLAN.md` | Phases. Build **one phase at a time** |
| 7 | `reference/liquidglass.md` | Owner's code for the liquid glass effect |
| 8 | `reference/repeleffect.md` | Owner's code for the cursor-repel dot background |

## 3. Rules you must follow

1. **Build one phase at a time** from `06-BUILD-PLAN.md`. After each phase, stop and wait for the owner to say "next".
2. **Do not invent a different stack.** Use the stack in `01-ARCHITECTURE.md`.
3. **Never put API keys in code.** Use `.env` files. Commit only `.env.example`.
4. **Never call Gemini or Supabase service keys from the frontend.** Only the backend does.
5. **Reuse the owner's reference code** (`liquidglass.md`, `repeleffect.md`). Do not rewrite these effects from scratch. Wrap them in reusable components (see design file).
6. **Add short comments** that explain *why*, not just *what*, in the RAG pipeline files.
7. **Handle errors.** Show friendly messages in the UI. Never show raw stack traces.
8. **After each phase, give the owner:** (a) what you built, (b) how to run it, (c) a checklist of things to test by hand.
9. If something in these docs is unclear or conflicts, **ask the owner**. Do not guess silently.
10. Keep the code in **TypeScript** (frontend) and **Python 3.11+** (backend). Use type hints in Python.

## 4. Version 1 scope

**In scope**
- PDF upload (text-based PDFs)
- Document list with delete
- Chat with streaming answers
- Inline citations in the answer text: `(filename, p. 3)`
- Glass UI + animated dot background
- Anonymous per-browser sessions (no login)
- Deployment: frontend on Vercel, backend on Render

**Out of scope for v1 (do NOT build unless asked)**
- User login / accounts
- Source cards with highlighted quotes in the UI
- Cost and speed dashboard
- OCR for scanned PDFs
- Word, PowerPoint, or web page upload

The backend **does** send source data with every answer, so these can be added later without changing the API.
