from fastapi import APIRouter, Depends, Query, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func

from app.database import get_db
from app.deps import get_current_user
from app.models.staff import Staff, TeacherSubject
from app.schemas.staff import StaffCreate, StaffUpdate, StaffOut, TeacherSubjectCreate, TeacherSubjectOut
from app.schemas.common import Response, ok

router = APIRouter()


@router.post("/staff", response_model=Response)
async def create_staff(body: StaffCreate, db: AsyncSession = Depends(get_db), user: dict = Depends(get_current_user)):
    school_id = user["school_id"]
    staff = Staff(school_id=school_id, **body.model_dump())
    db.add(staff)
    await db.flush()
    await db.refresh(staff)
    return ok(StaffOut.model_validate(staff).model_dump())


@router.get("/staff", response_model=Response)
async def list_staff(
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    category: str = Query(None),
    status: str = Query(None),
    db: AsyncSession = Depends(get_db),
    user: dict = Depends(get_current_user),
):
    school_id = user["school_id"]
    q = select(Staff).where(Staff.school_id == school_id)
    if category:
        q = q.where(Staff.category == category)
    if status:
        q = q.where(Staff.status == status)
    total = (await db.execute(select(func.count()).select_from(q.subquery()))).scalar_one()
    offset = (page - 1) * limit
    items = (await db.execute(q.order_by(Staff.created_at.desc()).offset(offset).limit(limit))).scalars().all()
    return ok([StaffOut.model_validate(s).model_dump() for s in items], meta={"page": page, "limit": limit, "total": total})


@router.get("/staff/{staff_id}", response_model=Response)
async def get_staff(staff_id: str, db: AsyncSession = Depends(get_db), user: dict = Depends(get_current_user)):
    res = await db.execute(select(Staff).where(Staff.id == staff_id, Staff.school_id == user["school_id"]))
    staff = res.scalar_one_or_none()
    if not staff:
        raise HTTPException(status_code=404, detail="Staff not found")
    return ok(StaffOut.model_validate(staff).model_dump())


@router.put("/staff/{staff_id}", response_model=Response)
async def update_staff(staff_id: str, body: StaffUpdate, db: AsyncSession = Depends(get_db), user: dict = Depends(get_current_user)):
    res = await db.execute(select(Staff).where(Staff.id == staff_id, Staff.school_id == user["school_id"]))
    staff = res.scalar_one_or_none()
    if not staff:
        raise HTTPException(status_code=404, detail="Staff not found")
    for k, v in body.model_dump(exclude_none=True).items():
        setattr(staff, k, v)
    await db.flush()
    await db.refresh(staff)
    return ok(StaffOut.model_validate(staff).model_dump())


@router.patch("/staff/{staff_id}/status", response_model=Response)
async def toggle_staff_status(staff_id: str, db: AsyncSession = Depends(get_db), user: dict = Depends(get_current_user)):
    res = await db.execute(select(Staff).where(Staff.id == staff_id, Staff.school_id == user["school_id"]))
    staff = res.scalar_one_or_none()
    if not staff:
        raise HTTPException(status_code=404, detail="Staff not found")
    staff.status = "inactive" if staff.status == "active" else "active"
    await db.flush()
    await db.refresh(staff)
    return ok(StaffOut.model_validate(staff).model_dump())


@router.post("/teacher-subjects", response_model=Response)
async def create_teacher_subject(body: TeacherSubjectCreate, db: AsyncSession = Depends(get_db), user: dict = Depends(get_current_user)):
    school_id = user["school_id"]
    ts = TeacherSubject(school_id=school_id, **body.model_dump())
    db.add(ts)
    await db.flush()
    await db.refresh(ts)
    return ok(TeacherSubjectOut.model_validate(ts).model_dump())


@router.get("/teacher-subjects", response_model=Response)
async def list_teacher_subjects(
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    staff_id: str = Query(None),
    class_section_id: str = Query(None),
    db: AsyncSession = Depends(get_db),
    user: dict = Depends(get_current_user),
):
    school_id = user["school_id"]
    q = select(TeacherSubject).where(TeacherSubject.school_id == school_id)
    if staff_id:
        q = q.where(TeacherSubject.staff_id == staff_id)
    if class_section_id:
        q = q.where(TeacherSubject.class_section_id == class_section_id)
    total = (await db.execute(select(func.count()).select_from(q.subquery()))).scalar_one()
    offset = (page - 1) * limit
    items = (await db.execute(q.offset(offset).limit(limit))).scalars().all()
    return ok([TeacherSubjectOut.model_validate(t).model_dump() for t in items], meta={"page": page, "limit": limit, "total": total})


@router.delete("/teacher-subjects/{ts_id}", response_model=Response)
async def delete_teacher_subject(ts_id: str, db: AsyncSession = Depends(get_db), user: dict = Depends(get_current_user)):
    res = await db.execute(select(TeacherSubject).where(TeacherSubject.id == ts_id, TeacherSubject.school_id == user["school_id"]))
    ts = res.scalar_one_or_none()
    if not ts:
        raise HTTPException(status_code=404, detail="Teacher subject not found")
    await db.delete(ts)
    return ok({"deleted": ts_id})
