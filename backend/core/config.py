"""
Application Configuration
==========================
Centralised Pydantic settings loaded from environment variables and .env file.
All settings are typed, validated, and documented.
"""

from __future__ import annotations

from functools import lru_cache
from typing import List

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Application-wide settings with environment variable support."""

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    # ── Application ──────────────────────────────────────────────────────────
    APP_NAME: str = Field(default="Offline Multimodal AI Knowledge Hub")
    APP_VERSION: str = Field(default="1.0.0")
    APP_DESCRIPTION: str = Field(
        default="An industry-grade offline Multimodal RAG application."
    )
    DEBUG: bool = Field(default=False)
    ENVIRONMENT: str = Field(default="development")  # development | staging | production

    # ── Server ───────────────────────────────────────────────────────────────
    HOST: str = Field(default="0.0.0.0")
    PORT: int = Field(default=8000)

    # ── CORS ─────────────────────────────────────────────────────────────────
    CORS_ORIGINS: List[str] = Field(
        default=[
            "http://localhost:5173",
            "http://localhost:3000",
            "http://127.0.0.1:5173",
        ]
    )
    CORS_ALLOW_CREDENTIALS: bool = Field(default=True)
    CORS_ALLOW_METHODS: List[str] = Field(default=["*"])
    CORS_ALLOW_HEADERS: List[str] = Field(default=["*"])

    # ── Logging ──────────────────────────────────────────────────────────────
    LOG_LEVEL: str = Field(default="INFO")
    LOG_DIR: str = Field(default="logs")
    LOG_ROTATION: str = Field(default="10 MB")
    LOG_RETENTION: str = Field(default="30 days")

    # ── Storage ──────────────────────────────────────────────────────────────
    STORAGE_DIR: str = Field(default="../storage")
    UPLOAD_DIR: str = Field(default="../storage/uploads")

    # ── AI (reserved for future phases) ──────────────────────────────────────
    OLLAMA_BASE_URL: str = Field(default="http://localhost:11434")
    DEFAULT_LLM_MODEL: str = Field(default="llama3.2:3b")
    DEFAULT_EMBEDDING_MODEL: str = Field(default="nomic-embed-text")


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    """Return the cached singleton Settings instance."""
    return Settings()


# Convenience alias used across the application
settings = get_settings()
