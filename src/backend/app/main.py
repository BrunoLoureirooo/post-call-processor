from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api import transcripts
from app.config import get_settings

app = FastAPI(title="post-call-processor")

#Add CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=[get_settings().frontend_origin],
    allow_methods=["*"],
    allow_headers=["*"],
)

#expose the transcripts endpoints
app.include_router(transcripts.router, prefix="/api")
