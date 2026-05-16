from datetime import date
from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func

from app.database import get_db
from app.deps import get_current_user
from app.models.student import Student
from app.models.staff import Staff
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

    return ok({
        "total_students": total_students,
        "total_staff": total_staff,
        "total_male_students": total_male,
        "total_female_students": total_female,
    })


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
