# DESIGN.md

Canonical visual system for this project. `CLAUDE.md` carries the short non-negotiables; this file is the source of truth for anything visual. `/impeccable` reads this.

Sensible defaults for an internal learning-project tool: clean, minimal, functional. Optimize for clarity over decoration.

## Tokens

CSS custom properties live in `src/frontend/src/styles/tokens.css`.

- `--color-bg` — page background (near-white light / near-black dark)
- `--color-fg` — body text, high contrast against bg
- `--color-fg-muted` — secondary text (labels, timestamps, metadata)
- `--color-border` — dividers, input borders, table lines
- `--color-hero` — the neutral workhorse color used for most UI chrome (buttons, active states)
- `--color-accent` — the ONE sparing accent, used only for calls-to-action and status highlights (e.g. "processing" / "done" badges). No second accent hue anywhere in the app.
- `--color-danger` — errors and destructive actions only

## Typography

Single font family everywhere: system font stack (`-apple-system, BlinkMacSystemFont, "Segoe UI", Inter, sans-serif`) — no custom font loading, this is an internal tool, not a marketing site. Monospace stack (`ui-monospace, "SF Mono", Menlo, monospace`) for transcript text and code-like content only.

Scale: 14px body, 16px base UI, 20px section headings, 28px page titles. One weight (400) for body text, one (600) for headings/emphasis — no in-between weights.

## Color

Neutral grayscale palette for backgrounds, text, and borders, with a single accent hue used sparingly (buttons, links, status badges). Exact hex values are chosen when the first UI slice is built and recorded here at that point — not fixed in advance.

- Light mode: near-white background, near-black text, mid-gray borders.
- Dark mode: near-black background, near-white text, mid-gray borders — same accent hue, adjusted lightness for contrast.
- Accent may appear at full saturation on small elements (badges, buttons); never as a large glowing surface. No glow effects on body text.

## Spacing & layout

8px base spacing scale (8/16/24/32/48/64). Max content width 960px for readable columns (ticket lists, transcript view), centered with side padding. Single-column layout — this is a utility app, not a dashboard grid.

## Motion

Minimal, functional motion only: 150ms ease-out for hover/focus state changes, 200ms ease-in-out for panel/modal open-close. No decorative animation, no page-transition effects. Every animation must respect `prefers-reduced-motion: reduce` by dropping to an instant state change (no fade, no slide) — no exceptions.

## Accessibility

WCAG AA contrast minimum (4.5:1 body text, 3:1 large text/UI components) in both light and dark mode. All interactive elements get a visible `focus-visible` outline using `--color-accent`. Full keyboard operability for the upload form and ticket list/detail views — no mouse-only interactions. Reduced-motion summary: see Motion section above — all transitions collapse to instant.
