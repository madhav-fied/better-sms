import hashlib
import logging
import random
import string
from datetime import datetime, timedelta, timezone
from typing import Optional

import httpx

from app.config import settings

logger = logging.getLogger(__name__)


def generate_otp() -> str:
    return "".join(random.choices(string.digits, k=6))


def hash_otp(otp: str) -> str:
    return hashlib.sha256(otp.encode()).hexdigest()


def hash_token(token: str) -> str:
    return hashlib.sha256(token.encode()).hexdigest()


def otp_expires_at() -> datetime:
    return datetime.now(timezone.utc) + timedelta(minutes=settings.otp_ttl_minutes)


async def send_otp(phone: str, otp: str) -> None:
    if settings.otp_dev_mode:
        logger.warning("DEV OTP for %s: %s", phone, otp)
        return
    async with httpx.AsyncClient() as client:
        resp = await client.post(
            "https://www.fast2sms.com/dev/bulkV2",
            headers={"authorization": settings.fast2sms_api_key},
            json={
                "route": "dlt",
                "sender_id": settings.fast2sms_sender_id,
                "message": settings.fast2sms_template_id,
                "variables_values": otp,
                "flash": 0,
                "numbers": phone,
            },
            timeout=10,
        )
        resp.raise_for_status()
