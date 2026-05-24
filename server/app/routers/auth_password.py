import re
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.deps import CurrentUser
from app.models.auth import SchoolUser, UserRole
from app.models.core import School
from app.schemas.common import Response, ok
from app.services.password import hash_password, verify_password
from app.services.session_auth import create_user_session
from app.utils import normalize_phone

router = APIRouter()

_STUDENT_UID_RE = re.compile(r"^SCH\d+-STU\d+$")


def _login_options(users: list[SchoolUser], schools: dict[str, str]) -> list[dict]:
    return [
        {
            "school_id": u.school_id,
            "school_name": schools.get(u.school_id or "", "") or "School",
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


class LoginBody(BaseModel):
    identifier: str
    password: str
    school_id: Optional[str] = None
    user_id: Optional[str] = None  # post account-selection disambiguation


class ChangePasswordBody(BaseModel):
    new_password: str
    current_password: Optional[str] = None


@router.post("/auth/login", response_model=Response)
async def login(body: LoginBody, db: AsyncSession = Depends(get_db)):
    identifier = body.identifier.strip()
    print(body)

    # ── Parent login: identifier is SCH###-STU##### ───────────────────────────
    if _STUDENT_UID_RE.match(identifier):
        res = await db.execute(
            select(SchoolUser).where(
                SchoolUser.phone == identifier,
                SchoolUser.role == UserRole.parent,
                SchoolUser.is_active == True,
            )
        )
        user = res.scalar_one_or_none()
        if not user or not user.password_hash:
            raise HTTPException(status_code=401, detail="Invalid credentials")
        # Parent's password is their phone number — normalize before verifying
        if not verify_password(normalize_phone(body.password), user.password_hash):
            raise HTTPException(status_code=401, detail="Invalid credentials")
        return ok(await create_user_session(db, user))

    # ── Admin / teacher login: identifier is phone number ────────────────────
    if body.user_id:
        # Direct lookup after account-selection step
        res = await db.execute(
            select(SchoolUser).where(
                SchoolUser.id == body.user_id,
                SchoolUser.role.in_([UserRole.superadmin, UserRole.admin, UserRole.teacher]),
                SchoolUser.is_active == True,
            )
        )
        user = res.scalar_one_or_none()
        print(user)
        if not user or not user.password_hash or not verify_password(body.password, user.password_hash):
            raise HTTPException(status_code=401, detail="Invalid credentials")
        return ok(await create_user_session(db, user))

    phone = normalize_phone(identifier)
    q = select(SchoolUser).where(
        SchoolUser.phone == phone,
        SchoolUser.role.in_([UserRole.superadmin, UserRole.admin, UserRole.teacher]),
        SchoolUser.is_active == True,
    )
    if body.school_id:
        q = q.where(SchoolUser.school_id == body.school_id)

    users = list((await db.execute(q)).scalars().all())
    matching = [u for u in users if u.password_hash and verify_password(body.password, u.password_hash)]

    if not matching:
        raise HTTPException(status_code=401, detail="Invalid credentials")

    if len(matching) > 1:
        school_map = await _school_name_map(db, matching)
        return ok(None, meta={
            "requires_account_selection": True,
            "accounts": _login_options(matching, school_map),
        })

    return ok(await create_user_session(db, matching[0]))


@router.post("/auth/change-password", response_model=Response)
async def change_password(
    body: ChangePasswordBody,
    user: CurrentUser,
    db: AsyncSession = Depends(get_db),
):
    if user["user_id"] == "superadmin":
        raise HTTPException(status_code=400, detail="Superadmin password is managed via server config")
    if not body.new_password:
        raise HTTPException(status_code=422, detail="new_password is required")

    res = await db.execute(select(SchoolUser).where(SchoolUser.id == user["user_id"]))
    school_user = res.scalar_one_or_none()
    if not school_user:
        raise HTTPException(status_code=404, detail="User not found")

    if body.current_password and school_user.password_hash:
        if not verify_password(body.current_password, school_user.password_hash):
            raise HTTPException(status_code=401, detail="Current password is incorrect")

    school_user.password_hash = hash_password(body.new_password)
    await db.flush()
    return ok({"message": "Password updated"})
