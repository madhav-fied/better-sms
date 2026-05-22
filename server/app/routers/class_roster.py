from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func

from app.database import get_db
from app.deps import CurrentUser, get_current_user, require_admin
from app.models.core import ClassSection
from app.models.staff import Staff, TeacherSubject
from app.models.student import Student
from app.models.subject import Subject
from app.schemas.common import Response, ok

router = APIRouter()


# ── Access helpers ─────────────────────────────────────────────────────────────

async def _require_class_access(db: AsyncSession, user: dict, cs_id: str) -> ClassSection:
    """Returns class section if caller has read access; raises 403/404 otherwise."""
    res = await db.execute(
        select(ClassSection).where(
            ClassSection.id == cs_id,
            ClassSection.school_id == user["school_id"],
        )
    )
    cs = res.scalar_one_or_none()
    if not cs:
        raise HTTPException(404, "Class section not found")

    role = user["role"]
    entity_id = user["entity_id"]

    if role in ("admin", "superadmin"):
        return cs
    if role == "teacher":
        ts_res = await db.execute(
            select(TeacherSubject).where(
                TeacherSubject.class_section_id == cs_id,
                TeacherSubject.staff_id == entity_id,
            )
        )
        if ts_res.scalar_one_or_none() or cs.class_teacher_id == entity_id:
            return cs
        raise HTTPException(403, "Not assigned to this class")
    raise HTTPException(403, "Access denied")


async def _require_subject_access(db: AsyncSession, user: dict, cs_id: str) -> ClassSection:
    """Like _require_class_access but also allows student/parent for subject listing."""
    res = await db.execute(
        select(ClassSection).where(
            ClassSection.id == cs_id,
            ClassSection.school_id == user["school_id"],
        )
    )
    cs = res.scalar_one_or_none()
    if not cs:
        raise HTTPException(404, "Class section not found")

    role = user["role"]
    entity_id = user["entity_id"]

    if role in ("admin", "superadmin"):
        return cs
    if role == "teacher":
        ts_res = await db.execute(
            select(TeacherSubject).where(
                TeacherSubject.class_section_id == cs_id,
                TeacherSubject.staff_id == entity_id,
            )
        )
        if ts_res.scalar_one_or_none() or cs.class_teacher_id == entity_id:
            return cs
        raise HTTPException(403, "Not assigned to this class")
    if role == "student":
        stu_res = await db.execute(
            select(Student).where(
                Student.id == entity_id,
                Student.class_section_id == cs_id,
            )
        )
        if stu_res.scalar_one_or_none():
            return cs
        raise HTTPException(403, "Not enrolled in this class")
    if role == "parent":
        from app.models.admission import ParentGuardian
        pg_res = await db.execute(
            select(ParentGuardian)
            .join(Student, ParentGuardian.student_id == Student.id)
            .where(
                ParentGuardian.parent_id == entity_id,
                Student.class_section_id == cs_id,
            )
        )
        if pg_res.scalar_one_or_none():
            return cs
        raise HTTPException(403, "No child enrolled in this class")
    raise HTTPException(403, "Access denied")


# ── Enrich teacher-subject list ────────────────────────────────────────────────

async def _enrich_ts(db: AsyncSession, ts_list: list[TeacherSubject]) -> list[dict]:
    """Batch-load staff names and class section names, return enriched dicts."""
    if not ts_list:
        return []
    staff_ids = list({ts.staff_id for ts in ts_list if ts.staff_id})
    staff_map: dict[str, Staff] = {}
    if staff_ids:
        staff_res = await db.execute(select(Staff).where(Staff.id.in_(staff_ids)))
        staff_map = {s.id: s for s in staff_res.scalars().all()}

    cs_ids = list({ts.class_section_id for ts in ts_list})
    cs_map: dict[str, ClassSection] = {}
    if cs_ids:
        cs_res = await db.execute(select(ClassSection).where(ClassSection.id.in_(cs_ids)))
        cs_map = {cs.id: cs for cs in cs_res.scalars().all()}

    result = []
    for ts in ts_list:
        staff = staff_map.get(ts.staff_id) if ts.staff_id else None
        cs = cs_map.get(ts.class_section_id)
        result.append(
            {
                "id": ts.id,
                "school_id": ts.school_id,
                "staff_id": ts.staff_id,
                "staff_name": staff.name if staff else None,
                "subject": ts.subject,
                "class_section_id": ts.class_section_id,
                "class_name": cs.name if cs else None,
                "section": cs.section if cs else None,
                "academic_year_id": ts.academic_year_id,
            }
        )
    return result


