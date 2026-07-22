from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Runtime config, read from environment variables (see docker-compose.yml)."""

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    #setting enviornment variables
    max_upload_bytes: int = 5 * 1024 * 1024
    frontend_origin: str = "http://localhost:4321"
    allowed_extensions: set[str] = {".txt", ".md", ".json", ".xml"}


@lru_cache
def get_settings() -> Settings:
    return Settings()
