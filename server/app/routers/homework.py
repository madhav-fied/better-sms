from datetime import datetime
from fastapi import APIRouter, Depends, Query, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func

from app.database import get_db
from app.deps import get_current_user
from app.models.homework import Homework, HomeworkAttachment
from app.schemas.homework import HomeworkCreate, HomeworkUpdate, HomeworkOut, HomeworkAttachmentOut
from app.schemas.common import Response, ok

router = APIRouter()


def _hw_out(hw, attachments: list) -> dict:
    return {
        "id": hw.id,
        "school_id": hw.school_id,
        "academic_year_id": hw.academic_year_id,
        "class_section_id": hw.class_section_id,
        "subject": hw.subject,
        "title": hw.title,
        "description": hw.description,
        "assigned_by": hw.assigned_by,
        "assigned_date": hw.assigned_date,
        "due_date": hw.due_date,
        "status": hw.status,
        "created_at": hw.created_at,
        "updated_at": hw.updated_at,
        "attachments": attachments,
    }

@router.post("/homework", response_model=Response)
async def create_homework(body: HomeworkCreate, db: AsyncSession = Depends(get_db), user: dict = Depends(get_current_user)):
    hw = Homework(school_id=user["school_id"], assigned_by=user["user_id"], **body.model_dump())
    db.add(hw)
    await db.flush()
    await db.refresh(hw)
    return ok(_hw_out(hw, []))


@router.get("/homework", response_model=Response)
async def list_homework(
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    class_section_id: str = Query(None),
    academic_year_id: str = Query(None),
    subject: str = Query(None),
    status: str = Query(None),
    db: AsyncSession = Depends(get_db),
    user: dict = Depends(get_current_user),
):
    school_id = user["school_id"]
    q = select(Homework).where(Homework.school_id == school_id)
    if class_section_id:
        q = q.where(Homework.class_section_id == class_section_id)
    if academic_year_id:
        q = q.where(Homework.academic_year_id == academic_year_id)
    if subject:
        q = q.where(Homework.subject == subject)
    if status:
        q = q.where(Homework.status == status)
    total = (await db.execute(select(func.count()).select_from(q.subquery()))).scalar_one()
    offset = (page - 1) * limit
    hws = (await db.execute(q.order_by(Homework.created_at.desc()).offset(offset).limit(limit))).scalars().all()
    results = []
    for hw in hws:
        atts = (await db.execute(select(HomeworkAttachment).where(HomeworkAttachment.homework_id == hw.id))).scalars().all()
        results.append(_hw_out(hw, [HomeworkAttachmentOut.model_validate(a).model_dump() for a in atts]))
    return ok(results, meta={"page": page, "limit": limit, "total": total})


@router.get("/homework/{hw_id}", response_model=Response)
async def get_homework(hw_id: str, db: AsyncSession = Depends(get_db), user: dict = Depends(get_current_user)):
    res = await db.execute(select(Homework).where(Homework.id == hw_id, Homework.school_id == user["school_id"]))
    hw = res.scalar_one_or_none()
    if not hw:
        raise HTTPException(status_code=404, detail="Homework not found")
    atts = (await db.execute(select(HomeworkAttachment).where(HomeworkAttachment.homework_id == hw.id))).scalars().all()
    return ok(_hw_out(hw, [HomeworkAttachmentOut.model_validate(a).model_dump() for a in atts]))


@router.put("/homework/{hw_id}", response_model=Response)
async def update_homework(hw_id: str, body: HomeworkUpdate, db: AsyncSession = Depends(get_db), user: dict = Depends(get_current_user)):
    res = await db.execute(select(Homework).where(Homework.id == hw_id, Homework.school_id == user["school_id"]))
    hw = res.scalar_one_or_none()
    if not hw:
        raise HTTPException(status_code=404, detail="Homework not found")
    for k, v in body.model_dump(exclude_none=True).items():
        setattr(hw, k, v)
    hw.updated_at = datetime.utcnow()
    await db.flush()
    await db.refresh(hw)
    atts = (await db.execute(select(HomeworkAttachment).where(HomeworkAttachment.homework_id == hw.id))).scalars().all()
    return ok(_hw_out(hw, [HomeworkAttachmentOut.model_validate(a).model_dump() for a in atts]))


@router.patch("/homework/{hw_id}/cancel", response_model=Response)
async def cancel_homework(hw_id: str, db: AsyncSession = Depends(get_db), user: dict = Depends(get_current_user)):
    res = await db.execute(select(Homework).where(Homework.id == hw_id, Homework.school_id == user["school_id"]))
    hw = res.scalar_one_or_none()
    if not hw:
        raise HTTPException(status_code=404, detail="Homework not found")
    hw.status = "cancelled"
    hw.updated_at = datetime.utcnow()
    await db.flush()
    await db.refresh(hw)
    return ok(_hw_out(hw, []))


@router.delete("/homework/{hw_id}", response_model=Response)
async def delete_homework(hw_id: str, db: AsyncSession = Depends(get_db), user: dict = Depends(get_current_user)):
    res = await db.execute(select(Homework).where(Homework.id == hw_id, Homework.school_id == user["school_id"]))
    hw = res.scalar_one_or_none()
    if not hw:
        raise HTTPException(status_code=404, detail="Homework not found")
    await db.execute(select(HomeworkAttachment).where(HomeworkAttachment.homework_id == hw.id))
    # Delete attachments first
    atts = (await db.execute(select(HomeworkAttachment).where(HomeworkAttachment.homework_id == hw.id))).scalars().all()
    for a in atts:
        await db.delete(a)
    await db.delete(hw)
    return ok({"deleted": hw_id})
