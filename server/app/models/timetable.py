import uuid
import enum
from datetime import datetime
from typing import Optional

import sqlalchemy as sa
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


class TimetableStatus(str, enum.Enum):
    draft = "draft"
    published = "published"


class PeriodConfig(Base):
    __tablename__ = "period_configs"

    id: Mapped[str] = mapped_column(sa.String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    school_id: Mapped[str] = mapped_column(sa.String(36), sa.ForeignKey("schools.id"), nullable=False, unique=True)
    periods: Mapped[Optional[dict]] = mapped_column(sa.JSON, nullable=True)
    updated_at: Mapped[Optional[datetime]] = mapped_column(sa.DateTime(timezone=True), nullable=True)
    updated_by: Mapped[Optional[str]] = mapped_column(sa.String(36), nullable=True)


class Timetable(Base):
    __tablename__ = "timetables"

    id: Mapped[str] = mapped_column(sa.String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    school_id: Mapped[str] = mapped_column(sa.String(36), sa.ForeignKey("schools.id"), nullable=False)
    class_section_id: Mapped[str] = mapped_column(sa.String(36), sa.ForeignKey("class_sections.id"), nullable=False)
    academic_year_id: Mapped[str] = mapped_column(sa.String(36), sa.ForeignKey("academic_years.id"), nullable=False)
    status: Mapped[str] = mapped_column(sa.Enum(TimetableStatus, native_enum=False), nullable=False, default=TimetableStatus.draft)
    slots: Mapped[Optional[dict]] = mapped_column(sa.JSON, nullable=True)
    created_by: Mapped[str] = mapped_column(sa.String(36), nullable=False)
    published_at: Mapped[Optional[datetime]] = mapped_column(sa.DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(sa.DateTime(timezone=True), default=lambda: datetime.utcnow(), nullable=False)
    updated_at: Mapped[Optional[datetime]] = mapped_column(sa.DateTime(timezone=True), nullable=True)
