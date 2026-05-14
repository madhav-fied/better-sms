import uuid
import enum
from datetime import datetime, date
from typing import Optional

import sqlalchemy as sa
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class HomeworkStatus(str, enum.Enum):
    active = "active"
    cancelled = "cancelled"


class Homework(Base):
    __tablename__ = "homework"

    id: Mapped[str] = mapped_column(sa.String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    school_id: Mapped[str] = mapped_column(sa.String(36), sa.ForeignKey("schools.id"), nullable=False)
    academic_year_id: Mapped[str] = mapped_column(sa.String(36), sa.ForeignKey("academic_years.id"), nullable=False)
    class_section_id: Mapped[str] = mapped_column(sa.String(36), sa.ForeignKey("class_sections.id"), nullable=False)
    subject: Mapped[str] = mapped_column(sa.String(100), nullable=False)
    title: Mapped[str] = mapped_column(sa.String(255), nullable=False)
    description: Mapped[Optional[str]] = mapped_column(sa.Text, nullable=True)
    assigned_by: Mapped[str] = mapped_column(sa.String(36), nullable=False)
    assigned_date: Mapped[date] = mapped_column(sa.Date, nullable=False)
    due_date: Mapped[date] = mapped_column(sa.Date, nullable=False)
    status: Mapped[str] = mapped_column(sa.Enum(HomeworkStatus, native_enum=False), nullable=False, default=HomeworkStatus.active)
    created_at: Mapped[datetime] = mapped_column(sa.DateTime(timezone=True), default=lambda: datetime.utcnow(), nullable=False)
    updated_at: Mapped[Optional[datetime]] = mapped_column(sa.DateTime(timezone=True), nullable=True)

    attachments: Mapped[list["HomeworkAttachment"]] = relationship("HomeworkAttachment", back_populates="homework")


class HomeworkAttachment(Base):
    __tablename__ = "homework_attachments"

    id: Mapped[str] = mapped_column(sa.String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    homework_id: Mapped[str] = mapped_column(sa.String(36), sa.ForeignKey("homework.id"), nullable=False)
    filename: Mapped[str] = mapped_column(sa.String(255), nullable=False)
    s3_key: Mapped[Optional[str]] = mapped_column(sa.String(500), nullable=True)
    mime_type: Mapped[Optional[str]] = mapped_column(sa.String(100), nullable=True)
    size_bytes: Mapped[Optional[int]] = mapped_column(sa.Integer, nullable=True)
    uploaded_at: Mapped[datetime] = mapped_column(sa.DateTime(timezone=True), default=lambda: datetime.utcnow(), nullable=False)

    homework: Mapped["Homework"] = relationship("Homework", back_populates="attachments")
