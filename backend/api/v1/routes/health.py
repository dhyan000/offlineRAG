"""
Health & System Routes
========================
Provides the core system endpoints:
  - GET /         → Welcome message
  - GET /health   → System health status
  - GET /version  → Application version info
"""

from __future__ import annotations

import time
from datetime import datetime, timezone
from fastapi import APIRouter
from sqlalchemy import text

from backend.core.config import settings
from backend.core.database import SessionLocal
from backend.processors.vectordb.chroma_service import ChromaService
from backend.processors.llm.ollama_service import OllamaService

router = APIRouter(tags=["System"])

# Track server start time for uptime calculation
_START_TIME: float = time.monotonic()


@router.get("/", summary="Welcome")
async def root() -> dict:
    """Return a welcome message confirming the API is reachable."""
    return {
        "message": f"Welcome to the {settings.APP_NAME} API",
        "status": "ok",
        "docs": "/docs",
        "version": settings.APP_VERSION,
    }


@router.get("/health", summary="Health Check")
async def health_check() -> dict:
    """
    Return the current health status of the application.
    Useful for monitoring, load balancers, and frontend status indicators.
    """
    uptime_seconds = round(time.monotonic() - _START_TIME, 2)

    # 1. Check Database (SQLite)
    database_status = "operational"
    try:
        db = SessionLocal()
        db.execute(text("SELECT 1"))
        db.close()
    except Exception:
        database_status = "error"

    # 2. Check Vector DB (ChromaDB)
    vector_store_status = "operational"
    try:
        _, collection = ChromaService.get_client()
        collection.count()
    except Exception:
        vector_store_status = "error"

    # 3. Check LLM (Ollama)
    llm_status = "operational"
    try:
        is_ollama_ok = await OllamaService.is_healthy()
        if not is_ollama_ok:
            llm_status = "degraded"
    except Exception:
        llm_status = "error"

    # Determine overall status
    if database_status == "error" or vector_store_status == "error":
        status = "unhealthy"
    elif llm_status in ["error", "degraded"]:
        status = "degraded"
    else:
        status = "healthy"

    return {
        "status": status,
        "uptime_seconds": uptime_seconds,
        "version": settings.APP_VERSION,
        "environment": settings.ENVIRONMENT,
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "services": {
            "api": "operational",
            "database": database_status,
            "vector_store": vector_store_status,
            "llm": llm_status,
        },
    }


@router.get("/version", summary="Version Info")
async def version_info() -> dict:
    """Return detailed application version and build metadata."""
    return {
        "app_name": settings.APP_NAME,
        "version": settings.APP_VERSION,
        "description": settings.APP_DESCRIPTION,
        "environment": settings.ENVIRONMENT,
        "python_version": "3.11+",
        "framework": "FastAPI",
        "build_date": "2026-07-16",
    }
