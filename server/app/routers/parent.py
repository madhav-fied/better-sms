from fastapi import APIRouter, Depends, Query, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func

from app.database import get_db
from app.deps import get_current_user, CurrentUser, require_admin
from app.models.parent import Parent
from app.models.admission import ParentGuardian
from app.models.student import Student
from app.models.core import ClassSection
from app.schemas.parent import ParentCreate, ParentUpdate, ParentOut
from app.schemas.student import StudentOut
from app.schemas.common import Response, ok

router = APIRouter()


@router.post("/parents", response_model=Response)
async def create_parent(
    body: ParentCreate,
    user: CurrentUser,
    _: None = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    parent = Parent(school_id=user["school_id"], **body.model_dump())
    db.add(parent)
    await db.flush()
    await db.refresh(parent)
    return ok(ParentOut.model_validate(parent).model_dump())


@router.get("/parents", response_model=Response)
async def list_parents(
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    search: str = Query(None),
    db: AsyncSession = Depends(get_db),
    user: dict = Depends(get_current_user),
):
    school_id = user["school_id"]
    q = select(Parent).where(Parent.school_id == school_id)
    if search:
        q = q.where(Parent.name.ilike(f"%{search}%"))
    total = (await db.execute(select(func.count()).select_from(q.subquery()))).scalar_one()
    offset = (page - 1) * limit
    items = (await db.execute(q.order_by(Parent.created_at.desc()).offset(offset).limit(limit))).scalars().all()
    return ok([ParentOut.model_validate(p).model_dump() for p in items], meta={"page": page, "limit": limit, "total": total})


@router.get("/parents/{parent_id}", response_model=Response)
async def get_parent(
    parent_id: str,
    db: AsyncSession = Depends(get_db),
    user: dict = Depends(get_current_user),
):
    res = await db.execute(select(Parent).where(Parent.id == parent_id, Parent.school_id == user["school_id"]))
    parent = res.scalar_one_or_none()
    if not parent:
        raise HTTPException(status_code=404, detail="Parent not found")

    pg_res = await db.execute(
        select(ParentGuardian.student_id).where(
            ParentGuardian.parent_id == parent_id,
            ParentGuardian.student_id.isnot(None),
        )
    )
    student_ids = list({row[0] for row in pg_res.fetchall()})

    students = []
    if student_ids:
        s_res = await db.execute(select(Student).where(Student.id.in_(student_ids)))
        st_list = s_res.scalars().all()
        cs_ids = list({s.class_section_id for s in st_list if s.class_section_id})
        cs_map: dict[str, ClassSection] = {}
        if cs_ids:
            cs_res = await db.execute(select(ClassSection).where(ClassSection.id.in_(cs_ids)))
            cs_map = {cs.id: cs for cs in cs_res.scalars().all()}
        for s in st_list:
            d = StudentOut.model_validate(s).model_dump()
            if s.class_section_id and s.class_section_id in cs_map:
                cs = cs_map[s.class_section_id]
                d["class_name"] = cs.class_name
                d["section"] = cs.section
            d["parent_guardians"] = []
            students.append(d)

    out = ParentOut.model_validate(parent).model_dump()
    out["students"] = students
    return ok(out)


@router.put("/parents/{parent_id}", response_model=Response)
async def update_parent(
    parent_id: str,
    body: ParentUpdate,
    user: CurrentUser,
    _: None = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    res = await db.execute(select(Parent).where(Parent.id == parent_id, Parent.school_id == user["school_id"]))
    parent = res.scalar_one_or_none()
    if not parent:
        raise HTTPException(status_code=404, detail="Parent not found")
    for k, v in body.model_dump(exclude_none=True).items():
        setattr(parent, k, v)
    await db.flush()
    await db.refresh(parent)
    return ok(ParentOut.model_validate(parent).model_dump())
