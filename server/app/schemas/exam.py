from datetime import date, datetime, time
from typing import Optional, List, Any
from pydantic import BaseModel

from app.models.exam import ExamType, ExamApplicableTo, ExamStatus


class ExamCreate(BaseModel):
    academic_year_id: str
    name: str
    exam_type: ExamType
    display_order: int = 0
    applicable_to: ExamApplicableTo = ExamApplicableTo.all_classes
    applicable_class_section_ids: Optional[List[str]] = None


class ExamUpdate(BaseModel):
    name: Optional[str] = None
    exam_type: Optional[ExamType] = None
    display_order: Optional[int] = None
    applicable_to: Optional[ExamApplicableTo] = None
    applicable_class_section_ids: Optional[List[str]] = None
    status: Optional[ExamStatus] = None


class ExamScheduleEntryIn(BaseModel):
    class_section_id: str
    subject: str
    exam_date: Optional[date] = None
    start_time: Optional[time] = None
    end_time: Optional[time] = None
    max_marks: float = 100
    passing_marks: float = 35


class ExamScheduleEntryOut(BaseModel):
    id: str
    exam_id: str
    class_section_id: str
    subject: str
    exam_date: Optional[date]
    start_time: Optional[time]
    end_time: Optional[time]
    max_marks: float
    passing_marks: float
    results_published: bool

    model_config = {"from_attributes": True}


class ExamOut(BaseModel):
    id: str
    school_id: str
    academic_year_id: str
    name: str
    exam_type: str
    display_order: int
    applicable_to: str
    applicable_class_section_ids: Optional[Any]
    status: str
    scheduled_at: Optional[datetime]
    completed_at: Optional[datetime]
    created_by: str
    created_at: datetime
    updated_at: Optional[datetime]

    model_config = {"from_attributes": True}
