from pydantic import field_validator
from pydantic_settings import BaseSettings

from app.db_url import normalize_database_url


class Settings(BaseSettings):
    database_url: str = "postgresql+asyncpg://postgres:postgres@localhost:5432/sms"
    # Auth
    session_ttl_days: int = 37
    superadmin_api_key: str = "dev-superadmin-key"

    @field_validator("database_url", mode="before")
    @classmethod
    def _normalize_database_url(cls, v: str) -> str:
        return normalize_database_url(v)

    model_config = {"env_file": ".env", "extra": "ignore"}


settings = Settings()
