# 05 — Frontend Spec (Next.js + TypeScript + Tailwind)

> Visual rules are in `02-DESIGN-SYSTEM.md`. This file covers behavior and logic.

## 1. Setup

- Next.js (App Router), TypeScript, Tailwind CSS, ESLint.
- Extra packages (keep the list small): `react-markdown` + `remark-gfm` (render answers), `lucide-react` (icons).
- Single page: `/` (`app/page.tsx`).
- Env: `NEXT_PUBLIC_API_URL`.

## 2. Types (`lib/types.ts`)

```ts
type DocumentInfo = {
  id: string;
  filename: string;
  page_count: number;
  chunk_count: number;
  status: "processing" | "ready" | "failed";
};

type Source = { filename: string; page: number; similarity: number; snippet: string };

type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  sources?: Source[];        // saved now, shown in a later upgrade
  status?: "streaming" | "done" | "error" | "stopped";
};
```

## 3. Session hook (`hooks/useSession.ts`)

- On first load: read `documind_session_id` from `localStorage`. If missing, create with `crypto.randomUUID()` and save.
- Return the id. Return `null` during server render (avoid hydration errors).
- `api.ts` adds `X-Session-Id` to every request.

## 4. API client (`lib/api.ts`)

Functions:
- `listDocuments()`
- `uploadDocument(file)`
- `deleteDocument(id)`
- `healthCheck()`

All throw an error with the backend's friendly `message` when the response is not OK. Show that message in the UI.

## 5. Streaming (`lib/sse.ts` + `hooks/useChat.ts`)

**Important:** the browser's `EventSource` only supports GET and cannot send headers. Our chat is a POST with a header. So use `fetch` and read the stream manually.

Logic for `sendMessage(question)`:
1. Add the user message to the list.
2. Add an empty assistant message with `status: "streaming"`.
3. Create an `AbortController` (needed for the Stop button).
4. `fetch(POST /api/chat)` with the question, last 6 messages as history, and optional document ids.
5. Read `response.body` with a `ReadableStream` reader and a `TextDecoder`.
6. Split the stream into SSE events (separated by a blank line). Handle events cut in half across reads — keep a buffer.
7. On `sources` → store on the message.
8. On `token` → append text to the assistant message content.
9. On `done` → set status `done`.
10. On `error` → set status `error`, show friendly text with "Try again".
11. Stop button → `abort()`, set status `stopped`, keep the text already shown.
12. Block sending a new question while one is streaming.

**Cold start handling:** if no first byte arrives within 4 seconds, set a flag `isWakingServer = true` so the UI shows the "Waking up the server…" note.

**Smooth typing:** tokens may arrive in bursts. Append them directly; do not add fake delays.

## 6. Components behavior

### `UploadZone`
- Click to choose or drag and drop. Accept only `.pdf`.
- Check client-side first (type, ≤10 MB) for instant feedback. The backend checks again.
- While uploading show steps (time-based text is fine: "Uploading…" → "Reading pages…" → "Understanding text…").
- Support one file at a time in v1 (simple). Disable the zone while uploading.
- At 5 documents: show "Limit reached" and disable.

### `DocumentList`
- Loads on start. Refresh after upload or delete.
- Delete: small confirm step (inline "Delete? Yes / No"), not a browser `confirm()`.
- Each item shows name, page count.

### `ChatWindow`
- Scrollable message list. Auto-scroll to the bottom as tokens arrive, **unless** the user scrolled up; then show a small "Jump to latest" glass button.
- Empty states and suggestion chips as in the design file.
- Clicking a chip sends that question.

### `MessageBubble`
- Assistant content rendered with `react-markdown`.
- Style citations like `(report.pdf, p. 4)` as small muted text (simple regex, optional).
- Copy button on assistant messages (appears on hover).
- Do not render raw HTML from the model (react-markdown default is safe; do not enable raw HTML).

### `ChatInput`
- Auto-growing textarea, max 1000 characters with a small counter near the limit.
- `Enter` = send, `Shift+Enter` = new line.
- While streaming, the send button becomes a Stop button.
- Disabled when there are no ready documents.

### `AiLoading`
- Cycles status messages with a shimmering gradient text effect (`reference/ailoading.md`) using site monochrome palette (black, dark gray, soft gray).
- Appears on the left side where the assistant answer will appear from the moment the user sends a question until the first answer text arrives.
- Hides when the first token arrives, when Stop is pressed, and on error. Never shows at any other time.

### `NavBar`
- Floating pill navigation bar at top center (`reference/navbar.md`).
- 3 items:
  1. "New chat": Stops ongoing generation and clears chat messages (prompts inline confirmation "Clear this chat? Yes / No").
  2. "Documents": On mobile, toggles sidebar drawer; on desktop, scrolls/focuses to upload area.
  3. "How it works": Opens a 4-step glass explanation modal (dismissible with button or Escape key).

## 7. Layout wiring (`app/page.tsx`)

- Render `DotBackground` once at the top (full screen, z-index 0).
- Top: Floating `NavBar` centered on desktop, compact on mobile with logo.
- Main columns: `Sidebar` + `ChatWindow` side by side with unclipped padding.
- Chat history lives in React state (resets on refresh). That is fine for v1.

## 8. Performance

- Mark `DotBackground`, `UploadZone`, `ChatWindow` as client components only where needed.
- Avoid re-rendering the whole message list on each token: keep message components memoized (`React.memo`) and update only the last message.
- Lazy-load `react-markdown` is not required; keep it simple.

## 9. Frontend tests (light)

- Unit test the SSE parser (handles split chunks, multiple events in one chunk).
- Manual test checklist is in `06-BUILD-PLAN.md`.
