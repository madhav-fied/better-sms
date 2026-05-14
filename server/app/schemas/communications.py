from datetime import date, datetime
from typing import Optional, List, Any
from pydantic import BaseModel

from app.models.communications import (
    NoticeTargetType, NoticeStatus,
    ConcernCategory, ConcernDirectedTo, ConcernSenderType,
    SyllabusStatus, NewsletterStatus,
)


class NoticeCreate(BaseModel):
    academic_year_id: Optional[str] = None
    title: str
    body: Optional[str] = None
    target_type: NoticeTargetType = NoticeTargetType.school_wide
    target_class_section_ids: Optional[List[str]] = None


class NoticeUpdate(BaseModel):
    academic_year_id: Optional[str] = None
    title: Optional[str] = None
    body: Optional[str] = None
    target_type: Optional[NoticeTargetType] = None
    target_class_section_ids: Optional[List[str]] = None


class NoticeAttachmentOut(BaseModel):
    id: str
    notice_id: str
    filename: str
    s3_key: Optional[str]
    mime_type: Optional[str]
    size_bytes: Optional[int]
    uploaded_at: datetime

    model_config = {"from_attributes": True}


class NoticeOut(BaseModel):
    id: str
    school_id: str
    academic_year_id: Optional[str]
    title: str
    body: Optional[str]
    target_type: str
    target_class_section_ids: Optional[Any]
    sent_by: str
    status: str
    published_at: Optional[datetime]
    created_at: datetime
    updated_at: Optional[datetime]
    attachments: List[NoticeAttachmentOut] = []

    model_config = {"from_attributes": True}


class ConcernCreate(BaseModel):
    student_id: str
    category: ConcernCategory
    subject: str
    directed_to: ConcernDirectedTo
    directed_to_staff_id: Optional[str] = None
    initial_message: str


class ConcernMessageCreate(BaseModel):
    sender_type: ConcernSenderType
    sender_name: str
    body: str


class ConcernMessageOut(BaseModel):
    id: str
    concern_id: str
    sender_type: str
    sender_id: str
    sender_name: str
    body: str
    created_at: datetime

    model_config = {"from_attributes": True}


class ConcernOut(BaseModel):
    id: str
    school_id: str
    student_id: str
    submitted_by: str
    category: str
    subject: str
    directed_to: str
    directed_to_staff_id: Optional[str]
    status: str
    reopened_at: Optional[datetime]
    resolved_at: Optional[datetime]
    resolved_by: Optional[str]
    closed_at: Optional[datetime]
    closed_by: Optional[str]
    last_activity_at: Optional[datetime]
    message_count: int
    created_at: datetime
    messages: List[ConcernMessageOut] = []

    model_config = {"from_attributes": True}


class SyllabusCreate(BaseModel):
    academic_year_id: str
    class_section_id: str
    subject: str
    title: str
    description: Optional[str] = None
    topics: Optional[List[Any]] = None


class SyllabusUpdate(BaseModel):
    subject: Optional[str] = None
    title: Optional[str] = None
    description: Optional[str] = None
    topics: Optional[List[Any]] = None


class SyllabusAttachmentOut(BaseModel):
    id: str
    syllabus_id: str
    filename: str
    s3_key: Optional[str]
    mime_type: Optional[str]
    size_bytes: Optional[int]
    uploaded_at: datetime

    model_config = {"from_attributes": True}


class SyllabusOut(BaseModel):
    id: str
    school_id: str
    academic_year_id: str
    class_section_id: str
    subject: str
    title: str
    description: Optional[str]
    topics: Optional[Any]
    version: int
    created_by: str
    status: str
    published_at: Optional[datetime]
    created_at: datetime
    updated_at: Optional[datetime]
    attachments: List[SyllabusAttachmentOut] = []

    model_config = {"from_attributes": True}


class NewsletterCreate(BaseModel):
    title: str
    issue_label: Optional[str] = None
    body: Optional[str] = None
    published_date: Optional[date] = None


class NewsletterUpdate(BaseModel):
    title: Optional[str] = None
    issue_label: Optional[str] = None
    body: Optional[str] = None
    published_date: Optional[date] = None


class NewsletterAttachmentOut(BaseModel):
    id: str
    newsletter_id: str
    filename: str
    s3_key: Optional[str]
    mime_type: Optional[str]
    size_bytes: Optional[int]
    uploaded_at: datetime

    model_config = {"from_attributes": True}


class NewsletterOut(BaseModel):
    id: str
    school_id: str
    title: str
    issue_label: Optional[str]
    body: Optional[str]
    published_date: Optional[date]
    created_by: str
    status: str
    published_at: Optional[datetime]
    created_at: datetime
    updated_at: Optional[datetime]
    attachments: List[NewsletterAttachmentOut] = []

    model_config = {"from_attributes": True}
