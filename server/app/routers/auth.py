from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.database import get_db
from app.deps import get_current_user, CurrentUser
from app.models.auth import SchoolUser, Session as SessionModel
from app.models.core import School
from app.schemas.common import Response, ok

router = APIRouter()


@router.post("/auth/logout", response_model=Response)
async def logout(user: CurrentUser, db: AsyncSession = Depends(get_db)):
    if user["user_id"] == "superadmin":
        return ok({"logged_out": True})

    res = await db.execute(
        select(SessionModel).where(
            SessionModel.school_user_id == user["user_id"],
        ).order_by(SessionModel.last_seen_at.desc())
    )
    session = res.scalars().first()
    if session:
        await db.delete(session)
        await db.flush()

    return ok({"logged_out": True})


@router.get("/auth/me", response_model=Response)
async def me(user: CurrentUser, db: AsyncSession = Depends(get_db)):
    if user["user_id"] == "superadmin":
        return ok({
            "user_id": "superadmin",
            "school_id": None,
            "school_name": None,
            "school_branch_name": None,
            "role": "superadmin",
            "entity_id": None,
        })

    res = await db.execute(select(SchoolUser).where(SchoolUser.id == user["user_id"]))
    school_user = res.scalar_one_or_none()
    if not school_user:
        raise HTTPException(status_code=404, detail="User not found")

    school_res = await db.execute(select(School).where(School.id == school_user.school_id))
    school = school_res.scalar_one_or_none()

    return ok({
        "user_id": school_user.id,
        "school_id": school_user.school_id,
        "school_name": school.name if school else None,
        "school_branch_name": school.branch_name if school else None,
        "role": school_user.role,
        "phone": school_user.phone,
        "email": school_user.email,
        "entity_id": school_user.entity_id,
        "is_active": school_user.is_active,
    })
