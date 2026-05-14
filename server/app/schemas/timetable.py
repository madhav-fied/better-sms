from datetime import datetime
from typing import Optional, Any
from pydantic import BaseModel

from app.models.timetable import TimetableStatus


class PeriodConfigUpdate(BaseModel):
    periods: Any


class PeriodConfigOut(BaseModel):
    id: str
    school_id: str
    periods: Optional[Any]
    updated_at: Optional[datetime]
    updated_by: Optional[str]

    model_config = {"from_attributes": True}


class TimetableCreate(BaseModel):
    class_section_id: str
    academic_year_id: str
    slots: Optional[Any] = None


class TimetableUpdate(BaseModel):
    class_section_id: Optional[str] = None
    academic_year_id: Optional[str] = None
    slots: Optional[Any] = None


class TimetableOut(BaseModel):
    id: str
    school_id: str
    class_section_id: str
    academic_year_id: str
    status: str
    slots: Optional[Any]
    created_by: str
    published_at: Optional[datetime]
    created_at: datetime
    updated_at: Optional[datetime]

    model_config = {"from_attributes": True}
