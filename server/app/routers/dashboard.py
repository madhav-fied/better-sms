from datetime import date
from fastapi import APIRouter, Depends, Query, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func

from app.database import get_db
from app.deps import get_current_user
from app.models.student import Student
from app.models.staff import Staff
from app.models.core import AcademicYear, ClassSection
from app.models.timetable import PeriodConfig, Timetable
from app.schemas.common import Response, ok

router = APIRouter()


@router.get("/dashboard/header-summary", response_model=Response)
async def header_summary(
    academic_year_id: str = Query(None),
    db: AsyncSession = Depends(get_db),
    user: dict = Depends(get_current_user),
):
    school_id = user["school_id"]
    sq = select(Student).where(Student.school_id == school_id, Student.status == "active")
    if academic_year_id:
        sq = sq.where(Student.academic_year_id == academic_year_id)
    total_students = (await db.execute(select(func.count()).select_from(sq.subquery()))).scalar_one()

    staffq = select(Staff).where(Staff.school_id == school_id, Staff.status == "active")
    total_staff = (await db.execute(select(func.count()).select_from(staffq.subquery()))).scalar_one()

    male_q = sq.where(Student.gender == "male")
    total_male = (await db.execute(select(func.count()).select_from(male_q.subquery()))).scalar_one()

    female_q = sq.where(Student.gender == "female")
    total_female = (await db.execute(select(func.count()).select_from(female_q.subquery()))).scalar_one()

    ay_label = None
    ay_res = await db.execute(
        select(AcademicYear).where(AcademicYear.school_id == school_id, AcademicYear.is_active == True)
    )
    active_ay = ay_res.scalar_one_or_none()
    if active_ay:
        ay_label = active_ay.label

    return ok({
        "total_students": total_students,
        "total_staff": total_staff,
        "total_male_students": total_male,
        "total_female_students": total_female,
        "students": total_students,
        "staff": total_staff,
        "ay_label": ay_label,
    })


@router.get("/dashboard/teacher-summary", response_model=Response)
async def teacher_summary(
    db: AsyncSession = Depends(get_db),
    user: dict = Depends(get_current_user),
):
    if user["role"] != "teacher":
        raise HTTPException(status_code=403, detail="Teacher role required")

    school_id = user["school_id"]
    entity_id = user["entity_id"]
    today_dow = date.today().weekday()

    period_labels: dict[int, str] = {}
    config_res = await db.execute(select(PeriodConfig).where(PeriodConfig.school_id == school_id))
    config = config_res.scalar_one_or_none()
    if config and config.periods:
        for p in config.periods:
            if isinstance(p, dict) and p.get("period_number") is not None:
                period_labels[p["period_number"]] = p.get("label") or f"Period {p['period_number']}"

    tt_res = await db.execute(
        select(Timetable).where(Timetable.school_id == school_id, Timetable.status == "published")
    )
    timetables = tt_res.scalars().all()

    cs_ids = list({tt.class_section_id for tt in timetables})
    cs_map: dict[str, ClassSection] = {}
    if cs_ids:
        cs_res = await db.execute(select(ClassSection).where(ClassSection.id.in_(cs_ids)))
        cs_map = {cs.id: cs for cs in cs_res.scalars().all()}

    today_periods = []
    for tt in timetables:
        slots = tt.slots if isinstance(tt.slots, list) else []
        cs = cs_map.get(tt.class_section_id)
        class_name = f"{cs.class_name} {cs.section}".strip() if cs else ""
        for slot in slots:
            if not isinstance(slot, dict):
                continue
            if slot.get("day_of_week") != today_dow:
                continue
            if slot.get("teacher_staff_id") != entity_id:
                continue
            period_no = slot.get("period_number")
            today_periods.append({
                "period_name": period_labels.get(period_no, f"Period {period_no}" if period_no else "Period"),
                "subject": slot.get("subject") or "",
                "class_name": class_name,
            })

    today_periods.sort(key=lambda p: p["period_name"])
    return ok({"today_periods": today_periods})


@router.get("/dashboard/birthdays", response_model=Response)
async def birthdays(
    db: AsyncSession = Depends(get_db),
    user: dict = Depends(get_current_user),
):
    school_id = user["school_id"]
    today = date.today()
    month = today.month
    day = today.day

    students_res = await db.execute(
        select(Student).where(Student.school_id == school_id, Student.status == "active", Student.dob != None)
    )
    students = students_res.scalars().all()
    student_bdays = [
        {"type": "student", "id": s.id, "name": f"{s.first_name} {s.last_name}", "dob": str(s.dob)}
        for s in students
        if s.dob and s.dob.month == month and s.dob.day == day
    ]

    staff_res = await db.execute(
        select(Staff).where(Staff.school_id == school_id, Staff.status == "active", Staff.dob != None)
    )
    staffs = staff_res.scalars().all()
    staff_bdays = [
        {"type": "staff", "id": s.id, "name": s.name, "dob": str(s.dob)}
        for s in staffs
        if s.dob and s.dob.month == month and s.dob.day == day
    ]

    return ok({"date": str(today), "birthdays": student_bdays + staff_bdays})
