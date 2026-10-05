# 02 — Design System

## 1. Look and feel

**Style:** Glassmorphism with a liquid-glass feel. Bright, calm, clean, premium.

- Colors: **white and off-white only**, with soft gray text. No bright brand colors.
- Panels look like frosted glass floating over an animated dot background.
- Slight blur, soft shadows, thin light borders, gentle highlights.
- Motion is smooth and quiet. Nothing flashy.

## 2. The two reference files (MOST IMPORTANT)

The owner provided real code for the two signature effects. **Use that code.**

| Effect | Reference file | Wrap it as |
|---|---|---|
| Liquid glass panels | `reference/liquidglass.md` | `components/ui/GlassPanel.tsx` + glass CSS in `globals.css` |
| Cursor-repelling dot background | `reference/repeleffect.md` | `components/background/DotBackground.tsx` |

**Instructions**
1. Read both files fully before coding any UI.
2. Keep the original logic and visual result. Only adapt it to React/Next.js/TypeScript (for example: `useEffect` for canvas setup and cleanup, `"use client"` at the top).
3. If the reference code is plain HTML/CSS/JS, convert it. Do not change how it looks or feels.
4. If the liquid glass code uses SVG filters (for example `feTurbulence` / `feDisplacementMap`), put the filter definition once in `layout.tsx` and reuse it. Note: SVG-filter glass works best in Chromium browsers. Add a **fallback** (plain `backdrop-filter: blur()` glass) for Safari/Firefox.
5. Every glass surface in the app must use `GlassPanel` (or the same CSS class). Do not make one-off glass styles.

## 3. Background

- `DotBackground` is **fixed**, full screen, behind everything (`z-index: 0`, `pointer-events: none` on the wrapper, but it listens to mouse movement on `window`).
- Dots are a soft gray on an off-white page.
- Dots move away from the cursor and ease back.
- **Performance:** use `requestAnimationFrame`, handle window resize, clean up on unmount, cap device pixel ratio at 2.
- **Accessibility:** if `prefers-reduced-motion` is on, show static dots (no repel animation).
- **Touch devices:** use touch position if the reference supports it. If not, show static dots.

## 4. Design tokens (put in `globals.css` as CSS variables)

```css
:root {
  /* Surfaces */
  --bg-base: #faf9f7;            /* off-white page */
  --bg-soft: #f3f1ed;
  --glass-fill: rgba(255, 255, 255, 0.45);
  --glass-fill-strong: rgba(255, 255, 255, 0.70);
  --glass-border: rgba(255, 255, 255, 0.70);
  --glass-border-dim: rgba(0, 0, 0, 0.06);
  --glass-blur: 18px;
  --glass-shadow: 0 8px 32px rgba(40, 40, 60, 0.08);

  /* Text */
  --text-primary: #1f1f23;
  --text-secondary: #5b5b66;
  --text-muted: #8c8c97;

  /* Accents (very subtle) */
  --accent: #2b2b33;             /* near-black for buttons */
  --accent-soft: rgba(43, 43, 51, 0.08);
  --danger: #c0392b;
  --success: #2f8f5b;

  /* Dots */
  --dot-color: rgba(120, 120, 135, 0.35);

  /* Shape */
  --radius-lg: 24px;
  --radius-md: 16px;
  --radius-sm: 10px;
}
```

The tokens above are defaults. If `liquidglass.md` uses different values, **the reference file wins**.

## 5. Typography

- Font: **Inter** (via `next/font`). Fallback: system sans-serif.
- Headings: weight 600, tight letter spacing.
- Body: 15–16px, line height 1.6.
- Chat answers: 15px, line height 1.65, max width ~70 characters per line for easy reading.
- Text on glass must always be dark (`--text-primary`) for contrast. Keep contrast ratio at least 4.5:1.

## 6. Layout

### Desktop (≥ 1024px)

```
┌──────────────────────────────────────────────────────────┐
│  [dot background fills the whole screen]                 │
│                                                          │
│  ┌────────────┐  ┌────────────────────────────────────┐  │
│  │  SIDEBAR   │  │   CHAT PANEL                       │  │
│  │  (glass)   │  │   (glass)                          │  │
│  │            │  │                                    │  │
│  │  DocuMind  │  │   messages scroll here             │  │
│  │  logo      │  │                                    │  │
│  │            │  │                                    │  │
│  │  [Upload]  │  │                                    │  │
│  │  Doc list  │  │   ┌──────────────────────────┐     │  │
│  │            │  │   │  Ask a question…   [↑]   │     │  │
│  └────────────┘  └───┴──────────────────────────┴─────┘  │
└──────────────────────────────────────────────────────────┘
```

- Sidebar: ~320px wide. Chat panel: fills the rest. 24px gap and 24px outer margin.
- Both panels are full height (`100dvh` minus margins).

### Mobile (< 1024px)

- Chat panel is full screen.
- Sidebar becomes a slide-in glass drawer, opened by a "Documents" button in the top bar.
- Chat input sticks to the bottom and respects the safe area (`env(safe-area-inset-bottom)`).

## 7. Components

| Component | Description |
|---|---|
| `GlassPanel` | Base glass surface. Props: `className`, `strong?` (more opaque), `children`. |
| `GlassButton` | Pill or rounded button. Primary = dark fill, white text. Secondary = glass. Hover: slight lift. Disabled: 50% opacity. |
| `GlassInput` | Text area with glass look. Auto-grows to 5 lines. `Enter` sends, `Shift+Enter` = new line. |
| `UploadZone` | Dashed light border area. Drag over → glass brightens. Shows file name and progress steps while processing. |
| `DocumentList` | Each item: PDF icon, file name (ellipsis), "12 pages", delete button. Delete asks for confirm. |
| `MessageBubble` | **User:** right side, `--glass-fill-strong`. **Assistant:** left side, lighter glass. Render markdown (bold, lists, code). |
| `AiLoading` | Animated thinking indicator cycling status messages with shimmering gradient text before the first token arrives. |

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
- Panel entrance on load: fade + slight scale from 0.98, 400ms.
- Respect `prefers-reduced-motion` everywhere.

## 10. Accessibility checklist

- All buttons have `aria-label` where there is only an icon.
- Visible keyboard focus ring (soft dark outline).
- Chat messages container uses `aria-live="polite"`.
- Color is never the only signal (use icons + text for errors).
