# transcript-upload

**Status:** planned

## What & why

First functional slice, after `00-scaffolding`. Proves the front half of the
processing pipeline: a user selects a call-transcript file in the browser and the
FastAPI backend receives and validates it. The slice after this (`02`, TBD) adds
the async handoff — persisting/enqueuing the transcript so a Celery worker can pick
it up — and a later slice sends it to Ollama.

**Deliberately thin.** The full product path is UI → API → queue → worker → Ollama.
This slice builds only **UI → API**, and stops at *receive + validate + acknowledge*.
The uploaded file is **not stored** — it is read into memory for validation, echoed
back as metadata, then discarded. No database, no Celery/Redis, no Ollama. Storage
and the queue handoff are the next slice's job; keeping them out avoids accumulating
orphan transcript rows before there is anything to process them.

**Constraint that shapes it:** learning-first, built one feature at a time with a
checkpoint after each. It is also the *first real UI slice*, so it is where the
`DESIGN.md` palette becomes concrete (hex values chosen, `tokens.css` filled).

### Decisions (settled in brainstorming + grill)

| Decision | Value | Why |
|---|---|---|
| Accepted formats | `.txt .md .json .xml` | Cover plain + structured transcripts. Validated by extension only; **no format-specific parsing** this slice (deferred). |
| Boundary | receive + validate + acknowledge, **no storage** | Focus on the upload wire; avoid premature persistence. |
| Upload UX | dropzone + click-to-browse, explicit submit | Standard upload pattern; drag/hover/upload states are the motion surface. |
| Browser → API | direct `fetch` + `CORSMiddleware` on FastAPI | Minimal infra, teaches CORS. Allowed origin from `pydantic-settings` `FRONTEND_ORIGIN` (default `http://localhost:4321`); value set in compose `x-backend-env`, **never** the Dockerfile (images stay env-agnostic). Frontend API base URL in `PUBLIC_API_BASE_URL`. |
| Size cap | 5 MB, in `pydantic-settings` (`MAX_UPLOAD_BYTES`) | Text transcripts are tiny (~2 MB worst case for an 8-hr structured call); 5 MB is ample. Env-overridable. File is read into RAM, so the cap guards against OOM. |
| Upload page | landing `index.astro` | User's framing: the landing page *is* the upload page. |
| Dev loop | docker-dev (hot-reload), enabled by Task 0 detour | User wants to build in containers; compose needs bind-mounts + reload first. |

### Data flow

1. User drops or picks a file in the `UploadForm` island.
2. Client validates extension + size (UX only) — bad file → inline error, no request.
3. User clicks Upload → `fetch` POST `multipart/form-data` (field `file`) to
   `${PUBLIC_API_BASE_URL}/api/transcripts`.
4. FastAPI reads the `UploadFile`, re-validates (authoritative): extension in the
   whitelist, `0 < size ≤ MAX_UPLOAD_BYTES`, non-empty.
5. Success → `200 {filename, size_bytes, format}`. Failure → `HTTPException`
   (`400` bad ext / empty, `413` too big) with `{detail}`.
6. Island renders success (filename + size) or the error message. Server discards
   the file — nothing persists.

**Validation stance:** extension + size + non-empty are the *only* upload gates, on
one file per request. Content/format well-formedness (valid JSON/XML) is **never** a
rejection criterion — not now, not planned. Malformed content is a downstream
preprocessing/LLM concern, never an upload error. Do not add format validation here
later thinking it was an oversight; it is a deliberate stance.

## Plan

**Goal:** A user uploads a transcript file on the landing page; FastAPI receives it,
validates it, and returns metadata — no storage.

**Architecture:** Astro landing page mounts a React island (`UploadForm`) that POSTs
`multipart/form-data` directly to a FastAPI `POST /api/transcripts` route across the
`:4321`/`:8000` origin split (CORS). The route validates and echoes metadata; the file
is discarded. Config (`MAX_UPLOAD_BYTES`, `FRONTEND_ORIGIN`, allowed extensions) lives
in `pydantic-settings`.

**Tech stack:** FastAPI + `python-multipart` (already installed via `fastapi[standard]`),
`pydantic-settings` (installed), pytest (installed); Astro + React 19 island (installed).
No new dependencies.

