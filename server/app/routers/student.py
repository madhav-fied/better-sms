import uuid
from datetime import date
from typing import List, Optional
from fastapi import APIRouter, Depends, Query, HTTPException
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, or_, update as sa_update

from app.database import get_db
from app.deps import get_current_user, CurrentUser, require_admin
from app.models.student import Student
from app.models.admission import ParentGuardian
from app.models.auth import SchoolUser
from app.models.core import AcademicYear, ClassSection
from app.schemas.student import StudentCreate, StudentUpdate, StudentOut
from app.schemas.admission import ParentGuardianCreate, ParentGuardianUpdate, ParentGuardianOut
from app.schemas.common import Response, ok
from app.services.parent_auth import (
    provision_parent_login,
    parent_guardian_row_data,
    parent_guardian_provision_data,
)

router = APIRouter()


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
        d["name"] = f"{s.first_name} {s.last_name}".strip()
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
        if isinstance(pg_data, dict):
            pg_dict = {k: v for k, v in pg_data.items() if v is not None}
        else:
            pg_dict = parent_guardian_provision_data(pg_data)
        if not pg_dict.get("name"):
            pg_dict["name"] = f"{pg_dict.get('first_name', '')} {pg_dict.get('last_name', '')}".strip()
        parent_id = await provision_parent_login(db, school_id, pg_dict)
        row = {k: v for k, v in pg_dict.items() if k != "login_password"}
        if parent_id:
            row["parent_id"] = parent_id
        pg = ParentGuardian(id=str(uuid.uuid4()), student_id=student.id, **row)
        db.add(pg)

    await db.flush()
    rows = await _build_responses(db, [student])
    return ok(rows[0])


@router.get("/students", response_model=Response)
async def list_students(
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=500),
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
    not_class_section_id: str = Query(None),
    unassigned: bool = Query(False),
    db: AsyncSession = Depends(get_db),
    user: dict = Depends(get_current_user),
):
    school_id = user["school_id"]
    if not school_id:
        raise HTTPException(status_code=400, detail="School context required")
    q = select(Student).where(Student.school_id == school_id)

    if user["role"] == "student" and user.get("entity_id"):
        q = q.where(Student.id == user["entity_id"])
    elif user["role"] == "parent" and user.get("entity_id"):
        pg_res = await db.execute(
            select(ParentGuardian.student_id).where(
                ParentGuardian.parent_id == user["entity_id"],
                ParentGuardian.student_id.isnot(None),
            )
        )
        ward_ids = list({row[0] for row in pg_res.fetchall()})
        if not ward_ids:
            return ok([], meta={"page": page, "limit": limit, "total": 0})
        q = q.where(Student.id.in_(ward_ids))

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
    if not_class_section_id:
        q = q.where(
            (Student.class_section_id != not_class_section_id) | Student.class_section_id.is_(None)
        )
    if unassigned:
        q = q.where(Student.class_section_id.is_(None))

    total = (await db.execute(select(func.count()).select_from(q.subquery()))).scalar_one()
    offset = (page - 1) * limit
    items = (await db.execute(q.order_by(Student.created_at.desc()).offset(offset).limit(limit))).scalars().all()

    rows = await _build_responses(db, list(items))
    return ok(rows, meta={"page": page, "limit": limit, "total": total})


class ChangeSectionBody(BaseModel):
    student_ids: List[str]
    to_class_section_id: str


class MigrateBody(BaseModel):
    student_ids: List[str]
    from_academic_year_id: str
    to_academic_year_id: str
    to_class_section_id: str
    promote_date: Optional[date] = None


