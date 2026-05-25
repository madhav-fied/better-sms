from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.auth import SchoolUser, UserRole
from app.models.parent import Parent
from app.services.password import hash_password
from app.utils import normalize_phone


async def provision_parent_login(
    db: AsyncSession,
    school_id: str,
    full_student_uid: str,
    pg_dict: dict,
    existing_parent_id: str | None = None,
) -> str | None:
    """Create or update a parent SchoolUser. Returns parent entity id.

    Login identifier: full_student_uid (e.g. SCH001-STU00001)
    Default password:  parent's normalized phone number
    """
    raw_phone = pg_dict.get("phone")
    if not raw_phone:
        return None

    phone = normalize_phone(raw_phone)

    # If a SchoolUser already exists for this student UID, update password to reflect new phone
    existing_res = await db.execute(
        select(SchoolUser).where(
            SchoolUser.school_id == school_id,
            SchoolUser.phone == full_student_uid,
            SchoolUser.role == UserRole.parent,
        )
    )
    existing_user = existing_res.scalar_one_or_none()
    if existing_user and existing_user.entity_id:
        existing_user.password_hash = hash_password(phone)
        existing_user.email = pg_dict.get("email")
        return existing_user.entity_id

    if existing_parent_id:
        parent_id = existing_parent_id
    else:
        name = (
            pg_dict.get("name")
            or f"{pg_dict.get('first_name', '')} {pg_dict.get('last_name', '')}".strip()
            or "Parent"
        )
        parent = Parent(school_id=school_id, name=name, phone=phone, email=pg_dict.get("email"))
        db.add(parent)
        await db.flush()
        parent_id = parent.id

    db.add(SchoolUser(
        school_id=school_id,
        role=UserRole.parent,
        phone=full_student_uid,
        email=pg_dict.get("email"),
        password_hash=hash_password(phone),
        entity_id=parent_id,
    ))
    return parent_id


def parent_guardian_row_data(body) -> dict:
    """ORM fields for ParentGuardian from a ParentGuardianCreate instance."""
    return body.model_dump(exclude_none=True)


def parent_guardian_provision_data(body) -> dict:
    """Full dict for provision_parent_login from a ParentGuardianCreate instance."""
    return body.model_dump(exclude_none=True)
