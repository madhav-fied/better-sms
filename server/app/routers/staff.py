from fastapi import APIRouter, Depends, Query, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, or_
from sqlalchemy.orm import selectinload

from app.database import get_db
from app.deps import get_current_user, CurrentUser, require_admin
from app.models.staff import Staff, TeacherSubject, StaffJobDetail
from app.models.auth import SchoolUser, UserRole
from app.models.core import ClassSection
from app.schemas.staff import (
    StaffCreate, StaffUpdate, StaffOut,
    StaffJobDetailCreate, StaffJobDetailOut,
    TeacherSubjectCreate, TeacherSubjectOut,
)
from app.schemas.common import Response, ok
from app.services.password import hash_password
from app.utils import normalize_phone

router = APIRouter()


@router.post("/staff", response_model=Response)
async def create_staff(
    body: StaffCreate,
    user: CurrentUser,
    _: None = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    school_id = user["school_id"]
    data = body.model_dump(exclude_none=True)
    # Derive `name` from first_name/last_name for backward compat
    first = data.get("first_name", "")
    last = data.get("last_name", "")
    data.setdefault("name", f"{first} {last}".strip() or first)
    # Auto-generate emp_code if not provided
    if not data.get("emp_code"):
        count_res = await db.execute(select(func.count()).select_from(Staff).where(Staff.school_id == school_id))
        seq = (count_res.scalar_one() or 0) + 1
        data["emp_code"] = f"EMP{seq:04d}"
    staff = Staff(school_id=school_id, **data)
    db.add(staff)
    await db.flush()
    if staff.mobile and staff.category == "teacher":
        phone = normalize_phone(staff.mobile)
        db.add(SchoolUser(
            school_id=school_id,
            role=UserRole.teacher,
            phone=phone,
            password_hash=hash_password(phone),
            entity_id=staff.id,
        ))
    res = await db.execute(select(Staff).options(selectinload(Staff.job_detail)).where(Staff.id == staff.id))
    staff = res.scalar_one()
    return ok(StaffOut.model_validate(staff).model_dump())


@router.get("/staff", response_model=Response)
async def list_staff(
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=500),
    search: str = Query(None),          # name / emp_code / mobile / email
    name: str = Query(None),            # kept for backward compat; same as search
    category: str = Query(None),
    status: str = Query(None),
    gender: str = Query(None),
    grade: str = Query(None),
    designation: str = Query(None),
    teaching_type: str = Query(None),
    db: AsyncSession = Depends(get_db),
    user: dict = Depends(get_current_user),
):
    school_id = user["school_id"]
    q = select(Staff).where(Staff.school_id == school_id)
    term = search or name
    if term:
        like = f"%{term}%"
        q = q.where(or_(
            Staff.first_name.ilike(like),
            Staff.last_name.ilike(like),
            Staff.name.ilike(like),
            Staff.emp_code.ilike(like),
            Staff.mobile.ilike(like),
            Staff.email.ilike(like),
        ))
    if category:
        q = q.where(Staff.category == category)
    if status:
        q = q.where(Staff.status == status)
    if gender:
        q = q.where(Staff.gender == gender)
    if grade:
        q = q.where(Staff.grade.ilike(f"%{grade}%"))
    if designation:
        q = q.where(Staff.designation.ilike(f"%{designation}%"))
    if teaching_type:
        q = q.where(Staff.teaching_type == teaching_type)
    total = (await db.execute(select(func.count()).select_from(q.subquery()))).scalar_one()
    offset = (page - 1) * limit
    items = (await db.execute(q.options(selectinload(Staff.job_detail)).order_by(Staff.created_at.desc()).offset(offset).limit(limit))).scalars().all()
    return ok([StaffOut.model_validate(s).model_dump() for s in items], meta={"page": page, "limit": limit, "total": total})


@router.get("/staff/{staff_id}", response_model=Response)
async def get_staff(staff_id: str, db: AsyncSession = Depends(get_db), user: dict = Depends(get_current_user)):
    res = await db.execute(
        select(Staff)
        .options(selectinload(Staff.job_detail))
        .where(Staff.id == staff_id, Staff.school_id == user["school_id"])
    )
    staff = res.scalar_one_or_none()
    if not staff:
        raise HTTPException(status_code=404, detail="Staff not found")
    return ok(StaffOut.model_validate(staff).model_dump())


