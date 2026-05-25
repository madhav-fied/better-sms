"""Add school_code to schools and student_uid to students.

Revision ID: 015
Revises: 014
"""
from alembic import op
import sqlalchemy as sa

from migrations.ddl import add_column, create_unique_constraint

revision = "015"
down_revision = "014"
branch_labels = None
depends_on = None


def upgrade() -> None:
    add_column("schools", sa.Column("school_code", sa.Integer(), nullable=True))
    op.execute(sa.text(
        """
        UPDATE schools s
        SET school_code = sub.rn
        FROM (
            SELECT id, ROW_NUMBER() OVER (ORDER BY created_at) AS rn
            FROM schools
        ) sub
        WHERE s.id = sub.id
        """
    ))
    op.alter_column("schools", "school_code", nullable=False)
    create_unique_constraint("uq_schools_school_code", "schools", ["school_code"])

    add_column("students", sa.Column("student_uid", sa.Integer(), nullable=True))
    op.execute(sa.text(
        """
        UPDATE students s
        SET student_uid = sub.rn
        FROM (
            SELECT id, ROW_NUMBER() OVER (ORDER BY created_at) AS rn
            FROM students
        ) sub
        WHERE s.id = sub.id
        """
    ))
    op.alter_column("students", "student_uid", nullable=False)
    create_unique_constraint("uq_students_student_uid", "students", ["student_uid"])


def downgrade() -> None:
    op.drop_constraint("uq_students_student_uid", "students", type_="unique")
    op.drop_column("students", "student_uid")
    op.drop_constraint("uq_schools_school_code", "schools", type_="unique")
    op.drop_column("schools", "school_code")
