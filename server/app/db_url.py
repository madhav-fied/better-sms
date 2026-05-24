"""Normalize Postgres URLs for async SQLAlchemy (Railway, Heroku, etc.)."""

from typing import Optional


def normalize_database_url(url: Optional[str]) -> str:
    if not url:
        return url or ""
    url = url.strip().strip('"').strip("'")
    if url.startswith("postgres://"):
        return "postgresql+asyncpg://" + url[len("postgres://") :]
    if url.startswith("postgresql+psycopg2://"):
        return "postgresql+asyncpg://" + url[len("postgresql+psycopg2://") :]
    if url.startswith("postgresql://") and "+asyncpg" not in url:
        return "postgresql+asyncpg://" + url[len("postgresql://") :]
    return url
