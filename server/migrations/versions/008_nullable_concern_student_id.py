"""concerns: make student_id nullable

Revision ID: 008
Revises: 007
Create Date: 2026-05-23 00:00:00.000000
"""
from alembic import op

revision = "008"
down_revision = "007"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.alter_column("concerns", "student_id", nullable=True)


def downgrade() -> None:
    op.execute("UPDATE concerns SET student_id = '' WHERE student_id IS NULL")
    op.alter_column("concerns", "student_id", nullable=False)
