from typing import Optional

from fastapi import APIRouter, Depends, Query, HTTPException
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, delete

from app.database import get_db
from app.deps import get_current_user, CurrentUser, require_admin
from app.models.auth import SchoolUser, Session as SessionModel
from app.schemas.common import Response, ok
from app.utils import normalize_phone

router = APIRouter()


class UserCreate(BaseModel):
    phone: str
    role: str
    entity_id: Optional[str] = None


class UserStatusUpdate(BaseModel):
    is_active: bool


def _user_out(u: SchoolUser) -> dict:
    return {
        "id": u.id,
        "school_id": u.school_id,
        "role": u.role,
        "phone": u.phone,
        "entity_id": u.entity_id,
        "is_active": u.is_active,
        "created_at": u.created_at,
    }


@router.post("/users", response_model=Response)
async def create_user(
    body: UserCreate,
    user: CurrentUser,
    _: None = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    school_id = user["school_id"]
    new_user = SchoolUser(
        school_id=school_id,
        phone=normalize_phone(body.phone),
        role=body.role,
        entity_id=body.entity_id,
    )
    db.add(new_user)
    await db.flush()
    await db.refresh(new_user)
    return ok(_user_out(new_user))


@router.get("/users", response_model=Response)
async def list_users(
    role: Optional[str] = Query(None),
    is_active: Optional[bool] = Query(None),
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    user: dict = Depends(get_current_user),
    _: None = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    school_id = user["school_id"]
    q = select(SchoolUser).where(SchoolUser.school_id == school_id)
    if role:
        q = q.where(SchoolUser.role == role)
    if is_active is not None:
        q = q.where(SchoolUser.is_active == is_active)
    total = (await db.execute(select(func.count()).select_from(q.subquery()))).scalar_one()
    offset = (page - 1) * limit
    items = (await db.execute(q.order_by(SchoolUser.created_at.desc()).offset(offset).limit(limit))).scalars().all()
    return ok([_user_out(u) for u in items], meta={"page": page, "limit": limit, "total": total})


@router.get("/users/{user_id}", response_model=Response)
async def get_user(
    user_id: str,
    user: dict = Depends(get_current_user),
    _: None = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    school_id = user["school_id"]
    res = await db.execute(
        select(SchoolUser).where(SchoolUser.id == user_id, SchoolUser.school_id == school_id)
    )
    found = res.scalar_one_or_none()
    if not found:
        raise HTTPException(status_code=404, detail="User not found")
    return ok(_user_out(found))


@router.patch("/users/{user_id}/status", response_model=Response)
async def set_user_status(
    user_id: str,
    body: UserStatusUpdate,
    user: dict = Depends(get_current_user),
    _: None = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    school_id = user["school_id"]
    res = await db.execute(
        select(SchoolUser).where(SchoolUser.id == user_id, SchoolUser.school_id == school_id)
    )
    found = res.scalar_one_or_none()
    if not found:
        raise HTTPException(status_code=404, detail="User not found")
    found.is_active = body.is_active
    await db.flush()
    await db.refresh(found)
    return ok(_user_out(found))


@router.delete("/users/{user_id}/sessions", response_model=Response)
async def delete_user_sessions(
    user_id: str,
    user: dict = Depends(get_current_user),
    _: None = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    school_id = user["school_id"]
    # Verify the target user belongs to this school
    res = await db.execute(
        select(SchoolUser).where(SchoolUser.id == user_id, SchoolUser.school_id == school_id)
    )
    found = res.scalar_one_or_none()
    if not found:
        raise HTTPException(status_code=404, detail="User not found")

    sessions_res = await db.execute(
        select(SessionModel).where(SessionModel.school_user_id == user_id)
    )
    sessions = sessions_res.scalars().all()
    count = len(sessions)
    for s in sessions:
        await db.delete(s)
    await db.flush()
    return ok({"deleted_sessions": count})
