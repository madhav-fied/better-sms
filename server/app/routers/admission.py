from datetime import date
from fastapi import APIRouter, Depends, Query, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func

from app.database import get_db
from app.deps import get_current_user, CurrentUser, require_admin
from app.models.admission import Enquiry, Registration, ParentGuardian
from app.models.core import AcademicYear
from app.schemas.admission import (
    EnquiryCreate, EnquiryUpdate, EnquiryOut,
    RegistrationCreate, RegistrationOut,
    ParentGuardianOut, AdmitStudentIn,
)
from app.schemas.common import Response, ok, err

router = APIRouter()


def _reg_out(reg: Registration, guardians: list) -> dict:
    """Build registration output dict without triggering ORM lazy loads."""
    return {
        "id": reg.id,
        "school_id": reg.school_id,
        "academic_year_id": reg.academic_year_id,
        "enquiry_id": reg.enquiry_id,
        "status": reg.status,
        "submitted_at": reg.submitted_at,
        "student_fields": reg.student_fields,
        "parent_guardians": [ParentGuardianOut.model_validate(g).model_dump() for g in guardians],
    }


def _enq_no(year: int, seq: int) -> str:
    return f"ENQ-{year}-{seq:04d}"


# ── Enquiries ─────────────────────────────────────────────────────────────────

