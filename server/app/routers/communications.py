from datetime import datetime
from fastapi import APIRouter, Depends, Query, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, or_, and_

from app.database import get_db
from app.deps import get_current_user, CurrentUser, require_admin, require_teacher
from app.models.communications import (
    Notice, NoticeAttachment,
    Concern, ConcernMessage,
    Syllabus, SyllabusAttachment,
    Newsletter, NewsletterAttachment,
)
from app.models.core import ClassSection
from app.models.student import Student
from app.models.admission import ParentGuardian
from app.schemas.communications import (
    NoticeCreate, NoticeUpdate, NoticeAttachmentOut,
    ConcernMessageOut,
    SyllabusCreate, SyllabusUpdate, SyllabusAttachmentOut,
    NewsletterCreate, NewsletterUpdate, NewsletterAttachmentOut,
)
from app.schemas.common import Response, ok
from typing import Optional
from pydantic import BaseModel

router = APIRouter()


class ConcernCreateExtended(BaseModel):
    student_id: Optional[str] = None
    category: str
    subject: str
    directed_to: str
    directed_to_staff_id: Optional[str] = None
    initial_message: str
    on_behalf_note: Optional[str] = None


def _notice_out(n, attachments: list) -> dict:
    return {
        "id": n.id, "school_id": n.school_id, "academic_year_id": n.academic_year_id,
        "title": n.title, "body": n.body, "target_type": n.target_type,
        "target_class_section_ids": n.target_class_section_ids,
        "sent_by": n.sent_by, "status": n.status, "published_at": n.published_at,
        "created_at": n.created_at, "updated_at": n.updated_at, "attachments": attachments,
    }


def _concern_out(c, messages: list) -> dict:
    return {
        "id": c.id, "school_id": c.school_id, "student_id": c.student_id,
        "submitted_by": c.submitted_by, "category": c.category, "subject": c.subject,
        "directed_to": c.directed_to, "directed_to_staff_id": c.directed_to_staff_id,
        "status": c.status, "reopened_at": c.reopened_at, "resolved_at": c.resolved_at,
        "resolved_by": c.resolved_by, "closed_at": c.closed_at, "closed_by": c.closed_by,
        "last_activity_at": c.last_activity_at, "message_count": c.message_count,
        "created_at": c.created_at, "messages": messages,
    }


def _syllabus_out(s, attachments: list) -> dict:
    return {
        "id": s.id, "school_id": s.school_id, "academic_year_id": s.academic_year_id,
        "class_section_id": s.class_section_id, "subject": s.subject, "title": s.title,
        "description": s.description, "topics": s.topics, "version": s.version,
        "created_by": s.created_by, "status": s.status, "published_at": s.published_at,
        "created_at": s.created_at, "updated_at": s.updated_at, "attachments": attachments,
    }


def _newsletter_out(nl, attachments: list) -> dict:
    return {
        "id": nl.id, "school_id": nl.school_id, "title": nl.title,
        "issue_label": nl.issue_label, "body": nl.body, "published_date": nl.published_date,
        "created_by": nl.created_by, "status": nl.status, "published_at": nl.published_at,
        "created_at": nl.created_at, "updated_at": nl.updated_at, "attachments": attachments,
    }


async def _teacher_homeroom_class_ids(db: AsyncSession, school_id: str, entity_id: str) -> list[str]:
    res = await db.execute(
        select(ClassSection.id).where(
            ClassSection.school_id == school_id,
            ClassSection.class_teacher_id == entity_id,
        )
    )
    return [row[0] for row in res.all()]


async def _user_visible_class_ids(db: AsyncSession, user: dict) -> list[str]:
    """Returns class_section_ids the user belongs to (for notice / homework read scoping)."""
    role, entity_id, school_id = user["role"], user["entity_id"], user["school_id"]
    if role == "teacher":
        return await _teacher_homeroom_class_ids(db, school_id, entity_id)
    if role == "student":
        res = await db.execute(select(Student.class_section_id).where(Student.id == entity_id))
        cs_id = res.scalar_one_or_none()
        return [cs_id] if cs_id else []
    if role == "parent":
        pg_res = await db.execute(
            select(ParentGuardian.student_id).where(ParentGuardian.parent_id == entity_id)
        )
        ward_ids = [r[0] for r in pg_res.all() if r[0]]
        if not ward_ids:
            return []
        s_res = await db.execute(
            select(Student.class_section_id).where(
                Student.id.in_(ward_ids), Student.class_section_id.isnot(None)
            )
        )
        return list({r[0] for r in s_res.all() if r[0]})
    return []


