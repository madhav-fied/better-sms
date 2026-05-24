from datetime import datetime
from typing import Optional
from pydantic import BaseModel


class ParentCreate(BaseModel):
    name: str
    phone: Optional[str] = None
    email: Optional[str] = None


class ParentUpdate(BaseModel):
    name: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None


class ParentOut(BaseModel):
    id: str
    school_id: str
    name: str
    phone: Optional[str] = None
    email: Optional[str] = None
    created_at: datetime

    model_config = {"from_attributes": True}