### Global constraints (apply to every task)

- Python 3.12 (`.python-version`), Node 22 pin — do not change.
- No new dependencies — everything needed is already in `pyproject.toml` / `package.json`.
- `DESIGN.md` rules: neutral palette + **one** accent hue; motion 150ms ease-out
  hover/focus, 200ms panel; every transition collapses to instant under
  `prefers-reduced-motion`; WCAG AA contrast.
- Server validation is authoritative; client validation is UX-only and must mirror it.
- `caveman` is a *conversation* mode — this doc and code stay normal prose.

**Execution model:** built inline, one task at a time, each explained; a **Checkpoint**
follows every task (AskUserQuestion: you test, or Claude tests — Playwright for UI, a
subagent/command otherwise). Not batch/subagent execution.

---

### Task 0 — Docker-dev enablement (detour)

Not upload work — enables hot-reload *inside* containers so Tasks 1-5 have a fast loop.

**Files:** Modify `docker-compose.yml`.

**Changes** — add to the `api` service:
```yaml
    command: ["uvicorn", "app.main:app", "--reload", "--host", "0.0.0.0", "--port", "8000"]
    environment:
      <<: *backend-env
      FRONTEND_ORIGIN: http://localhost:4321
    volumes:
      - ./src/backend:/app        # host source live in container
      - /app/.venv                # anon volume: keep the image's venv, don't shadow it
```
add to the `frontend` service:
```yaml
    command: ["pnpm", "dev", "--host", "0.0.0.0"]
    environment:
      PUBLIC_API_BASE_URL: http://localhost:8000
    volumes:
      - ./src/frontend:/app
      - /app/node_modules         # anon volume: keep the image's node_modules
```

- [ ] Edit compose as above.
- [ ] Start only what this slice needs (skip the crash-looping worker):
      `docker compose up api frontend` (postgres/redis/ollama not needed yet).
- [ ] Prove backend reload: change `title=` in `app/main.py`, watch
      `docker compose logs -f api` show a reload line; revert.
- [ ] Prove frontend HMR: edit text in `index.astro`, see the browser update without
      a manual rebuild; revert.

**Checkpoint:** test yourself, or have Claude test it?

---

### Task 1 — Settings + upload endpoint (backend, TDD)

**Files:**
- Create: `src/backend/app/config.py`
- Create: `src/backend/app/api/transcripts.py`
- Create: `src/backend/tests/test_transcripts.py`
- Modify: `src/backend/app/main.py` (include the router)

**Interfaces / produces:**
- `app.config.Settings` fields: `max_upload_bytes: int`, `frontend_origin: str`,
  `allowed_extensions: set[str]`; `app.config.get_settings() -> Settings` (cached).
- `POST /api/transcripts`, multipart field `file` →
  `200 {filename: str, size_bytes: int, format: str}`; `400` (bad ext / empty),
  `413` (oversize), body `{detail: str}`.

