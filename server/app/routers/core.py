from fastapi import APIRouter, Depends, Query, HTTPException
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func

from app.database import get_db
from app.deps import get_current_user, CurrentUser, require_superadmin, require_admin
from app.models.core import School, AcademicYear, ClassSection
from app.schemas.core import (
    SchoolCreate, SchoolUpdate, SchoolOut,
    AcademicYearCreate, AcademicYearUpdate, AcademicYearOut,
    ClassSectionCreate, ClassSectionUpdate, ClassSectionOut,
)
from app.schemas.common import Response, ok, err

router = APIRouter()


class StatusBody(BaseModel):
    is_active: bool


# ── Schools ──────────────────────────────────────────────────────────────────

@router.post("/schools", response_model=Response)
async def create_school(
    body: SchoolCreate,
    user: CurrentUser,
    _: None = Depends(require_superadmin),
    db: AsyncSession = Depends(get_db),
):
    school = School(**body.model_dump())
    db.add(school)
    await db.flush()
    await db.refresh(school)
    return ok(SchoolOut.model_validate(school).model_dump())


@router.get("/schools", response_model=Response)
async def list_schools(
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    user: dict = Depends(get_current_user),
):
    offset = (page - 1) * limit
    total_result = await db.execute(select(func.count()).select_from(School))
    total = total_result.scalar_one()
    result = await db.execute(select(School).offset(offset).limit(limit))
    schools = result.scalars().all()
    return ok([SchoolOut.model_validate(s).model_dump() for s in schools], meta={"page": page, "limit": limit, "total": total})


@router.get("/schools/{school_id}", response_model=Response)
async def get_school(school_id: str, db: AsyncSession = Depends(get_db), user: dict = Depends(get_current_user)):
    result = await db.execute(select(School).where(School.id == school_id))
    school = result.scalar_one_or_none()
    if not school:
        raise HTTPException(status_code=404, detail="School not found")
    return ok(SchoolOut.model_validate(school).model_dump())


@router.put("/schools/{school_id}", response_model=Response)
async def update_school(
    school_id: str,
    body: SchoolUpdate,
    user: CurrentUser,
    _: None = Depends(require_superadmin),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(School).where(School.id == school_id))
    school = result.scalar_one_or_none()
    if not school:
        raise HTTPException(status_code=404, detail="School not found")
    for k, v in body.model_dump(exclude_none=True).items():
        setattr(school, k, v)
    await db.flush()
    await db.refresh(school)
    return ok(SchoolOut.model_validate(school).model_dump())


@router.patch("/schools/{school_id}/status", response_model=Response)
async def set_school_status(
    school_id: str,
    body: StatusBody,
    user: CurrentUser,
    _: None = Depends(require_superadmin),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(School).where(School.id == school_id))
    school = result.scalar_one_or_none()
    if not school:
        raise HTTPException(status_code=404, detail="School not found")
    school.is_active = body.is_active
    await db.flush()
    await db.refresh(school)
    return ok(SchoolOut.model_validate(school).model_dump())


# ── Academic Years ────────────────────────────────────────────────────────────

