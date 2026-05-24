from datetime import datetime
from typing import Optional
from pydantic import BaseModel, model_validator


class ParentCreate(BaseModel):
    name: str
    phone: Optional[str] = None
    email: Optional[str] = None
    login_password: Optional[str] = None

    @model_validator(mode="after")
    def require_login_credentials(self) -> "ParentCreate":
        if self.phone and self.phone.strip():
            if not self.email or not self.email.strip():
                raise ValueError("Parent email is required when phone is provided")
            if not self.login_password:
                raise ValueError("Parent password is required when phone is provided")
        return self


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