- [ ] **Write the failing tests** — `tests/test_transcripts.py`:
```python
from fastapi.testclient import TestClient

from app.config import Settings, get_settings
from app.main import app

client = TestClient(app)


def _upload(filename: str, content: bytes):
    return client.post(
        "/api/transcripts",
        files={"file": (filename, content, "application/octet-stream")},
    )


def test_valid_txt_upload_returns_metadata() -> None:
    resp = _upload("call.txt", b"hello world")
    assert resp.status_code == 200
    assert resp.json() == {"filename": "call.txt", "size_bytes": 11, "format": "txt"}


def test_json_extension_accepted() -> None:
    resp = _upload("turns.json", b"{}")
    assert resp.status_code == 200
    assert resp.json()["format"] == "json"


def test_disallowed_extension_rejected() -> None:
    resp = _upload("slides.pdf", b"%PDF-1.4")
    assert resp.status_code == 400
    assert "pdf" in resp.json()["detail"].lower()


def test_empty_file_rejected() -> None:
    resp = _upload("empty.txt", b"")
    assert resp.status_code == 400
    assert "empty" in resp.json()["detail"].lower()


def test_oversize_file_rejected() -> None:
    app.dependency_overrides[get_settings] = lambda: Settings(max_upload_bytes=5)
    try:
        resp = _upload("big.txt", b"way too many bytes")
        assert resp.status_code == 413
    finally:
        app.dependency_overrides.clear()
```
- [ ] **Run, expect fail:** `uv run pytest tests/test_transcripts.py -v` → import/404 errors.
- [ ] **Implement `app/config.py`:**
```python
from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    max_upload_bytes: int = 5 * 1024 * 1024
    frontend_origin: str = "http://localhost:4321"
    allowed_extensions: set[str] = {".txt", ".md", ".json", ".xml"}


@lru_cache
def get_settings() -> Settings:
    return Settings()
```
- [ ] **Implement `app/api/transcripts.py`:**
```python
from pathlib import Path

from fastapi import APIRouter, Depends, HTTPException, UploadFile
from pydantic import BaseModel

from app.config import Settings, get_settings

router = APIRouter()


class TranscriptUploadResponse(BaseModel):
    filename: str
    size_bytes: int
    format: str


@router.post("/transcripts", response_model=TranscriptUploadResponse)
async def upload_transcript(
    file: UploadFile,
    settings: Settings = Depends(get_settings),
) -> TranscriptUploadResponse:
    ext = Path(file.filename or "").suffix.lower()
    if ext not in settings.allowed_extensions:
        raise HTTPException(400, f"Unsupported file type '{ext or '(none)'}'.")

    content = await file.read()  # small files only; size cap guards memory
    size = len(content)
    if size == 0:
        raise HTTPException(400, "File is empty.")
    if size > settings.max_upload_bytes:
        raise HTTPException(413, "File too large.")

    return TranscriptUploadResponse(
        filename=file.filename or "", size_bytes=size, format=ext.lstrip(".")
    )
```
- [ ] **Wire the router in `app/main.py`:**
```python
from app.api import transcripts
# ...
app.include_router(transcripts.router, prefix="/api")
```
- [ ] **Run, expect pass:** `uv run pytest -v` (5 passed) and `uv run mypy app`.

**Checkpoint:** test yourself, or have Claude test it?

---

### Task 2 — CORS middleware (backend)

**Files:** Modify `src/backend/app/main.py`.

- [ ] **Add the middleware**, origin sourced from settings (not hardcoded):
```python
from fastapi.middleware.cors import CORSMiddleware
from app.config import get_settings
# ...
app.add_middleware(
    CORSMiddleware,
    allow_origins=[get_settings().frontend_origin],
    allow_methods=["*"],
    allow_headers=["*"],
)
```
- [ ] **Verify the preflight** (in docker-dev, `docker compose up api`):
```bash
curl -i -X OPTIONS http://localhost:8000/api/transcripts \
  -H "Origin: http://localhost:4321" \
  -H "Access-Control-Request-Method: POST"
```
Expected: `200` with `access-control-allow-origin: http://localhost:4321`.

**Checkpoint:** test yourself, or have Claude test it?

---

### Task 3 — Design tokens (first real UI work) — `/impeccable` + `/design-motion-principles`

**Files:** Modify `src/frontend/src/styles/tokens.css`; Modify `DESIGN.md`.

This is where the palette becomes concrete (DESIGN.md says hex is chosen at the first
UI slice). Run the visual skills to pick values, not by guesswork.

- [ ] Run `/impeccable` + `/design-motion-principles` to choose a neutral grayscale
      ramp + **one** accent hue, light and dark, meeting WCAG AA.
- [ ] Fill the seven tokens in `tokens.css` (uncomment + set hex) for `:root` (light)
      and the `prefers-color-scheme: dark` block.
- [ ] Record the chosen hex values back in `DESIGN.md` (Color section).

**Checkpoint:** test yourself, or have Claude test it?

---

### Task 4 — Upload UI island (frontend) — authored live under `/impeccable` + `/design-motion-principles`

**Files:**
- Create: `src/frontend/src/components/UploadForm.tsx`
- Modify: `src/frontend/src/pages/index.astro` (import `tokens.css`, mount island)
- Create: `src/frontend/.env.example` (`PUBLIC_API_BASE_URL=http://localhost:8000`)

**Consumes:** `POST /api/transcripts` (Task 1), design tokens (Task 3).

