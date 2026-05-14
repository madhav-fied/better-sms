import uuid
from datetime import datetime
from typing import Optional

import sqlalchemy as sa
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class School(Base):
    __tablename__ = "schools"

    id: Mapped[str] = mapped_column(sa.String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    name: Mapped[str] = mapped_column(sa.String(255), nullable=False)
    branch_name: Mapped[Optional[str]] = mapped_column(sa.String(255), nullable=True)
    address: Mapped[Optional[str]] = mapped_column(sa.Text, nullable=True)
    phone: Mapped[Optional[str]] = mapped_column(sa.String(20), nullable=True)
    email: Mapped[Optional[str]] = mapped_column(sa.String(255), nullable=True)
    is_active: Mapped[bool] = mapped_column(sa.Boolean, default=True, nullable=False)
    created_at: Mapped[datetime] = mapped_column(sa.DateTime(timezone=True), default=lambda: datetime.utcnow(), nullable=False)

    academic_years: Mapped[list["AcademicYear"]] = relationship("AcademicYear", back_populates="school")
    class_sections: Mapped[list["ClassSection"]] = relationship("ClassSection", back_populates="school")


class AcademicYear(Base):
    __tablename__ = "academic_years"

    id: Mapped[str] = mapped_column(sa.String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    school_id: Mapped[str] = mapped_column(sa.String(36), sa.ForeignKey("schools.id"), nullable=False)
    label: Mapped[str] = mapped_column(sa.String(50), nullable=False)
    start_date: Mapped[datetime] = mapped_column(sa.Date, nullable=False)
    end_date: Mapped[datetime] = mapped_column(sa.Date, nullable=False)
    is_active: Mapped[bool] = mapped_column(sa.Boolean, default=False, nullable=False)
    created_at: Mapped[datetime] = mapped_column(sa.DateTime(timezone=True), default=lambda: datetime.utcnow(), nullable=False)

    school: Mapped["School"] = relationship("School", back_populates="academic_years")
    class_sections: Mapped[list["ClassSection"]] = relationship("ClassSection", back_populates="academic_year")


class ClassSection(Base):
    __tablename__ = "class_sections"

    id: Mapped[str] = mapped_column(sa.String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    school_id: Mapped[str] = mapped_column(sa.String(36), sa.ForeignKey("schools.id"), nullable=False)
    academic_year_id: Mapped[str] = mapped_column(sa.String(36), sa.ForeignKey("academic_years.id"), nullable=False)
    class_name: Mapped[str] = mapped_column(sa.String(50), nullable=False)
    section: Mapped[str] = mapped_column(sa.String(10), nullable=False)
    class_teacher_id: Mapped[Optional[str]] = mapped_column(sa.String(36), sa.ForeignKey("staff.id"), nullable=True)

    school: Mapped["School"] = relationship("School", back_populates="class_sections")
    academic_year: Mapped["AcademicYear"] = relationship("AcademicYear", back_populates="class_sections")
