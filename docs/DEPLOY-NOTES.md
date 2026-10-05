# Deployment Notes & Environment Variables

This document outlines the required configuration and environment variables for deploying DocuMind: backend on **Render** (Web Service via Docker) and frontend on **Vercel** (Next.js).

---

## 1. Backend on Render (Web Service)

### Service Configuration
- **Runtime:** Docker
- **Root Directory:** `backend`
- **Dockerfile Path:** `Dockerfile` (or `./Dockerfile` relative to root directory `backend`)
- **Health Check Path:** `/api/health`
- **Instance Type:** Free or Starter

### Environment Variables for Render

| Variable | Explanation (1-line) | Example / Default |
|---|---|---|
| `PORT` | Port the uvicorn web server listens on inside the container (assigned dynamically by Render). | `10000` |
| `GEMINI_API_KEY` | Secret API key from Google AI Studio used for chat answering and vector embeddings. | *(Secret)* |
| `GEMINI_CHAT_MODEL` | Gemini chat model used for query rewriting and response generation. | `gemini-3.7-flash` |
| `GEMINI_EMBED_MODEL` | Gemini model used to generate 768-dimensional document and query embeddings. | `gemini-embedding-001` |
| `EMBED_DIMENSIONS` | Output vector dimension matching the Supabase pgvector column schema. | `768` |
| `SIMILARITY_THRESHOLD` | Minimum cosine similarity required to accept a document excerpt as relevant. | `0.60` |
| `TOP_K` | Maximum number of top matching document chunks retrieved per user question. | `5` |
| `SUPABASE_URL` | HTTPS project URL for your Supabase PostgreSQL database instance. | `https://xxxx.supabase.co` |
| `SUPABASE_SERVICE_KEY` | Supabase `service_role` secret key allowing backend vector store read/write access. | *(Secret)* |
| `ALLOWED_ORIGINS` | Comma-separated list of allowed frontend origins for CORS (include local dev and Vercel URL). | `http://localhost:3000,https://your-documind.vercel.app` |
| `GEMINI_DAILY_LIMIT` | Maximum Gemini chat requests permitted per day to safeguard demo API quota. | `100` |
| `EMBED_DAILY_LIMIT` | Maximum Gemini embedding API calls permitted per day to safeguard demo API quota. | `500` |

---

## 2. Frontend on Vercel (Next.js)

### Project Configuration
- **Framework Preset:** Next.js
- **Root Directory:** `frontend`
- **Build Command:** `next build` (default)
- **Output Directory:** `.next` (default)

### Environment Variables for Vercel

| Variable | Explanation (1-line) | Example / Default |
|---|---|---|
| `NEXT_PUBLIC_API_URL` | Public HTTPS base URL of your deployed Render backend service (without trailing slash). | `https://your-documind-api.onrender.com` |
| `NODE_ENV` | Automatically set by Vercel to `production` to optimize bundles and hide the dev-only State Preview bar. | `production` |

---

## 3. Important Deployment Notes

### Cold Starts on Free Tier
Render free instances spin down after 15 minutes of inactivity. When a request arrives, spinning back up may take 30 to 60 seconds.
- DocuMind includes an automatic waking indicator ("Waking up the server, this can take up to a minute…") that appears if a response takes longer than 4 seconds.
- The health check endpoint `/api/health` can also be used by external uptime monitors (e.g. UptimeRobot or Cron-job.org) to keep the instance warm if desired.

### Daily AI Quota Protection
- The backend tracks daily usage of Gemini chat generation and embeddings in-memory.
- When `GEMINI_DAILY_LIMIT` or `EMBED_DAILY_LIMIT` is reached, Gemini is **not** called, and users receive a friendly notice:
  > *"This demo has reached its daily AI limit. Please try again tomorrow."*
- Counters reset automatically at midnight UTC. Production setups would back this with Redis or a database.

### CORS Verification
Once your Vercel URL is live (e.g. `https://documind-portfolio.vercel.app`), add it to `ALLOWED_ORIGINS` in your Render Environment dashboard, separated by a comma (e.g. `http://localhost:3000,https://documind-portfolio.vercel.app`).
