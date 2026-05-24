"""Model/DB parity: staff designation, parent_guardians extended columns.

Revision ID: 014
Revises: 013
"""
from alembic import op
import sqlalchemy as sa

from migrations.ddl import add_column, column_exists, rename_column

revision = "014"
down_revision = "013"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # staff.designation/qualification were dropped in 009 but models still use them
    add_column("staff", sa.Column("designation", sa.String(100), nullable=True))
    add_column("staff", sa.Column("qualification", sa.String(255), nullable=True))

    # parent_guardians.phone was renamed to mobile in 009; ensure mobile exists
    rename_column("parent_guardians", "phone", "mobile")

    pg_cols = [
        sa.Column("first_name", sa.String(100), nullable=True),
        sa.Column("last_name", sa.String(100), nullable=True),
        sa.Column("qualification", sa.String(100), nullable=True),
        sa.Column("aadhar_no", sa.String(20), nullable=True),
        sa.Column("dob", sa.Date, nullable=True),
        sa.Column("bank_account", sa.String(50), nullable=True),
        sa.Column("ifsc_code", sa.String(20), nullable=True),
        sa.Column("annual_income", sa.Integer, nullable=True),
        sa.Column("photo_url", sa.String(500), nullable=True),
        sa.Column("anniversary_date", sa.Date, nullable=True),
        sa.Column("address", sa.Text, nullable=True),
        sa.Column("guardian_relation", sa.String(50), nullable=True),
        sa.Column("alternate_mobile", sa.String(20), nullable=True),
        sa.Column("alternate_email", sa.String(255), nullable=True),
        sa.Column("emergency_mobile", sa.String(20), nullable=True),
    ]
    for col in pg_cols:
        add_column("parent_guardians", col)

    add_column(
        "parent_guardians",
        sa.Column("is_primary", sa.Boolean(), nullable=False, server_default="false"),
    )

    if column_exists("staff", "name") and column_exists("staff", "designation"):
        op.execute(
            sa.text(
                """
                UPDATE staff
                SET designation = COALESCE(designation, name)
                WHERE designation IS NULL AND name IS NOT NULL
                """
            )
        )


def downgrade() -> None:
    pass
