import uuid
from datetime import datetime

import sqlalchemy as sa
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


class Subject(Base):
    __tablename__ = "subjects"

    id: Mapped[str] = mapped_column(sa.String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    school_id: Mapped[str] = mapped_column(sa.String(36), sa.ForeignKey("schools.id"), nullable=False)
    name: Mapped[str] = mapped_column(sa.String(100), nullable=False)
    is_active: Mapped[bool] = mapped_column(sa.Boolean, default=True, nullable=False)
    created_at: Mapped[datetime] = mapped_column(sa.DateTime(timezone=True), default=lambda: datetime.utcnow(), nullable=False)

    __table_args__ = (sa.UniqueConstraint("school_id", "name", name="uq_subject_school_name"),)
