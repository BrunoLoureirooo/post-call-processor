# architecture.md

Design decisions for the project's scaffolding (slice `00-scaffolding`). This is the
source of truth for repo shape, dependency choices, and container wiring — CLAUDE.md
carries the short non-negotiables and links here for the reasoning behind them.

## Scope of slice 00

Repo skeleton only — folders, package manifests, and inert docker config. Nothing
runs end-to-end yet (no working routes, no `docker compose up` smoke test); that's
proven incrementally in later slices. What *is* proven now: `uv sync` / `uv run pytest`
/ `uv run mypy app` resolve and pass trivially, and `pnpm install` resolves.

## Backend skeleton

```
src/backend/
  pyproject.toml       # uv, Python 3.12. Full stack deps declared now (not added
                        #   incrementally per slice): fastapi, uvicorn, sqlalchemy,
                        #   psycopg, celery, redis, pydantic-settings.
                        #   Dev deps: pytest, mypy.
  app/
    __init__.py
    main.py             # FastAPI() instance, no real routes yet
    api/__init__.py
    models/__init__.py
    tasks/
      __init__.py
      ollama_client.py  # placeholder — will hold the HTTP client the Celery worker
                        #   uses to call Ollama's own REST API directly (no separate
                        #   wrapper service; Ollama's built-in API is the boundary)
  tests/
    __init__.py
    test_main.py        # trivial import test, proves `uv run pytest` works
```

## Frontend skeleton

```
src/frontend/
  package.json          # pnpm, Node 22 engines pin. Full stack deps declared now:
                          #   astro, react, @astrojs/react, typescript.
  astro.config.mjs       # React integration registered
  tsconfig.json
  src/
    pages/index.astro    # placeholder page
    components/.gitkeep
    layouts/.gitkeep
    styles/tokens.css     # token names from DESIGN.md; hex values filled in when the
                          #   first real UI slice is built
```

## Docker (inert config, not run yet)

```
docker/
  Dockerfile.api        # python:3.12-slim, uv sync, uvicorn entrypoint
  Dockerfile.worker      # same base, celery worker entrypoint
  Dockerfile.frontend    # node:22-slim, pnpm build/dev entrypoint
docker-compose.yml        # (repo root) api, worker, redis, postgres, ollama, frontend
                          # services wired (env vars, ports, volumes) but not smoke-tested
```

## Versions

Python 3.12, Node 22 LTS — pinned in `pyproject.toml` / `package.json` engines field.

## Decisions & why

- **Full dependency sets declared upfront** rather than added per-slice, so later
  slices write code instead of managing packages.
- **No separate Ollama wrapper service** — the worker calls Ollama's own REST API
  directly via a client module; adding a 6th container would be unnecessary
  indirection for a single internal caller.
- **Docker written but not run in slice 00** — proves the shape of the container
  boundaries (matters for the later K8s/AWS study) without needing working app code
  behind them yet.
