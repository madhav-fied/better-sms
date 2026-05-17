"""Extended schema: student, staff, parent_guardian new fields

Revision ID: 003
Revises: 002
Create Date: 2026-05-16 00:00:00.000000
"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = "003"
down_revision = "002"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # ── students ──────────────────────────────────────────────────────────────
    op.add_column("students", sa.Column("email", sa.String(255), nullable=True))
    op.add_column("students", sa.Column("sms_mobile", sa.String(20), nullable=True))
    op.add_column("students", sa.Column("whatsapp_mobile", sa.String(20), nullable=True))
    op.add_column("students", sa.Column("saral_id", sa.String(50), nullable=True))
    op.add_column("students", sa.Column("roll_number", sa.String(20), nullable=True))
    op.add_column("students", sa.Column("card_number", sa.String(30), nullable=True))
    op.add_column("students", sa.Column("cbse_reg_no", sa.String(50), nullable=True))
    op.add_column("students", sa.Column("ledger_no", sa.String(50), nullable=True))
    op.add_column("students", sa.Column("pen", sa.String(30), nullable=True))
    op.add_column("students", sa.Column("apaar_id", sa.String(50), nullable=True))
    op.add_column("students", sa.Column("caste_category", sa.String(50), nullable=True))
    op.add_column("students", sa.Column("student_category", sa.String(50), nullable=True))
    op.add_column("students", sa.Column("house_category", sa.String(50), nullable=True))
    op.add_column("students", sa.Column("fee_type", sa.String(20), nullable=True))
    op.add_column("students", sa.Column("papers", sa.JSON, nullable=True))
    op.add_column("students", sa.Column("additional_papers", sa.JSON, nullable=True))
    op.add_column("students", sa.Column("contact_address", sa.Text, nullable=True))
    op.add_column("students", sa.Column("pin_code", sa.String(10), nullable=True))
    op.add_column("students", sa.Column("permanent_address", sa.Text, nullable=True))
    op.add_column("students", sa.Column("country", sa.String(50), nullable=True))
    op.add_column("students", sa.Column("city_state", sa.String(100), nullable=True))
    op.add_column("students", sa.Column("registration_date", sa.Date, nullable=True))
    op.add_column("students", sa.Column("joining_date", sa.Date, nullable=True))
    op.add_column("students", sa.Column("relieving_date", sa.Date, nullable=True))
    op.add_column("students", sa.Column("class_promoted_date", sa.Date, nullable=True))
    op.add_column("students", sa.Column("last_school_name", sa.String(255), nullable=True))
    op.add_column("students", sa.Column("last_school_class", sa.String(50), nullable=True))
    op.add_column("students", sa.Column("last_school_subjects", sa.Text, nullable=True))
    op.add_column("students", sa.Column("last_school_attendance", sa.Integer, nullable=True))
    op.add_column("students", sa.Column("transfer_certificate_no", sa.String(50), nullable=True))
    op.add_column("students", sa.Column("fee_concession", sa.String(100), nullable=True))
    op.add_column("students", sa.Column("photo_url", sa.String(500), nullable=True))
    op.add_column(
        "students",
        sa.Column("has_sibling", sa.Boolean, nullable=False, server_default="false"),
    )
    op.add_column("students", sa.Column("sibling_student_id", sa.String(36), nullable=True))
    op.add_column(
        "students",
        sa.Column("tc_generated", sa.Boolean, nullable=False, server_default="false"),
    )

    # ── staff ─────────────────────────────────────────────────────────────────
    op.add_column("staff", sa.Column("first_name", sa.String(100), nullable=True))
    op.add_column("staff", sa.Column("last_name", sa.String(100), nullable=True))
    op.add_column("staff", sa.Column("short_name", sa.String(50), nullable=True))
    op.add_column("staff", sa.Column("religion", sa.String(50), nullable=True))
    op.add_column("staff", sa.Column("blood_group", sa.String(10), nullable=True))
    op.add_column("staff", sa.Column("caste_category", sa.String(50), nullable=True))
    op.add_column("staff", sa.Column("contact_address", sa.Text, nullable=True))
    op.add_column("staff", sa.Column("pincode", sa.String(10), nullable=True))
    op.add_column("staff", sa.Column("city_state", sa.String(100), nullable=True))
    # designation and qualification already exist from migration 001
    op.add_column("staff", sa.Column("teaching_type", sa.String(20), nullable=True))
    op.add_column("staff", sa.Column("basic_salary", sa.Numeric(12, 2), nullable=True))
    op.add_column("staff", sa.Column("total_experience", sa.Integer, nullable=True))
    op.add_column("staff", sa.Column("card_number", sa.String(30), nullable=True))
    op.add_column("staff", sa.Column("relieving_date", sa.Date, nullable=True))
    op.add_column("staff", sa.Column("licensee_number", sa.String(50), nullable=True))
    op.add_column("staff", sa.Column("passport_number", sa.String(30), nullable=True))
    op.add_column("staff", sa.Column("emergency_mobile", sa.String(20), nullable=True))
    op.add_column("staff", sa.Column("father_first_name", sa.String(100), nullable=True))
    op.add_column("staff", sa.Column("father_last_name", sa.String(100), nullable=True))
    op.add_column("staff", sa.Column("mother_first_name", sa.String(100), nullable=True))
    op.add_column("staff", sa.Column("mother_last_name", sa.String(100), nullable=True))
    op.add_column("staff", sa.Column("marital_status", sa.String(20), nullable=True))
    op.add_column("staff", sa.Column("spouse_name", sa.String(200), nullable=True))
    op.add_column("staff", sa.Column("photo_url", sa.String(500), nullable=True))

    # ── staff_job_details (new table) ─────────────────────────────────────────
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

    # ── parent_guardians ──────────────────────────────────────────────────────
    op.add_column("parent_guardians", sa.Column("first_name", sa.String(100), nullable=True))
    op.add_column("parent_guardians", sa.Column("last_name", sa.String(100), nullable=True))
    op.add_column("parent_guardians", sa.Column("qualification", sa.String(100), nullable=True))
    op.add_column("parent_guardians", sa.Column("aadhar_no", sa.String(20), nullable=True))
    op.add_column("parent_guardians", sa.Column("dob", sa.Date, nullable=True))
    op.add_column("parent_guardians", sa.Column("bank_account", sa.String(50), nullable=True))
    op.add_column("parent_guardians", sa.Column("ifsc_code", sa.String(20), nullable=True))
    op.add_column("parent_guardians", sa.Column("annual_income", sa.Integer, nullable=True))
    op.add_column("parent_guardians", sa.Column("photo_url", sa.String(500), nullable=True))
    op.add_column("parent_guardians", sa.Column("anniversary_date", sa.Date, nullable=True))
    op.add_column("parent_guardians", sa.Column("address", sa.Text, nullable=True))
    op.add_column("parent_guardians", sa.Column("guardian_relation", sa.String(50), nullable=True))
    op.add_column("parent_guardians", sa.Column("alternate_mobile", sa.String(20), nullable=True))
    op.add_column("parent_guardians", sa.Column("alternate_email", sa.String(255), nullable=True))
    op.add_column("parent_guardians", sa.Column("emergency_mobile", sa.String(20), nullable=True))


def downgrade() -> None:
    # ── parent_guardians ──────────────────────────────────────────────────────
    op.drop_column("parent_guardians", "emergency_mobile")
    op.drop_column("parent_guardians", "alternate_email")
    op.drop_column("parent_guardians", "alternate_mobile")
    op.drop_column("parent_guardians", "guardian_relation")
    op.drop_column("parent_guardians", "address")
    op.drop_column("parent_guardians", "anniversary_date")
    op.drop_column("parent_guardians", "photo_url")
    op.drop_column("parent_guardians", "annual_income")
    op.drop_column("parent_guardians", "ifsc_code")
    op.drop_column("parent_guardians", "bank_account")
    op.drop_column("parent_guardians", "dob")
    op.drop_column("parent_guardians", "aadhar_no")
    op.drop_column("parent_guardians", "qualification")
    op.drop_column("parent_guardians", "last_name")
    op.drop_column("parent_guardians", "first_name")

    # ── staff_job_details ─────────────────────────────────────────────────────
    op.drop_table("staff_job_details")

    # ── staff ─────────────────────────────────────────────────────────────────
    op.drop_column("staff", "photo_url")
    op.drop_column("staff", "spouse_name")
    op.drop_column("staff", "marital_status")
    op.drop_column("staff", "mother_last_name")
    op.drop_column("staff", "mother_first_name")
    op.drop_column("staff", "father_last_name")
    op.drop_column("staff", "father_first_name")
    op.drop_column("staff", "emergency_mobile")
    op.drop_column("staff", "passport_number")
    op.drop_column("staff", "licensee_number")
    op.drop_column("staff", "relieving_date")
    op.drop_column("staff", "card_number")
    op.drop_column("staff", "total_experience")
    op.drop_column("staff", "basic_salary")
    op.drop_column("staff", "teaching_type")
    # designation and qualification are from migration 001, not dropped here
    op.drop_column("staff", "city_state")
    op.drop_column("staff", "pincode")
    op.drop_column("staff", "contact_address")
    op.drop_column("staff", "caste_category")
    op.drop_column("staff", "blood_group")
    op.drop_column("staff", "religion")
    op.drop_column("staff", "short_name")
    op.drop_column("staff", "last_name")
    op.drop_column("staff", "first_name")

    # ── students ──────────────────────────────────────────────────────────────
    op.drop_column("students", "tc_generated")
    op.drop_column("students", "sibling_student_id")
    op.drop_column("students", "has_sibling")
    op.drop_column("students", "photo_url")
    op.drop_column("students", "fee_concession")
    op.drop_column("students", "transfer_certificate_no")
    op.drop_column("students", "last_school_attendance")
    op.drop_column("students", "last_school_subjects")
    op.drop_column("students", "last_school_class")
    op.drop_column("students", "last_school_name")
    op.drop_column("students", "class_promoted_date")
    op.drop_column("students", "relieving_date")
    op.drop_column("students", "joining_date")
    op.drop_column("students", "registration_date")
    op.drop_column("students", "city_state")
    op.drop_column("students", "country")
    op.drop_column("students", "permanent_address")
    op.drop_column("students", "pin_code")
    op.drop_column("students", "contact_address")
    op.drop_column("students", "additional_papers")
    op.drop_column("students", "papers")
    op.drop_column("students", "fee_type")
    op.drop_column("students", "house_category")
    op.drop_column("students", "student_category")
    op.drop_column("students", "caste_category")
    op.drop_column("students", "apaar_id")
    op.drop_column("students", "pen")
    op.drop_column("students", "ledger_no")
    op.drop_column("students", "cbse_reg_no")
    op.drop_column("students", "card_number")
    op.drop_column("students", "roll_number")
    op.drop_column("students", "saral_id")
    op.drop_column("students", "whatsapp_mobile")
    op.drop_column("students", "sms_mobile")
    op.drop_column("students", "email")
