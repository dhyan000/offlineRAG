"""
Logging Configuration
======================
Loguru-based structured logger with file rotation, coloured console output,
and a clean API for use across all backend modules.
"""

from __future__ import annotations

import sys
from pathlib import Path

from loguru import logger as _logger

from backend.core.config import settings


def configure_logging() -> None:
    """Configure the global Loguru logger for the application."""

    # Remove any default handlers
    _logger.remove()

    # ── Console handler ───────────────────────────────────────────────────────
    _logger.add(
        sys.stdout,
        level=settings.LOG_LEVEL,
        colorize=True,
        format=(
            "<green>{time:YYYY-MM-DD HH:mm:ss.SSS}</green> | "
            "<level>{level: <8}</level> | "
            "<cyan>{name}</cyan>:<cyan>{function}</cyan>:<cyan>{line}</cyan> | "
            "<level>{message}</level>"
        ),
        backtrace=True,
        diagnose=settings.DEBUG,
    )

    # ── File handler ──────────────────────────────────────────────────────────
    log_dir = Path(settings.LOG_DIR)
    log_dir.mkdir(parents=True, exist_ok=True)

    _logger.add(
        log_dir / "app_{time:YYYY-MM-DD}.log",
        level=settings.LOG_LEVEL,
        rotation=settings.LOG_ROTATION,
        retention=settings.LOG_RETENTION,
        compression="zip",
        enqueue=True,  # Thread-safe async writes
        backtrace=True,
        diagnose=settings.DEBUG,
        format=(
            "{time:YYYY-MM-DD HH:mm:ss.SSS} | "
            "{level: <8} | "
            "{name}:{function}:{line} | "
            "{message}"
        ),
    )


# Export the configured logger for import elsewhere
get_logger = _logger.bind
logger = _logger
