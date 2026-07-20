"""HTTP client for Ollama's REST API, used by the Celery worker.

Placeholder for slice 00 (scaffolding). The real client — summarize/extract
calls against Ollama's own `/api/generate` / `/api/chat` endpoints — is added in
a later slice. There is no separate Ollama wrapper service; this module is the
boundary between our worker and Ollama (see docs/architecture.md).
"""
