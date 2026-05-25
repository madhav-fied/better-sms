import hashlib
from datetime import datetime, timedelta, timezone
from typing import Annotated

from fastapi import Depends, HTTPException, status, Request
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.database import get_db
from app.config import settings
from app.models.auth import Session as SessionModel, SchoolUser

bearer_scheme = HTTPBearer(auto_error=True)


def _hash_token(token: str) -> str:
    return hashlib.sha256(token.encode()).hexdigest()


async def get_current_user(
    request: Request,
    credentials: Annotated[HTTPAuthorizationCredentials, Depends(bearer_scheme)],
    db: AsyncSession = Depends(get_db),
) -> dict:
    token = credentials.credentials

    # Superadmin shortcut — static API key
    if token == settings.superadmin_api_key:
        user = {"user_id": "superadmin", "school_id": None, "role": "superadmin", "entity_id": None}
        x_school = request.headers.get("X-School-Id")
        if x_school:
            user["school_id"] = x_school
        return user

    token_hash = _hash_token(token)
    now = datetime.now(timezone.utc)

    result = await db.execute(
        select(SessionModel, SchoolUser.entity_id, SchoolUser.school_id)
        .join(SchoolUser, SessionModel.school_user_id == SchoolUser.id)
        .where(
            SessionModel.token_hash == token_hash,
            SessionModel.expires_at > now,
        )
    )
    row = result.one_or_none()
    if not row:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid or expired session")

    session, entity_id, user_school_id = row

    # Sliding renewal: reset TTL if within last 7 days
    slide_threshold = session.expires_at - timedelta(days=7)
    if now >= slide_threshold:
        new_expires = now + timedelta(days=settings.session_ttl_days)
        session.expires_at = new_expires
    session.last_seen_at = now

    if session.role == "superadmin":
        school_id = session.school_id
    else:
        school_id = session.school_id or user_school_id
        if school_id and session.school_id != school_id:
            session.school_id = school_id

    await db.flush()

    user = {
        "user_id": session.school_user_id,
        "school_id": school_id,
        "role": session.role,
        "entity_id": entity_id,
    }
    if user["role"] == "superadmin":
        x_school = request.headers.get("X-School-Id")
        if x_school:
            user["school_id"] = x_school
    return user


CurrentUser = Annotated[dict, Depends(get_current_user)]


# ── Role guards ───────────────────────────────────────────────────────────────

def require_superadmin(user: CurrentUser):
    if user["role"] not in ("superadmin",):
        raise HTTPException(status_code=403, detail="Superadmin role required")


def require_admin(user: CurrentUser):
    if user["role"] not in ("superadmin", "admin"):
        raise HTTPException(status_code=403, detail="Admin role required")


def require_teacher(user: CurrentUser):
    if user["role"] not in ("superadmin", "admin", "teacher"):
        raise HTTPException(status_code=403, detail="Teacher or admin role required")


def require_staff(user: CurrentUser):
    if user["role"] not in ("superadmin", "admin", "teacher"):
        raise HTTPException(status_code=403, detail="Staff role required")