def _notice_visible(notice: Notice, role: str, user_class_ids: list[str]) -> bool:
    """True if the notice is visible to the caller."""
    if notice.target_type == "school_wide":
        return True  # school-wide is visible to everyone
    # class_sections notice
    if role in ("admin", "superadmin"):
        return True  # admins see everything for oversight
    targets = notice.target_class_section_ids or []
    return any(cid in targets for cid in user_class_ids)


async def _assert_concern_access(db: AsyncSession, concern: Concern, user: dict) -> None:
    """Raises 403 if the caller is not allowed to view/interact with this concern."""
    role = user["role"]
    if role in ("admin", "superadmin"):
        if concern.directed_to != "admin":
            raise HTTPException(403, "Access denied")
        return
    if role == "parent":
        if concern.submitted_by != user["user_id"]:
            raise HTTPException(403, "Access denied")
        return
    if role == "teacher":
        entity_id = user["entity_id"]
        if concern.directed_to == "specific_staff" and concern.directed_to_staff_id == entity_id:
            return
        if concern.directed_to == "class_teacher" and concern.student_id:
            # Verify the student is in the teacher's homeroom class
            s_res = await db.execute(
                select(Student.class_section_id).where(Student.id == concern.student_id)
            )
            cs_id = s_res.scalar_one_or_none()
            if cs_id:
                cs_res = await db.execute(
                    select(ClassSection).where(
                        ClassSection.id == cs_id,
                        ClassSection.class_teacher_id == entity_id,
                    )
                )
                if cs_res.scalar_one_or_none():
                    return
        raise HTTPException(403, "Access denied")
    raise HTTPException(403, "Access denied")


# ── Notices ───────────────────────────────────────────────────────────────────

@router.post("/communications/notices", response_model=Response)
async def create_notice(
    body: NoticeCreate,
    user: CurrentUser,
    _: None = Depends(require_teacher),
    db: AsyncSession = Depends(get_db),
):
    school_id = user["school_id"]
    role = user["role"]

    if role in ("admin", "superadmin"):
        # Admins send school-wide only
        if body.target_type != "school_wide":
            raise HTTPException(403, "Admins can only send school-wide notices")
    else:
        # Teachers send to their homeroom class only
        if body.target_type != "class_sections":
            raise HTTPException(403, "Teachers can only send class-specific notices")
        if not body.target_class_section_ids:
            raise HTTPException(422, "target_class_section_ids is required for class notices")
        entity_id = user["entity_id"]
        homeroom_ids = await _teacher_homeroom_class_ids(db, school_id, entity_id)
        forbidden = [cid for cid in body.target_class_section_ids if cid not in homeroom_ids]
        if forbidden:
            raise HTTPException(403, "You can only send notices to your own class")

    notice = Notice(school_id=school_id, sent_by=user["user_id"], **body.model_dump())
    db.add(notice)
    await db.flush()
    await db.refresh(notice)
    return ok(_notice_out(notice, []))


@router.get("/communications/notices", response_model=Response)
async def list_notices(
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    status: str = Query(None),
    db: AsyncSession = Depends(get_db),
    user: dict = Depends(get_current_user),
):
    school_id = user["school_id"]
    role = user["role"]
    q = select(Notice).where(Notice.school_id == school_id)
    if status:
        q = q.where(Notice.status == status)
    all_notices = (await db.execute(q.order_by(Notice.created_at.desc()))).scalars().all()

    user_class_ids = await _user_visible_class_ids(db, user)
    visible = [n for n in all_notices if _notice_visible(n, role, user_class_ids)]

    total = len(visible)
    offset = (page - 1) * limit
    page_notices = visible[offset: offset + limit]

    results = []
    for n in page_notices:
        atts = (await db.execute(select(NoticeAttachment).where(NoticeAttachment.notice_id == n.id))).scalars().all()
        results.append(_notice_out(n, [NoticeAttachmentOut.model_validate(a).model_dump() for a in atts]))
    return ok(results, meta={"page": page, "limit": limit, "total": total})


