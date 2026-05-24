"""Schema parity: rename columns, add missing columns, rename syllabus table

Fixes discrepancies between SQLAlchemy models and the DB:
- staff: phone->mobile, address->permanent_address, add aadhar_no, drop experience_years/join_date
- timetables: entries->slots
- syllabus table renamed to syllabuses
- exams: add applicable_to, applicable_class_section_ids, scheduled_at, completed_at
- exam_schedule_entries: add results_published
- teacher_subjects: add academic_year_id

Revision ID: 007
Revises: 006
Create Date: 2026-05-17 00:00:00.000000
"""
from alembic import op
import sqlalchemy as sa

revision = "007"
down_revision = "006"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # ── staff ─────────────────────────────────────────────────────────────────
    op.alter_column("staff", "phone", new_column_name="mobile", existing_type=sa.String(20), existing_nullable=True)
    op.alter_column("staff", "address", new_column_name="permanent_address", existing_type=sa.Text(), existing_nullable=True)
    op.add_column("staff", sa.Column("aadhar_no", sa.String(20), nullable=True))
    op.drop_column("staff", "experience_years")
    op.drop_column("staff", "join_date")

    # ── timetables ────────────────────────────────────────────────────────────
    op.alter_column("timetables", "entries", new_column_name="slots", existing_type=sa.JSON(), existing_nullable=True)

    # ── syllabus -> syllabuses ────────────────────────────────────────────────
    op.rename_table("syllabus", "syllabuses")

    # ── exams ─────────────────────────────────────────────────────────────────
    op.add_column("exams", sa.Column("applicable_to", sa.String(30), nullable=False, server_default="all_classes"))
    op.add_column("exams", sa.Column("applicable_class_section_ids", sa.JSON(), nullable=True))
    op.add_column("exams", sa.Column("scheduled_at", sa.DateTime(timezone=True), nullable=True))
    op.add_column("exams", sa.Column("completed_at", sa.DateTime(timezone=True), nullable=True))
    op.alter_column("exams", "display_order", existing_type=sa.Integer(), nullable=False, server_default="0")

    # ── exam_schedule_entries ─────────────────────────────────────────────────
    op.add_column(
        "exam_schedule_entries",
        sa.Column("results_published", sa.Boolean(), nullable=False, server_default="false"),
    )

    # ── teacher_subjects ──────────────────────────────────────────────────────
    op.add_column("teacher_subjects", sa.Column("academic_year_id", sa.String(36), nullable=True))
    op.create_foreign_key(
        "fk_teacher_subjects_academic_year",
        "teacher_subjects", "academic_years",
        ["academic_year_id"], ["id"],
    )


def downgrade() -> None:
    op.drop_constraint("fk_teacher_subjects_academic_year", "teacher_subjects", type_="foreignkey")
    op.drop_column("teacher_subjects", "academic_year_id")

    op.drop_column("exam_schedule_entries", "results_published")

    op.alter_column("exams", "display_order", existing_type=sa.Integer(), nullable=True, server_default=None)
    op.drop_column("exams", "completed_at")
    op.drop_column("exams", "scheduled_at")
    op.drop_column("exams", "applicable_class_section_ids")
    op.drop_column("exams", "applicable_to")

    op.rename_table("syllabuses", "syllabus")

    op.alter_column("timetables", "slots", new_column_name="entries", existing_type=sa.JSON(), existing_nullable=True)

    op.drop_column("staff", "aadhar_no")
    op.add_column("staff", sa.Column("join_date", sa.Date(), nullable=True))
    op.add_column("staff", sa.Column("experience_years", sa.Integer(), nullable=True))
    op.alter_column("staff", "permanent_address", new_column_name="address", existing_type=sa.Text(), existing_nullable=True)
    op.alter_column("staff", "mobile", new_column_name="phone", existing_type=sa.String(20), existing_nullable=True)
