"""Parent entity: parents table, student_id/parent_id on parent_guardians

Revision ID: 008
Revises: 007
Create Date: 2026-05-17 00:00:00.000000
"""
from alembic import op
import sqlalchemy as sa

revision = "008"
down_revision = "007"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # ── parents table ─────────────────────────────────────────────────────────
    op.create_table(
        "parents",
        sa.Column("id", sa.String(36), nullable=False),
        sa.Column("school_id", sa.String(36), nullable=False),
        sa.Column("name", sa.String(255), nullable=False),
        sa.Column("phone", sa.String(20), nullable=True),
        sa.Column("email", sa.String(255), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["school_id"], ["schools.id"]),
        sa.PrimaryKeyConstraint("id"),
    )

    # ── parent_guardians: link to student + parent entity ─────────────────────
    op.add_column("parent_guardians", sa.Column("student_id", sa.String(36), nullable=True))
    op.add_column("parent_guardians", sa.Column("parent_id", sa.String(36), nullable=True))
    op.create_foreign_key("fk_pg_student", "parent_guardians", "students", ["student_id"], ["id"])
    op.create_foreign_key("fk_pg_parent", "parent_guardians", "parents", ["parent_id"], ["id"])
    op.alter_column("parent_guardians", "registration_id", existing_type=sa.String(36), nullable=True)

    # Backfill student_id for rows created through the admission flow
    op.execute(
        "UPDATE parent_guardians pg "
        "SET student_id = s.id "
        "FROM students s "
        "WHERE s.registration_id = pg.registration_id "
        "AND pg.student_id IS NULL"
    )


def downgrade() -> None:
    op.alter_column("parent_guardians", "registration_id", existing_type=sa.String(36), nullable=False)
    op.drop_constraint("fk_pg_parent", "parent_guardians", type_="foreignkey")
    op.drop_constraint("fk_pg_student", "parent_guardians", type_="foreignkey")
    op.drop_column("parent_guardians", "parent_id")
    op.drop_column("parent_guardians", "student_id")
    op.drop_table("parents")