@router.get("/communications/notices/{notice_id}", response_model=Response)
async def get_notice(notice_id: str, db: AsyncSession = Depends(get_db), user: dict = Depends(get_current_user)):
    res = await db.execute(select(Notice).where(Notice.id == notice_id, Notice.school_id == user["school_id"]))
    notice = res.scalar_one_or_none()
    if not notice:
        raise HTTPException(status_code=404, detail="Notice not found")
    user_class_ids = await _user_visible_class_ids(db, user)
    if not _notice_visible(notice, user["role"], user_class_ids):
        raise HTTPException(403, "Access denied")
    atts = (await db.execute(select(NoticeAttachment).where(NoticeAttachment.notice_id == notice.id))).scalars().all()
    return ok(_notice_out(notice, [NoticeAttachmentOut.model_validate(a).model_dump() for a in atts]))


@router.put("/communications/notices/{notice_id}", response_model=Response)
async def update_notice(
    notice_id: str,
    body: NoticeUpdate,
    user: CurrentUser,
    _: None = Depends(require_teacher),
    db: AsyncSession = Depends(get_db),
):
    res = await db.execute(select(Notice).where(Notice.id == notice_id, Notice.school_id == user["school_id"]))
    notice = res.scalar_one_or_none()
    if not notice:
        raise HTTPException(status_code=404, detail="Notice not found")
    role = user["role"]
    # Admin can manage any school-wide notice; teacher only their own
    if role not in ("admin", "superadmin") and notice.sent_by != user["user_id"]:
        raise HTTPException(403, "You can only edit your own notices")
    for k, v in body.model_dump(exclude_none=True).items():
        setattr(notice, k, v)
    notice.updated_at = datetime.utcnow()
    await db.flush()
    await db.refresh(notice)
    return ok(_notice_out(notice, []))


@router.post("/communications/notices/{notice_id}/publish", response_model=Response)
async def publish_notice(
    notice_id: str,
    user: CurrentUser,
    _: None = Depends(require_teacher),
    db: AsyncSession = Depends(get_db),
):
    res = await db.execute(select(Notice).where(Notice.id == notice_id, Notice.school_id == user["school_id"]))
    notice = res.scalar_one_or_none()
    if not notice:
        raise HTTPException(status_code=404, detail="Notice not found")
    role = user["role"]
    if role not in ("admin", "superadmin") and notice.sent_by != user["user_id"]:
        raise HTTPException(403, "You can only publish your own notices")
    notice.status = "published"
    notice.published_at = datetime.utcnow()
    await db.flush()
    await db.refresh(notice)
    return ok(_notice_out(notice, []))


@router.patch("/communications/notices/{notice_id}/archive", response_model=Response)
async def archive_notice(
    notice_id: str,
    user: CurrentUser,
    _: None = Depends(require_teacher),
    db: AsyncSession = Depends(get_db),
):
    res = await db.execute(select(Notice).where(Notice.id == notice_id, Notice.school_id == user["school_id"]))
    notice = res.scalar_one_or_none()
    if not notice:
        raise HTTPException(status_code=404, detail="Notice not found")
    role = user["role"]
    if role not in ("admin", "superadmin") and notice.sent_by != user["user_id"]:
        raise HTTPException(403, "You can only archive your own notices")
    notice.status = "archived"
    notice.updated_at = datetime.utcnow()
    await db.flush()
    await db.refresh(notice)
    return ok(_notice_out(notice, []))


