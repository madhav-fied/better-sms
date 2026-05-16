import uuid
import enum
from datetime import datetime, date, time
from typing import Optional

import sqlalchemy as sa
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


class AttendanceSession(str, enum.Enum):
    morning = "morning"
    afternoon = "afternoon"


class StudentAttendanceStatus(str, enum.Enum):
    present = "present"
    absent = "absent"
    late = "late"
    on_leave = "on_leave"
    not_marked = "not_marked"


class StaffAttendanceStatus(str, enum.Enum):
    present = "present"
    absent = "absent"
    late = "late"
    half_day = "half_day"
    on_leave = "on_leave"
    not_marked = "not_marked"


class StudentAttendanceRecord(Base):
    __tablename__ = "student_attendance_records"

    id: Mapped[str] = mapped_column(sa.String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    school_id: Mapped[str] = mapped_column(sa.String(36), sa.ForeignKey("schools.id"), nullable=False)
    academic_year_id: Mapped[str] = mapped_column(sa.String(36), sa.ForeignKey("academic_years.id"), nullable=False)
    class_section_id: Mapped[str] = mapped_column(sa.String(36), sa.ForeignKey("class_sections.id"), nullable=False)
    student_id: Mapped[str] = mapped_column(sa.String(36), sa.ForeignKey("students.id"), nullable=False)
    date: Mapped[date] = mapped_column(sa.Date, nullable=False)
    period_no: Mapped[Optional[int]] = mapped_column(sa.Integer, nullable=True)
    session: Mapped[Optional[str]] = mapped_column(sa.Enum(AttendanceSession, native_enum=False), nullable=True)
    status: Mapped[str] = mapped_column(sa.Enum(StudentAttendanceStatus, native_enum=False), nullable=False, default=StudentAttendanceStatus.not_marked)
    notes: Mapped[Optional[str]] = mapped_column(sa.Text, nullable=True)
    marked_by: Mapped[Optional[str]] = mapped_column(sa.String(36), nullable=True)
    marked_at: Mapped[Optional[datetime]] = mapped_column(sa.DateTime(timezone=True), nullable=True)
    updated_by: Mapped[Optional[str]] = mapped_column(sa.String(36), nullable=True)
    updated_at: Mapped[Optional[datetime]] = mapped_column(sa.DateTime(timezone=True), nullable=True)
    previous_status: Mapped[Optional[str]] = mapped_column(sa.String(20), nullable=True)
    source: Mapped[str] = mapped_column(sa.String(20), nullable=False, default="manual", server_default="manual")
    leave_id: Mapped[Optional[str]] = mapped_column(sa.String(36), nullable=True)


class StaffAttendanceRecord(Base):
    __tablename__ = "staff_attendance_records"

    id: Mapped[str] = mapped_column(sa.String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    school_id: Mapped[str] = mapped_column(sa.String(36), sa.ForeignKey("schools.id"), nullable=False)
    staff_id: Mapped[str] = mapped_column(sa.String(36), sa.ForeignKey("staff.id"), nullable=False)
    date: Mapped[date] = mapped_column(sa.Date, nullable=False)
    status: Mapped[str] = mapped_column(sa.Enum(StaffAttendanceStatus, native_enum=False), nullable=False, default=StaffAttendanceStatus.not_marked)
    check_in_time: Mapped[Optional[time]] = mapped_column(sa.Time, nullable=True)
    check_out_time: Mapped[Optional[time]] = mapped_column(sa.Time, nullable=True)
    notes: Mapped[Optional[str]] = mapped_column(sa.Text, nullable=True)
    marked_by: Mapped[Optional[str]] = mapped_column(sa.String(36), nullable=True)
    marked_at: Mapped[Optional[datetime]] = mapped_column(sa.DateTime(timezone=True), nullable=True)
    updated_by: Mapped[Optional[str]] = mapped_column(sa.String(36), nullable=True)
    updated_at: Mapped[Optional[datetime]] = mapped_column(sa.DateTime(timezone=True), nullable=True)
    previous_status: Mapped[Optional[str]] = mapped_column(sa.String(20), nullable=True)
