"""Align staff, students, enquiries, exams with SQLAlchemy models

Revision ID: 006
Revises: 005
Create Date: 2026-05-23
"""
from alembic import op
import sqlalchemy as sa

revision = "006"
down_revision = "005"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # ── staff ─────────────────────────────────────────────────────────────────
    op.alter_column("staff", "phone", new_column_name="mobile")
    op.add_column("staff", sa.Column("aadhar_no", sa.String(20), nullable=True))
    op.add_column("staff", sa.Column("permanent_address", sa.Text(), nullable=True))
    op.execute(sa.text("UPDATE staff SET permanent_address = address WHERE permanent_address IS NULL"))
    op.execute(sa.text("UPDATE staff SET emp_code = 'EMP-' || LEFT(id, 8) WHERE emp_code IS NULL OR emp_code = ''"))
    op.execute(sa.text("UPDATE staff SET gender = 'male' WHERE gender IS NULL"))
    op.alter_column("staff", "emp_code", nullable=False)
    op.drop_column("staff", "designation")
    op.drop_column("staff", "qualification")
    op.drop_column("staff", "experience_years")
    op.drop_column("staff", "join_date")
    op.drop_column("staff", "address")

    # ── students ──────────────────────────────────────────────────────────────
    op.add_column("students", sa.Column("sms_mobile", sa.String(20), nullable=True))
    op.add_column(
        "students",
        sa.Column("tc_generated", sa.Boolean(), nullable=False, server_default="false"),
    )
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
    op.add_column("parent_guardians", sa.Column("qualification", sa.String(255), nullable=True))
    op.add_column("parent_guardians", sa.Column("aadhar_no", sa.String(20), nullable=True))
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

    # ── teacher_subjects ──────────────────────────────────────────────────────
    op.add_column("teacher_subjects", sa.Column("academic_year_id", sa.String(36), nullable=True))
    op.execute(
        sa.text(
            """
            UPDATE teacher_subjects ts SET academic_year_id = cs.academic_year_id
            FROM class_sections cs WHERE ts.class_section_id = cs.id
            """
        )
    )
    op.create_foreign_key(
        "fk_teacher_subjects_academic_year_id",
        "teacher_subjects",
        "academic_years",
        ["academic_year_id"],
        ["id"],
    )
    op.alter_column("teacher_subjects", "academic_year_id", nullable=False)

    # ── exams ─────────────────────────────────────────────────────────────────
    op.add_column(
        "exams",
        sa.Column("applicable_to", sa.String(30), nullable=False, server_default="all_classes"),
    )
    op.add_column("exams", sa.Column("applicable_class_section_ids", sa.JSON(), nullable=True))
    op.add_column("exams", sa.Column("scheduled_at", sa.DateTime(timezone=True), nullable=True))
    op.add_column("exams", sa.Column("completed_at", sa.DateTime(timezone=True), nullable=True))
    op.execute(sa.text("UPDATE exams SET status = 'draft' WHERE status NOT IN ('draft', 'scheduled', 'completed')"))
    op.add_column(
        "exam_schedule_entries",
        sa.Column("results_published", sa.Boolean(), nullable=False, server_default="false"),
    )


def downgrade() -> None:
    op.drop_column("exam_schedule_entries", "results_published")
    op.drop_column("exams", "completed_at")
    op.drop_column("exams", "scheduled_at")
    op.drop_column("exams", "applicable_class_section_ids")
    op.drop_column("exams", "applicable_to")

    op.drop_constraint("fk_teacher_subjects_academic_year_id", "teacher_subjects", type_="foreignkey")
    op.drop_column("teacher_subjects", "academic_year_id")

    op.add_column("parent_guardians", sa.Column("is_primary", sa.Boolean(), server_default="false"))
    op.drop_column("parent_guardians", "aadhar_no")
    op.drop_column("parent_guardians", "qualification")
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

    op.drop_column("students", "tc_generated")
    op.drop_column("students", "sms_mobile")

    op.add_column("staff", sa.Column("address", sa.Text(), nullable=True))
    op.add_column("staff", sa.Column("join_date", sa.Date(), nullable=True))
    op.add_column("staff", sa.Column("experience_years", sa.Integer(), nullable=True))
    op.add_column("staff", sa.Column("qualification", sa.String(255), nullable=True))
    op.add_column("staff", sa.Column("designation", sa.String(100), nullable=True))
    op.execute(sa.text("UPDATE staff SET address = permanent_address"))
    op.drop_column("staff", "permanent_address")
    op.drop_column("staff", "aadhar_no")
    op.alter_column("staff", "mobile", new_column_name="phone")
    op.alter_column("staff", "emp_code", nullable=True)
