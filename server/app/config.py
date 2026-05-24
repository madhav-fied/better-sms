from pydantic import field_validator
from pydantic_settings import BaseSettings

from app.db_url import normalize_database_url


class Settings(BaseSettings):
    database_url: str = "postgresql+asyncpg://postgres:postgres@localhost:5432/sms"
    # Auth
    session_ttl_days: int = 37
    superadmin_api_key: str = "dev-superadmin-key"
    frontend_url: str = "http://localhost:3000"
    password_reset_ttl_hours: int = 24
    # Email (password reset)
    email_dev_mode: bool = True
    smtp_host: str = ""
    smtp_port: int = 587
    smtp_user: str = ""
    smtp_password: str = ""
    smtp_from: str = ""
    smtp_use_tls: bool = True
    # Fast2SMS (production)
    fast2sms_api_key: str = ""
    fast2sms_sender_id: str = "SKEDUC"
    fast2sms_template_id: str = ""
    # Dev mode: if True, OTPs are logged to console instead of sent via SMS
    otp_dev_mode: bool = True
    # OTP settings
    otp_ttl_minutes: int = 10
    otp_max_attempts: int = 5
    otp_rate_limit_count: int = 3
    otp_rate_limit_minutes: int = 15

    @field_validator("database_url", mode="before")
    @classmethod
    def _normalize_database_url(cls, v: str) -> str:
        return normalize_database_url(v)

    model_config = {"env_file": ".env", "extra": "ignore"}


settings = Settings()
