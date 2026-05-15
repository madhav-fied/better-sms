from datetime import datetime, timedelta
from fastapi import APIRouter, Depends, Query, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func

from app.database import get_db
from app.deps import get_current_user, CurrentUser, require_admin
from app.models.document import Document
from app.schemas.document import DocumentCreate, DocumentOut
from app.schemas.common import Response, ok

router = APIRouter()

STUB_BASE_URL = "https://storage.skeducations.example.com"


def _stub_url(entity_type: str, entity_id: str, filename: str) -> str:
    return f"{STUB_BASE_URL}/{entity_type}/{entity_id}/{filename}"


async def _upload_doc(entity_type: str, entity_id: str, body: DocumentCreate, school_id: str, db: AsyncSession) -> Document:
    stub_key = f"{entity_type}/{entity_id}/{body.filename}"
    doc = Document(
        school_id=school_id,
        entity_type=entity_type,
        entity_id=entity_id,
        doc_type=body.doc_type,
        filename=body.filename,
        s3_key=stub_key,
        url_expires_at=datetime.utcnow() + timedelta(hours=1),
    )
    db.add(doc)
    await db.flush()
    await db.refresh(doc)
    return doc


@router.post("/students/{student_id}/documents", response_model=Response)
async def upload_student_document(
    student_id: str,
    body: DocumentCreate,
    user: CurrentUser,
    _: None = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    doc = await _upload_doc("student", student_id, body, user["school_id"], db)
    return ok(DocumentOut.model_validate(doc).model_dump())


@router.get("/students/{student_id}/documents", response_model=Response)
async def list_student_documents(
    student_id: str,
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    user: dict = Depends(get_current_user),
):
    school_id = user["school_id"]
    q = select(Document).where(Document.school_id == school_id, Document.entity_type == "student", Document.entity_id == student_id)
    total = (await db.execute(select(func.count()).select_from(q.subquery()))).scalar_one()
    offset = (page - 1) * limit
    items = (await db.execute(q.offset(offset).limit(limit))).scalars().all()
    return ok([DocumentOut.model_validate(d).model_dump() for d in items], meta={"page": page, "limit": limit, "total": total})


@router.post("/staff/{staff_id}/documents", response_model=Response)
async def upload_staff_document(
    staff_id: str,
    body: DocumentCreate,
    user: CurrentUser,
    _: None = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    doc = await _upload_doc("staff", staff_id, body, user["school_id"], db)
    return ok(DocumentOut.model_validate(doc).model_dump())


@router.get("/staff/{staff_id}/documents", response_model=Response)
async def list_staff_documents(
    staff_id: str,
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    user: dict = Depends(get_current_user),
):
    school_id = user["school_id"]
    q = select(Document).where(Document.school_id == school_id, Document.entity_type == "staff", Document.entity_id == staff_id)
    total = (await db.execute(select(func.count()).select_from(q.subquery()))).scalar_one()
    offset = (page - 1) * limit
    items = (await db.execute(q.offset(offset).limit(limit))).scalars().all()
    return ok([DocumentOut.model_validate(d).model_dump() for d in items], meta={"page": page, "limit": limit, "total": total})


@router.delete("/documents/{doc_id}", response_model=Response)
async def delete_document(
    doc_id: str,
    user: CurrentUser,
    _: None = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    res = await db.execute(select(Document).where(Document.id == doc_id, Document.school_id == user["school_id"]))
    doc = res.scalar_one_or_none()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
    await db.delete(doc)
    return ok({"deleted": doc_id})
