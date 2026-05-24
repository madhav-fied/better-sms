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

from migrations.ddl import (
    add_column,
    column_exists,
    create_foreign_key,
    drop_column,
    rename_column,
    rename_table,
)

revision = "007"
down_revision = "006"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # ── staff ─────────────────────────────────────────────────────────────────
    rename_column(
        "staff", "phone", "mobile",
        existing_type=sa.String(20), existing_nullable=True,
    )
    rename_column(
        "staff", "address", "permanent_address",
        existing_type=sa.Text(), existing_nullable=True,
    )
    add_column("staff", sa.Column("aadhar_no", sa.String(20), nullable=True))
    drop_column("staff", "experience_years")
    drop_column("staff", "join_date")

    # ── timetables ────────────────────────────────────────────────────────────
    rename_column(
        "timetables", "entries", "slots",
        existing_type=sa.JSON(), existing_nullable=True,
    )

    # ── syllabus -> syllabuses ────────────────────────────────────────────────
    rename_table("syllabus", "syllabuses")

    # ── exams ─────────────────────────────────────────────────────────────────
    add_column(
        "exams",
        sa.Column("applicable_to", sa.String(30), nullable=False, server_default="all_classes"),
    )
    add_column("exams", sa.Column("applicable_class_section_ids", sa.JSON(), nullable=True))
    add_column("exams", sa.Column("scheduled_at", sa.DateTime(timezone=True), nullable=True))
    add_column("exams", sa.Column("completed_at", sa.DateTime(timezone=True), nullable=True))
    if column_exists("exams", "display_order"):
        op.alter_column(
            "exams", "display_order",
            existing_type=sa.Integer(), nullable=False, server_default="0",
        )

    # ── exam_schedule_entries ─────────────────────────────────────────────────
    add_column(
        "exam_schedule_entries",
        sa.Column("results_published", sa.Boolean(), nullable=False, server_default="false"),
    )

    # ── teacher_subjects ──────────────────────────────────────────────────────
    add_column("teacher_subjects", sa.Column("academic_year_id", sa.String(36), nullable=True))
    create_foreign_key(
        "fk_teacher_subjects_academic_year",
        "teacher_subjects", "academic_years",
        ["academic_year_id"], ["id"],
    )


def downgrade() -> None:
    from migrations.ddl import constraint_exists

    if constraint_exists("teacher_subjects", "fk_teacher_subjects_academic_year"):
        op.drop_constraint("fk_teacher_subjects_academic_year", "teacher_subjects", type_="foreignkey")
    drop_column("teacher_subjects", "academic_year_id")

    drop_column("exam_schedule_entries", "results_published")

    if column_exists("exams", "display_order"):
        op.alter_column(
            "exams", "display_order",
            existing_type=sa.Integer(), nullable=True, server_default=None,
        )
    drop_column("exams", "completed_at")
    drop_column("exams", "scheduled_at")
    drop_column("exams", "applicable_class_section_ids")
    drop_column("exams", "applicable_to")

    rename_table("syllabuses", "syllabus")

    rename_column(
        "timetables", "slots", "entries",
        existing_type=sa.JSON(), existing_nullable=True,
    )

    drop_column("staff", "aadhar_no")
    add_column("staff", sa.Column("join_date", sa.Date(), nullable=True))
    add_column("staff", sa.Column("experience_years", sa.Integer(), nullable=True))
    rename_column(
        "staff", "permanent_address", "address",
        existing_type=sa.Text(), existing_nullable=True,
    )
    rename_column(
        "staff", "mobile", "phone",
        existing_type=sa.String(20), existing_nullable=True,
    )
