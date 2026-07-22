# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

post-call-processor is a web app that takes a manually-uploaded call transcript, summarizes it, extracts actionable items into internal ticket records, and dispatches emails with that content. It runs fully dockerized locally, with an eye toward a later Kubernetes/AWS deployment study — don't build cloud-specific code yet, but keep the container boundaries clean since they'll matter later.

## Working style

Learning project — small, single-purpose edits, each immediately followed by a plain explanation of what it does and why. Never write a whole file in one shot when the user is learning that layer; one concept per edit. Batch mechanical scaffolding (config boilerplate) is fine, but anything with actual logic gets built incrementally with explanation.

## Commands

```bash
# Backend (FastAPI, from backend/)
uv run fastapi dev app/main.py    # PRIMARY dev loop: hot-reload API on :8000, no worker/Ollama attached
uv run pytest                      # backend tests
uv run mypy app                    # type-check

# Frontend (Astro, from frontend/)
pnpm dev                           # PRIMARY dev loop: Astro dev server with React islands, HMR
pnpm build                         # static build + SSR bundle per astro.config
pnpm astro check                   # type-check .astro + TS files

# Full stack (from repo root)
docker compose up                  # runs api, worker (Celery), redis, postgres, ollama together
                                    # this is the ONLY way to exercise real async processing end-to-end —
                                    # `fastapi dev` alone has no worker or Ollama, jobs will never complete
```

## Stack (non-negotiable)

- Backend: Python, FastAPI, package manager `uv`
- Frontend: Astro, React islands, package manager `pnpm`
- Database: PostgreSQL
- Async processing: Celery + Redis task queue — the API enqueues jobs, a separate worker container processes them
- LLM: Ollama, running in its own container (kept separate so slow inference never blocks the API process)
- Email: SMTP (or a compatible transactional email API)
- Packaging: Docker / docker compose for all services; local-only for now, structured for a future Kubernetes/AWS deployment

## File conventions

See [DESIGN.md](DESIGN.md) — canonical visual system: tokens, typography, motion.
See [docs/architecture.md](docs/architecture.md) — repo skeleton, dependency, and container-wiring decisions for the scaffolding slice.
Each small, independently-shippable slice gets its own `docs/features/NN-<slug>.md` (two-digit build-order prefix, e.g. `00-scaffolding.md`, `01-<first-slice>.md`) — plan first, then implementation context. Copy [docs/features/_TEMPLATE.md](docs/features/_TEMPLATE.md) per slice; never combine slices into one file or let one file span the whole app.

## Architecture

All code lives under `src/` — no exceptions carved out per file type or framework convention.

```
src/
  backend/
    app/
      api/         # FastAPI route modules
      models/      # SQLAlchemy models (transcripts, tickets, jobs)
      tasks/        # Celery task definitions (calls Ollama, builds summary/tickets, sends email)
      main.py      # FastAPI app entrypoint
    tests/
  frontend/
    src/
      pages/       # Astro pages (upload, ticket list, ticket detail)
      components/  # React islands (upload form, ticket table, etc.)
      layouts/     # shared page shell
docker/            # Dockerfiles + compose service configs
```

A transcript upload creates a job row, enqueues a Celery task, and returns immediately; the worker calls Ollama, writes the summary/tickets back to Postgres, and triggers the email send — the frontend polls or refetches job status rather than blocking on the request.

## Design rules

Fonts, palette, and motion defaults are documented in [DESIGN.md](DESIGN.md) — a clean, minimal, functional look with a neutral palette and one accent color, restrained motion. Never introduce a second accent hue or non-essential animation without updating DESIGN.md first.

## Agent / skill rules

- Large-scale code analysis → deploy Haiku agents
- All visual changes → run `/impeccable` `/design-motion-principles`
- Each slice → its own `docs/features/NN-<slug>.md` (plan first, then impl context) — never one file per app or per milestone
- All code → under `src/`; the scaffolding slice (`00-scaffolding.md`) always creates the initial folders/files there, never leaves it empty
- Executing a slice → after every individual feature within it (not just at the end of the slice), stop at the plan's Checkpoint: ask whether the user will test it themselves or wants Claude to spin up an agent to test it (Playwright MCP for a UI flow, a subagent otherwise) — wait for their answer before starting the next feature
- Every implemented feature → spin up the app and drive the real flow in a browser via the Playwright MCP before marking complete; ≥90% confidence from observed behavior or report it as UNVERIFIED
- CLAUDE.md max 200 lines — overflow goes to referenced docs/

## TODOs

- Webhook ingestion (e.g. from a call platform) is deferred — manual upload only for the current milestone.
- External ticket-tool integration (Jira/Linear/Zendesk) is deferred — tickets are internal records only for now.
- Kubernetes/AWS deployment is a future study, not part of the current milestone — keep containers clean but don't build cloud-specific manifests yet.
