from datetime import datetime
from fastapi import APIRouter, Depends, Query, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func

from app.database import get_db
from app.deps import get_current_user
from app.models.result import Result
from app.models.student import Student
from app.schemas.result import ResultBulkIn, ResultPublishIn, ResultUpdate, ResultOut
from app.schemas.common import Response, ok

router = APIRouter()

# IMPORTANT: bulk/publish/marksheet/class-summary MUST come before /{id}


@router.post("/results/bulk", response_model=Response)
async def bulk_upsert_results(body: ResultBulkIn, db: AsyncSession = Depends(get_db), user: dict = Depends(get_current_user)):
    now = datetime.utcnow()
    created = []
    for item in body.results:
        # Check for existing
        existing_res = await db.execute(
            select(Result).where(
                Result.exam_id == item.exam_id,
                Result.student_id == item.student_id,
                Result.subject == item.subject,
            )
        )
        existing = existing_res.scalar_one_or_none()
        if existing:
            existing.marks_obtained = item.marks_obtained
            existing.max_marks = item.max_marks
            existing.passing_marks = item.passing_marks
            existing.is_absent = item.is_absent
            existing.is_exempt = item.is_exempt
            existing.grade = item.grade
            existing.remarks = item.remarks
            existing.updated_at = now
            created.append(existing)
        else:
            result = Result(
                entered_by=user["user_id"],
                entered_at=now,
                **item.model_dump(),
            )
            db.add(result)
            created.append(result)
    await db.flush()
    for r in created:
        await db.refresh(r)
    return ok([ResultOut.model_validate(r).model_dump() for r in created])


@router.post("/results/publish", response_model=Response)
async def publish_results(body: ResultPublishIn, db: AsyncSession = Depends(get_db), user: dict = Depends(get_current_user)):
    now = datetime.utcnow()
    q = select(Result).where(Result.exam_id == body.exam_id)
    if body.class_section_id:
        q = q.where(Result.class_section_id == body.class_section_id)
    if body.subject:
        q = q.where(Result.subject == body.subject)
    results = (await db.execute(q)).scalars().all()
    for r in results:
        r.is_published = True
        r.published_at = now
        r.published_by = user["user_id"]
    await db.flush()
    return ok({"published_count": len(results)})


@router.get("/results/marksheet", response_model=Response)
async def get_marksheet(
    exam_id: str = Query(...),
    student_id: str = Query(...),
    db: AsyncSession = Depends(get_db),
    user: dict = Depends(get_current_user),
):
    q = select(Result).where(Result.exam_id == exam_id, Result.student_id == student_id)
    results = (await db.execute(q)).scalars().all()
    total_marks = sum(float(r.marks_obtained or 0) for r in results if not r.is_absent and not r.is_exempt)
    max_marks = sum(float(r.max_marks) for r in results if not r.is_exempt)
    pct = round((total_marks / max_marks) * 100, 2) if max_marks else 0.0
    return ok({
        "exam_id": exam_id,
        "student_id": student_id,
        "subjects": [ResultOut.model_validate(r).model_dump() for r in results],
        "total_marks_obtained": total_marks,
        "total_max_marks": max_marks,
        "percentage": pct,
    })


@router.get("/results/class-summary", response_model=Response)
async def get_class_summary(
    exam_id: str = Query(...),
    class_section_id: str = Query(...),
    db: AsyncSession = Depends(get_db),
    user: dict = Depends(get_current_user),
):
    q = select(Result).where(Result.exam_id == exam_id, Result.class_section_id == class_section_id)
    results = (await db.execute(q)).scalars().all()
    # Group by student
    from collections import defaultdict
    by_student: dict = defaultdict(list)
    for r in results:
        by_student[r.student_id].append(r)
    summary = []
    for sid, rlist in by_student.items():
        total = sum(float(r.marks_obtained or 0) for r in rlist if not r.is_absent and not r.is_exempt)
        max_t = sum(float(r.max_marks) for r in rlist if not r.is_exempt)
        pct = round((total / max_t) * 100, 2) if max_t else 0.0
        summary.append({"student_id": sid, "total_marks": total, "max_marks": max_t, "percentage": pct})
    return ok({"exam_id": exam_id, "class_section_id": class_section_id, "students": summary})


@router.get("/results", response_model=Response)
async def list_results(
    exam_id: str = Query(None),
    student_id: str = Query(None),
    class_section_id: str = Query(None),
    subject: str = Query(None),
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    user: dict = Depends(get_current_user),
):
    q = select(Result)
    if exam_id:
        q = q.where(Result.exam_id == exam_id)
    if student_id:
        q = q.where(Result.student_id == student_id)
    if class_section_id:
        q = q.where(Result.class_section_id == class_section_id)
    if subject:
        q = q.where(Result.subject == subject)
    total = (await db.execute(select(func.count()).select_from(q.subquery()))).scalar_one()
    offset = (page - 1) * limit
    items = (await db.execute(q.offset(offset).limit(limit))).scalars().all()
    return ok([ResultOut.model_validate(r).model_dump() for r in items], meta={"page": page, "limit": limit, "total": total})


@router.get("/results/{result_id}", response_model=Response)
async def get_result(result_id: str, db: AsyncSession = Depends(get_db), user: dict = Depends(get_current_user)):
    res = await db.execute(select(Result).where(Result.id == result_id))
    result = res.scalar_one_or_none()
    if not result:
        raise HTTPException(status_code=404, detail="Result not found")
    return ok(ResultOut.model_validate(result).model_dump())


@router.put("/results/{result_id}", response_model=Response)
async def update_result(result_id: str, body: ResultUpdate, db: AsyncSession = Depends(get_db), user: dict = Depends(get_current_user)):
    res = await db.execute(select(Result).where(Result.id == result_id))
    result = res.scalar_one_or_none()
    if not result:
        raise HTTPException(status_code=404, detail="Result not found")
    for k, v in body.model_dump(exclude_none=True).items():
        setattr(result, k, v)
    result.updated_at = datetime.utcnow()
    await db.flush()
    await db.refresh(result)
    return ok(ResultOut.model_validate(result).model_dump())
