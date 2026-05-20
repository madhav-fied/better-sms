"""Class roster: unique constraint on teacher_subjects(school_id, class_section_id, subject, academic_year_id)

Revision ID: 007
Revises: 006
Create Date: 2026-05-20 00:00:00.000000
"""
from alembic import op
import sqlalchemy as sa

revision = "007"
down_revision = "006"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Deduplicate: keep the row with the smallest id for each unique tuple,
    # delete all others.
    op.execute(
        """
        DELETE FROM teacher_subjects
        WHERE id NOT IN (
            SELECT MIN(id)
            FROM teacher_subjects
            GROUP BY school_id, class_section_id, subject, academic_year_id
        )
        """
    )

    op.create_unique_constraint(
        "uq_teacher_subjects_class_subject_ay",
        "teacher_subjects",
        ["school_id", "class_section_id", "subject", "academic_year_id"],
    )


def downgrade() -> None:
    op.drop_constraint(
        "uq_teacher_subjects_class_subject_ay",
        "teacher_subjects",
        type_="unique",
    )
