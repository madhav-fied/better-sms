from datetime import datetime
from typing import List
from fastapi import APIRouter, Depends, Query, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func

from app.database import get_db
from app.deps import get_current_user
from app.models.exam import Exam, ExamScheduleEntry
from app.schemas.exam import ExamCreate, ExamUpdate, ExamOut, ExamScheduleEntryIn, ExamScheduleEntryOut
from app.schemas.common import Response, ok

router = APIRouter()


@router.post("/exams", response_model=Response)
async def create_exam(body: ExamCreate, db: AsyncSession = Depends(get_db), user: dict = Depends(get_current_user)):
    exam = Exam(school_id=user["school_id"], created_by=user["user_id"], **body.model_dump())
    db.add(exam)
    await db.flush()
    await db.refresh(exam)
    return ok(ExamOut.model_validate(exam).model_dump())


@router.get("/exams", response_model=Response)
async def list_exams(
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    academic_year_id: str = Query(None),
    status: str = Query(None),
    db: AsyncSession = Depends(get_db),
    user: dict = Depends(get_current_user),
):
    school_id = user["school_id"]
    q = select(Exam).where(Exam.school_id == school_id)
    if academic_year_id:
        q = q.where(Exam.academic_year_id == academic_year_id)
    if status:
        q = q.where(Exam.status == status)
    total = (await db.execute(select(func.count()).select_from(q.subquery()))).scalar_one()
    offset = (page - 1) * limit
    items = (await db.execute(q.order_by(Exam.display_order, Exam.created_at.desc()).offset(offset).limit(limit))).scalars().all()
    return ok([ExamOut.model_validate(e).model_dump() for e in items], meta={"page": page, "limit": limit, "total": total})


@router.get("/exams/{exam_id}", response_model=Response)
async def get_exam(exam_id: str, db: AsyncSession = Depends(get_db), user: dict = Depends(get_current_user)):
    res = await db.execute(select(Exam).where(Exam.id == exam_id, Exam.school_id == user["school_id"]))
    exam = res.scalar_one_or_none()
    if not exam:
        raise HTTPException(status_code=404, detail="Exam not found")
    return ok(ExamOut.model_validate(exam).model_dump())


@router.put("/exams/{exam_id}", response_model=Response)
async def update_exam(exam_id: str, body: ExamUpdate, db: AsyncSession = Depends(get_db), user: dict = Depends(get_current_user)):
    res = await db.execute(select(Exam).where(Exam.id == exam_id, Exam.school_id == user["school_id"]))
    exam = res.scalar_one_or_none()
    if not exam:
        raise HTTPException(status_code=404, detail="Exam not found")
    for k, v in body.model_dump(exclude_none=True).items():
        setattr(exam, k, v)
    exam.updated_at = datetime.utcnow()
    await db.flush()
    await db.refresh(exam)
    return ok(ExamOut.model_validate(exam).model_dump())


@router.delete("/exams/{exam_id}", response_model=Response)
async def delete_exam(exam_id: str, db: AsyncSession = Depends(get_db), user: dict = Depends(get_current_user)):
    res = await db.execute(select(Exam).where(Exam.id == exam_id, Exam.school_id == user["school_id"]))
    exam = res.scalar_one_or_none()
    if not exam:
        raise HTTPException(status_code=404, detail="Exam not found")
    entries = (await db.execute(select(ExamScheduleEntry).where(ExamScheduleEntry.exam_id == exam.id))).scalars().all()
    for e in entries:
        await db.delete(e)
    await db.delete(exam)
    return ok({"deleted": exam_id})


@router.get("/exams/{exam_id}/schedule", response_model=Response)
async def get_exam_schedule(
    exam_id: str,
    class_section_id: str = Query(None),
    db: AsyncSession = Depends(get_db),
    user: dict = Depends(get_current_user),
):
    res = await db.execute(select(Exam).where(Exam.id == exam_id, Exam.school_id == user["school_id"]))
    exam = res.scalar_one_or_none()
    if not exam:
        raise HTTPException(status_code=404, detail="Exam not found")
    q = select(ExamScheduleEntry).where(ExamScheduleEntry.exam_id == exam_id)
    if class_section_id:
        q = q.where(ExamScheduleEntry.class_section_id == class_section_id)
    entries = (await db.execute(q)).scalars().all()
    return ok([ExamScheduleEntryOut.model_validate(e).model_dump() for e in entries])


@router.put("/exams/{exam_id}/schedule", response_model=Response)
async def upsert_exam_schedule(
    exam_id: str,
    entries: List[ExamScheduleEntryIn],
    db: AsyncSession = Depends(get_db),
    user: dict = Depends(get_current_user),
):
    res = await db.execute(select(Exam).where(Exam.id == exam_id, Exam.school_id == user["school_id"]))
    exam = res.scalar_one_or_none()
    if not exam:
        raise HTTPException(status_code=404, detail="Exam not found")
    # Delete existing entries and replace
    existing = (await db.execute(select(ExamScheduleEntry).where(ExamScheduleEntry.exam_id == exam_id))).scalars().all()
    for e in existing:
        await db.delete(e)
    await db.flush()
    new_entries = []
    for item in entries:
        entry = ExamScheduleEntry(exam_id=exam_id, **item.model_dump())
        db.add(entry)
        new_entries.append(entry)
    await db.flush()
    for e in new_entries:
        await db.refresh(e)
    return ok([ExamScheduleEntryOut.model_validate(e).model_dump() for e in new_entries])
