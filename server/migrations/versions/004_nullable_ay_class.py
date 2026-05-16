"""Make academic_year_id and class_section_id nullable on students/registrations

Allows creating students and registrations without requiring an active academic
year or class sections to exist first. Both can be assigned later via edit.

Revision ID: 004
Revises: 003
Create Date: 2026-05-16 00:00:00.000000
"""
from alembic import op
import sqlalchemy as sa

revision = "004"
down_revision = "003"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.alter_column("students", "academic_year_id", nullable=True, existing_type=sa.String(36))
    op.alter_column("students", "class_section_id", nullable=True, existing_type=sa.String(36))
    op.alter_column("registrations", "academic_year_id", nullable=True, existing_type=sa.String(36))


def downgrade() -> None:
    op.alter_column("registrations", "academic_year_id", nullable=False, existing_type=sa.String(36))
    op.alter_column("students", "class_section_id", nullable=False, existing_type=sa.String(36))
    op.alter_column("students", "academic_year_id", nullable=False, existing_type=sa.String(36))
