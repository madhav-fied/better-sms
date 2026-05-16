from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel


class ResultBulkItem(BaseModel):
    exam_id: str
    class_section_id: str
    subject: str
    student_id: str
    marks_obtained: Optional[float] = None
    max_marks: float
    passing_marks: float
    is_absent: bool = False
    is_exempt: bool = False
    grade: Optional[str] = None
    remarks: Optional[str] = None


class ResultBulkIn(BaseModel):
    results: List[ResultBulkItem]


class ResultPublishIn(BaseModel):
    exam_id: str
    class_section_id: Optional[str] = None
    subject: Optional[str] = None


class ResultUpdate(BaseModel):
    marks_obtained: Optional[float] = None
    is_absent: Optional[bool] = None
    is_exempt: Optional[bool] = None
    grade: Optional[str] = None
    remarks: Optional[str] = None


class ResultOut(BaseModel):
    id: str
    exam_id: str
    class_section_id: str
    subject: str
    student_id: str
    marks_obtained: Optional[float]
    max_marks: float
    passing_marks: float
    is_absent: bool
    is_exempt: bool
    grade: Optional[str]
    remarks: Optional[str]
    is_published: bool
    published_at: Optional[datetime]
    published_by: Optional[str]
    entered_by: Optional[str]
    entered_at: Optional[datetime]
    updated_at: Optional[datetime]

    model_config = {"from_attributes": True}
