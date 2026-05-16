from datetime import date
from fastapi import APIRouter, Depends, Query, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, or_

from app.database import get_db
from app.deps import get_current_user, CurrentUser, require_admin
from app.models.student import Student
from app.models.core import AcademicYear, ClassSection
from app.schemas.student import StudentCreate, StudentUpdate, StudentOut
from app.schemas.common import Response, ok

router = APIRouter()


async def _attach_class(db: AsyncSession, students: list[Student]) -> list[dict]:
    cs_ids = list({s.class_section_id for s in students})
    cs_map: dict[str, ClassSection] = {}
    if cs_ids:
        cs_res = await db.execute(select(ClassSection).where(ClassSection.id.in_(cs_ids)))
        cs_map = {cs.id: cs for cs in cs_res.scalars().all()}
    result = []
    for s in students:
        d = StudentOut.model_validate(s).model_dump()
        cs = cs_map.get(s.class_section_id)
        if cs:
            d["class_name"] = cs.class_name
            d["section"] = cs.section
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
    if not academic_year_id:
        ay_res = await db.execute(
            select(AcademicYear).where(AcademicYear.school_id == school_id, AcademicYear.is_active == True)
        )
        ay = ay_res.scalar_one_or_none()
        if not ay:
            raise HTTPException(status_code=400, detail="No active academic year. Please create one first.")
        academic_year_id = ay.id
    else:
        ay_res = await db.execute(select(AcademicYear).where(AcademicYear.id == academic_year_id))
        ay = ay_res.scalar_one_or_none()

    ay_year = ay.start_date.year if ay else date.today().year
    count_res = await db.execute(
        select(func.count()).select_from(Student).where(
            Student.school_id == school_id,
            Student.academic_year_id == academic_year_id,
        )
    )
    seq = (count_res.scalar_one() or 0) + 1
    admission_no = f"{ay_year}{seq:04d}"

    student = Student(
        school_id=school_id,
        academic_year_id=academic_year_id,
        admission_no=admission_no,
        first_name=body.first_name,
        last_name=body.last_name,
        gender=body.gender,
        dob=body.dob,
        blood_group=body.blood_group,
        aadhar_no=body.aadhar_no,
        class_section_id=body.class_section_id,
        student_type=body.student_type,
        hosteller=body.hosteller,
        admission_type=body.admission_type,
    )
    db.add(student)
    await db.flush()
    await db.refresh(student)

    rows = await _attach_class(db, [student])
    return ok(rows[0])


@router.get("/students", response_model=Response)
async def list_students(
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    search: str = Query(None),
    class_section_id: str = Query(None),
    academic_year_id: str = Query(None),
    status: str = Query(None),
    db: AsyncSession = Depends(get_db),
    user: dict = Depends(get_current_user),
):
    school_id = user["school_id"]
    q = select(Student).where(Student.school_id == school_id)
    if search:
        like = f"%{search}%"
        q = q.where(or_(Student.first_name.ilike(like), Student.last_name.ilike(like), Student.admission_no.ilike(like)))
    if class_section_id:
        q = q.where(Student.class_section_id == class_section_id)
    if academic_year_id:
        q = q.where(Student.academic_year_id == academic_year_id)
    if status:
        q = q.where(Student.status == status)

    total = (await db.execute(select(func.count()).select_from(q.subquery()))).scalar_one()
    offset = (page - 1) * limit
    items = (await db.execute(q.order_by(Student.created_at.desc()).offset(offset).limit(limit))).scalars().all()

    rows = await _attach_class(db, list(items))
    return ok(rows, meta={"page": page, "limit": limit, "total": total})


@router.get("/students/{student_id}", response_model=Response)
async def get_student(student_id: str, db: AsyncSession = Depends(get_db), user: dict = Depends(get_current_user)):
    res = await db.execute(select(Student).where(Student.id == student_id, Student.school_id == user["school_id"]))
    student = res.scalar_one_or_none()
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")
    rows = await _attach_class(db, [student])
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
    rows = await _attach_class(db, [student])
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
    rows = await _attach_class(db, [student])
    return ok(rows[0])
