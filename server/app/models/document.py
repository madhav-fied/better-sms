import uuid
import enum
from datetime import datetime
from typing import Optional

import sqlalchemy as sa
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


class EntityType(str, enum.Enum):
    student = "student"
    staff = "staff"
    registration = "registration"


class DocType(str, enum.Enum):
    photo = "photo"
    tc = "tc"
    character_cert = "character_cert"
    medical = "medical"
    dob = "dob"
    aadhar = "aadhar"
    other = "other"


class Document(Base):
    __tablename__ = "documents"

    id: Mapped[str] = mapped_column(sa.String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    school_id: Mapped[str] = mapped_column(sa.String(36), sa.ForeignKey("schools.id"), nullable=False)
    entity_type: Mapped[str] = mapped_column(sa.Enum(EntityType, native_enum=False), nullable=False)
    entity_id: Mapped[str] = mapped_column(sa.String(36), nullable=False)
    doc_type: Mapped[str] = mapped_column(sa.Enum(DocType, native_enum=False), nullable=False)
    filename: Mapped[str] = mapped_column(sa.String(255), nullable=False)
    s3_key: Mapped[Optional[str]] = mapped_column(sa.String(500), nullable=True)
    url_expires_at: Mapped[Optional[datetime]] = mapped_column(sa.DateTime(timezone=True), nullable=True)
    uploaded_at: Mapped[datetime] = mapped_column(sa.DateTime(timezone=True), default=lambda: datetime.utcnow(), nullable=False)
