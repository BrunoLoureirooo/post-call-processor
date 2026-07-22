# DESIGN.md

Canonical visual system for this project. `CLAUDE.md` carries the short non-negotiables; this file is the source of truth for anything visual. `/impeccable` reads this.

Sensible defaults for an internal learning-project tool: clean, minimal, functional. Optimize for clarity over decoration.

## Tokens

CSS custom properties live in `src/frontend/src/styles/tokens.css`.

- `--color-bg` — page background (pure white light / near-black dark)
- `--color-fg` — body text, high contrast against bg
- `--color-fg-muted` — secondary text (labels, timestamps, metadata)
- `--color-border` — decorative dividers and table lines only; intentionally low contrast
- `--color-border-strong` — edges of interactive controls (inputs, the upload dropzone); meets 3:1 so the control boundary is perceivable
- `--color-hero` — the neutral workhorse color used for most UI chrome (buttons, active states)
- `--color-accent` — the ONE sparing accent, used only for calls-to-action and status highlights (e.g. "processing" / "done" badges). No second accent hue anywhere in the app.
- `--color-danger` — errors and destructive actions only

## Typography

Single font family everywhere: system font stack (`-apple-system, BlinkMacSystemFont, "Segoe UI", Inter, sans-serif`) — no custom font loading, this is an internal tool, not a marketing site. Monospace stack (`ui-monospace, "SF Mono", Menlo, monospace`) for transcript text and code-like content only.

Scale: 14px body, 16px base UI, 20px section headings, 28px page titles. One weight (400) for body text, one (600) for headings/emphasis — no in-between weights.

## Color

Neutral palette for backgrounds, text, and borders, with a single accent hue used sparingly (buttons, links, status badges). Values were chosen in slice `01-transcript-upload` (the first real UI slice) and are recorded here. Authored in OKLCH; hex is the sRGB rendering. Canonical source: `src/frontend/src/styles/tokens.css`.

| Token | Light | Dark |
|---|---|---|
| `--color-bg` | `#ffffff` | `#070a0b` |
| `--color-fg` | `#0f1213` | `#eff2f3` |
| `--color-fg-muted` | `#5c6567` | `#9da7a9` |
| `--color-border` | `#d3d8da` | `#282f31` |
| `--color-border-strong` | `#868e90` | `#5c6567` |
| `--color-hero` | `#1c2325` | `#e4e9ea` |
| `--color-accent` | `#0b6677` | `#4db4cc` |
| `--color-danger` | `#be2323` | `#e86156` |

Decisions behind these values:

- **Accent is a deep petrol teal (hue 215°)**, deliberately not the SaaS-blue reflex (~255°). Neutrals carry a 0.006–0.012 chroma tint toward that same hue rather than a default warm tint.
- **Danger is a true red (hue 27°)**, ~188° from the accent, so a "done" badge can never read as an error and the pair stays distinguishable under red-green colour-vision deficiency. Status must never rely on hue alone — always pair it with text or an icon.
- **Light background is pure `#ffffff`**, not off-white or cream. Warmth belongs in brand colour and typography, never in the surface.
- **Two border values**, because one cannot serve both jobs: `--color-border` is a quiet divider (~1.4:1, decorative, exempt from the 3:1 rule); `--color-border-strong` marks interactive control edges at 3.3:1.

- Light mode: pure white background, near-black text.
- Dark mode: near-black background, near-white text — same accent hue, raised lightness for contrast.
- Accent may appear at full saturation on small elements (badges, buttons); never as a large glowing surface. No glow effects on body text.

## Spacing & layout

8px base spacing scale (8/16/24/32/48/64). Max content width 960px for readable columns (ticket lists, transcript view), centered with side padding. Single-column layout — this is a utility app, not a dashboard grid.

## Motion

Minimal, functional motion only: 150ms ease-out for hover/focus state changes, 200ms ease-in-out for panel/modal open-close. No decorative animation, no page-transition effects. Every animation must respect `prefers-reduced-motion: reduce` by dropping to an instant state change (no fade, no slide) — no exceptions.

## Accessibility

WCAG AA contrast minimum (4.5:1 body text, 3:1 large text/UI components) in both light and dark mode. All interactive elements get a visible `focus-visible` outline using `--color-accent`. Full keyboard operability for the upload form and ticket list/detail views — no mouse-only interactions. Reduced-motion summary: see Motion section above — all transitions collapse to instant.
