from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    database_url: str = "postgresql+asyncpg://postgres:postgres@localhost:5432/sms"
    # Auth
    session_ttl_days: int = 37
    superadmin_api_key: str = "dev-superadmin-key"
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

    model_config = {"env_file": ".env", "extra": "ignore"}


settings = Settings()