# ── Student roster endpoints ───────────────────────────────────────────────────

class AssignStudentsBody(BaseModel):
    student_ids: List[str]


class RosterStudentOut(BaseModel):
    id: str
    admission_no: str
    first_name: str
    last_name: str
    gender: str
    roll_number: Optional[str] = None
    photo_url: Optional[str] = None
    status: str

    model_config = {"from_attributes": True}


@router.get("/class-sections/{cs_id}/students", response_model=Response)
async def list_roster_students(
    cs_id: str,
    page: int = Query(1, ge=1),
    limit: int = Query(50, ge=1, le=200),
    search: str = Query(None),
    status: str = Query(None),
    user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await _require_class_access(db, user, cs_id)

    q = select(Student).where(
        Student.class_section_id == cs_id,
        Student.school_id == user["school_id"],
    )
    if search:
        like = f"%{search}%"
        from sqlalchemy import or_
        q = q.where(
            or_(
                Student.first_name.ilike(like),
                Student.last_name.ilike(like),
                Student.admission_no.ilike(like),
            )
        )
    if status:
        q = q.where(Student.status == status)

    total = (await db.execute(select(func.count()).select_from(q.subquery()))).scalar_one()
    offset = (page - 1) * limit
    items = (await db.execute(q.order_by(Student.first_name).offset(offset).limit(limit))).scalars().all()

    return ok(
        [RosterStudentOut.model_validate(s).model_dump() for s in items],
        meta={"page": page, "limit": limit, "total": total},
    )


@router.post("/class-sections/{cs_id}/students", response_model=Response)
async def assign_students_to_class(
    cs_id: str,
    body: AssignStudentsBody,
    user: CurrentUser,
    _: None = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    if not body.student_ids:
        raise HTTPException(422, "student_ids required")
    if len(body.student_ids) > 500:
        raise HTTPException(422, "Max 500 student IDs")

    school_id = user["school_id"]

    res = await db.execute(
        select(ClassSection).where(ClassSection.id == cs_id, ClassSection.school_id == school_id)
    )
    cs = res.scalar_one_or_none()
    if not cs:
        raise HTTPException(404, "Class section not found")

    students_res = await db.execute(
        select(Student).where(Student.id.in_(body.student_ids), Student.school_id == school_id)
    )
    students = students_res.scalars().all()

    assigned = 0
    skipped = 0
    for student in students:
        if student.class_section_id == cs_id:
            skipped += 1
            continue
        student.class_section_id = cs_id
        student.academic_year_id = cs.academic_year_id
        assigned += 1

    await db.flush()
    return ok({"assigned": assigned, "skipped": skipped})


@router.delete("/class-sections/{cs_id}/students/{student_id}", response_model=Response)
async def remove_student_from_class(
    cs_id: str,
    student_id: str,
    user: CurrentUser,
    _: None = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    school_id = user["school_id"]
    res = await db.execute(
        select(Student).where(
            Student.id == student_id,
            Student.school_id == school_id,
            Student.class_section_id == cs_id,
        )
    )
    student = res.scalar_one_or_none()
    if not student:
        raise HTTPException(404, "Student not found in this class section")

    student.class_section_id = None
    await db.flush()
    return ok({"unassigned": student_id})


# ── Subject assignment endpoints ───────────────────────────────────────────────

class SubjectAssignBody(BaseModel):
    subject: str
    staff_id: str
    academic_year_id: Optional[str] = None


class SubjectUpdateBody(BaseModel):
    staff_id: Optional[str] = None
    subject: Optional[str] = None


@router.get("/class-sections/{cs_id}/subjects", response_model=Response)
async def list_class_subjects(
    cs_id: str,
    user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await _require_subject_access(db, user, cs_id)

    ts_res = await db.execute(
        select(TeacherSubject)
        .where(
            TeacherSubject.class_section_id == cs_id,
            TeacherSubject.school_id == user["school_id"],
        )
        .limit(100)
    )
    ts_list = ts_res.scalars().all()
    enriched = await _enrich_ts(db, list(ts_list))
    return ok(enriched)


@router.post("/class-sections/{cs_id}/subjects", response_model=Response)
async def assign_subject_to_class(
    cs_id: str,
    body: SubjectAssignBody,
    user: CurrentUser,
    _: None = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    school_id = user["school_id"]

    cs_res = await db.execute(
        select(ClassSection).where(ClassSection.id == cs_id, ClassSection.school_id == school_id)
    )
    cs = cs_res.scalar_one_or_none()
    if not cs:
        raise HTTPException(404, "Class section not found")

    # Validate subject name against active subjects in school (case-insensitive)
    subj_res = await db.execute(
        select(Subject).where(
            Subject.school_id == school_id,
            Subject.is_active == True,
        )
    )
    active_subjects = subj_res.scalars().all()
    subject_names_lower = {s.name.lower() for s in active_subjects}
    if body.subject.lower() not in subject_names_lower:
        raise HTTPException(422, f"Subject '{body.subject}' is not an active subject for this school")

    # Validate staff belongs to school
    staff_res = await db.execute(
        select(Staff).where(Staff.id == body.staff_id, Staff.school_id == school_id)
    )
    if not staff_res.scalar_one_or_none():
        raise HTTPException(404, "Staff member not found in this school")

    ay_id = body.academic_year_id or cs.academic_year_id

    ts = TeacherSubject(
        school_id=school_id,
        staff_id=body.staff_id,
        subject=body.subject,
        class_section_id=cs_id,
        academic_year_id=ay_id,
    )
    db.add(ts)
    try:
        await db.flush()
    except IntegrityError:
        await db.rollback()
        raise HTTPException(409, f"Subject '{body.subject}' is already assigned to this class section for this academic year")

    await db.refresh(ts)
    enriched = await _enrich_ts(db, [ts])
    return ok(enriched[0])


@router.put("/class-sections/{cs_id}/subjects/{ts_id}", response_model=Response)
async def update_class_subject(
    cs_id: str,
    ts_id: str,
    body: SubjectUpdateBody,
    user: CurrentUser,
    _: None = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    school_id = user["school_id"]

    if body.staff_id is None and body.subject is None:
        raise HTTPException(422, "At least one of staff_id or subject must be provided")

    ts_res = await db.execute(
        select(TeacherSubject).where(
            TeacherSubject.id == ts_id,
            TeacherSubject.class_section_id == cs_id,
            TeacherSubject.school_id == school_id,
        )
    )
    ts = ts_res.scalar_one_or_none()
    if not ts:
        raise HTTPException(404, "Subject assignment not found")

    if body.staff_id is not None:
        staff_res = await db.execute(
            select(Staff).where(Staff.id == body.staff_id, Staff.school_id == school_id)
        )
        if not staff_res.scalar_one_or_none():
            raise HTTPException(404, "Staff member not found in this school")
        ts.staff_id = body.staff_id

    if body.subject is not None:
        subj_res = await db.execute(
            select(Subject).where(Subject.school_id == school_id, Subject.is_active == True)
        )
        active_subjects = subj_res.scalars().all()
        subject_names_lower = {s.name.lower() for s in active_subjects}
        if body.subject.lower() not in subject_names_lower:
            raise HTTPException(422, f"Subject '{body.subject}' is not an active subject for this school")
        ts.subject = body.subject

    try:
        await db.flush()
    except IntegrityError:
        await db.rollback()
        raise HTTPException(409, f"Subject '{ts.subject}' is already assigned to this class section for this academic year")

    await db.refresh(ts)
    enriched = await _enrich_ts(db, [ts])
    return ok(enriched[0])


@router.delete("/class-sections/{cs_id}/subjects/{ts_id}", response_model=Response)
async def remove_class_subject(
    cs_id: str,
    ts_id: str,
    user: CurrentUser,
    _: None = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    school_id = user["school_id"]

    ts_res = await db.execute(
        select(TeacherSubject).where(
            TeacherSubject.id == ts_id,
            TeacherSubject.class_section_id == cs_id,
            TeacherSubject.school_id == school_id,
        )
    )
    ts = ts_res.scalar_one_or_none()
    if not ts:
        raise HTTPException(404, "Subject assignment not found")

    await db.delete(ts)
    await db.flush()
    return ok({"deleted": ts_id})
