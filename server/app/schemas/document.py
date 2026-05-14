from datetime import datetime
from typing import Optional
from pydantic import BaseModel

from app.models.document import EntityType, DocType


class DocumentCreate(BaseModel):
    doc_type: DocType
    filename: str


class DocumentOut(BaseModel):
    id: str
    school_id: str
    entity_type: str
    entity_id: str
    doc_type: str
    filename: str
    s3_key: Optional[str]
    url_expires_at: Optional[datetime]
    uploaded_at: datetime

    model_config = {"from_attributes": True}
