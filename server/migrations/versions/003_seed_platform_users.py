"""Platform user indexes (seed data applied separately / via migration 003 run)

Revision ID: 003
Revises: 002
Create Date: 2026-05-23
"""
from alembic import op

revision = "003"
down_revision = "002"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute(
        """
        CREATE UNIQUE INDEX IF NOT EXISTS uq_school_users_phone_platform
        ON school_users (phone)
        WHERE school_id IS NULL
        """
    )
    op.execute(
        """
        CREATE UNIQUE INDEX IF NOT EXISTS uq_school_users_phone_school
        ON school_users (phone, school_id)
        WHERE school_id IS NOT NULL AND is_active = true
        """
    )


def downgrade() -> None:
    op.execute("DROP INDEX IF EXISTS uq_school_users_phone_school")
    op.execute("DROP INDEX IF EXISTS uq_school_users_phone_platform")
