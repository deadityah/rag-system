# 02 — Design System

## 1. Look and feel

**Style:** Clean frosted-glass style (plain glassmorphism). Pure white background (`#ffffff`), calm, clean, premium.

- Background: **pure white (#ffffff)** with a soft, quiet cursor-repelling dot background.
- Panels: separate frosted glass cards directly over the dot background.
- Clean blur, soft shadows, thin light borders (`1px solid rgba(255, 255, 255, 0.85)`), no liquid glass, no gradient overlays, no inner specular highlights.
- Motion is smooth and quiet.

## 2. Reference files

| Feature | Reference file | Component |
|---|---|---|
| Repel dot background | `reference/repeleffect.md` | `components/background/DotBackground.tsx` |
| AI loading indicator | `reference/ailoading.md` | `components/chat/AiLoading.tsx` |
| Floating navigation pill | `reference/navbar.md` | `components/layout/NavBar.tsx` |

*(Note: `reference/liquidglass.md` is retired; all cards use clean frosted glassmorphism).*

## 3. Background Dots

- `DotBackground` is **fixed**, full screen, behind everything (`z-index: 0`, `pointer-events: none`).
- Dot color: `#000000` at `0.18` opacity (`rgba(0, 0, 0, 0.18)`).
- Dot radius: `1.5px` (diameter 3px).
- Dot spacing: `40px` (soft, light, quiet grid).
- Repel physics: dots smoothly move away from cursor and spring back into position.
- **Accessibility:** `prefers-reduced-motion` renders static dots (no animation).
- **Touch devices:** tracks touch moves smoothly.

## 4. Glass Design Tokens

```css
:root {
  /* Surfaces */
  --bg-page: #ffffff;            /* pure white page only */
  --glass-card: rgba(255, 255, 255, 0.28);
  --glass-card-text: rgba(255, 255, 255, 0.36);
  --glass-border: rgba(255, 255, 255, 0.85);
  --glass-ring: rgba(0, 0, 0, 0.05);
  --glass-shadow: 0 6px 24px rgba(30, 30, 50, 0.08);

  /* Text */
  --text-primary: #1f1f23;
  --text-secondary: #5b5b66;
  --text-muted: #71717a;

  /* Accents */
  --accent: #2b2b33;
  --accent-soft: rgba(43, 43, 51, 0.08);
  --danger: #c0392b;
  --success: #2f8f5b;

  /* Dots */
  --dot-color: #000000;
  --dot-opacity: 0.18;
  --dot-radius: 1.5px;
  --dot-spacing: 40px;
}
```

## 5. Typography

- **Logo**: `Playwrite Argentina` (`Playwrite_AR`).
- **Headings**: `Space Grotesk` (weights 500, 600, 700).
- **Main writing font** (body text, chat messages, buttons, inputs, labels, placeholders): `Titillium Web` (weights 400, 600, 700).
- Form elements inherit `font-family: inherit`.
- Chat answers: 15–16px, line height ≥ 1.6.

## 6. Layout

### Desktop (≥ 1024px)

```
┌──────────────────────────────────────────────────────────┐
│  [dot background fills whole screen behind cards]        │
│                                                          │
│              [ NavBar: New chat | Docs | How it works ]  │
│                                                          │
│  ┌────────────┐  ┌────────────────────────────────────┐  │
│  │  SIDEBAR   │  │   CHAT PANEL                       │  │
│  │  DocuMind  │  │   messages scroll here             │  │
│  │  logo card │  │                                    │  │
│  │  [Upload]  │  │   ┌──────────────────────────┐     │  │
│  │  Doc list  │  │   │  Ask a question…   [↑]   │     │  │
│  │  Session   │  │   └──────────────────────────┘     │  │
│  └────────────┘  └────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────┘
```

- **Top Bar**: Floating pill `NavBar` centered at top.
- **Sidebar**: ~350px wide, container has `p-4` padding on all sides so card borders/shadows never clip.
- **Chat Panel**: Fills remaining space with generous padding.
- **Question Box**: Single rounded glass card with no `overflow: hidden`, padding 16px, seamless transparent textarea.

### Mobile (< 1024px)

- Top bar with logo on left and compact `NavBar` pill on right.
- "Documents" button opens/closes sidebar drawer.
- Chat input respects safe area with ample padding.

## 7. Components

| Component | Description |
|---|---|
| `NavBar` | Floating pill navbar with 3 items: "New chat" (inline confirm), "Documents" (mobile toggle / desktop scroll), and "How it works" (4-step modal). |
| `GlassPanel` | Base frosted glass surface (`rgba(255,255,255,0.28)`, `blur(20px) saturate(140%)`, `border: 1px solid rgba(255,255,255,0.85)`). |
| `GlassButton` | Primary = dark fill (#2b2b33), white text. Secondary = glass. Hover: slight lift. |
| `GlassInput` | Seamless transparent textarea, hidden scrollbar, auto-grows up to 5 lines. |
| `UploadZone` | Glass card with drag-and-drop affordance, progress steps, and validation. |
| `DocumentList` | Separate glass card per file: PDF icon, filename, page count, inline delete confirm. |
| `MessageBubble` | **User:** right side. **Assistant:** left side, markdown rendered, copy button on hover. |
| `AiLoading` | Shimmering monochrome text cycling status messages (`reference/ailoading.md`) before the first token arrives. |

## 8. States (build all of them)

| Situation | What to show |
|---|---|
| No documents yet | Friendly empty state: "Upload a PDF to get started." Chat input is disabled. |
| Uploading | Steps: "Reading pages…" → "Understanding text…" → "Ready". |
| Upload failed | Red-tinted small message with reason (too big, not a PDF, too many pages). |
| Documents ready, no messages | Suggestion chips: "Summarize this document", "What are the key points?", "List important dates or numbers". |
| Waiting for first token | `AiLoading`. |
| Streaming | Text appears live. Auto-scroll to bottom unless user scrolled up. Show a "Stop" button. |
| Answer not found in docs | Normal message (not an error) saying the documents do not contain it. |
| Backend sleeping (cold start) | After 4 seconds of waiting, show: "Waking up the server, this can take up to a minute…" |
| Network or server error | Friendly message + "Try again" button. |

## 9. Motion

- Message appears: fade + 8px slide up, 200ms.
- Buttons: 150ms transitions.
- Panels entrance on load: fade + slight scale from 0.98, 400ms.
- Respect `prefers-reduced-motion` everywhere.

## 10. Accessibility checklist

- All buttons have `aria-label` where there is only an icon.
- Visible keyboard focus ring (soft dark outline / focus-visible ring).
- Chat messages container uses `aria-live="polite"`.
- Modals close on `Escape` key and backdrops.
- Color is never the only signal (use icons + text for errors).
