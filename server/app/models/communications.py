import uuid
import enum
from datetime import datetime, date
from typing import Optional

import sqlalchemy as sa
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class NoticeTargetType(str, enum.Enum):
    school_wide = "school_wide"
    class_sections = "class_sections"


class NoticeStatus(str, enum.Enum):
    draft = "draft"
    published = "published"
    archived = "archived"


class ConcernCategory(str, enum.Enum):
    suggestion = "suggestion"
    complaint = "complaint"
    concern = "concern"
    query = "query"


class ConcernDirectedTo(str, enum.Enum):
    class_teacher = "class_teacher"
    specific_staff = "specific_staff"
    admin = "admin"


class ConcernStatus(str, enum.Enum):
    open = "open"
    acknowledged = "acknowledged"
    in_progress = "in_progress"
    resolved = "resolved"
    closed = "closed"


class ConcernSenderType(str, enum.Enum):
    parent = "parent"
    staff = "staff"


class SyllabusStatus(str, enum.Enum):
    draft = "draft"
    published = "published"
    archived = "archived"


class NewsletterStatus(str, enum.Enum):
    draft = "draft"
    published = "published"
    archived = "archived"


class Notice(Base):
    __tablename__ = "notices"

    id: Mapped[str] = mapped_column(sa.String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    school_id: Mapped[str] = mapped_column(sa.String(36), sa.ForeignKey("schools.id"), nullable=False)
    academic_year_id: Mapped[Optional[str]] = mapped_column(sa.String(36), sa.ForeignKey("academic_years.id"), nullable=True)
    title: Mapped[str] = mapped_column(sa.String(255), nullable=False)
    body: Mapped[Optional[str]] = mapped_column(sa.Text, nullable=True)
    target_type: Mapped[str] = mapped_column(sa.Enum(NoticeTargetType, native_enum=False), nullable=False, default=NoticeTargetType.school_wide)
    target_class_section_ids: Mapped[Optional[list]] = mapped_column(sa.JSON, nullable=True)
    sent_by: Mapped[str] = mapped_column(sa.String(36), nullable=False)
    status: Mapped[str] = mapped_column(sa.Enum(NoticeStatus, native_enum=False), nullable=False, default=NoticeStatus.draft)
    published_at: Mapped[Optional[datetime]] = mapped_column(sa.DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(sa.DateTime(timezone=True), default=lambda: datetime.utcnow(), nullable=False)
    updated_at: Mapped[Optional[datetime]] = mapped_column(sa.DateTime(timezone=True), nullable=True)

    attachments: Mapped[list["NoticeAttachment"]] = relationship("NoticeAttachment", back_populates="notice")


class NoticeAttachment(Base):
    __tablename__ = "notice_attachments"

    id: Mapped[str] = mapped_column(sa.String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    notice_id: Mapped[str] = mapped_column(sa.String(36), sa.ForeignKey("notices.id"), nullable=False)
    filename: Mapped[str] = mapped_column(sa.String(255), nullable=False)
    s3_key: Mapped[Optional[str]] = mapped_column(sa.String(500), nullable=True)
    mime_type: Mapped[Optional[str]] = mapped_column(sa.String(100), nullable=True)
    size_bytes: Mapped[Optional[int]] = mapped_column(sa.Integer, nullable=True)
    uploaded_at: Mapped[datetime] = mapped_column(sa.DateTime(timezone=True), default=lambda: datetime.utcnow(), nullable=False)

    notice: Mapped["Notice"] = relationship("Notice", back_populates="attachments")


class Concern(Base):
    __tablename__ = "concerns"

    id: Mapped[str] = mapped_column(sa.String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    school_id: Mapped[str] = mapped_column(sa.String(36), sa.ForeignKey("schools.id"), nullable=False)
    student_id: Mapped[Optional[str]] = mapped_column(sa.String(36), sa.ForeignKey("students.id"), nullable=True)
    submitted_by: Mapped[str] = mapped_column(sa.String(36), nullable=False)
    category: Mapped[str] = mapped_column(sa.Enum(ConcernCategory, native_enum=False), nullable=False)
    subject: Mapped[str] = mapped_column(sa.String(255), nullable=False)
    directed_to: Mapped[str] = mapped_column(sa.Enum(ConcernDirectedTo, native_enum=False), nullable=False)
    directed_to_staff_id: Mapped[Optional[str]] = mapped_column(sa.String(36), sa.ForeignKey("staff.id"), nullable=True)
    status: Mapped[str] = mapped_column(sa.Enum(ConcernStatus, native_enum=False), nullable=False, default=ConcernStatus.open)
    reopened_at: Mapped[Optional[datetime]] = mapped_column(sa.DateTime(timezone=True), nullable=True)
    resolved_at: Mapped[Optional[datetime]] = mapped_column(sa.DateTime(timezone=True), nullable=True)
    resolved_by: Mapped[Optional[str]] = mapped_column(sa.String(36), nullable=True)
    closed_at: Mapped[Optional[datetime]] = mapped_column(sa.DateTime(timezone=True), nullable=True)
    closed_by: Mapped[Optional[str]] = mapped_column(sa.String(36), nullable=True)
    last_activity_at: Mapped[Optional[datetime]] = mapped_column(sa.DateTime(timezone=True), nullable=True)
    message_count: Mapped[int] = mapped_column(sa.Integer, default=0, nullable=False)
    created_at: Mapped[datetime] = mapped_column(sa.DateTime(timezone=True), default=lambda: datetime.utcnow(), nullable=False)

    messages: Mapped[list["ConcernMessage"]] = relationship("ConcernMessage", back_populates="concern")


class ConcernMessage(Base):
    __tablename__ = "concern_messages"

    id: Mapped[str] = mapped_column(sa.String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    concern_id: Mapped[str] = mapped_column(sa.String(36), sa.ForeignKey("concerns.id"), nullable=False)
    sender_type: Mapped[str] = mapped_column(sa.Enum(ConcernSenderType, native_enum=False), nullable=False)
    sender_id: Mapped[str] = mapped_column(sa.String(36), nullable=False)
    sender_name: Mapped[str] = mapped_column(sa.String(255), nullable=False)
    body: Mapped[str] = mapped_column(sa.Text, nullable=False)
    created_at: Mapped[datetime] = mapped_column(sa.DateTime(timezone=True), default=lambda: datetime.utcnow(), nullable=False)

    concern: Mapped["Concern"] = relationship("Concern", back_populates="messages")


class Syllabus(Base):
    __tablename__ = "syllabuses"

    id: Mapped[str] = mapped_column(sa.String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    school_id: Mapped[str] = mapped_column(sa.String(36), sa.ForeignKey("schools.id"), nullable=False)
    academic_year_id: Mapped[str] = mapped_column(sa.String(36), sa.ForeignKey("academic_years.id"), nullable=False)
    class_section_id: Mapped[str] = mapped_column(sa.String(36), sa.ForeignKey("class_sections.id"), nullable=False)
    subject: Mapped[str] = mapped_column(sa.String(100), nullable=False)
    title: Mapped[str] = mapped_column(sa.String(255), nullable=False)
    description: Mapped[Optional[str]] = mapped_column(sa.Text, nullable=True)
    topics: Mapped[Optional[list]] = mapped_column(sa.JSON, nullable=True)
    version: Mapped[int] = mapped_column(sa.Integer, default=1, nullable=False)
    created_by: Mapped[str] = mapped_column(sa.String(36), nullable=False)
    status: Mapped[str] = mapped_column(sa.Enum(SyllabusStatus, native_enum=False), nullable=False, default=SyllabusStatus.draft)
    published_at: Mapped[Optional[datetime]] = mapped_column(sa.DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(sa.DateTime(timezone=True), default=lambda: datetime.utcnow(), nullable=False)
    updated_at: Mapped[Optional[datetime]] = mapped_column(sa.DateTime(timezone=True), nullable=True)

    attachments: Mapped[list["SyllabusAttachment"]] = relationship("SyllabusAttachment", back_populates="syllabus")


class SyllabusAttachment(Base):
    __tablename__ = "syllabus_attachments"

    id: Mapped[str] = mapped_column(sa.String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    syllabus_id: Mapped[str] = mapped_column(sa.String(36), sa.ForeignKey("syllabuses.id"), nullable=False)
    filename: Mapped[str] = mapped_column(sa.String(255), nullable=False)
    s3_key: Mapped[Optional[str]] = mapped_column(sa.String(500), nullable=True)
    mime_type: Mapped[Optional[str]] = mapped_column(sa.String(100), nullable=True)
    size_bytes: Mapped[Optional[int]] = mapped_column(sa.Integer, nullable=True)
    uploaded_at: Mapped[datetime] = mapped_column(sa.DateTime(timezone=True), default=lambda: datetime.utcnow(), nullable=False)

    syllabus: Mapped["Syllabus"] = relationship("Syllabus", back_populates="attachments")


class Newsletter(Base):
    __tablename__ = "newsletters"

    id: Mapped[str] = mapped_column(sa.String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    school_id: Mapped[str] = mapped_column(sa.String(36), sa.ForeignKey("schools.id"), nullable=False)
    title: Mapped[str] = mapped_column(sa.String(255), nullable=False)
    issue_label: Mapped[Optional[str]] = mapped_column(sa.String(100), nullable=True)
    body: Mapped[Optional[str]] = mapped_column(sa.Text, nullable=True)
    published_date: Mapped[Optional[date]] = mapped_column(sa.Date, nullable=True)
    created_by: Mapped[str] = mapped_column(sa.String(36), nullable=False)
    status: Mapped[str] = mapped_column(sa.Enum(NewsletterStatus, native_enum=False), nullable=False, default=NewsletterStatus.draft)
    published_at: Mapped[Optional[datetime]] = mapped_column(sa.DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(sa.DateTime(timezone=True), default=lambda: datetime.utcnow(), nullable=False)
    updated_at: Mapped[Optional[datetime]] = mapped_column(sa.DateTime(timezone=True), nullable=True)

    attachments: Mapped[list["NewsletterAttachment"]] = relationship("NewsletterAttachment", back_populates="newsletter")


class NewsletterAttachment(Base):
    __tablename__ = "newsletter_attachments"

    id: Mapped[str] = mapped_column(sa.String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    newsletter_id: Mapped[str] = mapped_column(sa.String(36), sa.ForeignKey("newsletters.id"), nullable=False)
    filename: Mapped[str] = mapped_column(sa.String(255), nullable=False)
    s3_key: Mapped[Optional[str]] = mapped_column(sa.String(500), nullable=True)
    mime_type: Mapped[Optional[str]] = mapped_column(sa.String(100), nullable=True)
    size_bytes: Mapped[Optional[int]] = mapped_column(sa.Integer, nullable=True)
    uploaded_at: Mapped[datetime] = mapped_column(sa.DateTime(timezone=True), default=lambda: datetime.utcnow(), nullable=False)

    newsletter: Mapped["Newsletter"] = relationship("Newsletter", back_populates="attachments")