@router.delete("/communications/notices/{notice_id}", response_model=Response)
async def delete_notice(
    notice_id: str,
    user: CurrentUser,
    _: None = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    res = await db.execute(select(Notice).where(Notice.id == notice_id, Notice.school_id == user["school_id"]))
    notice = res.scalar_one_or_none()
    if not notice:
        raise HTTPException(status_code=404, detail="Notice not found")
    atts = (await db.execute(select(NoticeAttachment).where(NoticeAttachment.notice_id == notice.id))).scalars().all()
    for a in atts:
        await db.delete(a)
    await db.delete(notice)
    return ok({"deleted": notice_id})


# ── Concerns ──────────────────────────────────────────────────────────────────

@router.post("/communications/concerns", response_model=Response)
async def create_concern(
    body: ConcernCreateExtended,
    user: CurrentUser,
    db: AsyncSession = Depends(get_db),
):
    print(body)
    role = user["role"]
    if role not in ("superadmin", "admin", "parent"):
        raise HTTPException(status_code=403, detail="Only parents or admins can submit concerns")

    school_id = user["school_id"]
    now = datetime.utcnow()
    sender_type = "admin" if role in ("superadmin", "admin") else "parent"

    concern = Concern(
        school_id=school_id,
        student_id=body.student_id,
        submitted_by=user["user_id"],
        category=body.category,
        subject=body.subject,
        directed_to=body.directed_to,
        directed_to_staff_id=body.directed_to_staff_id,
        last_activity_at=now,
        message_count=1,
    )
    db.add(concern)
    await db.flush()

    message_body = body.initial_message
    if body.on_behalf_note:
        message_body = f"[On behalf note: {body.on_behalf_note}]\n\n{message_body}"

    msg = ConcernMessage(
        concern_id=concern.id,
        sender_type=sender_type,
        sender_id=user["user_id"],
        sender_name="Admin" if sender_type == "admin" else "Parent",
        body=message_body,
    )
    db.add(msg)
    await db.flush()
    await db.refresh(concern)
    msgs = (await db.execute(select(ConcernMessage).where(ConcernMessage.concern_id == concern.id))).scalars().all()
    return ok(_concern_out(concern, [ConcernMessageOut.model_validate(m).model_dump() for m in msgs]))


@router.get("/communications/concerns", response_model=Response)
async def list_concerns(
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    status: str = Query(None),
    student_id: str = Query(None),
    db: AsyncSession = Depends(get_db),
    user: dict = Depends(get_current_user),
):
    school_id = user["school_id"]
    role = user["role"]
    entity_id = user["entity_id"]
    q = select(Concern).where(Concern.school_id == school_id)
    if status:
        q = q.where(Concern.status == status)
    if student_id:
        q = q.where(Concern.student_id == student_id)

    if role in ("admin", "superadmin"):
        q = q.where(Concern.directed_to == "admin")

    elif role == "teacher":
        # Class teacher sees class_teacher concerns for students in their class
        # + specific_staff concerns directed to them
        homeroom_ids = await _teacher_homeroom_class_ids(db, school_id, entity_id)
        if homeroom_ids:
            s_res = await db.execute(
                select(Student.id).where(Student.class_section_id.in_(homeroom_ids))
            )
            student_ids = [r[0] for r in s_res.all()]
        else:
            student_ids = []

        class_teacher_cond = and_(
            Concern.directed_to == "class_teacher",
            Concern.student_id.in_(student_ids) if student_ids else Concern.id.is_(None),
        )
        specific_staff_cond = and_(
            Concern.directed_to == "specific_staff",
            Concern.directed_to_staff_id == entity_id,
        )
        q = q.where(or_(class_teacher_cond, specific_staff_cond))

    elif role == "parent":
        q = q.where(Concern.submitted_by == user["user_id"])

    else:
        # Students and others see nothing
        return ok([], meta={"page": page, "limit": limit, "total": 0})

    total = (await db.execute(select(func.count()).select_from(q.subquery()))).scalar_one()
    offset = (page - 1) * limit
    concerns = (await db.execute(q.order_by(Concern.created_at.desc()).offset(offset).limit(limit))).scalars().all()
    results = []
    for c in concerns:
        msgs = (await db.execute(select(ConcernMessage).where(ConcernMessage.concern_id == c.id))).scalars().all()
        results.append(_concern_out(c, [ConcernMessageOut.model_validate(m).model_dump() for m in msgs]))
    return ok(results, meta={"page": page, "limit": limit, "total": total})


@router.get("/communications/concerns/{concern_id}", response_model=Response)
async def get_concern(concern_id: str, db: AsyncSession = Depends(get_db), user: dict = Depends(get_current_user)):
    res = await db.execute(select(Concern).where(Concern.id == concern_id, Concern.school_id == user["school_id"]))
    concern = res.scalar_one_or_none()
    if not concern:
        raise HTTPException(status_code=404, detail="Concern not found")
    await _assert_concern_access(db, concern, user)
    msgs = (await db.execute(select(ConcernMessage).where(ConcernMessage.concern_id == concern.id))).scalars().all()
    return ok(_concern_out(concern, [ConcernMessageOut.model_validate(m).model_dump() for m in msgs]))


class ConcernReplyBody(BaseModel):
    body: str


@router.post("/communications/concerns/{concern_id}/messages", response_model=Response)
async def add_concern_message(
    concern_id: str,
    body: ConcernReplyBody,
    user: CurrentUser,
    db: AsyncSession = Depends(get_db),
):
    res = await db.execute(select(Concern).where(Concern.id == concern_id, Concern.school_id == user["school_id"]))
    concern = res.scalar_one_or_none()
    if not concern:
        raise HTTPException(status_code=404, detail="Concern not found")
    await _assert_concern_access(db, concern, user)
    role = user["role"]
    if role in ("superadmin", "admin", "teacher"):
        sender_type = "staff"
        sender_name = "Staff"
    else:
        sender_type = "parent"
        sender_name = "Parent"
    msg = ConcernMessage(
        concern_id=concern_id,
        sender_type=sender_type,
        sender_id=user["user_id"],
        sender_name=sender_name,
        body=body.body,
    )
    db.add(msg)
    concern.message_count += 1
    concern.last_activity_at = datetime.utcnow()
    await db.flush()
    await db.refresh(msg)
    return ok(ConcernMessageOut.model_validate(msg).model_dump())


@router.patch("/communications/concerns/{concern_id}/acknowledge", response_model=Response)
async def acknowledge_concern(
    concern_id: str,
    user: CurrentUser,
    _: None = Depends(require_teacher),
    db: AsyncSession = Depends(get_db),
):
    res = await db.execute(select(Concern).where(Concern.id == concern_id, Concern.school_id == user["school_id"]))
    concern = res.scalar_one_or_none()
    if not concern:
        raise HTTPException(status_code=404, detail="Concern not found")
    await _assert_concern_access(db, concern, user)
    concern.status = "acknowledged"
    concern.last_activity_at = datetime.utcnow()
    await db.flush()
    await db.refresh(concern)
    return ok(_concern_out(concern, []))


@router.patch("/communications/concerns/{concern_id}/resolve", response_model=Response)
async def resolve_concern(
    concern_id: str,
    user: CurrentUser,
    _: None = Depends(require_teacher),
    db: AsyncSession = Depends(get_db),
):
    res = await db.execute(select(Concern).where(Concern.id == concern_id, Concern.school_id == user["school_id"]))
    concern = res.scalar_one_or_none()
    if not concern:
        raise HTTPException(status_code=404, detail="Concern not found")
    await _assert_concern_access(db, concern, user)
    concern.status = "resolved"
    concern.resolved_by = user["user_id"]
    concern.resolved_at = datetime.utcnow()
    concern.last_activity_at = datetime.utcnow()
    await db.flush()
    await db.refresh(concern)
    return ok(_concern_out(concern, []))


@router.patch("/communications/concerns/{concern_id}/close", response_model=Response)
async def close_concern(
    concern_id: str,
    user: CurrentUser,
    _: None = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    res = await db.execute(select(Concern).where(Concern.id == concern_id, Concern.school_id == user["school_id"]))
    concern = res.scalar_one_or_none()
    if not concern:
        raise HTTPException(status_code=404, detail="Concern not found")
    concern.status = "closed"
    concern.closed_by = user["user_id"]
    concern.closed_at = datetime.utcnow()
    concern.last_activity_at = datetime.utcnow()
    await db.flush()
    await db.refresh(concern)
    return ok(_concern_out(concern, []))


# ── Syllabus ──────────────────────────────────────────────────────────────────

@router.post("/communications/syllabus", response_model=Response)
async def create_syllabus(
    body: SyllabusCreate,
    user: CurrentUser,
    _: None = Depends(require_teacher),
    db: AsyncSession = Depends(get_db),
):
    syllabus = Syllabus(school_id=user["school_id"], created_by=user["user_id"], **body.model_dump())
    db.add(syllabus)
    await db.flush()
    await db.refresh(syllabus)
    return ok(_syllabus_out(syllabus, []))


@router.get("/communications/syllabus", response_model=Response)
async def list_syllabus(
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    class_section_id: str = Query(None),
    academic_year_id: str = Query(None),
    db: AsyncSession = Depends(get_db),
    user: dict = Depends(get_current_user),
):
    school_id = user["school_id"]
    q = select(Syllabus).where(Syllabus.school_id == school_id)
    if class_section_id:
        q = q.where(Syllabus.class_section_id == class_section_id)
    if academic_year_id:
        q = q.where(Syllabus.academic_year_id == academic_year_id)
    total = (await db.execute(select(func.count()).select_from(q.subquery()))).scalar_one()
    offset = (page - 1) * limit
    items = (await db.execute(q.order_by(Syllabus.created_at.desc()).offset(offset).limit(limit))).scalars().all()
    results = []
    for s in items:
        atts = (await db.execute(select(SyllabusAttachment).where(SyllabusAttachment.syllabus_id == s.id))).scalars().all()
        results.append(_syllabus_out(s, [SyllabusAttachmentOut.model_validate(a).model_dump() for a in atts]))
    return ok(results, meta={"page": page, "limit": limit, "total": total})


@router.get("/communications/syllabus/{syllabus_id}", response_model=Response)
async def get_syllabus(syllabus_id: str, db: AsyncSession = Depends(get_db), user: dict = Depends(get_current_user)):
    res = await db.execute(select(Syllabus).where(Syllabus.id == syllabus_id, Syllabus.school_id == user["school_id"]))
    syllabus = res.scalar_one_or_none()
    if not syllabus:
        raise HTTPException(status_code=404, detail="Syllabus not found")
    atts = (await db.execute(select(SyllabusAttachment).where(SyllabusAttachment.syllabus_id == syllabus.id))).scalars().all()
    return ok(_syllabus_out(syllabus, [SyllabusAttachmentOut.model_validate(a).model_dump() for a in atts]))


@router.put("/communications/syllabus/{syllabus_id}", response_model=Response)
async def update_syllabus(
    syllabus_id: str,
    body: SyllabusUpdate,
    user: CurrentUser,
    _: None = Depends(require_teacher),
    db: AsyncSession = Depends(get_db),
):
    res = await db.execute(select(Syllabus).where(Syllabus.id == syllabus_id, Syllabus.school_id == user["school_id"]))
    syllabus = res.scalar_one_or_none()
    if not syllabus:
        raise HTTPException(status_code=404, detail="Syllabus not found")
    for k, v in body.model_dump(exclude_none=True).items():
        setattr(syllabus, k, v)
    syllabus.version += 1
    syllabus.updated_at = datetime.utcnow()
    await db.flush()
    await db.refresh(syllabus)
    return ok(_syllabus_out(syllabus, []))


@router.post("/communications/syllabus/{syllabus_id}/publish", response_model=Response)
async def publish_syllabus(
    syllabus_id: str,
    user: CurrentUser,
    _: None = Depends(require_teacher),
    db: AsyncSession = Depends(get_db),
):
    res = await db.execute(select(Syllabus).where(Syllabus.id == syllabus_id, Syllabus.school_id == user["school_id"]))
    syllabus = res.scalar_one_or_none()
    if not syllabus:
        raise HTTPException(status_code=404, detail="Syllabus not found")
    syllabus.status = "published"
    syllabus.published_at = datetime.utcnow()
    await db.flush()
    await db.refresh(syllabus)
    return ok(_syllabus_out(syllabus, []))


# ── Newsletters ───────────────────────────────────────────────────────────────

@router.post("/communications/newsletters", response_model=Response)
async def create_newsletter(
    body: NewsletterCreate,
    user: CurrentUser,
    _: None = Depends(require_teacher),
    db: AsyncSession = Depends(get_db),
):
    nl = Newsletter(school_id=user["school_id"], created_by=user["user_id"], **body.model_dump())
    db.add(nl)
    await db.flush()
    await db.refresh(nl)
    return ok(_newsletter_out(nl, []))


@router.get("/communications/newsletters", response_model=Response)
async def list_newsletters(
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    status: str = Query(None),
    db: AsyncSession = Depends(get_db),
    user: dict = Depends(get_current_user),
):
    school_id = user["school_id"]
    q = select(Newsletter).where(Newsletter.school_id == school_id)
    if status:
        q = q.where(Newsletter.status == status)
    total = (await db.execute(select(func.count()).select_from(q.subquery()))).scalar_one()
    offset = (page - 1) * limit
    items = (await db.execute(q.order_by(Newsletter.created_at.desc()).offset(offset).limit(limit))).scalars().all()
    results = []
    for nl in items:
        atts = (await db.execute(select(NewsletterAttachment).where(NewsletterAttachment.newsletter_id == nl.id))).scalars().all()
        results.append(_newsletter_out(nl, [NewsletterAttachmentOut.model_validate(a).model_dump() for a in atts]))
    return ok(results, meta={"page": page, "limit": limit, "total": total})


@router.get("/communications/newsletters/{nl_id}", response_model=Response)
async def get_newsletter(nl_id: str, db: AsyncSession = Depends(get_db), user: dict = Depends(get_current_user)):
    res = await db.execute(select(Newsletter).where(Newsletter.id == nl_id, Newsletter.school_id == user["school_id"]))
    nl = res.scalar_one_or_none()
    if not nl:
        raise HTTPException(status_code=404, detail="Newsletter not found")
    atts = (await db.execute(select(NewsletterAttachment).where(NewsletterAttachment.newsletter_id == nl.id))).scalars().all()
    return ok(_newsletter_out(nl, [NewsletterAttachmentOut.model_validate(a).model_dump() for a in atts]))


@router.put("/communications/newsletters/{nl_id}", response_model=Response)
async def update_newsletter(
    nl_id: str,
    body: NewsletterUpdate,
    user: CurrentUser,
    _: None = Depends(require_teacher),
    db: AsyncSession = Depends(get_db),
):
    res = await db.execute(select(Newsletter).where(Newsletter.id == nl_id, Newsletter.school_id == user["school_id"]))
    nl = res.scalar_one_or_none()
    if not nl:
        raise HTTPException(status_code=404, detail="Newsletter not found")
    for k, v in body.model_dump(exclude_none=True).items():
        setattr(nl, k, v)
    nl.updated_at = datetime.utcnow()
    await db.flush()
    await db.refresh(nl)
    return ok(_newsletter_out(nl, []))


@router.post("/communications/newsletters/{nl_id}/publish", response_model=Response)
async def publish_newsletter(
    nl_id: str,
    user: CurrentUser,
    _: None = Depends(require_teacher),
    db: AsyncSession = Depends(get_db),
):
    res = await db.execute(select(Newsletter).where(Newsletter.id == nl_id, Newsletter.school_id == user["school_id"]))
    nl = res.scalar_one_or_none()
    if not nl:
        raise HTTPException(status_code=404, detail="Newsletter not found")
    nl.status = "published"
    nl.published_at = datetime.utcnow()
    await db.flush()
    await db.refresh(nl)
    return ok(_newsletter_out(nl, []))


@router.delete("/communications/newsletters/{nl_id}", response_model=Response)
async def delete_newsletter(
    nl_id: str,
    user: CurrentUser,
    _: None = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    res = await db.execute(select(Newsletter).where(Newsletter.id == nl_id, Newsletter.school_id == user["school_id"]))
    nl = res.scalar_one_or_none()
    if not nl:
        raise HTTPException(status_code=404, detail="Newsletter not found")
    atts = (await db.execute(select(NewsletterAttachment).where(NewsletterAttachment.newsletter_id == nl.id))).scalars().all()
    for a in atts:
        await db.delete(a)
    await db.delete(nl)
    return ok({"deleted": nl_id})
