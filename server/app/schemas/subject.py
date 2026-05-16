from datetime import datetime
from typing import Optional
from pydantic import BaseModel


class SubjectCreate(BaseModel):
    name: str


class SubjectUpdate(BaseModel):
    name: Optional[str] = None
    is_active: Optional[bool] = None


class SubjectOut(BaseModel):
    id: str
    school_id: str
    name: str
    is_active: bool
    created_at: datetime

    model_config = {"from_attributes": True}
