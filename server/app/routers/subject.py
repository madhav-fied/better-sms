from typing import Optional

from fastapi import APIRouter, Depends, Query, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from sqlalchemy.exc import IntegrityError

from app.database import get_db
from app.deps import get_current_user, CurrentUser, require_admin
from app.models.subject import Subject
from app.schemas.subject import SubjectCreate, SubjectUpdate, SubjectOut
from app.schemas.common import Response, ok

router = APIRouter()


@router.post("/subjects", response_model=Response)
async def create_subject(
    body: SubjectCreate,
    user: CurrentUser,
    _: None = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    school_id = user["school_id"]
    # Check for duplicate name
    existing_res = await db.execute(
        select(Subject).where(Subject.school_id == school_id, Subject.name == body.name)
    )
    if existing_res.scalar_one_or_none():
        raise HTTPException(status_code=409, detail="Subject with this name already exists for this school")

    subject = Subject(school_id=school_id, name=body.name)
    db.add(subject)
    try:
        await db.flush()
    except IntegrityError:
        raise HTTPException(status_code=409, detail="Subject with this name already exists for this school")
    await db.refresh(subject)
    return ok(SubjectOut.model_validate(subject).model_dump())


@router.get("/subjects", response_model=Response)
async def list_subjects(
    is_active: Optional[bool] = Query(None),
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=500),
    user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    school_id = user["school_id"]
    q = select(Subject).where(Subject.school_id == school_id)
    if is_active is not None:
        q = q.where(Subject.is_active == is_active)
    total = (await db.execute(select(func.count()).select_from(q.subquery()))).scalar_one()
    offset = (page - 1) * limit
    items = (await db.execute(q.order_by(Subject.name).offset(offset).limit(limit))).scalars().all()
    return ok([SubjectOut.model_validate(s).model_dump() for s in items], meta={"page": page, "limit": limit, "total": total})


@router.put("/subjects/{subject_id}", response_model=Response)
async def update_subject(
    subject_id: str,
    body: SubjectUpdate,
    user: dict = Depends(get_current_user),
    _: None = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    school_id = user["school_id"]
    res = await db.execute(
        select(Subject).where(Subject.id == subject_id, Subject.school_id == school_id)
    )
    subject = res.scalar_one_or_none()
    if not subject:
        raise HTTPException(status_code=404, detail="Subject not found")

    if body.name is not None:
        # Check for duplicate name (excluding current)
        dup_res = await db.execute(
            select(Subject).where(
                Subject.school_id == school_id,
                Subject.name == body.name,
                Subject.id != subject_id,
            )
        )
        if dup_res.scalar_one_or_none():
            raise HTTPException(status_code=409, detail="Subject with this name already exists for this school")
        subject.name = body.name

    if body.is_active is not None:
        subject.is_active = body.is_active

    try:
        await db.flush()
    except IntegrityError:
        raise HTTPException(status_code=409, detail="Subject with this name already exists for this school")
    await db.refresh(subject)
    return ok(SubjectOut.model_validate(subject).model_dump())


@router.delete("/subjects/{subject_id}", response_model=Response)
async def delete_subject(
    subject_id: str,
    user: dict = Depends(get_current_user),
    _: None = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    school_id = user["school_id"]
    res = await db.execute(
        select(Subject).where(Subject.id == subject_id, Subject.school_id == school_id)
    )
    subject = res.scalar_one_or_none()
    if not subject:
        raise HTTPException(status_code=404, detail="Subject not found")

    # Check if subject is referenced by homework or syllabus
    from app.models.homework import Homework
    from app.models.communications import Syllabus

    hw_res = await db.execute(
        select(func.count()).select_from(Homework).where(
            Homework.school_id == school_id,
            Homework.subject == subject.name,
        )
    )
    if hw_res.scalar_one() > 0:
        raise HTTPException(status_code=409, detail="Subject is referenced by homework records and cannot be deleted")

    syl_res = await db.execute(
        select(func.count()).select_from(Syllabus).where(
            Syllabus.school_id == school_id,
            Syllabus.subject == subject.name,
        )
    )
    if syl_res.scalar_one() > 0:
        raise HTTPException(status_code=409, detail="Subject is referenced by syllabus records and cannot be deleted")

    await db.delete(subject)
    await db.flush()
    return ok({"deleted": subject_id})
