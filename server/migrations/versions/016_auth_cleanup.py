"""Auth cleanup: drop password_reset_tokens, widen phone column, remove student/staff logins.

Revision ID: 016
Revises: 015
"""
from alembic import op
import sqlalchemy as sa

from migrations.ddl import table_exists, column_exists

revision = "016"
down_revision = "015"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Drop password reset infrastructure
    if table_exists("password_reset_tokens"):
        op.drop_table("password_reset_tokens")

    # Widen phone column to accommodate full_student_uid identifiers (e.g. SCH001-STU00001)
    op.alter_column(
        "school_users",
        "phone",
        existing_type=sa.String(15),
        type_=sa.String(30),
        nullable=False,
    )

    # Remove student and staff login accounts — they no longer have login access
    op.execute(sa.text(
        "DELETE FROM sessions WHERE school_user_id IN "
        "(SELECT id FROM school_users WHERE role IN ('student', 'staff'))"
    ))
    op.execute(sa.text("DELETE FROM school_users WHERE role IN ('student', 'staff')"))

    # Drop the email unique index — email is now a contact field only, not an auth identifier
    op.execute(sa.text("DROP INDEX IF EXISTS ix_school_users_email"))


def downgrade() -> None:
    pass
