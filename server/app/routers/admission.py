from datetime import date
from fastapi import APIRouter, Depends, Query, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, update as sa_update

from app.database import get_db
from app.deps import get_current_user, CurrentUser, require_admin
from app.models.admission import Enquiry, Registration, ParentGuardian
from app.models.core import AcademicYear, School
from app.services.parent_auth import provision_parent_login, parent_guardian_provision_data, parent_guardian_row_data
from app.schemas.admission import (
    EnquiryCreate, EnquiryUpdate, EnquiryOut,
    EnquiryStatusUpdate, RegistrationStatusUpdate,
    RegistrationCreate, RegistrationOut,
    ParentGuardianOut, AdmitStudentIn,
)
from app.schemas.common import Response, ok, err
from app.utils import normalize_phone, format_full_student_uid

router = APIRouter()


async def _add_registration_guardians(
    db: AsyncSession,
    school_id: str,
    reg_id: str,
    guardians_data: list,
) -> None:
    for gd in guardians_data:
        pg_dict = parent_guardian_provision_data(gd)
        if not pg_dict.get("name"):
            pg_dict["name"] = f"{pg_dict.get('first_name', '')} {pg_dict.get('last_name', '')}".strip()
        parent_id = None
        if pg_dict.get("phone"):
            parent_id = await provision_parent_login(db, school_id, pg_dict)
        row = parent_guardian_row_data(gd)
        if parent_id:
            row["parent_id"] = parent_id
        db.add(ParentGuardian(registration_id=reg_id, **row))


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
    payload = body.model_dump()
    payload["mobile"] = normalize_phone(payload["mobile"])
    enq = Enquiry(school_id=school_id, enq_no=_enq_no(year, seq), status="open", **payload)
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
    updates = body.model_dump(exclude_none=True)
    if "mobile" in updates:
        updates["mobile"] = normalize_phone(updates["mobile"])
    for k, v in updates.items():
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
        academic_year_id = ay.id if ay else None

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
    await _add_registration_guardians(db, school_id, reg.id, guardians_data)
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


@router.patch("/enquiries/{enq_id}/status", response_model=Response)
async def update_enquiry_status(
    enq_id: str,
    body: EnquiryStatusUpdate,
    user: CurrentUser,
    _: None = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    res = await db.execute(select(Enquiry).where(Enquiry.id == enq_id, Enquiry.school_id == user["school_id"]))
    enq = res.scalar_one_or_none()
    if not enq:
        raise HTTPException(status_code=404, detail="Enquiry not found")
    enq.status = body.status.value
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
        academic_year_id = ay.id if ay else None
    guardians_data = body.parent_guardians or []
    reg = Registration(
        school_id=school_id,
        academic_year_id=academic_year_id,
        enquiry_id=body.enquiry_id,
        student_fields=body.student_fields,
    )
    db.add(reg)
    await db.flush()
    await _add_registration_guardians(db, school_id, reg.id, guardians_data)
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


@router.patch("/registrations/{reg_id}/status", response_model=Response)
async def update_registration_status(
    reg_id: str,
    body: RegistrationStatusUpdate,
    user: CurrentUser,
    _: None = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    res = await db.execute(select(Registration).where(Registration.id == reg_id, Registration.school_id == user["school_id"]))
    reg = res.scalar_one_or_none()
    if not reg:
        raise HTTPException(status_code=404, detail="Registration not found")
    reg.status = body.status.value
    await db.flush()
    await db.refresh(reg)
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

    ay = None
    if reg.academic_year_id:
        ay_res = await db.execute(select(AcademicYear).where(AcademicYear.id == reg.academic_year_id))
        ay = ay_res.scalar_one_or_none()
    ay_year = ay.start_date.year if ay else date.today().year

    if reg.academic_year_id:
        count_q = select(func.count()).select_from(Student).where(
            Student.school_id == school_id, Student.academic_year_id == reg.academic_year_id
        )
    else:
        count_q = select(func.count()).select_from(Student).where(Student.school_id == school_id)
    seq = (await db.execute(count_q)).scalar_one() + 1
    admission_no = f"{ay_year}{seq:04d}"

    global_uid = (
        await db.execute(select(func.coalesce(func.max(Student.student_uid), 0)))
    ).scalar_one() + 1

    school_res = await db.execute(select(School).where(School.id == school_id))
    school = school_res.scalar_one_or_none()

    sf = reg.student_fields or {}
    student = Student(
        school_id=school_id,
        student_uid=global_uid,
        academic_year_id=reg.academic_year_id,
        admission_no=admission_no,
        first_name=sf.get("first_name", ""),
        last_name=sf.get("last_name", ""),
        gender=sf.get("gender", "other"),
        dob=sf.get("dob"),
        blood_group=sf.get("blood_group"),
        aadhar_no=sf.get("aadhar_no"),
        sms_mobile=sf.get("sms_mobile"),
        email=sf.get("email"),
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

    # Link guardian rows to this student
    await db.execute(
        sa_update(ParentGuardian)
        .where(ParentGuardian.registration_id == reg.id, ParentGuardian.student_id.is_(None))
        .values(student_id=student.id)
    )

    # Provision parent logins now that the student has a uid
    if school:
        full_uid = format_full_student_uid(school.school_code, student.student_uid)
        pg_res = await db.execute(
            select(ParentGuardian).where(ParentGuardian.registration_id == reg.id)
        )
        for pg in pg_res.scalars().all():
            if pg.phone:
                pg_dict = {"phone": pg.phone, "email": pg.email, "name": pg.name or ""}
                await provision_parent_login(db, school_id, full_uid, pg_dict, pg.parent_id)

    await db.flush()
    return ok(StudentOut.model_validate(student).model_dump())
