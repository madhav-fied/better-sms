from fastapi import APIRouter, Depends, Query, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func

from app.database import get_db
from app.deps import get_current_user
from app.models.student import Student
from app.schemas.student import StudentUpdate, StudentOut
from app.schemas.common import Response, ok

router = APIRouter()


@router.get("/students", response_model=Response)
async def list_students(
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    class_section_id: str = Query(None),
    academic_year_id: str = Query(None),
    status: str = Query(None),
    db: AsyncSession = Depends(get_db),
    user: dict = Depends(get_current_user),
):
    school_id = user["school_id"]
    q = select(Student).where(Student.school_id == school_id)
    if class_section_id:
        q = q.where(Student.class_section_id == class_section_id)
    if academic_year_id:
        q = q.where(Student.academic_year_id == academic_year_id)
    if status:
        q = q.where(Student.status == status)
    total = (await db.execute(select(func.count()).select_from(q.subquery()))).scalar_one()
    offset = (page - 1) * limit
    items = (await db.execute(q.order_by(Student.created_at.desc()).offset(offset).limit(limit))).scalars().all()
    return ok([StudentOut.model_validate(s).model_dump() for s in items], meta={"page": page, "limit": limit, "total": total})


@router.get("/students/{student_id}", response_model=Response)
async def get_student(student_id: str, db: AsyncSession = Depends(get_db), user: dict = Depends(get_current_user)):
    res = await db.execute(select(Student).where(Student.id == student_id, Student.school_id == user["school_id"]))
    student = res.scalar_one_or_none()
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")
    return ok(StudentOut.model_validate(student).model_dump())


@router.put("/students/{student_id}", response_model=Response)
async def update_student(student_id: str, body: StudentUpdate, db: AsyncSession = Depends(get_db), user: dict = Depends(get_current_user)):
    res = await db.execute(select(Student).where(Student.id == student_id, Student.school_id == user["school_id"]))
    student = res.scalar_one_or_none()
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")
    for k, v in body.model_dump(exclude_none=True).items():
        setattr(student, k, v)
    await db.flush()
    await db.refresh(student)
    return ok(StudentOut.model_validate(student).model_dump())


@router.patch("/students/{student_id}/status", response_model=Response)
async def toggle_student_status(student_id: str, db: AsyncSession = Depends(get_db), user: dict = Depends(get_current_user)):
    res = await db.execute(select(Student).where(Student.id == student_id, Student.school_id == user["school_id"]))
    student = res.scalar_one_or_none()
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")
    student.status = "inactive" if student.status == "active" else "active"
    await db.flush()
    await db.refresh(student)
    return ok(StudentOut.model_validate(student).model_dump())
