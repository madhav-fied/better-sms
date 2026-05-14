from datetime import date, datetime
from typing import Optional
from pydantic import BaseModel

from app.models.leave import LeaveEntityType, LeaveType, LeaveStatus


class LeaveCreate(BaseModel):
    entity_type: LeaveEntityType
    entity_id: str
    leave_type: LeaveType
    from_date: date
    to_date: date
    days: int
    reason: Optional[str] = None


class LeaveReviewIn(BaseModel):
    review_note: Optional[str] = None


class LeaveOut(BaseModel):
    id: str
    school_id: str
    entity_type: str
    entity_id: str
    leave_type: str
    from_date: date
    to_date: date
    days: int
    reason: Optional[str]
    status: str
    applied_by: str
    applied_at: datetime
    reviewed_by: Optional[str]
    reviewed_at: Optional[datetime]
    review_note: Optional[str]

    model_config = {"from_attributes": True}
