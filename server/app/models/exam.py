import uuid
import enum
from datetime import datetime, date, time
from typing import Optional

import sqlalchemy as sa
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class ExamType(str, enum.Enum):
    unit_test = "unit_test"
    monthly = "monthly"
    quarterly = "quarterly"
    half_yearly = "half_yearly"
    annual = "annual"
    pre_board = "pre_board"
    other = "other"


class ExamApplicableTo(str, enum.Enum):
    all_classes = "all_classes"
    specific_classes = "specific_classes"


class ExamStatus(str, enum.Enum):
    draft = "draft"
    scheduled = "scheduled"
    completed = "completed"


class Exam(Base):
    __tablename__ = "exams"

    id: Mapped[str] = mapped_column(sa.String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    school_id: Mapped[str] = mapped_column(sa.String(36), sa.ForeignKey("schools.id"), nullable=False)
    academic_year_id: Mapped[str] = mapped_column(sa.String(36), sa.ForeignKey("academic_years.id"), nullable=False)
    name: Mapped[str] = mapped_column(sa.String(255), nullable=False)
    exam_type: Mapped[str] = mapped_column(sa.Enum(ExamType, native_enum=False), nullable=False)
    display_order: Mapped[int] = mapped_column(sa.Integer, default=0, nullable=False)
    applicable_to: Mapped[str] = mapped_column(sa.Enum(ExamApplicableTo, native_enum=False), nullable=False, default=ExamApplicableTo.all_classes)
    applicable_class_section_ids: Mapped[Optional[list]] = mapped_column(sa.JSON, nullable=True)
    status: Mapped[str] = mapped_column(sa.Enum(ExamStatus, native_enum=False), nullable=False, default=ExamStatus.draft)
    scheduled_at: Mapped[Optional[datetime]] = mapped_column(sa.DateTime(timezone=True), nullable=True)
    completed_at: Mapped[Optional[datetime]] = mapped_column(sa.DateTime(timezone=True), nullable=True)
    created_by: Mapped[str] = mapped_column(sa.String(36), nullable=False)
    created_at: Mapped[datetime] = mapped_column(sa.DateTime(timezone=True), default=lambda: datetime.utcnow(), nullable=False)
    updated_at: Mapped[Optional[datetime]] = mapped_column(sa.DateTime(timezone=True), nullable=True)

    schedule_entries: Mapped[list["ExamScheduleEntry"]] = relationship("ExamScheduleEntry", back_populates="exam")


class ExamScheduleEntry(Base):
    __tablename__ = "exam_schedule_entries"

    id: Mapped[str] = mapped_column(sa.String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    exam_id: Mapped[str] = mapped_column(sa.String(36), sa.ForeignKey("exams.id"), nullable=False)
    class_section_id: Mapped[str] = mapped_column(sa.String(36), sa.ForeignKey("class_sections.id"), nullable=False)
    subject: Mapped[str] = mapped_column(sa.String(100), nullable=False)
    exam_date: Mapped[Optional[date]] = mapped_column(sa.Date, nullable=True)
    start_time: Mapped[Optional[time]] = mapped_column(sa.Time, nullable=True)
    end_time: Mapped[Optional[time]] = mapped_column(sa.Time, nullable=True)
    max_marks: Mapped[float] = mapped_column(sa.Numeric(6, 2), nullable=False, default=100)
    passing_marks: Mapped[float] = mapped_column(sa.Numeric(6, 2), nullable=False, default=35)
    results_published: Mapped[bool] = mapped_column(sa.Boolean, default=False, nullable=False)

    exam: Mapped["Exam"] = relationship("Exam", back_populates="schedule_entries")
