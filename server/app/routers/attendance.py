from datetime import datetime
from fastapi import APIRouter, Depends, Query, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func

from app.database import get_db
from app.deps import get_current_user, CurrentUser, require_admin, require_teacher
from app.models.attendance import StudentAttendanceRecord, StaffAttendanceRecord
from app.models.core import ClassSection
from app.models.staff import TeacherSubject
from app.schemas.attendance import (
    StudentAttendanceMarkIn, StudentAttendanceUpdate, StudentAttendanceOut,
    StaffAttendanceMarkIn, StaffAttendanceUpdate, StaffAttendanceOut,
)
from app.schemas.common import Response, ok

router = APIRouter()


async def _check_teacher_class_access(db: AsyncSession, user: dict, class_section_id: str) -> None:
    """Raises 403/404 if a teacher is not assigned to the given class section. Admins bypass."""
    role = user["role"]
    if role in ("admin", "superadmin"):
        return
    if role != "teacher":
        raise HTTPException(403, "Access denied")
    entity_id = user["entity_id"]
    cs_res = await db.execute(
        select(ClassSection).where(
            ClassSection.id == class_section_id,
            ClassSection.school_id == user["school_id"],
        )
    )
    cs = cs_res.scalar_one_or_none()
    if not cs:
        raise HTTPException(404, "Class section not found")
    if cs.class_teacher_id == entity_id:
        return
    ts_res = await db.execute(
        select(TeacherSubject).where(
            TeacherSubject.class_section_id == class_section_id,
            TeacherSubject.staff_id == entity_id,
        )
    )
    if not ts_res.scalar_one_or_none():
        raise HTTPException(403, "Not assigned to this class")


# ── Student Attendance ────────────────────────────────────────────────────────

@router.post("/attendance/students/mark", response_model=Response)
async def mark_student_attendance(
    body: StudentAttendanceMarkIn,
    user: CurrentUser,
    _: None = Depends(require_teacher),
    db: AsyncSession = Depends(get_db),
):
    await _check_teacher_class_access(db, user, body.class_section_id)
    school_id = user["school_id"]
    now = datetime.utcnow()
    created = []
    for item in body.records:
        existing_res = await db.execute(
            select(StudentAttendanceRecord).where(
                StudentAttendanceRecord.school_id == school_id,
                StudentAttendanceRecord.student_id == item.student_id,
                StudentAttendanceRecord.date == body.date,
                StudentAttendanceRecord.class_section_id == body.class_section_id,
            )
        )
        existing = existing_res.scalar_one_or_none()
        if existing:
            existing.previous_status = existing.status
            existing.status = item.status
            existing.updated_by = user["user_id"]
            existing.updated_at = now
            if item.notes is not None:
                existing.notes = item.notes
            created.append(existing)
        else:
            rec = StudentAttendanceRecord(
                school_id=school_id,
                academic_year_id=body.academic_year_id,
                class_section_id=body.class_section_id,
                student_id=item.student_id,
                date=body.date,
                period_no=item.period_no,
                session=item.session,
                status=item.status,
                notes=item.notes,
                marked_by=user["user_id"],
                marked_at=now,
            )
            db.add(rec)
            created.append(rec)
    await db.flush()
    for r in created:
        await db.refresh(r)
    return ok([StudentAttendanceOut.model_validate(r).model_dump() for r in created])


@router.get("/attendance/students", response_model=Response)
async def list_student_attendance(
    class_section_id: str = Query(None),
    academic_year_id: str = Query(None),
    date: str = Query(None),
    student_id: str = Query(None),
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    user: dict = Depends(get_current_user),
):
    school_id = user["school_id"]
    q = select(StudentAttendanceRecord).where(StudentAttendanceRecord.school_id == school_id)

    # Scope teachers to only their assigned class sections
    if user["role"] == "teacher":
        entity_id = user["entity_id"]
        ts_res = await db.execute(
            select(TeacherSubject.class_section_id).where(TeacherSubject.staff_id == entity_id).distinct()
        )
        teacher_class_ids = [row[0] for row in ts_res.all()]
        ct_res = await db.execute(
            select(ClassSection.id).where(
                ClassSection.school_id == school_id,
                ClassSection.class_teacher_id == entity_id,
            )
        )
        teacher_class_ids += [row[0] for row in ct_res.all()]
        teacher_class_ids = list(set(teacher_class_ids))
        if class_section_id:
            if class_section_id not in teacher_class_ids:
                raise HTTPException(403, "Not assigned to this class")
            q = q.where(StudentAttendanceRecord.class_section_id == class_section_id)
        else:
            q = q.where(StudentAttendanceRecord.class_section_id.in_(teacher_class_ids))
    elif class_section_id:
        q = q.where(StudentAttendanceRecord.class_section_id == class_section_id)

    if academic_year_id:
        q = q.where(StudentAttendanceRecord.academic_year_id == academic_year_id)
    if date:
        q = q.where(StudentAttendanceRecord.date == date)
    if student_id:
        q = q.where(StudentAttendanceRecord.student_id == student_id)
    total = (await db.execute(select(func.count()).select_from(q.subquery()))).scalar_one()
    offset = (page - 1) * limit
    items = (await db.execute(q.order_by(StudentAttendanceRecord.date.desc()).offset(offset).limit(limit))).scalars().all()
    return ok([StudentAttendanceOut.model_validate(r).model_dump() for r in items], meta={"page": page, "limit": limit, "total": total})


