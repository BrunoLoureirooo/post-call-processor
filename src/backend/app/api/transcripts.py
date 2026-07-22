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
    """Receive a transcript, validate it, echo its metadata. Nothing is stored."""

    #get the filename normalized to lowercase
    ext = Path(file.filename or "").suffix.lower()
    if ext not in settings.allowed_extensions:
        raise HTTPException(400, f"Unsupported file type '{ext or '(none)'}'.")

    #read file and validate size is smaller than max size
    content = await file.read()  # small files only; the size cap guards memory
    size = len(content)
    if size == 0:
        raise HTTPException(400, "File is empty.")
    if size > settings.max_upload_bytes:
        raise HTTPException(413, "File too large.")

    return TranscriptUploadResponse(
        filename=file.filename or "", size_bytes=size, format=ext.lstrip(".")
    )
