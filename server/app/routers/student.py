import uuid
from datetime import date
from fastapi import APIRouter, Depends, Query, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, or_, update as sa_update

from app.database import get_db
from app.deps import get_current_user, CurrentUser, require_admin
from app.models.student import Student
from app.models.admission import ParentGuardian
from app.models.auth import SchoolUser, UserRole
from app.models.parent import Parent
from app.models.core import AcademicYear, ClassSection
from app.schemas.student import StudentCreate, StudentUpdate, StudentOut
from app.schemas.admission import ParentGuardianCreate, ParentGuardianOut
from app.schemas.common import Response, ok

router = APIRouter()


async def _provision_parent_login(db: AsyncSession, school_id: str, pg_dict: dict) -> str | None:
    phone = pg_dict.get("phone")
    if not phone:
        return None
    parent = Parent(
        school_id=school_id,
        name=pg_dict.get("name") or f"{pg_dict.get('first_name', '')} {pg_dict.get('last_name', '')}".strip(),
        phone=phone,
        email=pg_dict.get("email"),
    )
    db.add(parent)
    await db.flush()
    db.add(SchoolUser(school_id=school_id, role=UserRole.parent, phone=phone, entity_id=parent.id))
    return parent.id


async def _build_responses(db: AsyncSession, students: list[Student]) -> list[dict]:
    """Batch-load class sections and parent guardians for a list of students."""
    cs_ids = list({s.class_section_id for s in students if s.class_section_id})
    cs_map: dict[str, ClassSection] = {}
    if cs_ids:
        cs_res = await db.execute(select(ClassSection).where(ClassSection.id.in_(cs_ids)))
        cs_map = {cs.id: cs for cs in cs_res.scalars().all()}

    student_ids = [s.id for s in students]
    pg_map: dict[str, list] = {s.id: [] for s in students}
    if student_ids:
        pg_res = await db.execute(
            select(ParentGuardian).where(ParentGuardian.student_id.in_(student_ids))
        )
        for pg in pg_res.scalars().all():
            if pg.student_id in pg_map:
                pg_map[pg.student_id].append(ParentGuardianOut.model_validate(pg).model_dump())

    result = []
    for s in students:
        d = StudentOut.model_validate(s).model_dump()
        if s.class_section_id and s.class_section_id in cs_map:
            cs = cs_map[s.class_section_id]
            d["class_name"] = cs.class_name
            d["section"] = cs.section
        d["parent_guardians"] = pg_map[s.id]
        result.append(d)
    return result


