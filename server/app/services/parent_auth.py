import re

from fastapi import HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.auth import SchoolUser, UserRole
from app.models.parent import Parent
from app.services.password import hash_password
from app.utils import normalize_phone

EMAIL_RE = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")


def _normalize_email(email: str) -> str:
    return email.strip().lower()


async def provision_parent_login(
    db: AsyncSession,
    school_id: str,
    pg_dict: dict,
    existing_parent_id: str | None = None,
) -> str | None:
    """Create or update a parent login (SchoolUser + Parent entity). Returns parent entity id."""
    raw_phone = pg_dict.get("phone")
    if not raw_phone:
        return None

    phone = normalize_phone(raw_phone)
    raw_email = pg_dict.get("email")
    password = pg_dict.get("login_password")

    if not raw_email:
        raise HTTPException(status_code=422, detail="Parent email is required for login access")
    if not password:
        raise HTTPException(status_code=422, detail="Parent password is required for login access")

    email = _normalize_email(raw_email)
    if not EMAIL_RE.match(email):
        raise HTTPException(status_code=422, detail="Invalid parent email address")

    existing_res = await db.execute(
        select(SchoolUser).where(
            SchoolUser.school_id == school_id,
            SchoolUser.phone == phone,
            SchoolUser.role == UserRole.parent,
            SchoolUser.is_active == True,
        )
    )
    existing_user = existing_res.scalar_one_or_none()
    if existing_user and existing_user.entity_id:
        existing_user.email = email
        existing_user.password_hash = hash_password(password)
        return existing_user.entity_id

    email_res = await db.execute(
        select(SchoolUser).where(
            SchoolUser.email == email,
            SchoolUser.is_active == True,
            SchoolUser.school_id == school_id,
        )
    )
    if email_res.scalar_one_or_none():
        raise HTTPException(status_code=409, detail="Email already registered for this school")

    phone_res = await db.execute(
        select(SchoolUser).where(
            SchoolUser.phone == phone,
            SchoolUser.is_active == True,
            SchoolUser.school_id == school_id,
        )
    )
    if phone_res.scalar_one_or_none():
        raise HTTPException(status_code=409, detail="Phone already registered for this school")

    if existing_parent_id:
        parent_id = existing_parent_id
    else:
        name = pg_dict.get("name") or f"{pg_dict.get('first_name', '')} {pg_dict.get('last_name', '')}".strip() or "Parent"
        parent = Parent(
            school_id=school_id,
            name=name,
            phone=phone,
            email=email,
        )
        db.add(parent)
        await db.flush()
        parent_id = parent.id

    db.add(
        SchoolUser(
            school_id=school_id,
            role=UserRole.parent,
            phone=phone,
            email=email,
            password_hash=hash_password(password),
            entity_id=parent_id,
        )
    )
    return parent_id


def parent_guardian_row_data(body) -> dict:
    """ORM fields for ParentGuardian from a ParentGuardianCreate instance."""
    data = body.model_dump(exclude_none=True)
    data.pop("login_password", None)
    return data


def parent_guardian_provision_data(body) -> dict:
    """Full dict for provision_parent_login from a ParentGuardianCreate instance."""
    return body.model_dump(exclude_none=True)