@router.post("/enquiries", response_model=Response)
async def create_enquiry(
    body: EnquiryCreate,
    user: CurrentUser,
    _: None = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    school_id = user["school_id"]
    ay_res = await db.execute(
        select(AcademicYear).where(AcademicYear.school_id == school_id, AcademicYear.is_active == True)
    )
    ay = ay_res.scalar_one_or_none()
    year = ay.start_date.year if ay else date.today().year
    count_res = await db.execute(
        select(func.count()).select_from(Enquiry).where(Enquiry.school_id == school_id)
    )
    seq = (count_res.scalar_one() or 0) + 1
    enq = Enquiry(school_id=school_id, enq_no=_enq_no(year, seq), **body.model_dump())
    db.add(enq)
    await db.flush()
    await db.refresh(enq)
    return ok(EnquiryOut.model_validate(enq).model_dump())


@router.get("/enquiries", response_model=Response)
async def list_enquiries(
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    status: str = Query(None),
    db: AsyncSession = Depends(get_db),
    user: dict = Depends(get_current_user),
):
    school_id = user["school_id"]
    q = select(Enquiry).where(Enquiry.school_id == school_id)
    if status:
        q = q.where(Enquiry.status == status)
    total = (await db.execute(select(func.count()).select_from(q.subquery()))).scalar_one()
    offset = (page - 1) * limit
    items = (await db.execute(q.order_by(Enquiry.created_at.desc()).offset(offset).limit(limit))).scalars().all()
    return ok([EnquiryOut.model_validate(e).model_dump() for e in items], meta={"page": page, "limit": limit, "total": total})


@router.get("/enquiries/{enq_id}", response_model=Response)
async def get_enquiry(enq_id: str, db: AsyncSession = Depends(get_db), user: dict = Depends(get_current_user)):
    res = await db.execute(select(Enquiry).where(Enquiry.id == enq_id, Enquiry.school_id == user["school_id"]))
    enq = res.scalar_one_or_none()
    if not enq:
        raise HTTPException(status_code=404, detail="Enquiry not found")
    return ok(EnquiryOut.model_validate(enq).model_dump())


@router.put("/enquiries/{enq_id}", response_model=Response)
async def update_enquiry(
    enq_id: str,
    body: EnquiryUpdate,
    user: CurrentUser,
    _: None = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    res = await db.execute(select(Enquiry).where(Enquiry.id == enq_id, Enquiry.school_id == user["school_id"]))
    enq = res.scalar_one_or_none()
    if not enq:
        raise HTTPException(status_code=404, detail="Enquiry not found")
    for k, v in body.model_dump(exclude_none=True).items():
        setattr(enq, k, v)
    await db.flush()
    await db.refresh(enq)
    return ok(EnquiryOut.model_validate(enq).model_dump())


@router.post("/enquiries/{enq_id}/convert", response_model=Response)
async def convert_enquiry(
    enq_id: str,
    body: RegistrationCreate,
    user: CurrentUser,
    _: None = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    school_id = user["school_id"]
    res = await db.execute(select(Enquiry).where(Enquiry.id == enq_id, Enquiry.school_id == school_id))
    enq = res.scalar_one_or_none()
    if not enq:
        raise HTTPException(status_code=404, detail="Enquiry not found")

    academic_year_id = body.academic_year_id
    if not academic_year_id:
        ay_res = await db.execute(
            select(AcademicYear).where(AcademicYear.school_id == school_id, AcademicYear.is_active == True)
        )
        ay = ay_res.scalar_one_or_none()
        if not ay:
            raise HTTPException(status_code=400, detail="No active academic year. Please create one first.")
        academic_year_id = ay.id

    student_fields = body.student_fields or {
        "first_name": enq.student_name,
        "last_name": "",
    }

    enq.status = "converted"
    guardians_data = body.parent_guardians or []
    reg = Registration(
        school_id=school_id,
        academic_year_id=academic_year_id,
        enquiry_id=enq_id,
        student_fields=student_fields,
    )
    db.add(reg)
    await db.flush()
    for gd in guardians_data:
        pg = ParentGuardian(registration_id=reg.id, **gd.model_dump())
        db.add(pg)
    await db.flush()
    await db.refresh(reg)
    guardians_res = await db.execute(select(ParentGuardian).where(ParentGuardian.registration_id == reg.id))
    guardians = guardians_res.scalars().all()
    return ok(_reg_out(reg, guardians))


@router.patch("/enquiries/{enq_id}/reject", response_model=Response)
async def reject_enquiry(
    enq_id: str,
    user: CurrentUser,
    _: None = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    res = await db.execute(select(Enquiry).where(Enquiry.id == enq_id, Enquiry.school_id == user["school_id"]))
    enq = res.scalar_one_or_none()
    if not enq:
        raise HTTPException(status_code=404, detail="Enquiry not found")
    enq.status = "rejected"
    await db.flush()
    await db.refresh(enq)
    return ok(EnquiryOut.model_validate(enq).model_dump())


# ── Registrations ─────────────────────────────────────────────────────────────

@router.post("/registrations", response_model=Response)
async def create_registration(
    body: RegistrationCreate,
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
    guardians_data = body.parent_guardians or []
    reg = Registration(
        school_id=school_id,
        academic_year_id=academic_year_id,
        enquiry_id=body.enquiry_id,
        student_fields=body.student_fields,
    )
    db.add(reg)
    await db.flush()
    for gd in guardians_data:
        pg = ParentGuardian(registration_id=reg.id, **gd.model_dump())
        db.add(pg)
    await db.flush()
    await db.refresh(reg)
    guardians_res = await db.execute(select(ParentGuardian).where(ParentGuardian.registration_id == reg.id))
    guardians = guardians_res.scalars().all()
    return ok(_reg_out(reg, guardians))


@router.get("/registrations", response_model=Response)
async def list_registrations(
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    status: str = Query(None),
    db: AsyncSession = Depends(get_db),
    user: dict = Depends(get_current_user),
):
    school_id = user["school_id"]
    q = select(Registration).where(Registration.school_id == school_id)
    if status:
        q = q.where(Registration.status == status)
    total = (await db.execute(select(func.count()).select_from(q.subquery()))).scalar_one()
    offset = (page - 1) * limit
    regs = (await db.execute(q.order_by(Registration.submitted_at.desc()).offset(offset).limit(limit))).scalars().all()
    results = []
    for reg in regs:
        guardians_res = await db.execute(select(ParentGuardian).where(ParentGuardian.registration_id == reg.id))
        guardians = guardians_res.scalars().all()
        results.append(_reg_out(reg, guardians))
    return ok(results, meta={"page": page, "limit": limit, "total": total})


@router.get("/registrations/{reg_id}", response_model=Response)
async def get_registration(reg_id: str, db: AsyncSession = Depends(get_db), user: dict = Depends(get_current_user)):
    res = await db.execute(select(Registration).where(Registration.id == reg_id, Registration.school_id == user["school_id"]))
    reg = res.scalar_one_or_none()
    if not reg:
        raise HTTPException(status_code=404, detail="Registration not found")
    guardians_res = await db.execute(select(ParentGuardian).where(ParentGuardian.registration_id == reg.id))
    guardians = guardians_res.scalars().all()
    return ok(_reg_out(reg, guardians))


@router.post("/registrations/{reg_id}/accept", response_model=Response)
async def accept_registration(
    reg_id: str,
    user: CurrentUser,
    _: None = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    res = await db.execute(select(Registration).where(Registration.id == reg_id, Registration.school_id == user["school_id"]))
    reg = res.scalar_one_or_none()
    if not reg:
        raise HTTPException(status_code=404, detail="Registration not found")
    reg.status = "accepted"
    await db.flush()
    await db.refresh(reg)
    return ok(_reg_out(reg, []))


@router.post("/registrations/{reg_id}/reject", response_model=Response)
async def reject_registration(
    reg_id: str,
    user: CurrentUser,
    _: None = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    res = await db.execute(select(Registration).where(Registration.id == reg_id, Registration.school_id == user["school_id"]))
    reg = res.scalar_one_or_none()
    if not reg:
        raise HTTPException(status_code=404, detail="Registration not found")
    reg.status = "rejected"
    await db.flush()
    await db.refresh(reg)
    return ok(_reg_out(reg, []))


# ── Admit Student ─────────────────────────────────────────────────────────────

@router.post("/students/admit", response_model=Response)
async def admit_student(
    body: AdmitStudentIn,
    user: CurrentUser,
    _: None = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    from app.models.student import Student
    from app.schemas.student import StudentOut

    school_id = user["school_id"]
    reg_res = await db.execute(
        select(Registration).where(Registration.id == body.registration_id, Registration.school_id == school_id)
    )
    reg = reg_res.scalar_one_or_none()
    if not reg:
        raise HTTPException(status_code=404, detail="Registration not found")
    if reg.status != "accepted":
        raise HTTPException(status_code=400, detail="Registration must be accepted before admitting")

    ay_res = await db.execute(select(AcademicYear).where(AcademicYear.id == reg.academic_year_id))
    ay = ay_res.scalar_one_or_none()
    ay_year = ay.start_date.year if ay else date.today().year

    count_res = await db.execute(
        select(func.count()).select_from(Student).where(Student.school_id == school_id, Student.academic_year_id == reg.academic_year_id)
    )
    seq = (count_res.scalar_one() or 0) + 1
    admission_no = f"{ay_year}{seq:04d}"

    sf = reg.student_fields or {}
    student = Student(
        school_id=school_id,
        academic_year_id=reg.academic_year_id,
        admission_no=admission_no,
        first_name=sf.get("first_name", ""),
        last_name=sf.get("last_name", ""),
        gender=sf.get("gender", "other"),
        dob=sf.get("dob"),
        blood_group=sf.get("blood_group"),
        aadhar_no=sf.get("aadhar_no"),
        reg_no=str(reg.id)[:8],
        class_section_id=body.class_section_id,
        student_type=body.student_type,
        hosteller=body.hosteller,
        admission_type=body.admission_type,
        registration_id=reg.id,
    )
    db.add(student)
    await db.flush()
    await db.refresh(student)
    return ok(StudentOut.model_validate(student).model_dump())