@router.post("/students/change-class-section", response_model=Response)
async def change_class_section(
    body: ChangeSectionBody,
    user: CurrentUser,
    _: None = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    if not body.student_ids:
        raise HTTPException(422, "student_ids required")
    if len(body.student_ids) > 500:
        raise HTTPException(422, "Max 500 student IDs")

    school_id = user["school_id"]

    cs_res = await db.execute(
        select(ClassSection).where(
            ClassSection.id == body.to_class_section_id,
            ClassSection.school_id == school_id,
        )
    )
    cs = cs_res.scalar_one_or_none()
    if not cs:
        raise HTTPException(404, "Target class section not found")

    await db.execute(
        sa_update(Student)
        .where(Student.id.in_(body.student_ids), Student.school_id == school_id)
        .values(class_section_id=body.to_class_section_id, academic_year_id=cs.academic_year_id)
    )
    return ok({"updated": len(body.student_ids)})


@router.post("/students/migrate", response_model=Response)
async def migrate_students(
    body: MigrateBody,
    user: CurrentUser,
    _: None = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    if not body.student_ids:
        raise HTTPException(422, "student_ids required")
    if len(body.student_ids) > 500:
        raise HTTPException(422, "Max 500 student IDs")

    from datetime import date as date_type

    school_id = user["school_id"]
    promote_date = body.promote_date or date_type.today()

    cs_res = await db.execute(
        select(ClassSection).where(
            ClassSection.id == body.to_class_section_id,
            ClassSection.school_id == school_id,
        )
    )
    cs = cs_res.scalar_one_or_none()
    if not cs:
        raise HTTPException(404, "Target class section not found")

    ay_res = await db.execute(
        select(AcademicYear).where(
            AcademicYear.id == body.to_academic_year_id,
            AcademicYear.school_id == school_id,
        )
    )
    if not ay_res.scalar_one_or_none():
        raise HTTPException(404, "Target academic year not found")

    students_res = await db.execute(
        select(Student).where(
            Student.id.in_(body.student_ids),
            Student.school_id == school_id,
        )
    )
    student_map = {s.id: s for s in students_res.scalars().all()}

    migrated = 0
    skipped = 0
    errors = []
    warnings = []

    for sid in body.student_ids:
        student = student_map.get(sid)
        if not student:
            errors.append({"student_id": sid, "reason": "student_not_found"})
            continue
        if student.academic_year_id != body.from_academic_year_id:
            errors.append({"student_id": sid, "reason": "not_in_source_ay"})
            continue
        if (
            student.class_section_id == body.to_class_section_id
            and student.academic_year_id == body.to_academic_year_id
        ):
            skipped += 1
            continue
        if student.tc_generated:
            warnings.append({"student_id": sid, "warning": "tc_generated"})
        student.class_section_id = body.to_class_section_id
        student.academic_year_id = body.to_academic_year_id
        student.student_type = "old"
        student.class_promoted_date = promote_date
        migrated += 1

    await db.flush()
    return ok({"migrated": migrated, "skipped": skipped, "errors": errors, "warnings": warnings})


@router.get("/students/{student_id}", response_model=Response)
async def get_student(student_id: str, db: AsyncSession = Depends(get_db), user: dict = Depends(get_current_user)):
    res = await db.execute(select(Student).where(Student.id == student_id, Student.school_id == user["school_id"]))
    student = res.scalar_one_or_none()
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")
    if user["role"] == "parent":
        entity_id = user.get("entity_id")
        if not entity_id:
            raise HTTPException(status_code=403, detail="Access denied")
        pg_check = await db.execute(
            select(ParentGuardian).where(
                ParentGuardian.parent_id == entity_id,
                ParentGuardian.student_id == student_id,
            )
        )
        if not pg_check.scalar_one_or_none():
            raise HTTPException(status_code=403, detail="Access denied")
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
    pg_dict = parent_guardian_provision_data(body)
    if not pg_dict.get("name"):
        pg_dict["name"] = f"{pg_dict.get('first_name', '')} {pg_dict.get('last_name', '')}".strip()
    parent_id = await provision_parent_login(db, user["school_id"], pg_dict)
    row = parent_guardian_row_data(body)
    if parent_id:
        row["parent_id"] = parent_id
    pg = ParentGuardian(id=str(uuid.uuid4()), student_id=student_id, **row)
    db.add(pg)
    await db.flush()
    await db.refresh(pg)
    return ok(ParentGuardianOut.model_validate(pg).model_dump())


@router.put("/students/{student_id}/parent-guardians/{pg_id}", response_model=Response)
async def update_parent_guardian(
    student_id: str,
    pg_id: str,
    body: ParentGuardianUpdate,
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
    updates = body.model_dump(exclude_none=True)
    login_password = updates.pop("login_password", None)
    for k, v in updates.items():
        setattr(pg, k, v)
    if updates.get("phone") and updates.get("email") and login_password:
        parent_id = await provision_parent_login(
            db,
            user["school_id"],
            {
                **updates,
                "login_password": login_password,
                "first_name": updates.get("first_name") or pg.first_name or "",
                "name": updates.get("name") or pg.name,
            },
            existing_parent_id=pg.parent_id,
        )
        if parent_id:
            pg.parent_id = parent_id
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
