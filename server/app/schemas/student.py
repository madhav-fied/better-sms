from datetime import date, datetime
from typing import Optional
from pydantic import BaseModel

from app.models.student import StudentGender, StudentType, AdmissionType, StudentStatus


class StudentUpdate(BaseModel):
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    gender: Optional[StudentGender] = None
    dob: Optional[date] = None
    blood_group: Optional[str] = None
    aadhar_no: Optional[str] = None
    sms_mobile: Optional[str] = None
    class_section_id: Optional[str] = None
    hosteller: Optional[bool] = None
    admission_type: Optional[AdmissionType] = None


class StudentOut(BaseModel):
    id: str
    school_id: str
    academic_year_id: str
    admission_no: str
    first_name: str
    last_name: str
    gender: str
    dob: Optional[date]
    blood_group: Optional[str]
    aadhar_no: Optional[str]
    reg_no: Optional[str]
    sms_mobile: Optional[str]
    class_section_id: str
    student_type: str
    hosteller: bool
    admission_type: str
    status: str
    tc_generated: bool
    registration_id: Optional[str]
    created_at: datetime

    model_config = {"from_attributes": True}
