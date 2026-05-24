import re
import secrets
from datetime import datetime, timedelta, timezone
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, field_validator
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.database import get_db
from app.models.auth import SchoolUser, PasswordResetToken
from app.models.core import School
from app.schemas.common import Response, ok
from app.services.email import send_password_reset_email
from app.services.tokens import hash_token
from app.services.password import hash_password, verify_password
from app.services.session_auth import create_user_session
from app.routers.auth_helpers import (
    login_option_label,
    resolve_school_id,
    school_id_filter,
)

router = APIRouter()

EMAIL_RE = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")


def _normalize_email(email: str) -> str:
    return email.strip().lower()


def _is_email(identifier: str) -> bool:
    return "@" in identifier


def _login_options_for_users(users: list[SchoolUser], schools: dict[str, str]) -> list[dict]:
    return [
        {
            "school_id": u.school_id,
            "school_name": login_option_label(u.role, schools.get(u.school_id or "", "")),
            "role": u.role,
            "user_id": u.id,
        }
        for u in users
    ]


async def _school_name_map(db: AsyncSession, users: list[SchoolUser]) -> dict[str, str]:
    school_ids = [u.school_id for u in users if u.school_id]
    if not school_ids:
        return {}
    res = await db.execute(select(School).where(School.id.in_(school_ids)))
    return {s.id: s.name for s in res.scalars().all()}


async def _find_users_by_identifier(
    db: AsyncSession,
    identifier: str,
    school_id: Optional[str] = None,
    school_id_set: bool = False,
) -> list[SchoolUser]:
    q = select(SchoolUser).where(SchoolUser.is_active == True)
    if _is_email(identifier):
        q = q.where(SchoolUser.email == _normalize_email(identifier))
    else:
        q = q.where(SchoolUser.phone == identifier.strip())
    if school_id_set:
        q = q.where(school_id_filter(SchoolUser.school_id, school_id))
    res = await db.execute(q)
    return list(res.scalars().all())


class PasswordLoginBody(BaseModel):
    identifier: str  # email or phone
    password: str
    school_id: Optional[str] = None
    user_id: Optional[str] = None  # disambiguation when multiple accounts


class ForgotPasswordBody(BaseModel):
    email: str
    school_id: Optional[str] = None
    user_id: Optional[str] = None

    @field_validator("email")
    @classmethod
    def validate_email(cls, v: str) -> str:
        e = _normalize_email(v)
        if not EMAIL_RE.match(e):
            raise ValueError("Invalid email address")
        return e


class ResetPasswordBody(BaseModel):
    token: str
    password: str

    @field_validator("password")
    @classmethod
    def validate_password(cls, v: str) -> str:
        if not v:
            raise ValueError("Password is required")
        return v


@router.post("/auth/login", response_model=Response)
async def password_login(body: PasswordLoginBody, db: AsyncSession = Depends(get_db)):
    resolved_school_id = resolve_school_id(body.school_id)
    school_id_set = "school_id" in body.model_fields_set

    if body.user_id:
        res = await db.execute(
            select(SchoolUser).where(
                SchoolUser.id == body.user_id,
                SchoolUser.is_active == True,
            )
        )
        user = res.scalar_one_or_none()
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
        if not user.password_hash or not verify_password(body.password, user.password_hash):
            raise HTTPException(status_code=401, detail="Invalid email/phone or password")
        return ok(await create_user_session(db, user))

    users = await _find_users_by_identifier(
        db, body.identifier.strip(), resolved_school_id, school_id_set
    )
    users_with_password = [u for u in users if u.password_hash]

    if len(users_with_password) == 0:
        raise HTTPException(status_code=401, detail="Invalid email/phone or password")

    matching = [
        u for u in users_with_password
        if verify_password(body.password, u.password_hash or "")
    ]
    if len(matching) == 0:
        raise HTTPException(status_code=401, detail="Invalid email/phone or password")

    if len(matching) > 1 and not school_id_set and not body.user_id:
        school_map = await _school_name_map(db, matching)
        return ok(
            None,
            meta={
                "requires_account_selection": True,
                "accounts": _login_options_for_users(matching, school_map),
            },
        )

    return ok(await create_user_session(db, matching[0]))


@router.post("/auth/forgot-password", response_model=Response)
async def forgot_password(body: ForgotPasswordBody, db: AsyncSession = Depends(get_db)):
    resolved_school_id = resolve_school_id(body.school_id)
    school_id_set = "school_id" in body.model_fields_set

    if body.user_id:
        res = await db.execute(
            select(SchoolUser).where(SchoolUser.id == body.user_id, SchoolUser.is_active == True)
        )
        users = [res.scalar_one_or_none()]
        users = [u for u in users if u]
    else:
        users = await _find_users_by_identifier(
            db, body.email, resolved_school_id, school_id_set
        )

    users = [u for u in users if u and u.email]
    if not users:
        return ok({"message": "If that email is registered, a reset link has been sent."})

    if len(users) > 1 and not body.user_id:
        school_map = await _school_name_map(db, users)
        return ok(
            None,
            meta={
                "requires_account_selection": True,
                "accounts": _login_options_for_users(users, school_map),
            },
        )

    user = users[0]
    now = datetime.now(timezone.utc)
    raw_token = secrets.token_urlsafe(32)
    reset = PasswordResetToken(
        school_user_id=user.id,
        token_hash=hash_token(raw_token),
        expires_at=now + timedelta(hours=settings.password_reset_ttl_hours),
    )
    db.add(reset)
    await db.flush()

    reset_url = f"{settings.frontend_url.rstrip('/')}/reset-password?token={raw_token}"
    send_password_reset_email(user.email, reset_url)

    return ok({"message": "If that email is registered, a reset link has been sent."})


@router.post("/auth/reset-password", response_model=Response)
async def reset_password(body: ResetPasswordBody, db: AsyncSession = Depends(get_db)):
    now = datetime.now(timezone.utc)
    token_hash = hash_token(body.token)
    res = await db.execute(
        select(PasswordResetToken).where(
            PasswordResetToken.token_hash == token_hash,
            PasswordResetToken.used == False,
            PasswordResetToken.expires_at > now,
        )
    )
    reset = res.scalar_one_or_none()
    if not reset:
        raise HTTPException(status_code=400, detail="Invalid or expired reset link")

    user_res = await db.execute(
        select(SchoolUser).where(SchoolUser.id == reset.school_user_id, SchoolUser.is_active == True)
    )
    user = user_res.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    user.password_hash = hash_password(body.password)
    reset.used = True
    await db.flush()

    return ok({"message": "Password updated successfully"})
