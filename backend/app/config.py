from functools import lru_cache
from typing import List
from pydantic_settings import BaseSettings, SettingsConfigDict


from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent


class Settings(BaseSettings):
    """Application settings read from environment variables or .env file."""
    gemini_api_key: str = ""
    gemini_chat_model: str = "gemini-3.7-flash"
    gemini_embed_model: str = "gemini-embedding-001"
    embed_dimensions: int = 768
    similarity_threshold: float = 0.60
    top_k: int = 5
    supabase_url: str = ""
    supabase_service_key: str = ""
    allowed_origins: str = "http://localhost:3000"
    gemini_daily_limit: int = 100
    embed_daily_limit: int = 500

    model_config = SettingsConfigDict(
        env_file=(str(BASE_DIR / ".env"), ".env"),
        env_file_encoding="utf-8",
        extra="ignore"
    )

    @property
    def cors_origins(self) -> List[str]:
        """Parse comma-separated allowed origins into a list for CORS middleware.
        Strips whitespace, surrounding quotes, and trailing slashes so variations like 'https://example.com/' match.
        """
        raw = self.allowed_origins.strip().strip("'\"") if self.allowed_origins else ""
        if not raw:
            return ["http://localhost:3000"]
        origins = []
        for origin in raw.split(","):
            cleaned = origin.strip().strip("'\"").rstrip("/")
            if cleaned:
                origins.append(cleaned)
        return origins if origins else ["http://localhost:3000"]


@lru_cache
def get_settings() -> Settings:
    """Singleton getter for cached application settings."""
    return Settings()
