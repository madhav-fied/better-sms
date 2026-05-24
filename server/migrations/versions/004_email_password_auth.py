"""Email and password authentication

Revision ID: 004
Revises: 003
Create Date: 2026-05-23
"""
from alembic import op
import sqlalchemy as sa

revision = "004"
down_revision = "003"
branch_labels = None
depends_on = None

# bcrypt hash for password "Welcome1"
DEFAULT_PASSWORD_HASH = "$2b$12$nGwPJy69R1WSvqMWUlZiX.pPgLQqVyJt0DKXM71ku5V0JkxFDJZHW"


def upgrade() -> None:
    op.add_column("school_users", sa.Column("email", sa.String(255), nullable=True))
    op.add_column("school_users", sa.Column("password_hash", sa.String(255), nullable=True))
    op.create_index("ix_school_users_email", "school_users", ["email"], unique=False)

    op.create_table(
        "password_reset_tokens",
        sa.Column("id", sa.String(36), nullable=False),
        sa.Column("school_user_id", sa.String(36), nullable=False),
        sa.Column("token_hash", sa.String(64), nullable=False),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("used", sa.Boolean(), nullable=False, server_default="false"),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["school_user_id"], ["school_users.id"]),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("token_hash"),
    )

    conn = op.get_bind()
    conn.execute(
        sa.text(
            """
            UPDATE school_users
            SET email = :email, password_hash = :password_hash
            WHERE phone = '8871352717' AND is_active = true
            """
        ),
        {"email": "iamashutoshpanda@gmail.com", "password_hash": DEFAULT_PASSWORD_HASH},
    )
    conn.execute(
        sa.text(
            """
            UPDATE school_users
            SET email = :email, password_hash = :password_hash
            WHERE phone = '9498076092' AND is_active = true
            """
        ),
        {"email": "iamashutoshpanda2@gmail.com", "password_hash": DEFAULT_PASSWORD_HASH},
    )


def downgrade() -> None:
    op.drop_table("password_reset_tokens")
    op.drop_index("ix_school_users_email", table_name="school_users")
    op.drop_column("school_users", "password_hash")
    op.drop_column("school_users", "email")