@router.post("/students", response_model=Response)
async def create_student(
    body: StudentCreate,
    user: CurrentUser,
    _: None = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    school_id = user["school_id"]

    academic_year_id = body.academic_year_id
    ay = None
    if not academic_year_id:
        ay_res = await db.execute(
            select(AcademicYear).where(AcademicYear.school_id == school_id, AcademicYear.is_active == True)
        )
        ay = ay_res.scalar_one_or_none()
        academic_year_id = ay.id if ay else None
    else:
        ay_res = await db.execute(select(AcademicYear).where(AcademicYear.id == academic_year_id))
        ay = ay_res.scalar_one_or_none()

    ay_year = ay.start_date.year if ay else date.today().year

    if academic_year_id:
        count_q = select(func.count()).select_from(Student).where(
            Student.school_id == school_id,
            Student.academic_year_id == academic_year_id,
        )
    else:
        count_q = select(func.count()).select_from(Student).where(Student.school_id == school_id)
    seq = ((await db.execute(count_q)).scalar_one() or 0) + 1
    admission_no = f"{ay_year}{seq:04d}"

    student_data = body.model_dump(exclude_none=True)
    student_data.pop("academic_year_id", None)
    parent_guardians_data = student_data.pop("parent_guardians", None) or []

    student = Student(
        school_id=school_id,
        academic_year_id=academic_year_id,
        admission_no=admission_no,
        **student_data,
    )
    db.add(student)
    await db.flush()
    await db.refresh(student)

    for pg_data in parent_guardians_data:
        pg_dict = pg_data if isinstance(pg_data, dict) else pg_data.model_dump(exclude_none=True)
        if not pg_dict.get("name"):
            pg_dict["name"] = f"{pg_dict.get('first_name', '')} {pg_dict.get('last_name', '')}".strip()
        parent_id = await _provision_parent_login(db, school_id, pg_dict)
        if parent_id:
            pg_dict["parent_id"] = parent_id
        pg = ParentGuardian(id=str(uuid.uuid4()), student_id=student.id, **pg_dict)
        db.add(pg)

    await db.flush()
    rows = await _build_responses(db, [student])
    return ok(rows[0])


@router.get("/students", response_model=Response)
async def list_students(
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    search: str = Query(None),
    admission_no: str = Query(None),
    mobile: str = Query(None),
    class_section_id: str = Query(None),
    academic_year_id: str = Query(None),
    gender: str = Query(None),
    status: str = Query(None),
    student_type: str = Query(None),
    admission_type: str = Query(None),
    fee_type: str = Query(None),
    caste_category: str = Query(None),
    house_category: str = Query(None),
    hosteller: str = Query(None),
    tc_generated: str = Query(None),
    has_sibling: str = Query(None),
    dob_from: date = Query(None),
    dob_to: date = Query(None),
    parent_id: str = Query(None),
    db: AsyncSession = Depends(get_db),
    user: dict = Depends(get_current_user),
):
    school_id = user["school_id"]
    q = select(Student).where(Student.school_id == school_id)

    if parent_id:
        user_res = await db.execute(
            select(SchoolUser).where(SchoolUser.id == parent_id, SchoolUser.school_id == school_id)
        )
        parent_user = user_res.scalar_one_or_none()
        if not parent_user or not parent_user.entity_id:
            return ok([], meta={"page": page, "limit": limit, "total": 0})
        pg_res = await db.execute(
            select(ParentGuardian.student_id).where(
                ParentGuardian.parent_id == parent_user.entity_id,
                ParentGuardian.student_id.isnot(None),
            )
        )
        student_ids = list({row[0] for row in pg_res.fetchall()})
        if not student_ids:
            return ok([], meta={"page": page, "limit": limit, "total": 0})
        q = q.where(Student.id.in_(student_ids))

    if search:
        like = f"%{search}%"
        q = q.where(or_(
            Student.first_name.ilike(like),
            Student.last_name.ilike(like),
            Student.admission_no.ilike(like),
        ))
    if admission_no:
        q = q.where(Student.admission_no.ilike(f"%{admission_no}%"))
    if mobile:
        like = f"%{mobile}%"
        q = q.where(or_(Student.sms_mobile.ilike(like), Student.whatsapp_mobile.ilike(like)))
    if class_section_id:
        q = q.where(Student.class_section_id == class_section_id)
    if academic_year_id:
        q = q.where(Student.academic_year_id == academic_year_id)
    if gender:
        q = q.where(Student.gender == gender)
    if status:
        q = q.where(Student.status == status)
    if student_type:
        q = q.where(Student.student_type == student_type)
    if admission_type:
        q = q.where(Student.admission_type == admission_type)
    if fee_type:
        q = q.where(Student.fee_type == fee_type)
    if caste_category:
        q = q.where(Student.caste_category.ilike(f"%{caste_category}%"))
    if house_category:
        q = q.where(Student.house_category.ilike(f"%{house_category}%"))
    if hosteller is not None:
        q = q.where(Student.hosteller == (hosteller.lower() == "true"))
    if tc_generated is not None:
        q = q.where(Student.tc_generated == (tc_generated.lower() == "true"))
    if has_sibling is not None:
        q = q.where(Student.has_sibling == (has_sibling.lower() == "true"))
    if dob_from:
        q = q.where(Student.dob >= dob_from)
    if dob_to:
        q = q.where(Student.dob <= dob_to)

    total = (await db.execute(select(func.count()).select_from(q.subquery()))).scalar_one()
    offset = (page - 1) * limit
    items = (await db.execute(q.order_by(Student.created_at.desc()).offset(offset).limit(limit))).scalars().all()

    rows = await _build_responses(db, list(items))
    return ok(rows, meta={"page": page, "limit": limit, "total": total})


@router.get("/students/{student_id}", response_model=Response)
async def get_student(student_id: str, db: AsyncSession = Depends(get_db), user: dict = Depends(get_current_user)):
    res = await db.execute(select(Student).where(Student.id == student_id, Student.school_id == user["school_id"]))
    student = res.scalar_one_or_none()
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")
    rows = await _build_responses(db, [student])
    return ok(rows[0])


@router.put("/students/{student_id}", response_model=Response)
async def update_student(
    student_id: str,
    body: StudentUpdate,
    user: CurrentUser,
    _: None = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    res = await db.execute(select(Student).where(Student.id == student_id, Student.school_id == user["school_id"]))
    student = res.scalar_one_or_none()
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")
    for k, v in body.model_dump(exclude_none=True).items():
        setattr(student, k, v)
    await db.flush()
    await db.refresh(student)
    rows = await _build_responses(db, [student])
    return ok(rows[0])


@router.patch("/students/{student_id}/status", response_model=Response)
async def toggle_student_status(
    student_id: str,
    user: CurrentUser,
    _: None = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    res = await db.execute(select(Student).where(Student.id == student_id, Student.school_id == user["school_id"]))
    student = res.scalar_one_or_none()
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")
    student.status = "inactive" if student.status == "active" else "active"
    await db.flush()
    await db.refresh(student)
    rows = await _build_responses(db, [student])
    return ok(rows[0])


# ── Parent guardian management on a student ──────────────────────────────────

@router.post("/students/{student_id}/parent-guardians", response_model=Response)
async def add_parent_guardian(
    student_id: str,
    body: ParentGuardianCreate,
    user: CurrentUser,
    _: None = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    res = await db.execute(select(Student).where(Student.id == student_id, Student.school_id == user["school_id"]))
    if not res.scalar_one_or_none():
        raise HTTPException(status_code=404, detail="Student not found")
    pg_dict = body.model_dump(exclude_none=True)
    if not pg_dict.get("name"):
        pg_dict["name"] = f"{pg_dict.get('first_name', '')} {pg_dict.get('last_name', '')}".strip()
    parent_id = await _provision_parent_login(db, user["school_id"], pg_dict)
    if parent_id:
        pg_dict["parent_id"] = parent_id
    pg = ParentGuardian(id=str(uuid.uuid4()), student_id=student_id, **pg_dict)
    db.add(pg)
    await db.flush()
    await db.refresh(pg)
    return ok(ParentGuardianOut.model_validate(pg).model_dump())


@router.put("/students/{student_id}/parent-guardians/{pg_id}", response_model=Response)
async def update_parent_guardian(
    student_id: str,
    pg_id: str,
    body: ParentGuardianCreate,
    user: CurrentUser,
    _: None = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    res = await db.execute(
        select(ParentGuardian).where(ParentGuardian.id == pg_id, ParentGuardian.student_id == student_id)
    )
    pg = res.scalar_one_or_none()
    if not pg:
        raise HTTPException(status_code=404, detail="Parent guardian not found")
    for k, v in body.model_dump(exclude_none=True).items():
        setattr(pg, k, v)
    await db.flush()
    await db.refresh(pg)
    return ok(ParentGuardianOut.model_validate(pg).model_dump())


@router.delete("/students/{student_id}/parent-guardians/{pg_id}", response_model=Response)
async def delete_parent_guardian(
    student_id: str,
    pg_id: str,
    user: CurrentUser,
    _: None = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    res = await db.execute(
        select(ParentGuardian).where(ParentGuardian.id == pg_id, ParentGuardian.student_id == student_id)
    )
    pg = res.scalar_one_or_none()
    if not pg:
        raise HTTPException(status_code=404, detail="Parent guardian not found")
    await db.delete(pg)
    return ok({"id": pg_id})
