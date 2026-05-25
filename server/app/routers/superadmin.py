from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func

from app.database import get_db
from app.deps import CurrentUser, require_superadmin
from app.models.core import School
from app.models.auth import SchoolUser
from app.schemas.core import SchoolOut
from app.schemas.common import Response, ok
from app.services.password import hash_password
from app.utils import normalize_phone

router = APIRouter()


class OnboardSchoolBody(BaseModel):
    name: str
    branch_name: Optional[str] = None
    address: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    attendance_mode: str = "period"
    uses_saturday: bool = False
    admin_phone: str


@router.post("/superadmin/onboard-school", response_model=Response)
async def onboard_school(
    body: OnboardSchoolBody,
    user: CurrentUser,
    _: None = Depends(require_superadmin),
    db: AsyncSession = Depends(get_db),
):
    max_code = (await db.execute(select(func.coalesce(func.max(School.school_code), 0)))).scalar_one()
    school = School(
        school_code=max_code + 1,
        name=body.name,
        branch_name=body.branch_name,
        address=body.address,
        phone=body.phone,
        email=body.email,
        attendance_mode=body.attendance_mode,
        uses_saturday=body.uses_saturday,
    )
    db.add(school)
    await db.flush()
    await db.refresh(school)

    admin_phone = normalize_phone(body.admin_phone)
    existing = await db.execute(
        select(SchoolUser).where(
            SchoolUser.phone == admin_phone,
            SchoolUser.school_id == school.id,
        )
    )
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=409, detail="Admin phone already registered for this school")

    admin_user = SchoolUser(
        school_id=school.id,
        phone=admin_phone,
        role="admin",
        password_hash=hash_password(admin_phone),
    )
    db.add(admin_user)
    await db.flush()
    await db.refresh(admin_user)

    return ok({
        "school": SchoolOut.model_validate(school).model_dump(),
        "admin_user": {
            "id": admin_user.id,
            "phone": admin_user.phone,
            "role": admin_user.role,
            "school_id": admin_user.school_id,
        },
    })
