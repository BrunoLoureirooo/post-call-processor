import { useRef, useState } from "react";
import "./UploadForm.css";

// ⚠️ DUPLICATED CONFIG — flagged for later consolidation.
// ALLOWED and MAX_BYTES mirror the server's authoritative values in
// src/backend/app/config.py and must be kept in sync BY HAND for now.
// Client validation is a UX shortcut only (the server re-validates every upload),
// so drift is low-risk. Consolidation options are recorded in the slice doc's
// Gotchas (docs/features/01-transcript-upload.md). Revisit if these start changing.
const ALLOWED = [".txt", ".md", ".json", ".xml"];
const MAX_BYTES = 5 * 1024 * 1024;
const API_BASE =
  (import.meta.env.PUBLIC_API_BASE_URL as string | undefined) ?? "http://localhost:8000";

type Result = { filename: string; size_bytes: number; format: string };
type Status = "idle" | "selected" | "uploading" | "success" | "error";

function extensionOf(name: string): string {
  const dot = name.lastIndexOf(".");
  return dot === -1 ? "" : name.slice(dot).toLowerCase();
}

function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / 1024 / 1024).toFixed(1)} MB`;
}

/** Mirrors the server's gates (extension, non-empty, size). Server stays authoritative. */
function validate(file: File): string | null {
  const ext = extensionOf(file.name);
  if (!ALLOWED.includes(ext)) {
    return `Unsupported file type '${ext || "(none)"}'. Accepted: ${ALLOWED.join(", ")}.`;
  }
  if (file.size === 0) return "File is empty.";
  if (file.size > MAX_BYTES) {
    return `File is too large (${formatBytes(file.size)}). Maximum is 5 MB.`;
  }
  return null;
}

export default function UploadForm() {
  const [file, setFile] = useState<File | null>(null);
  const [status, setStatus] = useState<Status>("idle");
  const [message, setMessage] = useState("");
  const [result, setResult] = useState<Result | null>(null);
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  function accept(next: File) {
    const problem = validate(next);
    setResult(null);
    if (problem) {
      setFile(null);
      setStatus("error");
      setMessage(problem);
      return;
    }
    setFile(next);
    setStatus("selected");
    setMessage("");
  }

  function onDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragging(false);
    const dropped = e.dataTransfer.files?.[0];
    if (dropped) accept(dropped);
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!file) return;
    setStatus("uploading");
    setMessage("");
    const body = new FormData();
    body.append("file", file);
    try {
      const resp = await fetch(`${API_BASE}/api/transcripts`, { method: "POST", body });
      const data = await resp.json().catch(() => null);
      if (!resp.ok) {
        setStatus("error");
        setMessage(data?.detail ?? `Upload failed (${resp.status}).`);
        return;
      }
      setResult(data as Result);
      setStatus("success");
    } catch {
      setStatus("error");
      setMessage("Could not reach the server. Is the API running?");
    }
  }

  const busy = status === "uploading";

  return (
    <form className="uf" onSubmit={onSubmit}>
      <button
        type="button"
        className="uf-zone"
        data-dragging={dragging}
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
      >
        <span className="uf-zone-title">Drop a transcript here</span>
        <span className="uf-zone-hint">or click to choose a file — {ALLOWED.join(" ")} up to 5 MB</span>
      </button>

      <input
        ref={inputRef}
        type="file"
        className="uf-input"
        accept={ALLOWED.join(",")}
        onChange={(e) => {
          const picked = e.target.files?.[0];
          if (picked) accept(picked);
          e.target.value = "";
        }}
      />

      <div className="uf-actions">
        <span className="uf-filename">
          {file ? `${file.name} · ${formatBytes(file.size)}` : "No file selected"}
        </span>
        <button type="submit" className="uf-submit" disabled={!file || busy}>
          {busy && <span className="uf-spinner" aria-hidden="true" />}
          {busy ? "Uploading…" : "Upload"}
        </button>
      </div>

      <div className="uf-status" role="status" aria-live="polite">
        {status === "success" && result && (
          <p className="uf-result uf-result-ok">
            Received <strong>{result.filename}</strong> — {formatBytes(result.size_bytes)}, format{" "}
            {result.format}.
          </p>
        )}
        {status === "error" && <p className="uf-result uf-result-error">{message}</p>}
      </div>
    </form>
  );
}
