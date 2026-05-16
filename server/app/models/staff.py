import uuid
import enum
from datetime import datetime, date
from typing import Optional

import sqlalchemy as sa
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


class StaffGender(str, enum.Enum):
    male = "male"
    female = "female"
    other = "other"


class StaffCategory(str, enum.Enum):
    teacher = "teacher"
    peon = "peon"
    accounts = "accounts"
    clerk = "clerk"
    electrician = "electrician"
    receptionist = "receptionist"
    security = "security"
    other = "other"


class StaffStatus(str, enum.Enum):
    active = "active"
    inactive = "inactive"


class Staff(Base):
    __tablename__ = "staff"

    id: Mapped[str] = mapped_column(sa.String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    school_id: Mapped[str] = mapped_column(sa.String(36), sa.ForeignKey("schools.id"), nullable=False)
    emp_code: Mapped[str] = mapped_column(sa.String(50), nullable=False)
    name: Mapped[str] = mapped_column(sa.String(255), nullable=False)
    dob: Mapped[Optional[date]] = mapped_column(sa.Date, nullable=True)
    gender: Mapped[str] = mapped_column(sa.Enum(StaffGender, native_enum=False), nullable=False)
    mobile: Mapped[Optional[str]] = mapped_column(sa.String(20), nullable=True)
    email: Mapped[Optional[str]] = mapped_column(sa.String(255), nullable=True)
    aadhar_no: Mapped[Optional[str]] = mapped_column(sa.String(20), nullable=True)
    permanent_address: Mapped[Optional[str]] = mapped_column(sa.Text, nullable=True)
    category: Mapped[str] = mapped_column(sa.Enum(StaffCategory, native_enum=False), nullable=False, default=StaffCategory.teacher)
    grade: Mapped[Optional[str]] = mapped_column(sa.String(20), nullable=True)
    status: Mapped[str] = mapped_column(sa.Enum(StaffStatus, native_enum=False), nullable=False, default=StaffStatus.active)
    created_at: Mapped[datetime] = mapped_column(sa.DateTime(timezone=True), default=lambda: datetime.utcnow(), nullable=False)


class TeacherSubject(Base):
    __tablename__ = "teacher_subjects"

    id: Mapped[str] = mapped_column(sa.String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    school_id: Mapped[str] = mapped_column(sa.String(36), sa.ForeignKey("schools.id"), nullable=False)
    staff_id: Mapped[str] = mapped_column(sa.String(36), sa.ForeignKey("staff.id"), nullable=False)
    subject: Mapped[str] = mapped_column(sa.String(100), nullable=False)
    class_section_id: Mapped[str] = mapped_column(sa.String(36), sa.ForeignKey("class_sections.id"), nullable=False)
    academic_year_id: Mapped[str] = mapped_column(sa.String(36), sa.ForeignKey("academic_years.id"), nullable=False)
