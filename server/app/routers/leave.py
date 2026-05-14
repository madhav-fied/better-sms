from datetime import datetime
from fastapi import APIRouter, Depends, Query, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func

from app.database import get_db
from app.deps import get_current_user
from app.models.leave import Leave
from app.schemas.leave import LeaveCreate, LeaveReviewIn, LeaveOut
from app.schemas.common import Response, ok

router = APIRouter()


@router.post("/leaves", response_model=Response)
async def create_leave(body: LeaveCreate, db: AsyncSession = Depends(get_db), user: dict = Depends(get_current_user)):
    leave = Leave(school_id=user["school_id"], applied_by=user["user_id"], **body.model_dump())
    db.add(leave)
    await db.flush()
    await db.refresh(leave)
    return ok(LeaveOut.model_validate(leave).model_dump())


@router.get("/leaves", response_model=Response)
async def list_leaves(
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    entity_type: str = Query(None),
    entity_id: str = Query(None),
    status: str = Query(None),
    db: AsyncSession = Depends(get_db),
    user: dict = Depends(get_current_user),
):
    school_id = user["school_id"]
    q = select(Leave).where(Leave.school_id == school_id)
    if entity_type:
        q = q.where(Leave.entity_type == entity_type)
    if entity_id:
        q = q.where(Leave.entity_id == entity_id)
    if status:
        q = q.where(Leave.status == status)
    total = (await db.execute(select(func.count()).select_from(q.subquery()))).scalar_one()
    offset = (page - 1) * limit
    items = (await db.execute(q.order_by(Leave.applied_at.desc()).offset(offset).limit(limit))).scalars().all()
    return ok([LeaveOut.model_validate(l).model_dump() for l in items], meta={"page": page, "limit": limit, "total": total})


@router.get("/leaves/{leave_id}", response_model=Response)
async def get_leave(leave_id: str, db: AsyncSession = Depends(get_db), user: dict = Depends(get_current_user)):
    res = await db.execute(select(Leave).where(Leave.id == leave_id, Leave.school_id == user["school_id"]))
    leave = res.scalar_one_or_none()
    if not leave:
        raise HTTPException(status_code=404, detail="Leave not found")
    return ok(LeaveOut.model_validate(leave).model_dump())


@router.post("/leaves/{leave_id}/approve", response_model=Response)
async def approve_leave(leave_id: str, body: LeaveReviewIn, db: AsyncSession = Depends(get_db), user: dict = Depends(get_current_user)):
    res = await db.execute(select(Leave).where(Leave.id == leave_id, Leave.school_id == user["school_id"]))
    leave = res.scalar_one_or_none()
    if not leave:
        raise HTTPException(status_code=404, detail="Leave not found")
    leave.status = "approved"
    leave.reviewed_by = user["user_id"]
    leave.reviewed_at = datetime.utcnow()
    leave.review_note = body.review_note
    await db.flush()
    await db.refresh(leave)
    return ok(LeaveOut.model_validate(leave).model_dump())


@router.post("/leaves/{leave_id}/reject", response_model=Response)
async def reject_leave(leave_id: str, body: LeaveReviewIn, db: AsyncSession = Depends(get_db), user: dict = Depends(get_current_user)):
    res = await db.execute(select(Leave).where(Leave.id == leave_id, Leave.school_id == user["school_id"]))
    leave = res.scalar_one_or_none()
    if not leave:
        raise HTTPException(status_code=404, detail="Leave not found")
    leave.status = "rejected"
    leave.reviewed_by = user["user_id"]
    leave.reviewed_at = datetime.utcnow()
    leave.review_note = body.review_note
    await db.flush()
    await db.refresh(leave)
    return ok(LeaveOut.model_validate(leave).model_dump())


@router.patch("/leaves/{leave_id}/cancel", response_model=Response)
async def cancel_leave(leave_id: str, db: AsyncSession = Depends(get_db), user: dict = Depends(get_current_user)):
    res = await db.execute(select(Leave).where(Leave.id == leave_id, Leave.school_id == user["school_id"]))
    leave = res.scalar_one_or_none()
    if not leave:
        raise HTTPException(status_code=404, detail="Leave not found")
    leave.status = "cancelled"
    await db.flush()
    await db.refresh(leave)
    return ok(LeaveOut.model_validate(leave).model_dump())
