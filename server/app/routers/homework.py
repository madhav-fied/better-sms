from datetime import datetime
from fastapi import APIRouter, Depends, Query, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func

from app.database import get_db
from app.deps import get_current_user, CurrentUser, require_teacher
from app.models.homework import Homework, HomeworkAttachment
from app.models.core import ClassSection
from app.models.student import Student
from app.models.admission import ParentGuardian
from app.schemas.homework import HomeworkCreate, HomeworkUpdate, HomeworkAttachmentOut
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


async def _assert_class_teacher(db: AsyncSession, user: dict, class_section_id: str) -> None:
    """Raises 403 unless the user is admin or the class teacher of class_section_id."""
    role = user["role"]
    if role in ("admin", "superadmin"):
        return
    if role != "teacher":
        raise HTTPException(403, "Only the class teacher or admin can manage homework")
    entity_id = user["entity_id"]
    cs_res = await db.execute(
        select(ClassSection).where(
            ClassSection.id == class_section_id,
            ClassSection.school_id == user["school_id"],
        )
    )
    cs = cs_res.scalar_one_or_none()
    if not cs or cs.class_teacher_id != entity_id:
        raise HTTPException(403, "Only the class teacher can manage homework for this class")


async def _teacher_class_ids(db: AsyncSession, school_id: str, entity_id: str) -> list[str]:
    res = await db.execute(
        select(ClassSection.id).where(
            ClassSection.school_id == school_id,
            ClassSection.class_teacher_id == entity_id,
        )
    )
    return [r[0] for r in res.all()]


@router.post("/homework", response_model=Response)
async def create_homework(
    body: HomeworkCreate,
    user: CurrentUser,
    _: None = Depends(require_teacher),
    db: AsyncSession = Depends(get_db),
):
    await _assert_class_teacher(db, user, body.class_section_id)
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
    role = user["role"]
    entity_id = user["entity_id"]
    q = select(Homework).where(Homework.school_id == school_id)

    if role == "teacher":
        # Teachers see only their homeroom class
        homeroom_ids = await _teacher_class_ids(db, school_id, entity_id)
        if class_section_id:
            if class_section_id not in homeroom_ids:
                raise HTTPException(403, "Not your class")
            q = q.where(Homework.class_section_id == class_section_id)
        elif homeroom_ids:
            q = q.where(Homework.class_section_id.in_(homeroom_ids))
        else:
            return ok([], meta={"page": page, "limit": limit, "total": 0})

    elif role == "student":
        s_res = await db.execute(select(Student.class_section_id).where(Student.id == entity_id))
        student_cs_id = s_res.scalar_one_or_none()
        if not student_cs_id:
            return ok([], meta={"page": page, "limit": limit, "total": 0})
        if class_section_id and class_section_id != student_cs_id:
            raise HTTPException(403, "Access denied")
        q = q.where(Homework.class_section_id == student_cs_id)

    elif role == "parent":
        pg_res = await db.execute(
            select(ParentGuardian.student_id).where(ParentGuardian.parent_id == entity_id)
        )
        ward_ids = [r[0] for r in pg_res.all() if r[0]]
        if not ward_ids:
            return ok([], meta={"page": page, "limit": limit, "total": 0})
        s_res = await db.execute(
            select(Student.class_section_id).where(
                Student.id.in_(ward_ids), Student.class_section_id.isnot(None)
            )
        )
        ward_cs_ids = list({r[0] for r in s_res.all() if r[0]})
        if class_section_id:
            if class_section_id not in ward_cs_ids:
                raise HTTPException(403, "Access denied")
            q = q.where(Homework.class_section_id == class_section_id)
        elif ward_cs_ids:
            q = q.where(Homework.class_section_id.in_(ward_cs_ids))
        else:
            return ok([], meta={"page": page, "limit": limit, "total": 0})

    else:
        # admin / superadmin: unrestricted
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
async def update_homework(
    hw_id: str,
    body: HomeworkUpdate,
    user: CurrentUser,
    _: None = Depends(require_teacher),
    db: AsyncSession = Depends(get_db),
):
    res = await db.execute(select(Homework).where(Homework.id == hw_id, Homework.school_id == user["school_id"]))
    hw = res.scalar_one_or_none()
    if not hw:
        raise HTTPException(status_code=404, detail="Homework not found")
    await _assert_class_teacher(db, user, hw.class_section_id)
    for k, v in body.model_dump(exclude_none=True).items():
        setattr(hw, k, v)
    hw.updated_at = datetime.utcnow()
    await db.flush()
    await db.refresh(hw)
    atts = (await db.execute(select(HomeworkAttachment).where(HomeworkAttachment.homework_id == hw.id))).scalars().all()
    return ok(_hw_out(hw, [HomeworkAttachmentOut.model_validate(a).model_dump() for a in atts]))


@router.patch("/homework/{hw_id}/cancel", response_model=Response)
async def cancel_homework(
    hw_id: str,
    user: CurrentUser,
    _: None = Depends(require_teacher),
    db: AsyncSession = Depends(get_db),
):
    res = await db.execute(select(Homework).where(Homework.id == hw_id, Homework.school_id == user["school_id"]))
    hw = res.scalar_one_or_none()
    if not hw:
        raise HTTPException(status_code=404, detail="Homework not found")
    await _assert_class_teacher(db, user, hw.class_section_id)
    hw.status = "cancelled"
    hw.updated_at = datetime.utcnow()
    await db.flush()
    await db.refresh(hw)
    return ok(_hw_out(hw, []))


@router.delete("/homework/{hw_id}", response_model=Response)
async def delete_homework(
    hw_id: str,
    user: CurrentUser,
    _: None = Depends(require_teacher),
    db: AsyncSession = Depends(get_db),
):
    res = await db.execute(select(Homework).where(Homework.id == hw_id, Homework.school_id == user["school_id"]))
    hw = res.scalar_one_or_none()
    if not hw:
        raise HTTPException(status_code=404, detail="Homework not found")
    await _assert_class_teacher(db, user, hw.class_section_id)
    atts = (await db.execute(select(HomeworkAttachment).where(HomeworkAttachment.homework_id == hw.id))).scalars().all()
    for a in atts:
        await db.delete(a)
    await db.delete(hw)
    return ok({"deleted": hw_id})
