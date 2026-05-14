import uuid
from datetime import datetime
from typing import Optional

import sqlalchemy as sa
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


class Result(Base):
    __tablename__ = "results"

    id: Mapped[str] = mapped_column(sa.String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    exam_id: Mapped[str] = mapped_column(sa.String(36), sa.ForeignKey("exams.id"), nullable=False)
    class_section_id: Mapped[str] = mapped_column(sa.String(36), sa.ForeignKey("class_sections.id"), nullable=False)
    subject: Mapped[str] = mapped_column(sa.String(100), nullable=False)
    student_id: Mapped[str] = mapped_column(sa.String(36), sa.ForeignKey("students.id"), nullable=False)
    marks_obtained: Mapped[Optional[float]] = mapped_column(sa.Numeric(6, 2), nullable=True)
    max_marks: Mapped[float] = mapped_column(sa.Numeric(6, 2), nullable=False)
    passing_marks: Mapped[float] = mapped_column(sa.Numeric(6, 2), nullable=False)
    is_absent: Mapped[bool] = mapped_column(sa.Boolean, default=False, nullable=False)
    is_exempt: Mapped[bool] = mapped_column(sa.Boolean, default=False, nullable=False)
    grade: Mapped[Optional[str]] = mapped_column(sa.String(10), nullable=True)
    remarks: Mapped[Optional[str]] = mapped_column(sa.Text, nullable=True)
    is_published: Mapped[bool] = mapped_column(sa.Boolean, default=False, nullable=False)
    published_at: Mapped[Optional[datetime]] = mapped_column(sa.DateTime(timezone=True), nullable=True)
    published_by: Mapped[Optional[str]] = mapped_column(sa.String(36), nullable=True)
    entered_by: Mapped[Optional[str]] = mapped_column(sa.String(36), nullable=True)
    entered_at: Mapped[Optional[datetime]] = mapped_column(sa.DateTime(timezone=True), nullable=True)
    updated_at: Mapped[Optional[datetime]] = mapped_column(sa.DateTime(timezone=True), nullable=True)


class ResultAcknowledgement(Base):
    __tablename__ = "result_acknowledgements"

    id: Mapped[str] = mapped_column(sa.String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    exam_id: Mapped[str] = mapped_column(sa.String(36), sa.ForeignKey("exams.id"), nullable=False)
    student_id: Mapped[str] = mapped_column(sa.String(36), sa.ForeignKey("students.id"), nullable=False)
    acknowledged_by: Mapped[str] = mapped_column(sa.String(36), nullable=False)
    acknowledged_by_name: Mapped[str] = mapped_column(sa.String(255), nullable=False)
    acknowledged_at: Mapped[datetime] = mapped_column(sa.DateTime(timezone=True), default=lambda: datetime.utcnow(), nullable=False)
