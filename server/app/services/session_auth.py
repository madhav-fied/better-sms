import secrets
from datetime import datetime, timedelta, timezone

from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.models.auth import SchoolUser, Session as SessionModel
from app.services.tokens import hash_token


async def create_user_session(db: AsyncSession, school_user: SchoolUser) -> dict:
    now = datetime.now(timezone.utc)
    raw_token = secrets.token_hex(32)
    expires_at = now + timedelta(days=settings.session_ttl_days)
    session = SessionModel(
        school_user_id=school_user.id,
        token_hash=hash_token(raw_token),
        role=school_user.role,
        school_id=school_user.school_id,
        expires_at=expires_at,
    )
    db.add(session)
    await db.flush()
    return {
        "token": raw_token,
        "expires_at": expires_at.isoformat(),
        "role": school_user.role,
        "school_id": school_user.school_id,
        "user_id": school_user.id,
        "entity_id": school_user.entity_id,
    }
