"""Production schema catch-up: extended student/staff columns from 003.

Revision ID: 013
Revises: 012

Some Railway databases reached 012 without 003_extended_schema columns applied.
All DDL is idempotent via migrations.ddl helpers.
"""
from alembic import op
import sqlalchemy as sa

from migrations.ddl import add_column, column_exists, rename_table, table_exists

revision = "013"
down_revision = "012"
branch_labels = None
depends_on = None


def upgrade() -> None:
    rename_table("syllabus", "syllabuses")

    # ── students (003_extended_schema) ────────────────────────────────────────
    student_cols = [
        sa.Column("email", sa.String(255), nullable=True),
        sa.Column("sms_mobile", sa.String(20), nullable=True),
        sa.Column("whatsapp_mobile", sa.String(20), nullable=True),
        sa.Column("saral_id", sa.String(50), nullable=True),
        sa.Column("roll_number", sa.String(20), nullable=True),
        sa.Column("card_number", sa.String(30), nullable=True),
        sa.Column("cbse_reg_no", sa.String(50), nullable=True),
        sa.Column("ledger_no", sa.String(50), nullable=True),
        sa.Column("pen", sa.String(30), nullable=True),
        sa.Column("apaar_id", sa.String(50), nullable=True),
        sa.Column("caste_category", sa.String(50), nullable=True),
        sa.Column("student_category", sa.String(50), nullable=True),
        sa.Column("house_category", sa.String(50), nullable=True),
        sa.Column("fee_type", sa.String(20), nullable=True),
        sa.Column("papers", sa.JSON, nullable=True),
        sa.Column("additional_papers", sa.JSON, nullable=True),
        sa.Column("contact_address", sa.Text, nullable=True),
        sa.Column("pin_code", sa.String(10), nullable=True),
        sa.Column("permanent_address", sa.Text, nullable=True),
        sa.Column("country", sa.String(50), nullable=True),
        sa.Column("city_state", sa.String(100), nullable=True),
        sa.Column("registration_date", sa.Date, nullable=True),
        sa.Column("joining_date", sa.Date, nullable=True),
        sa.Column("relieving_date", sa.Date, nullable=True),
        sa.Column("class_promoted_date", sa.Date, nullable=True),
        sa.Column("last_school_name", sa.String(255), nullable=True),
        sa.Column("last_school_class", sa.String(50), nullable=True),
        sa.Column("last_school_subjects", sa.Text, nullable=True),
        sa.Column("last_school_attendance", sa.Integer, nullable=True),
        sa.Column("transfer_certificate_no", sa.String(50), nullable=True),
        sa.Column("fee_concession", sa.String(100), nullable=True),
        sa.Column("photo_url", sa.String(500), nullable=True),
        sa.Column("has_sibling", sa.Boolean, nullable=False, server_default="false"),
        sa.Column("sibling_student_id", sa.String(36), nullable=True),
        sa.Column("tc_generated", sa.Boolean, nullable=False, server_default="false"),
    ]
    for col in student_cols:
        add_column("students", col)

    # ── staff (003_extended_schema) ───────────────────────────────────────────
    staff_cols = [
        sa.Column("first_name", sa.String(100), nullable=True),
        sa.Column("last_name", sa.String(100), nullable=True),
        sa.Column("short_name", sa.String(50), nullable=True),
        sa.Column("religion", sa.String(50), nullable=True),
        sa.Column("blood_group", sa.String(10), nullable=True),
        sa.Column("caste_category", sa.String(50), nullable=True),
        sa.Column("contact_address", sa.Text, nullable=True),
        sa.Column("pincode", sa.String(10), nullable=True),
        sa.Column("city_state", sa.String(100), nullable=True),
        sa.Column("teaching_type", sa.String(20), nullable=True),
        sa.Column("basic_salary", sa.Numeric(12, 2), nullable=True),
        sa.Column("total_experience", sa.Integer, nullable=True),
        sa.Column("card_number", sa.String(30), nullable=True),
        sa.Column("relieving_date", sa.Date, nullable=True),
        sa.Column("licensee_number", sa.String(50), nullable=True),
        sa.Column("passport_number", sa.String(30), nullable=True),
        sa.Column("emergency_mobile", sa.String(20), nullable=True),
        sa.Column("father_first_name", sa.String(100), nullable=True),
        sa.Column("father_last_name", sa.String(100), nullable=True),
        sa.Column("mother_first_name", sa.String(100), nullable=True),
        sa.Column("mother_last_name", sa.String(100), nullable=True),
        sa.Column("marital_status", sa.String(20), nullable=True),
        sa.Column("spouse_name", sa.String(200), nullable=True),
        sa.Column("photo_url", sa.String(500), nullable=True),
    ]
    for col in staff_cols:
        add_column("staff", col)

    if not table_exists("staff_job_details"):
        op.create_table(
            "staff_job_details",
            sa.Column("id", sa.String(36), nullable=False),
            sa.Column("staff_id", sa.String(36), nullable=False),
            sa.Column("joined_date", sa.Date, nullable=True),
            sa.Column("end_of_probation", sa.Date, nullable=True),
            sa.Column("position", sa.String(100), nullable=True),
            sa.Column("effective_date", sa.Date, nullable=True),
            sa.Column("superior", sa.String(200), nullable=True),
            sa.Column("department", sa.String(100), nullable=True),
            sa.Column("branch", sa.String(100), nullable=True),
            sa.Column("job_type", sa.String(20), nullable=True),
            sa.Column("job_status", sa.String(20), nullable=True),
            sa.Column("workdays", sa.Integer, nullable=True),
            sa.Column("holidays", sa.Integer, nullable=True),
            sa.ForeignKeyConstraint(["staff_id"], ["staff.id"]),
            sa.PrimaryKeyConstraint("id"),
            sa.UniqueConstraint("staff_id"),
        )

    # Backfill staff first/last name from legacy name column when present
    if column_exists("staff", "name") and column_exists("staff", "first_name"):
        op.execute(
            sa.text(
                """
                UPDATE staff
                SET first_name = COALESCE(NULLIF(first_name, ''), split_part(name, ' ', 1)),
                    last_name = COALESCE(
                        NULLIF(last_name, ''),
                        NULLIF(trim(substring(name from position(' ' in name))), ''),
                        ''
                    )
                WHERE (first_name IS NULL OR first_name = '')
                  AND name IS NOT NULL AND name <> ''
                """
            )
        )


def downgrade() -> None:
    pass
