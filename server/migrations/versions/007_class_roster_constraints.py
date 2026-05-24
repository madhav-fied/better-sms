"""Class roster: unique constraint on teacher_subjects(school_id, class_section_id, subject, academic_year_id)

Revision ID: 011
Revises: 010
Create Date: 2026-05-20 00:00:00.000000
"""
from alembic import op
import sqlalchemy as sa

from migrations.ddl import create_unique_constraint

revision = "011"
down_revision = "010"
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

    create_unique_constraint(
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
