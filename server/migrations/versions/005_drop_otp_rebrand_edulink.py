"""Drop OTP tables and rename default school to Edulink

Revision ID: 010
Revises: 009
Create Date: 2026-05-23
"""
from alembic import op
import sqlalchemy as sa

from migrations.ddl import drop_index_if_exists, table_exists

revision = "010"
down_revision = "009"
branch_labels = None
depends_on = None


def upgrade() -> None:
    if table_exists("otp_requests"):
        drop_index_if_exists("ix_otp_requests_phone_created_at", "otp_requests")
        op.drop_table("otp_requests")
    op.execute(sa.text("UPDATE schools SET name = 'Edulink' WHERE name = 'SKEducations'"))


def downgrade() -> None:
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
    op.execute(sa.text("UPDATE schools SET name = 'SKEducations' WHERE name = 'Edulink'"))