@router.put("/staff/{staff_id}", response_model=Response)
async def update_staff(
    staff_id: str,
    body: StaffUpdate,
    user: CurrentUser,
    _: None = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    res = await db.execute(select(Staff).where(Staff.id == staff_id, Staff.school_id == user["school_id"]))
    staff = res.scalar_one_or_none()
    if not staff:
        raise HTTPException(status_code=404, detail="Staff not found")
    for k, v in body.model_dump(exclude_none=True).items():
        setattr(staff, k, v)
    await db.flush()
    res = await db.execute(select(Staff).options(selectinload(Staff.job_detail)).where(Staff.id == staff_id))
    staff = res.scalar_one()
    return ok(StaffOut.model_validate(staff).model_dump())


@router.patch("/staff/{staff_id}/status", response_model=Response)
async def toggle_staff_status(
    staff_id: str,
    user: CurrentUser,
    _: None = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    res = await db.execute(select(Staff).where(Staff.id == staff_id, Staff.school_id == user["school_id"]))
    staff = res.scalar_one_or_none()
    if not staff:
        raise HTTPException(status_code=404, detail="Staff not found")
    staff.status = "inactive" if staff.status == "active" else "active"
    await db.flush()
    res = await db.execute(select(Staff).options(selectinload(Staff.job_detail)).where(Staff.id == staff_id))
    staff = res.scalar_one()
    return ok(StaffOut.model_validate(staff).model_dump())


@router.put("/staff/{staff_id}/job-detail", response_model=Response)
async def upsert_job_detail(
    staff_id: str,
    body: StaffJobDetailCreate,
    user: CurrentUser,
    _: None = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    res = await db.execute(select(Staff).where(Staff.id == staff_id, Staff.school_id == user["school_id"]))
    staff = res.scalar_one_or_none()
    if not staff:
        raise HTTPException(status_code=404, detail="Staff not found")
    jd_res = await db.execute(select(StaffJobDetail).where(StaffJobDetail.staff_id == staff_id))
    jd = jd_res.scalar_one_or_none()
    if jd:
        for k, v in body.model_dump(exclude_none=True).items():
            setattr(jd, k, v)
    else:
        jd = StaffJobDetail(staff_id=staff_id, **body.model_dump())
        db.add(jd)
    await db.flush()
    await db.refresh(jd)
    return ok(StaffJobDetailOut.model_validate(jd).model_dump())


@router.post("/teacher-subjects", response_model=Response)
async def create_teacher_subject(
    body: TeacherSubjectCreate,
    user: CurrentUser,
    _: None = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    school_id = user["school_id"]
    ts = TeacherSubject(school_id=school_id, **body.model_dump())
    db.add(ts)
    await db.flush()
    await db.refresh(ts)
    return ok(TeacherSubjectOut.model_validate(ts).model_dump())


@router.get("/teacher-subjects", response_model=Response)
async def list_teacher_subjects(
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=500),
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

    cs_ids = list({t.class_section_id for t in items})
    cs_map: dict[str, ClassSection] = {}
    if cs_ids:
        cs_res = await db.execute(select(ClassSection).where(ClassSection.id.in_(cs_ids)))
        cs_map = {cs.id: cs for cs in cs_res.scalars().all()}

    enriched = []
    for t in items:
        cs = cs_map.get(t.class_section_id)
        d = TeacherSubjectOut.model_validate(t).model_dump()
        d["class_name"] = cs.name if cs else None
        d["section"] = cs.section if cs else None
        enriched.append(d)

    return ok(enriched, meta={"page": page, "limit": limit, "total": total})


@router.delete("/teacher-subjects/{ts_id}", response_model=Response)
async def delete_teacher_subject(
    ts_id: str,
    user: CurrentUser,
    _: None = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    res = await db.execute(select(TeacherSubject).where(TeacherSubject.id == ts_id, TeacherSubject.school_id == user["school_id"]))
    ts = res.scalar_one_or_none()
    if not ts:
        raise HTTPException(status_code=404, detail="Teacher subject not found")
    await db.delete(ts)
    return ok({"deleted": ts_id})
