"""Auth, subjects, school config

Revision ID: 002
Revises: 001
Create Date: 2026-01-02 00:00:00.000000
"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = "002"
down_revision = "001"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # school_users table
    op.create_table(
        "school_users",
        sa.Column("id", sa.String(36), nullable=False),
        sa.Column("school_id", sa.String(36), nullable=True),
        sa.Column("role", sa.String(20), nullable=False),
        sa.Column("phone", sa.String(15), nullable=False),
        sa.Column("entity_id", sa.String(36), nullable=True),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default="true"),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["school_id"], ["schools.id"]),
        sa.PrimaryKeyConstraint("id"),
    )

    # otp_requests table
    op.create_table(
        "otp_requests",
        sa.Column("id", sa.String(36), nullable=False),
        sa.Column("phone", sa.String(15), nullable=False),
        sa.Column("school_id", sa.String(36), nullable=True),
        sa.Column("otp_hash", sa.String(255), nullable=False),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("used", sa.Boolean(), nullable=False, server_default="false"),
        sa.Column("attempt_count", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_otp_requests_phone_created_at", "otp_requests", ["phone", "created_at"])

    # sessions table
    op.create_table(
        "sessions",
        sa.Column("id", sa.String(36), nullable=False),
        sa.Column("school_user_id", sa.String(36), nullable=False),
        sa.Column("token_hash", sa.String(64), nullable=False),
        sa.Column("role", sa.String(20), nullable=False),
        sa.Column("school_id", sa.String(36), nullable=True),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("last_seen_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["school_user_id"], ["school_users.id"]),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("token_hash"),
    )

    # subjects table
    op.create_table(
        "subjects",
        sa.Column("id", sa.String(36), nullable=False),
        sa.Column("school_id", sa.String(36), nullable=False),
        sa.Column("name", sa.String(100), nullable=False),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default="true"),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["school_id"], ["schools.id"]),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("school_id", "name", name="uq_subject_school_name"),
    )

    # Add attendance_mode to schools
    op.add_column(
        "schools",
        sa.Column(
            "attendance_mode",
            sa.String(20),
            nullable=False,
            server_default="period",
        ),
    )

    # Add uses_saturday to schools
    op.add_column(
        "schools",
        sa.Column(
            "uses_saturday",
            sa.Boolean(),
            nullable=False,
            server_default="false",
        ),
    )

    # Add source to student_attendance_records
    op.add_column(
        "student_attendance_records",
        sa.Column(
            "source",
            sa.String(20),
            nullable=False,
            server_default="manual",
        ),
    )

    # Add leave_id to student_attendance_records
    op.add_column(
        "student_attendance_records",
        sa.Column(
            "leave_id",
            sa.String(36),
            nullable=True,
        ),
    )


def downgrade() -> None:
    op.drop_column("student_attendance_records", "leave_id")
    op.drop_column("student_attendance_records", "source")
    op.drop_column("schools", "uses_saturday")
    op.drop_column("schools", "attendance_mode")
    op.drop_table("subjects")
    op.drop_table("sessions")
    op.drop_index("ix_otp_requests_phone_created_at", "otp_requests")
    op.drop_table("otp_requests")
    op.drop_table("school_users")
