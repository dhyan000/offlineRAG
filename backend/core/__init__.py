"""
Core Package
=============
Exports primary application utilities: settings and logger.
"""

from backend.core.config import get_settings, settings
from backend.core.logging import configure_logging, logger

__all__ = ["settings", "get_settings", "configure_logging", "logger"]
