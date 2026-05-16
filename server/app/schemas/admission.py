from datetime import date, datetime
from typing import Optional, List, Any
from pydantic import BaseModel

from app.models.admission import EnquiryPurpose, EnquiryStatus, RegistrationStatus, ParentRelation


class EnquiryCreate(BaseModel):
    parent_name: str
    student_name: str
    mobile: str
    dob: Optional[date] = None
    class_section_id: Optional[str] = None
    purpose: EnquiryPurpose = EnquiryPurpose.new_admission
    date: date
    notes: Optional[str] = None


class EnquiryUpdate(BaseModel):
    parent_name: Optional[str] = None
    student_name: Optional[str] = None
    mobile: Optional[str] = None
    dob: Optional[date] = None
    class_section_id: Optional[str] = None
    purpose: Optional[EnquiryPurpose] = None
    date: Optional[date] = None
    notes: Optional[str] = None
    status: Optional[EnquiryStatus] = None


class EnquiryOut(BaseModel):
    id: str
    school_id: str
    enq_no: str
    parent_name: str
    student_name: str
    mobile: str
    dob: Optional[date]
    class_section_id: Optional[str]
    purpose: str
    date: date
    notes: Optional[str]
    status: str
    created_at: datetime

    model_config = {"from_attributes": True}


class ParentGuardianCreate(BaseModel):
    relation: ParentRelation
    name: str
    mobile: Optional[str] = None
    email: Optional[str] = None
    occupation: Optional[str] = None
    qualification: Optional[str] = None
    aadhar_no: Optional[str] = None


class ParentGuardianOut(BaseModel):
    id: str
    registration_id: str
    relation: str
    name: str
    mobile: Optional[str]
    email: Optional[str]
    occupation: Optional[str]
    qualification: Optional[str]
    aadhar_no: Optional[str]

    model_config = {"from_attributes": True}


class RegistrationCreate(BaseModel):
    academic_year_id: str
    enquiry_id: Optional[str] = None
    student_fields: Optional[dict] = None
    parent_guardians: Optional[List[ParentGuardianCreate]] = None


class RegistrationOut(BaseModel):
    id: str
    school_id: str
    academic_year_id: str
    enquiry_id: Optional[str]
    status: str
    submitted_at: datetime
    student_fields: Optional[Any]
    parent_guardians: List[ParentGuardianOut] = []

    model_config = {"from_attributes": True}


class AdmitStudentIn(BaseModel):
    registration_id: str
    class_section_id: str
    student_type: str = "new"
    hosteller: bool = False
    admission_type: str = "regular"
