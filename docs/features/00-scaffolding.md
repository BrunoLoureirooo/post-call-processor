# scaffolding

**Status:** complete

## What & why

Establishes the repo skeleton — folder structure, package manifests, and inert
docker config — for post-call-processor. This is the first slice; there is no
slice before it. The next slice (01-<first-slice>, TBD) will be the first one to
put real behavior behind these folders, starting with whichever piece of the
upload → summarize → ticket → email flow is chosen first.

Full design reasoning (dependency choices, why no separate Ollama wrapper service,
version pins) lives in [docs/architecture.md](../architecture.md) — this file is
the build-order plan only.

## Plan

1. Initialize git — `git init`, `.gitignore` (python/node/docker/editor cruft).
   **Checkpoint:** test yourself, or have Claude test it?
2. Backend skeleton — `src/backend/pyproject.toml` (uv, Python 3.12, full stack
   deps per architecture.md), `app/{__init__.py,main.py,api/,models/,tasks/}`,
   `tasks/ollama_client.py` placeholder, `tests/test_main.py` trivial import test.
   **Checkpoint:** test yourself, or have Claude test it?
3. Frontend skeleton — `src/frontend/package.json` (pnpm, Node 22, full stack
   deps), `astro.config.mjs`, `tsconfig.json`, `src/pages/index.astro` placeholder,
   `src/styles/tokens.css` (token names from DESIGN.md), empty
   `components/`/`layouts/` dirs.
   **Checkpoint:** test yourself, or have Claude test it?
4. Docker config (inert, not run) — `docker/Dockerfile.{api,worker,frontend}`,
   root `docker-compose.yml` wiring api/worker/redis/postgres/ollama/frontend.
   **Checkpoint:** test yourself, or have Claude test it?
5. Initial commit — stage everything from steps 1-4, one commit.
   **Checkpoint:** test yourself, or have Claude test it?

## Implementation notes

Built with the real CLI workflow (uv/pnpm/astro), not hand-written manifests.

- **Backend** (`src/backend/`): `uv init --bare` → `uv add` per stack layer. Runtime
  deps = fastapi[standard], sqlalchemy, psycopg[binary], celery, redis,
  pydantic-settings; dev group = pytest, mypy. `fastapi[standard]` was chosen (not
  bare `fastapi`) because it bundles the `fastapi` CLI that `uv run fastapi dev`
  needs, plus uvicorn. `psycopg[binary]` avoids a system libpq dependency locally.
  `pydantic-settings` is declared directly even though fastapi pulls it in
  transitively. App is a non-package project (no `[build-system]`), so the container
  images set `PYTHONPATH=/app` to make `app.main` importable.
- **Python 3.12 pin**: `uv init --bare --python 3.12` only set the `>=3.12` *floor*,
  which system Python 3.14 satisfied — the venv built on 3.14. Fixed with
  `uv python pin 3.12` (writes `.python-version`, downloads managed CPython 3.12)
  then `uv sync` rebuilt the venv on 3.12.13. Floor (`requires-python`) vs. exact
  interpreter (`.python-version`) are different things.
- **Frontend** (`src/frontend/`): `pnpm create astro --template minimal` then
  `pnpm astro add react` (React 19, @astrojs/react 6 — the integration installer
  edits `astro.config.mjs` + `tsconfig.json` for us). create-astro set
  `engines.node >=22.12.0` (the Node 22 pin) and a `pnpm-workspace.yaml` carrying
  `allowBuilds` for esbuild/sharp (pnpm 10+ blocks build scripts by default).
  `src/styles/tokens.css` holds the DESIGN.md token *names* only — no hex yet.
- **Docker** (`docker/` + root `docker-compose.yml`): build context = repo root
  (so images read `src/backend` / `src/frontend`), kept lean by root `.dockerignore`.
  api/worker share one image build differing only in entrypoint; compose uses a
  YAML anchor (`x-backend-env`) for the shared DB/broker/Ollama env, internal DNS
  (service names as hostnames), named volumes for pg data + ollama models, and
  healthcheck-gated `depends_on`.

Verified: backend `uv run pytest` + `uv run mypy app` green; frontend `pnpm build`
green; `docker compose config` exit 0 (anchor + build contexts resolve). Docker was
NOT built or `up`-ed — inert by design for slice 00.

## Gotchas

- **`.python-version` is load-bearing.** Delete it and `requires-python = ">=3.12"`
  alone will let uv rebuild the venv on whatever newer Python is installed (3.14
  locally). Keep the pin; Docker uses `python:3.12-slim` to match.
- **`app.tasks.celery_app` does not exist yet.** Both `docker/Dockerfile.worker` and
  the compose `worker` reference it as the Celery app; that instance is added in a
  later slice, so the worker container will NOT start successfully until then.
- **Docker is untested at runtime.** Only `docker compose config` was run — no
  `docker build`, no `docker compose up`. First real build/run (and its
  verification) belongs to a later slice.
- **Local Node is 26, pinned is 22.** Satisfies `>=22.12.0` and builds fine locally,
  but it's an untested-in-CI combo; the frontend image uses `node:22-slim`.
- **Compose creds are plaintext local-only** (`pcp`/`pcp`). Real secret handling is
  deferred to the k8s/AWS study.
- **Frontend image runs the dev server** (`pnpm dev`), and Astro output is currently
  `static` — there is no production static-serve image yet.