@router.post("/academic-years", response_model=Response)
async def create_academic_year(
    body: AcademicYearCreate,
    user: CurrentUser,
    _: None = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    ay = AcademicYear(**body.model_dump())
    db.add(ay)
    await db.flush()
    await db.refresh(ay)
    return ok(AcademicYearOut.model_validate(ay).model_dump())


@router.get("/academic-years", response_model=Response)
async def list_academic_years(
    school_id: str = Query(None),
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    user: dict = Depends(get_current_user),
):
    q = select(AcademicYear)
    sid = school_id or (user["school_id"] if user["role"] != "superadmin" else None)
    if sid:
        q = q.where(AcademicYear.school_id == sid)
    total_result = await db.execute(select(func.count()).select_from(q.subquery()))
    total = total_result.scalar_one()
    offset = (page - 1) * limit
    result = await db.execute(q.offset(offset).limit(limit))
    items = result.scalars().all()
    return ok([AcademicYearOut.model_validate(a).model_dump() for a in items], meta={"page": page, "limit": limit, "total": total})


@router.get("/academic-years/{ay_id}", response_model=Response)
async def get_academic_year(ay_id: str, db: AsyncSession = Depends(get_db), user: dict = Depends(get_current_user)):
    result = await db.execute(select(AcademicYear).where(AcademicYear.id == ay_id))
    ay = result.scalar_one_or_none()
    if not ay:
        raise HTTPException(status_code=404, detail="Academic year not found")
    return ok(AcademicYearOut.model_validate(ay).model_dump())


@router.put("/academic-years/{ay_id}", response_model=Response)
async def update_academic_year(
    ay_id: str,
    body: AcademicYearUpdate,
    user: CurrentUser,
    _: None = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(AcademicYear).where(AcademicYear.id == ay_id))
    ay = result.scalar_one_or_none()
    if not ay:
        raise HTTPException(status_code=404, detail="Academic year not found")
    for k, v in body.model_dump(exclude_none=True).items():
        setattr(ay, k, v)
    await db.flush()
    await db.refresh(ay)
    return ok(AcademicYearOut.model_validate(ay).model_dump())


@router.post("/academic-years/{ay_id}/activate", response_model=Response)
async def activate_academic_year(
    ay_id: str,
    user: CurrentUser,
    _: None = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(AcademicYear).where(AcademicYear.id == ay_id))
    ay = result.scalar_one_or_none()
    if not ay:
        raise HTTPException(status_code=404, detail="Academic year not found")
    all_result = await db.execute(select(AcademicYear).where(AcademicYear.school_id == ay.school_id))
    for other in all_result.scalars().all():
        other.is_active = False
    ay.is_active = True
    await db.flush()
    await db.refresh(ay)
    return ok(AcademicYearOut.model_validate(ay).model_dump())


@router.delete("/academic-years/{ay_id}", response_model=Response)
async def delete_academic_year(
    ay_id: str,
    user: CurrentUser,
    _: None = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(AcademicYear).where(AcademicYear.id == ay_id))
    ay = result.scalar_one_or_none()
    if not ay:
        raise HTTPException(status_code=404, detail="Academic year not found")
    await db.delete(ay)
    return ok({"deleted": ay_id})


# ── Class Sections ────────────────────────────────────────────────────────────

@router.post("/class-sections", response_model=Response)
async def create_class_section(
    body: ClassSectionCreate,
    user: CurrentUser,
    _: None = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    cs = ClassSection(**body.model_dump())
    db.add(cs)
    await db.flush()
    await db.refresh(cs)
    return ok(ClassSectionOut.model_validate(cs).model_dump())


@router.get("/class-sections", response_model=Response)
async def list_class_sections(
    school_id: str = Query(None),
    academic_year_id: str = Query(None),
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    user: dict = Depends(get_current_user),
):
    q = select(ClassSection)
    sid = school_id or (user["school_id"] if user["role"] != "superadmin" else None)
    if sid:
        q = q.where(ClassSection.school_id == sid)
    if academic_year_id:
        q = q.where(ClassSection.academic_year_id == academic_year_id)
    total_result = await db.execute(select(func.count()).select_from(q.subquery()))
    total = total_result.scalar_one()
    offset = (page - 1) * limit
    result = await db.execute(q.offset(offset).limit(limit))
    items = result.scalars().all()
    return ok([ClassSectionOut.model_validate(c).model_dump() for c in items], meta={"page": page, "limit": limit, "total": total})


@router.get("/class-sections/{cs_id}", response_model=Response)
async def get_class_section(cs_id: str, db: AsyncSession = Depends(get_db), user: dict = Depends(get_current_user)):
    result = await db.execute(select(ClassSection).where(ClassSection.id == cs_id))
    cs = result.scalar_one_or_none()
    if not cs:
        raise HTTPException(status_code=404, detail="Class section not found")
    return ok(ClassSectionOut.model_validate(cs).model_dump())


@router.put("/class-sections/{cs_id}", response_model=Response)
async def update_class_section(
    cs_id: str,
    body: ClassSectionUpdate,
    user: CurrentUser,
    _: None = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(ClassSection).where(ClassSection.id == cs_id))
    cs = result.scalar_one_or_none()
    if not cs:
        raise HTTPException(status_code=404, detail="Class section not found")
    for k, v in body.model_dump(exclude_none=True).items():
        setattr(cs, k, v)
    await db.flush()
    await db.refresh(cs)
    return ok(ClassSectionOut.model_validate(cs).model_dump())


@router.delete("/class-sections/{cs_id}", response_model=Response)
async def delete_class_section(
    cs_id: str,
    user: CurrentUser,
    _: None = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(ClassSection).where(ClassSection.id == cs_id))
    cs = result.scalar_one_or_none()
    if not cs:
        raise HTTPException(status_code=404, detail="Class section not found")
    await db.delete(cs)
    return ok({"deleted": cs_id})
