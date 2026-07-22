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
