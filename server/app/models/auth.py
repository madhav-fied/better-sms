import hashlib
import secrets
import uuid
import enum
from datetime import datetime
from typing import Optional

import sqlalchemy as sa
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


class UserRole(str, enum.Enum):
    superadmin = "superadmin"
    admin = "admin"
    teacher = "teacher"
    staff = "staff"
    student = "student"
    parent = "parent"


class SchoolUser(Base):
    __tablename__ = "school_users"

    id: Mapped[str] = mapped_column(sa.String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    school_id: Mapped[Optional[str]] = mapped_column(sa.String(36), sa.ForeignKey("schools.id"), nullable=True)  # null for superadmin
    role: Mapped[str] = mapped_column(sa.Enum(UserRole, native_enum=False), nullable=False)
    phone: Mapped[str] = mapped_column(sa.String(15), nullable=False)
    entity_id: Mapped[Optional[str]] = mapped_column(sa.String(36), nullable=True)  # FK to staff/students/etc
    email: Mapped[Optional[str]] = mapped_column(sa.String(255), nullable=True, index=True)
    password_hash: Mapped[Optional[str]] = mapped_column(sa.String(255), nullable=True)
    is_active: Mapped[bool] = mapped_column(sa.Boolean, default=True, nullable=False)
    created_at: Mapped[datetime] = mapped_column(sa.DateTime(timezone=True), default=lambda: datetime.utcnow(), nullable=False)


class OtpRequest(Base):
    __tablename__ = "otp_requests"

    id: Mapped[str] = mapped_column(sa.String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    phone: Mapped[str] = mapped_column(sa.String(15), nullable=False)
    school_id: Mapped[Optional[str]] = mapped_column(sa.String(36), nullable=True)
    otp_hash: Mapped[str] = mapped_column(sa.String(255), nullable=False)
    expires_at: Mapped[datetime] = mapped_column(sa.DateTime(timezone=True), nullable=False)
    used: Mapped[bool] = mapped_column(sa.Boolean, default=False, nullable=False)
    attempt_count: Mapped[int] = mapped_column(sa.Integer, default=0, nullable=False)
    created_at: Mapped[datetime] = mapped_column(sa.DateTime(timezone=True), default=lambda: datetime.utcnow(), nullable=False)


class PasswordResetToken(Base):
    __tablename__ = "password_reset_tokens"

    id: Mapped[str] = mapped_column(sa.String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    school_user_id: Mapped[str] = mapped_column(sa.String(36), sa.ForeignKey("school_users.id"), nullable=False)
    token_hash: Mapped[str] = mapped_column(sa.String(64), nullable=False, unique=True)
    expires_at: Mapped[datetime] = mapped_column(sa.DateTime(timezone=True), nullable=False)
    used: Mapped[bool] = mapped_column(sa.Boolean, default=False, server_default="false", nullable=False)
    created_at: Mapped[datetime] = mapped_column(sa.DateTime(timezone=True), default=lambda: datetime.utcnow(), nullable=False)


class Session(Base):
    __tablename__ = "sessions"

    id: Mapped[str] = mapped_column(sa.String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    school_user_id: Mapped[str] = mapped_column(sa.String(36), sa.ForeignKey("school_users.id"), nullable=False)
    token_hash: Mapped[str] = mapped_column(sa.String(64), nullable=False, unique=True)  # sha256 hex
    role: Mapped[str] = mapped_column(sa.String(20), nullable=False)
    school_id: Mapped[Optional[str]] = mapped_column(sa.String(36), nullable=True)
    expires_at: Mapped[datetime] = mapped_column(sa.DateTime(timezone=True), nullable=False)
    created_at: Mapped[datetime] = mapped_column(sa.DateTime(timezone=True), default=lambda: datetime.utcnow(), nullable=False)
    last_seen_at: Mapped[datetime] = mapped_column(sa.DateTime(timezone=True), default=lambda: datetime.utcnow(), nullable=False)
