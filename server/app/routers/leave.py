from datetime import datetime, date, timedelta
from fastapi import APIRouter, Depends, Query, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func

from app.database import get_db
from app.deps import get_current_user, CurrentUser, require_admin, require_teacher
from app.models.leave import Leave
from app.models.attendance import StudentAttendanceRecord
from app.models.admission import ParentGuardian
from app.models.student import Student
from app.schemas.leave import LeaveCreate, LeaveUpdate, LeaveReviewIn, LeaveOut
from app.schemas.common import Response, ok

router = APIRouter()


async def _mark_leave_attendance(leave: Leave, user_id: str, db: AsyncSession) -> None:
    """Create/update student attendance records for approved student leave period."""
    if leave.entity_type != "student":
        return

    now = datetime.utcnow()

    # Look up the student to get class_section_id and academic_year_id
    student_res = await db.execute(
        select(Student).where(Student.id == leave.entity_id, Student.school_id == leave.school_id)
    )
    student = student_res.scalar_one_or_none()
    if not student:
        # Cannot create attendance records without student context
        return

    # Iterate dates in the leave range
    current = leave.from_date
    while current <= leave.to_date:
        existing_res = await db.execute(
            select(StudentAttendanceRecord).where(
                StudentAttendanceRecord.school_id == leave.school_id,
                StudentAttendanceRecord.student_id == leave.entity_id,
                StudentAttendanceRecord.date == current,
                StudentAttendanceRecord.class_section_id == student.class_section_id,
            )
        )
        existing = existing_res.scalar_one_or_none()
        if existing:
            existing.previous_status = existing.status
            existing.status = "on_leave"
            existing.updated_by = user_id
            existing.updated_at = now
            existing.source = "leave"
            existing.leave_id = leave.id
        else:
            rec = StudentAttendanceRecord(
                school_id=leave.school_id,
                academic_year_id=student.academic_year_id,
                class_section_id=student.class_section_id,
                student_id=leave.entity_id,
                date=current,
                status="on_leave",
                marked_by=user_id,
                marked_at=now,
                source="leave",
                leave_id=leave.id,
            )
            db.add(rec)
        current += timedelta(days=1)


async def _revert_leave_attendance(leave: Leave, db: AsyncSession) -> None:
    """Revert student attendance records created from this leave back to not_marked."""
    if leave.entity_type != "student":
        return

    recs_res = await db.execute(
        select(StudentAttendanceRecord).where(
            StudentAttendanceRecord.source == "leave",
            StudentAttendanceRecord.leave_id == leave.id,
        )
    )
    recs = recs_res.scalars().all()
    for rec in recs:
        rec.status = "not_marked"
        rec.source = "manual"
        rec.leave_id = None
        rec.previous_status = "on_leave"
        rec.updated_at = datetime.utcnow()


@router.post("/leaves", response_model=Response)
async def create_leave(
    body: LeaveCreate,
    user: CurrentUser,
    db: AsyncSession = Depends(get_db),
):
    role = user["role"]
    if role not in ("superadmin", "admin"):
        entity_id = user["entity_id"]
        if body.entity_type == "student":
            if role == "student" and body.entity_id != entity_id:
                raise HTTPException(status_code=403, detail="Cannot apply leave for another student")
            if role == "parent":
                pg_res = await db.execute(
                    select(ParentGuardian).where(
                        ParentGuardian.parent_id == entity_id,
                        ParentGuardian.student_id == body.entity_id,
                    )
                )
                if not pg_res.scalar_one_or_none():
                    raise HTTPException(status_code=403, detail="Cannot apply leave for this student")
            elif role not in ("student", "parent"):
                raise HTTPException(status_code=403, detail="Not allowed to apply student leave")
        elif body.entity_type == "staff" and body.entity_id != entity_id:
            raise HTTPException(status_code=403, detail="Cannot apply leave for another staff member")

    leave = Leave(school_id=user["school_id"], applied_by=user["user_id"], **body.model_dump())
    db.add(leave)
    await db.flush()
    await db.refresh(leave)
    return ok(LeaveOut.model_validate(leave).model_dump())


