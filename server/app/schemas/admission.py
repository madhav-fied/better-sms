from datetime import datetime
from typing import Optional, List, Any
from pydantic import BaseModel

from app.models.admission import EnquiryStatus, RegistrationStatus, ParentRelation


class EnquiryCreate(BaseModel):
    student_name: str
    parent_name: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    class_seeking: Optional[str] = None
    source: Optional[str] = None
    notes: Optional[str] = None


class EnquiryUpdate(BaseModel):
    student_name: Optional[str] = None
    parent_name: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    class_seeking: Optional[str] = None
    source: Optional[str] = None
    notes: Optional[str] = None
    status: Optional[EnquiryStatus] = None


class EnquiryOut(BaseModel):
    id: str
    school_id: str
    enq_no: str
    student_name: str
    parent_name: Optional[str]
    phone: Optional[str]
    email: Optional[str]
    class_seeking: Optional[str]
    source: Optional[str]
    notes: Optional[str]
    status: str
    created_at: datetime

    model_config = {"from_attributes": True}


class ParentGuardianCreate(BaseModel):
    relation: ParentRelation
    name: str
    phone: Optional[str] = None
    email: Optional[str] = None
    occupation: Optional[str] = None
    is_primary: bool = False


class ParentGuardianOut(BaseModel):
    id: str
    registration_id: str
    relation: str
    name: str
    phone: Optional[str]
    email: Optional[str]
    occupation: Optional[str]
    is_primary: bool

    model_config = {"from_attributes": True}


class RegistrationCreate(BaseModel):
    academic_year_id: Optional[str] = None
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
