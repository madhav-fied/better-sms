from datetime import date, datetime
from typing import Optional, List
from pydantic import BaseModel

from app.models.homework import HomeworkStatus


class HomeworkCreate(BaseModel):
    academic_year_id: str
    class_section_id: str
    subject: str
    title: str
    description: Optional[str] = None
    assigned_date: date
    due_date: date


class HomeworkUpdate(BaseModel):
    subject: Optional[str] = None
    title: Optional[str] = None
    description: Optional[str] = None
    assigned_date: Optional[date] = None
    due_date: Optional[date] = None


class HomeworkAttachmentOut(BaseModel):
    id: str
    homework_id: str
    filename: str
    s3_key: Optional[str]
    mime_type: Optional[str]
    size_bytes: Optional[int]
    uploaded_at: datetime

    model_config = {"from_attributes": True}


class HomeworkOut(BaseModel):
    id: str
    school_id: str
    academic_year_id: str
    class_section_id: str
    subject: str
    title: str
    description: Optional[str]
    assigned_by: str
    assigned_date: date
    due_date: date
    status: str
    created_at: datetime
    updated_at: Optional[datetime]
    attachments: List[HomeworkAttachmentOut] = []

    model_config = {"from_attributes": True}
