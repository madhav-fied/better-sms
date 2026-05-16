from datetime import date, datetime
from typing import Optional
from pydantic import BaseModel

from app.models.student import StudentGender, AdmissionType


class StudentCreate(BaseModel):
    first_name: str
    last_name: str
    gender: StudentGender
    class_section_id: str
    academic_year_id: Optional[str] = None
    dob: Optional[date] = None
    blood_group: Optional[str] = None
    aadhar_no: Optional[str] = None
    student_type: str = "new"
    hosteller: bool = False
    admission_type: str = "regular"


class StudentUpdate(BaseModel):
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    gender: Optional[StudentGender] = None
    dob: Optional[date] = None
    blood_group: Optional[str] = None
    aadhar_no: Optional[str] = None
    class_section_id: Optional[str] = None
    hosteller: Optional[bool] = None
    admission_type: Optional[AdmissionType] = None
    status: Optional[str] = None


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
    class_section_id: str
    class_name: Optional[str] = None
    section: Optional[str] = None
    student_type: Optional[str]
    hosteller: bool
    admission_type: Optional[str]
    status: str
    registration_id: Optional[str]
    created_at: datetime

    model_config = {"from_attributes": True}