@router.put("/attendance/students/{record_id}", response_model=Response)
async def update_student_attendance(
    record_id: str,
    body: StudentAttendanceUpdate,
    user: CurrentUser,
    _: None = Depends(require_teacher),
    db: AsyncSession = Depends(get_db),
):
    res = await db.execute(select(StudentAttendanceRecord).where(
        StudentAttendanceRecord.id == record_id,
        StudentAttendanceRecord.school_id == user["school_id"]
    ))
    rec = res.scalar_one_or_none()
    if not rec:
        raise HTTPException(status_code=404, detail="Attendance record not found")
    if body.status:
        rec.previous_status = rec.status
        rec.status = body.status
    if body.notes is not None:
        rec.notes = body.notes
    if body.period_no is not None:
        rec.period_no = body.period_no
    if body.session is not None:
        rec.session = body.session
    rec.updated_by = user["user_id"]
    rec.updated_at = datetime.utcnow()
    await db.flush()
    await db.refresh(rec)
    return ok(StudentAttendanceOut.model_validate(rec).model_dump())


@router.get("/attendance/students/{student_id}/summary", response_model=Response)
async def student_attendance_summary(
    student_id: str,
    academic_year_id: str = Query(None),
    db: AsyncSession = Depends(get_db),
    user: dict = Depends(get_current_user),
):
    school_id = user["school_id"]
    q = select(StudentAttendanceRecord).where(
        StudentAttendanceRecord.school_id == school_id,
        StudentAttendanceRecord.student_id == student_id,
    )
    if academic_year_id:
        q = q.where(StudentAttendanceRecord.academic_year_id == academic_year_id)
    records = (await db.execute(q)).scalars().all()
    total = len(records)
    present = sum(1 for r in records if r.status == "present")
    absent = sum(1 for r in records if r.status == "absent")
    late = sum(1 for r in records if r.status == "late")
    on_leave = sum(1 for r in records if r.status == "on_leave")
    pct = round((present / total) * 100, 2) if total else 0.0
    return ok({
        "student_id": student_id,
        "total": total,
        "present": present,
        "absent": absent,
        "late": late,
        "on_leave": on_leave,
        "attendance_percentage": pct,
    })


# ── Staff Attendance ──────────────────────────────────────────────────────────

@router.post("/attendance/staff/mark", response_model=Response)
async def mark_staff_attendance(
    body: StaffAttendanceMarkIn,
    user: CurrentUser,
    _: None = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    school_id = user["school_id"]
    now = datetime.utcnow()
    created = []
    for item in body.records:
        existing_res = await db.execute(
            select(StaffAttendanceRecord).where(
                StaffAttendanceRecord.school_id == school_id,
                StaffAttendanceRecord.staff_id == item.staff_id,
                StaffAttendanceRecord.date == body.date,
            )
        )
        existing = existing_res.scalar_one_or_none()
        if existing:
            existing.previous_status = existing.status
            existing.status = item.status
            existing.updated_by = user["user_id"]
            existing.updated_at = now
            if item.check_in_time is not None:
                existing.check_in_time = item.check_in_time
            if item.check_out_time is not None:
                existing.check_out_time = item.check_out_time
            if item.notes is not None:
                existing.notes = item.notes
            created.append(existing)
        else:
            rec = StaffAttendanceRecord(
                school_id=school_id,
                staff_id=item.staff_id,
                date=body.date,
                status=item.status,
                check_in_time=item.check_in_time,
                check_out_time=item.check_out_time,
                notes=item.notes,
                marked_by=user["user_id"],
                marked_at=now,
            )
            db.add(rec)
            created.append(rec)
    await db.flush()
    for r in created:
        await db.refresh(r)
    return ok([StaffAttendanceOut.model_validate(r).model_dump() for r in created])


@router.get("/attendance/staff", response_model=Response)
async def list_staff_attendance(
    staff_id: str = Query(None),
    date: str = Query(None),
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    user: dict = Depends(get_current_user),
):
    school_id = user["school_id"]
    q = select(StaffAttendanceRecord).where(StaffAttendanceRecord.school_id == school_id)
    if staff_id:
        q = q.where(StaffAttendanceRecord.staff_id == staff_id)
    if date:
        q = q.where(StaffAttendanceRecord.date == date)
    total = (await db.execute(select(func.count()).select_from(q.subquery()))).scalar_one()
    offset = (page - 1) * limit
    items = (await db.execute(q.order_by(StaffAttendanceRecord.date.desc()).offset(offset).limit(limit))).scalars().all()
    return ok([StaffAttendanceOut.model_validate(r).model_dump() for r in items], meta={"page": page, "limit": limit, "total": total})


@router.put("/attendance/staff/{record_id}", response_model=Response)
async def update_staff_attendance(
    record_id: str,
    body: StaffAttendanceUpdate,
    user: CurrentUser,
    _: None = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    res = await db.execute(select(StaffAttendanceRecord).where(
        StaffAttendanceRecord.id == record_id,
        StaffAttendanceRecord.school_id == user["school_id"]
    ))
    rec = res.scalar_one_or_none()
    if not rec:
        raise HTTPException(status_code=404, detail="Attendance record not found")
    if body.status:
        rec.previous_status = rec.status
        rec.status = body.status
    if body.check_in_time is not None:
        rec.check_in_time = body.check_in_time
    if body.check_out_time is not None:
        rec.check_out_time = body.check_out_time
    if body.notes is not None:
        rec.notes = body.notes
    rec.updated_by = user["user_id"]
    rec.updated_at = datetime.utcnow()
    await db.flush()
    await db.refresh(rec)
    return ok(StaffAttendanceOut.model_validate(rec).model_dump())
