# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Primary user: a **manager or team lead** processing transcripts of calls they did **not**
attend. They arrive with no context from the call itself, need to get up to speed
quickly, and need the resulting work assigned to their team. No other audience is
confirmed.

## Product Purpose

post-call-processor turns a manually-uploaded call transcript into a summary, a set of
actionable items extracted as internal ticket records, and an email dispatching that
content. It exists to remove manual note-taking and follow-up triage after calls.

Success: a manager who did not attend the call can read the summary and find the
call's action items already existing as tickets, without anyone having written notes
by hand.

## Positioning

The mechanism is automatic conversion of unstructured call text into **structured,
actionable ticket records** (plus an email) — not merely a shorter transcript. The
differentiator is the extraction-to-tickets step, not summarization alone.

Privacy was explicitly considered and **not** adopted as the positioning claim, even
though inference runs on a self-hosted model. Future work must not market this as a
privacy product.

## Operating Context

- Transcripts arrive by **manual file upload** through a web page. There is no
  call-platform or webhook integration.
- Accepted upload formats: `.txt`, `.md`, `.json`, `.xml`. Uploads are gated on
  extension, size, and non-emptiness only; content well-formedness is never a
  rejection criterion.
- Processing is asynchronous: the API enqueues a job and returns immediately; a
  separate worker performs the LLM work and writes results back.
- The system runs locally under docker compose (api, worker, redis, postgres, ollama,
  frontend). Inference runs in a self-hosted Ollama container rather than a
  third-party API.
- Email delivery via SMTP or a compatible transactional email API.

## Capabilities and Constraints

Confirmed constraints that future work must preserve:

- **Manual upload only** — webhook / call-platform ingestion is deferred.
- **Tickets are internal records only** — no Jira / Linear / Zendesk sync.
- **Local-only docker** for now — Kubernetes/AWS is a later study; keep container
  boundaries clean, but build no cloud-specific code.
- **Stack is fixed** — FastAPI + uv, Astro + pnpm + React islands, PostgreSQL,
  Celery + Redis, Ollama, SMTP.

Terminology: a **transcript** is the uploaded call text; a **ticket** is an internal
actionable record extracted from a transcript; a **job** is one async unit of
processing.

Explicitly undecided (do not invent answers): authentication and multi-user access,
transcript retention/storage policy, and ticket lifecycle beyond creation.

## Evidence on Hand

None. There are no customers, testimonials, benchmarks, case studies, press, logo, or
production data, and no real transcript corpus yet. Future work must not fabricate
any of these.

## Product Principles

1. **The reader wasn't there.** Output must stand alone without prior call context.
2. **Extraction over transcription.** The value is structured tickets, not a tidier
   transcript.
3. **Never block on inference.** Slow LLM work belongs to the worker; the API responds
   immediately.
4. **Accept messy input.** Validate that a file is plausible, never that its content is
   well-formed — malformed content is a processing concern, not an upload error.
5. **Deferred work stays visibly deferred.** No fabricated integrations or claims.

## Accessibility & Inclusion

WCAG AA contrast minimum (4.5:1 body text, 3:1 large text and UI components) in both
light and dark mode. Full keyboard operability for the upload form and ticket
list/detail views — no mouse-only interactions. All motion respects
`prefers-reduced-motion` by collapsing to an instant state change.
