from datetime import datetime
from fastapi import APIRouter, Depends, Query, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func

from app.database import get_db
from app.deps import get_current_user
from app.models.timetable import PeriodConfig, Timetable
from app.schemas.timetable import PeriodConfigUpdate, PeriodConfigOut, TimetableCreate, TimetableUpdate, TimetableOut
from app.schemas.common import Response, ok

router = APIRouter()

# IMPORTANT: period-config routes MUST come before /{id} routes


@router.get("/timetable/period-config", response_model=Response)
async def get_period_config(db: AsyncSession = Depends(get_db), user: dict = Depends(get_current_user)):
    school_id = user["school_id"]
    res = await db.execute(select(PeriodConfig).where(PeriodConfig.school_id == school_id))
    config = res.scalar_one_or_none()
    if not config:
        return ok(None)
    return ok(PeriodConfigOut.model_validate(config).model_dump())


@router.put("/timetable/period-config", response_model=Response)
async def upsert_period_config(body: PeriodConfigUpdate, db: AsyncSession = Depends(get_db), user: dict = Depends(get_current_user)):
    school_id = user["school_id"]
    res = await db.execute(select(PeriodConfig).where(PeriodConfig.school_id == school_id))
    config = res.scalar_one_or_none()
    if config:
        config.periods = body.periods
        config.updated_at = datetime.utcnow()
        config.updated_by = user["user_id"]
    else:
        config = PeriodConfig(
            school_id=school_id,
            periods=body.periods,
            updated_at=datetime.utcnow(),
            updated_by=user["user_id"],
        )
        db.add(config)
    await db.flush()
    await db.refresh(config)
    return ok(PeriodConfigOut.model_validate(config).model_dump())


@router.post("/timetable", response_model=Response)
async def create_timetable(body: TimetableCreate, db: AsyncSession = Depends(get_db), user: dict = Depends(get_current_user)):
    tt = Timetable(school_id=user["school_id"], created_by=user["user_id"], **body.model_dump())
    db.add(tt)
    await db.flush()
    await db.refresh(tt)
    return ok(TimetableOut.model_validate(tt).model_dump())


@router.get("/timetable", response_model=Response)
async def list_timetables(
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    class_section_id: str = Query(None),
    academic_year_id: str = Query(None),
    status: str = Query(None),
    db: AsyncSession = Depends(get_db),
    user: dict = Depends(get_current_user),
):
    school_id = user["school_id"]
    q = select(Timetable).where(Timetable.school_id == school_id)
    if class_section_id:
        q = q.where(Timetable.class_section_id == class_section_id)
    if academic_year_id:
        q = q.where(Timetable.academic_year_id == academic_year_id)
    if status:
        q = q.where(Timetable.status == status)
    total = (await db.execute(select(func.count()).select_from(q.subquery()))).scalar_one()
    offset = (page - 1) * limit
    items = (await db.execute(q.order_by(Timetable.created_at.desc()).offset(offset).limit(limit))).scalars().all()
    return ok([TimetableOut.model_validate(t).model_dump() for t in items], meta={"page": page, "limit": limit, "total": total})


@router.get("/timetable/{tt_id}", response_model=Response)
async def get_timetable(tt_id: str, db: AsyncSession = Depends(get_db), user: dict = Depends(get_current_user)):
    res = await db.execute(select(Timetable).where(Timetable.id == tt_id, Timetable.school_id == user["school_id"]))
    tt = res.scalar_one_or_none()
    if not tt:
        raise HTTPException(status_code=404, detail="Timetable not found")
    return ok(TimetableOut.model_validate(tt).model_dump())


@router.put("/timetable/{tt_id}", response_model=Response)
async def update_timetable(tt_id: str, body: TimetableUpdate, db: AsyncSession = Depends(get_db), user: dict = Depends(get_current_user)):
    res = await db.execute(select(Timetable).where(Timetable.id == tt_id, Timetable.school_id == user["school_id"]))
    tt = res.scalar_one_or_none()
    if not tt:
        raise HTTPException(status_code=404, detail="Timetable not found")
    for k, v in body.model_dump(exclude_none=True).items():
        setattr(tt, k, v)
    tt.updated_at = datetime.utcnow()
    await db.flush()
    await db.refresh(tt)
    return ok(TimetableOut.model_validate(tt).model_dump())


@router.post("/timetable/{tt_id}/publish", response_model=Response)
async def publish_timetable(tt_id: str, db: AsyncSession = Depends(get_db), user: dict = Depends(get_current_user)):
    res = await db.execute(select(Timetable).where(Timetable.id == tt_id, Timetable.school_id == user["school_id"]))
    tt = res.scalar_one_or_none()
    if not tt:
        raise HTTPException(status_code=404, detail="Timetable not found")
    tt.status = "published"
    tt.published_at = datetime.utcnow()
    await db.flush()
    await db.refresh(tt)
    return ok(TimetableOut.model_validate(tt).model_dump())


@router.delete("/timetable/{tt_id}", response_model=Response)
async def delete_timetable(tt_id: str, db: AsyncSession = Depends(get_db), user: dict = Depends(get_current_user)):
    res = await db.execute(select(Timetable).where(Timetable.id == tt_id, Timetable.school_id == user["school_id"]))
    tt = res.scalar_one_or_none()
    if not tt:
        raise HTTPException(status_code=404, detail="Timetable not found")
    await db.delete(tt)
    return ok({"deleted": tt_id})
