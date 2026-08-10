"""
Offline Multimodal AI Knowledge Hub — Backend Entry Point
==========================================================
FastAPI application factory with:
  - CORS middleware
  - Structured logging (Loguru)
  - Versioned API router registration
  - Lifespan context management (startup / shutdown hooks)
  - Global exception handler
  - OpenAPI customisation
"""

from __future__ import annotations

import time
from contextlib import asynccontextmanager
from typing import AsyncIterator

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from backend.api.v1 import api_router as api_v1_router
from backend.core.config import settings
from backend.core.logging import configure_logging, logger


# ── Lifespan ──────────────────────────────────────────────────────────────────

@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncIterator[None]:
    """Handle application startup and shutdown events."""
    # ── Startup ───────────────────────────────────────────────────────────────
    configure_logging()
    from backend.core.database import init_and_migrate_db
    try:
        logger.info("Initializing SQL database tables and schema migrations...")
        init_and_migrate_db()
        logger.success("Database tables initialized successfully.")
    except Exception as e:
        logger.error(f"Failed to initialize database tables: {e}")

    # --- Startup Validation & Preloading ---
    from backend.processors.embeddings.embedding_service import EmbeddingService
    from backend.processors.vectordb.chroma_service import ChromaService
    from backend.processors.audio.audio_processor import ensure_ffmpeg_in_path, get_whisper_model

    # 1. FFmpeg validation (required by Whisper audio/video pipelines)
    logger.info("[Startup] Validating FFmpeg availability...")
    try:
        ensure_ffmpeg_in_path()
    except Exception as e:
        logger.error(
            f"[Startup] CRITICAL: FFmpeg is not available. Audio/Video uploads will fail.\n"
            f"Fix: pip install imageio-ffmpeg\nError: {e}"
        )

    # 2. Sentence Transformers embedding model
    logger.info("[Startup] Loading all-MiniLM-L6-v2 embedding model...")
    EmbeddingService.get_model()

    # 3. ChromaDB vector store
    logger.info("[Startup] Connecting to ChromaDB persistent store...")
    ChromaService.get_client()

    # 4. Whisper speech recognition model
    logger.info("[Startup] Preloading Whisper 'tiny' model (CPU mode)...")
    try:
        get_whisper_model()
    except Exception as e:
        logger.warning(f"[Startup] Whisper preloading deferred: {e}")

    logger.success("[Startup] All models and services ready.")


    logger.info("=" * 60)
    logger.info(f"  {settings.APP_NAME}")
    logger.info(f"  Version  : {settings.APP_VERSION}")
    logger.info(f"  Env      : {settings.ENVIRONMENT}")
    logger.info(f"  Debug    : {settings.DEBUG}")
    logger.info(f"  Docs     : http://localhost:{settings.PORT}/docs")
    logger.info("=" * 60)
    logger.success("Application started successfully.")

    yield  # Application is now running

    # ── Shutdown ──────────────────────────────────────────────────────────────
    logger.info("Application shutting down gracefully...")
    logger.success("Shutdown complete.")


# ── Application Factory ───────────────────────────────────────────────────────

def create_application() -> FastAPI:
    """Create and configure the FastAPI application instance."""

    app = FastAPI(
        title=settings.APP_NAME,
        description=settings.APP_DESCRIPTION,
        version=settings.APP_VERSION,
        docs_url="/docs",
        redoc_url="/redoc",
        openapi_url="/openapi.json",
        lifespan=lifespan,
    )

    # ── Middleware ────────────────────────────────────────────────────────────
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.CORS_ORIGINS,
        allow_credentials=settings.CORS_ALLOW_CREDENTIALS,
        allow_methods=settings.CORS_ALLOW_METHODS,
        allow_headers=settings.CORS_ALLOW_HEADERS,
    )

    # ── Request timing middleware ─────────────────────────────────────────────
    @app.middleware("http")
    async def add_process_time_header(request: Request, call_next):
        start = time.perf_counter()
        response = await call_next(request)
        duration_ms = round((time.perf_counter() - start) * 1000, 2)
        response.headers["X-Process-Time-Ms"] = str(duration_ms)
        logger.debug(f"{request.method} {request.url.path} → {response.status_code} ({duration_ms}ms)")
        return response

    # ── Global exception handler ──────────────────────────────────────────────
    @app.exception_handler(Exception)
    async def global_exception_handler(request: Request, exc: Exception) -> JSONResponse:
        logger.exception(f"Unhandled exception on {request.method} {request.url.path}: {exc}")
        return JSONResponse(
            status_code=500,
            content={
                "error": "internal_server_error",
                "message": "An unexpected error occurred. Please try again later.",
                "path": str(request.url.path),
            },
        )

    # ── Routers ───────────────────────────────────────────────────────────────
    from backend.api.v1.routes import health
    app.include_router(health.router)
    app.include_router(api_v1_router, prefix="/api/v1")

    return app


# ── Application Instance ──────────────────────────────────────────────────────

app = create_application()


# ── Development Entry Point ───────────────────────────────────────────────────

if __name__ == "__main__":
    import uvicorn

    uvicorn.run(
        "backend.main:app",
        host=settings.HOST,
        port=settings.PORT,
        reload=settings.DEBUG,
        log_level=settings.LOG_LEVEL.lower(),
    )