**Component spec** (JSX/CSS/motion built live, not pre-frozen here):
- A dropzone that accepts **drag-and-drop** and **click-to-browse**
  (`<input type="file" accept=".txt,.md,.json,.xml">`, single file).
- State machine: `idle → selected → uploading → success | error`.
- Client validation mirrors the server: extension ∈ whitelist, `0 < size ≤ 5 MB`.
  On failure → inline error, no request.
- Explicit **Upload** button (no auto-upload). Submits `FormData` (field `file`) via
  `fetch` POST to `` `${import.meta.env.PUBLIC_API_BASE_URL ?? "http://localhost:8000"}/api/transcripts` ``.
- Success → show `filename` + `size_bytes`. Error → show `detail` (or a network
  fallback message) + allow retry.
- Motion (DESIGN.md): drag-over feedback, upload spinner, 150ms ease-out state
  transitions; all collapse to instant under `prefers-reduced-motion`.

- [ ] Author `UploadForm.tsx` live (states, handlers, validation, fetch) with the
      visual skills shaping layout + motion.
- [ ] `index.astro`: `import "../styles/tokens.css";` and mount
      `<UploadForm client:load />`.
- [ ] Add `.env.example`; ensure `PUBLIC_API_BASE_URL` resolves (compose sets it in
      docker-dev; code has a localhost fallback).
- [ ] `pnpm build` passes.

**Checkpoint:** test yourself, or have Claude test it?

---

### Task 5 — End-to-end verification

**Files:** Modify `docs/features/01-transcript-upload.md` (fill Implementation notes,
set Status → live).

- [ ] Run api + frontend (docker-dev). Drive the real flow via the Playwright MCP:
      valid `.txt` → success shows filename + size; `.pdf` → inline rejection;
      oversize (temporarily small cap) → error. Screenshot.
- [ ] Confirm ≥90% confidence from observed behavior; if below, record UNVERIFIED gaps.
- [ ] Fill **Implementation notes**, set **Status: live**.

**Checkpoint:** test yourself, or have Claude test it?

## Implementation notes

<!-- Filled in as each task is built: exact files, decisions made along the way. -->

## Gotchas

<!-- Seeded from brainstorming + grill; extend during build. -->

- **CORS origin must match exactly** — scheme + host + port (`http://localhost:4321`).
  A mismatch shows up as an opaque browser CORS error, not a server log.
- **`PUBLIC_` prefix is required** — Astro only exposes env vars named `PUBLIC_*` to
  client-side island code (`import.meta.env.PUBLIC_API_BASE_URL`). Without the prefix
  the value is `undefined` in the browser.
- **File is discarded, not stored** — do not assume the transcript exists after the
  response. Storage arrives in the next slice.
- **5 MB cap lives in settings** — change via `MAX_UPLOAD_BYTES` env var, not a code
  literal. The whole file is read into memory before the size check, so the cap is a
  real OOM guard; a streaming/`content-length` pre-check is a later hardening.
- **`tokens.css` starts value-less** — Task 3 fills it; any UI referencing the tokens
  before that renders unstyled.
- **Bind-mount shadows deps** — mounting `./src/backend`/`./src/frontend` over `/app`
  hides the image's `.venv`/`node_modules` unless the anonymous volumes are present.
- **Worker still crash-loops** — `app.tasks.celery_app` doesn't exist yet; run
  `docker compose up api frontend` for this slice, not the whole stack.
- **Config duplicated client↔server (FOLLOW-UP, not yet resolved)** — the size cap
  and allowed extensions live in BOTH `app/config.py` (authoritative) and
  `UploadForm.tsx` (UX mirror), kept in sync by hand. Deliberately left duplicated to
  keep this slice thin; the server re-validates so drift is low-risk. When it's worth
  consolidating, two evaluated options: (a) one compose YAML anchor feeding
  `MAX_UPLOAD_BYTES`/`ALLOWED_EXTENSIONS` + `PUBLIC_*` twins (note: `astro build`
  inlines `PUBLIC_*` at build time), or (b) a `GET /api/config` the client fetches at
  runtime (no drift possible, costs a request + fallback). The endpoint path stays in
  code as the API contract, not env.
