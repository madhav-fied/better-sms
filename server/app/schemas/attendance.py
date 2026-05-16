from datetime import date, datetime, time
from typing import Optional, List
from pydantic import BaseModel

from app.models.attendance import StudentAttendanceStatus, StaffAttendanceStatus, AttendanceSession


class StudentAttendanceMarkItem(BaseModel):
    student_id: str
    status: StudentAttendanceStatus
    period_no: Optional[int] = None
    session: Optional[AttendanceSession] = None
    notes: Optional[str] = None


class StudentAttendanceMarkIn(BaseModel):
    class_section_id: str
    academic_year_id: str
    date: date
    records: List[StudentAttendanceMarkItem]


class StudentAttendanceUpdate(BaseModel):
    status: Optional[StudentAttendanceStatus] = None
    period_no: Optional[int] = None
    session: Optional[AttendanceSession] = None
    notes: Optional[str] = None


class StudentAttendanceOut(BaseModel):
    id: str
    school_id: str
    academic_year_id: str
    class_section_id: str
    student_id: str
    date: date
    period_no: Optional[int]
    session: Optional[str]
    status: str
    notes: Optional[str]
    marked_by: Optional[str]
    marked_at: Optional[datetime]
    updated_by: Optional[str]
    updated_at: Optional[datetime]
    previous_status: Optional[str]

    model_config = {"from_attributes": True}


class StaffAttendanceMarkItem(BaseModel):
    staff_id: str
    status: StaffAttendanceStatus
    check_in_time: Optional[time] = None
    check_out_time: Optional[time] = None
    notes: Optional[str] = None


class StaffAttendanceMarkIn(BaseModel):
    date: date
    records: List[StaffAttendanceMarkItem]


class StaffAttendanceUpdate(BaseModel):
    status: Optional[StaffAttendanceStatus] = None
    check_in_time: Optional[time] = None
    check_out_time: Optional[time] = None
    notes: Optional[str] = None


class StaffAttendanceOut(BaseModel):
    id: str
    school_id: str
    staff_id: str
    date: date
    status: str
    check_in_time: Optional[time]
    check_out_time: Optional[time]
    notes: Optional[str]
    marked_by: Optional[str]
    marked_at: Optional[datetime]
    updated_by: Optional[str]
    updated_at: Optional[datetime]
    previous_status: Optional[str]

    model_config = {"from_attributes": True}