@router.get("/leaves", response_model=Response)
async def list_leaves(
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    entity_type: str = Query(None),
    entity_id: str = Query(None),
    status: str = Query(None),
    db: AsyncSession = Depends(get_db),
    user: dict = Depends(get_current_user),
):
    school_id = user["school_id"]
    q = select(Leave).where(Leave.school_id == school_id)
    if entity_type:
        q = q.where(Leave.entity_type == entity_type)
    if entity_id:
        q = q.where(Leave.entity_id == entity_id)
    if status:
        q = q.where(Leave.status == status)
    total = (await db.execute(select(func.count()).select_from(q.subquery()))).scalar_one()
    offset = (page - 1) * limit
    items = (await db.execute(q.order_by(Leave.applied_at.desc()).offset(offset).limit(limit))).scalars().all()
    return ok([LeaveOut.model_validate(l).model_dump() for l in items], meta={"page": page, "limit": limit, "total": total})


@router.get("/leaves/{leave_id}", response_model=Response)
async def get_leave(leave_id: str, db: AsyncSession = Depends(get_db), user: dict = Depends(get_current_user)):
    res = await db.execute(select(Leave).where(Leave.id == leave_id, Leave.school_id == user["school_id"]))
    leave = res.scalar_one_or_none()
    if not leave:
        raise HTTPException(status_code=404, detail="Leave not found")
    return ok(LeaveOut.model_validate(leave).model_dump())


@router.put("/leaves/{leave_id}", response_model=Response)
async def update_leave(
    leave_id: str,
    body: LeaveUpdate,
    user: CurrentUser,
    _: None = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    res = await db.execute(select(Leave).where(Leave.id == leave_id, Leave.school_id == user["school_id"]))
    leave = res.scalar_one_or_none()
    if not leave:
        raise HTTPException(status_code=404, detail="Leave not found")
    if leave.status != "pending":
        raise HTTPException(status_code=400, detail="Only pending leaves can be edited")
    for k, v in body.model_dump(exclude_none=True).items():
        setattr(leave, k, v)
    await db.flush()
    await db.refresh(leave)
    return ok(LeaveOut.model_validate(leave).model_dump())


@router.post("/leaves/{leave_id}/approve", response_model=Response)
async def approve_leave(
    leave_id: str,
    body: LeaveReviewIn,
    user: CurrentUser,
    _: None = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    res = await db.execute(select(Leave).where(Leave.id == leave_id, Leave.school_id == user["school_id"]))
    leave = res.scalar_one_or_none()
    if not leave:
        raise HTTPException(status_code=404, detail="Leave not found")
    leave.status = "approved"
    leave.reviewed_by = user["user_id"]
    leave.reviewed_at = datetime.utcnow()
    leave.review_note = body.review_note
    await db.flush()

    # Auto-create/update attendance records for student leaves
    await _mark_leave_attendance(leave, user["user_id"], db)
    await db.flush()
    await db.refresh(leave)
    return ok(LeaveOut.model_validate(leave).model_dump())


@router.post("/leaves/{leave_id}/reject", response_model=Response)
async def reject_leave(
    leave_id: str,
    body: LeaveReviewIn,
    user: CurrentUser,
    _: None = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    res = await db.execute(select(Leave).where(Leave.id == leave_id, Leave.school_id == user["school_id"]))
    leave = res.scalar_one_or_none()
    if not leave:
        raise HTTPException(status_code=404, detail="Leave not found")
    leave.status = "rejected"
    leave.reviewed_by = user["user_id"]
    leave.reviewed_at = datetime.utcnow()
    leave.review_note = body.review_note
    await db.flush()
    await db.refresh(leave)
    return ok(LeaveOut.model_validate(leave).model_dump())


@router.patch("/leaves/{leave_id}/cancel", response_model=Response)
async def cancel_leave(
    leave_id: str,
    user: CurrentUser,
    _: None = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    res = await db.execute(select(Leave).where(Leave.id == leave_id, Leave.school_id == user["school_id"]))
    leave = res.scalar_one_or_none()
    if not leave:
        raise HTTPException(status_code=404, detail="Leave not found")

    was_approved = leave.status == "approved"
    leave.status = "cancelled"
    await db.flush()

    # Revert attendance records if the leave was previously approved
    if was_approved:
        await _revert_leave_attendance(leave, db)
        await db.flush()

    await db.refresh(leave)
    return ok(LeaveOut.model_validate(leave).model_dump())
