"""Enquiries alignment and remaining staff/student fixes (auth-branch catch-up)

Revision ID: 009
Revises: 008
Create Date: 2026-05-23

Operations already covered by 003_extended_schema / 007_schema_parity are omitted here
to keep a single linear chain without duplicate DDL.
"""
from alembic import op
import sqlalchemy as sa

revision = "009"
down_revision = "008"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # ── staff ─────────────────────────────────────────────────────────────────
    op.execute(sa.text("UPDATE staff SET emp_code = 'EMP-' || LEFT(id, 8) WHERE emp_code IS NULL OR emp_code = ''"))
    op.execute(sa.text("UPDATE staff SET gender = 'male' WHERE gender IS NULL"))
    op.alter_column("staff", "emp_code", nullable=False)
    op.drop_column("staff", "designation")
    op.drop_column("staff", "qualification")

    # ── students ──────────────────────────────────────────────────────────────
    op.execute(sa.text("UPDATE students SET student_type = 'new' WHERE student_type IS NULL"))
    op.execute(sa.text("UPDATE students SET admission_type = 'regular' WHERE admission_type IS NULL"))

    # ── enquiries ─────────────────────────────────────────────────────────────
    op.add_column("enquiries", sa.Column("mobile", sa.String(20), nullable=True))
    op.add_column("enquiries", sa.Column("dob", sa.Date(), nullable=True))
    op.add_column("enquiries", sa.Column("class_section_id", sa.String(36), nullable=True))
    op.add_column(
        "enquiries",
        sa.Column("purpose", sa.String(30), nullable=False, server_default="new_admission"),
    )
    op.add_column("enquiries", sa.Column("date", sa.Date(), nullable=True))
    op.create_foreign_key(
        "fk_enquiries_class_section_id",
        "enquiries",
        "class_sections",
        ["class_section_id"],
        ["id"],
    )
    op.execute(
        sa.text(
            """
            UPDATE enquiries SET
                mobile = COALESCE(phone, '0000000000'),
                parent_name = COALESCE(parent_name, 'Unknown'),
                date = COALESCE(date, created_at::date),
                status = CASE WHEN status = 'new' THEN 'open' ELSE status END
            """
        )
    )
    op.alter_column("enquiries", "mobile", nullable=False)
    op.alter_column("enquiries", "parent_name", nullable=False)
    op.alter_column("enquiries", "date", nullable=False)
    op.drop_column("enquiries", "phone")
    op.drop_column("enquiries", "email")
    op.drop_column("enquiries", "class_seeking")
    op.drop_column("enquiries", "source")

    # ── parent_guardians ──────────────────────────────────────────────────────
    op.alter_column("parent_guardians", "phone", new_column_name="mobile")
    op.drop_column("parent_guardians", "is_primary")

    # ── registrations ─────────────────────────────────────────────────────────
    op.execute(
        sa.text(
            """
            UPDATE registrations r SET academic_year_id = ay.id
            FROM (
                SELECT DISTINCT ON (school_id) id, school_id
                FROM academic_years
                ORDER BY school_id, is_active DESC, created_at DESC
            ) ay
            WHERE r.academic_year_id IS NULL AND r.school_id = ay.school_id
            """
        )
    )


def downgrade() -> None:
    op.add_column("parent_guardians", sa.Column("is_primary", sa.Boolean(), server_default="false"))
    op.alter_column("parent_guardians", "mobile", new_column_name="phone")

    op.add_column("enquiries", sa.Column("source", sa.String(50), nullable=True))
    op.add_column("enquiries", sa.Column("class_seeking", sa.String(50), nullable=True))
    op.add_column("enquiries", sa.Column("email", sa.String(255), nullable=True))
    op.add_column("enquiries", sa.Column("phone", sa.String(20), nullable=True))
    op.execute(sa.text("UPDATE enquiries SET phone = mobile"))
    op.drop_constraint("fk_enquiries_class_section_id", "enquiries", type_="foreignkey")
    op.drop_column("enquiries", "date")
    op.drop_column("enquiries", "purpose")
    op.drop_column("enquiries", "class_section_id")
    op.drop_column("enquiries", "dob")
    op.drop_column("enquiries", "mobile")

    op.add_column("staff", sa.Column("qualification", sa.String(255), nullable=True))
    op.add_column("staff", sa.Column("designation", sa.String(100), nullable=True))
    op.alter_column("staff", "emp_code", nullable=True)
