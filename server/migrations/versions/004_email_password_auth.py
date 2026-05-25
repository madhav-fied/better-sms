"""Email and password authentication; seed superadmin accounts.

Revision ID: 006
Revises: 005
Create Date: 2026-05-23
"""
import uuid
from datetime import datetime, timezone

from alembic import op
import sqlalchemy as sa

revision = "006"
down_revision = "005"
branch_labels = None
depends_on = None

# bcrypt hash for password "Welcome1"
DEFAULT_PASSWORD_HASH = "$2b$12$nGwPJy69R1WSvqMWUlZiX.pPgLQqVyJt0DKXM71ku5V0JkxFDJZHW"

# Superadmin accounts — phones stored normalized (+91 prefix) to match login lookup
SUPERADMINS = [
    {"phone": "+918871352717", "email": "iamashutoshpanda@gmail.com"},
    {"phone": "+919498076092", "email": "iamashutoshpanda2@gmail.com"},
]


def upgrade() -> None:
    op.add_column("school_users", sa.Column("email", sa.String(255), nullable=True))
    op.add_column("school_users", sa.Column("password_hash", sa.String(255), nullable=True))
    op.create_index("ix_school_users_email", "school_users", ["email"], unique=False)

    # Kept for migration chain integrity — dropped in 016_auth_cleanup
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
    now = datetime.now(timezone.utc)

    for sa_user in SUPERADMINS:
        exists = conn.execute(
            sa.text("SELECT 1 FROM school_users WHERE phone = :phone AND school_id IS NULL"),
            {"phone": sa_user["phone"]},
        ).fetchone()
        if not exists:
            conn.execute(
                sa.text(
                    """
                    INSERT INTO school_users (id, school_id, role, phone, email, password_hash, is_active, created_at)
                    VALUES (:id, NULL, 'superadmin', :phone, :email, :password_hash, true, :created_at)
                    """
                ),
                {
                    "id": str(uuid.uuid4()),
                    "phone": sa_user["phone"],
                    "email": sa_user["email"],
                    "password_hash": DEFAULT_PASSWORD_HASH,
                    "created_at": now,
                },
            )


def downgrade() -> None:
    op.drop_table("password_reset_tokens")
    op.drop_index("ix_school_users_email", table_name="school_users")
    op.drop_column("school_users", "password_hash")
    op.drop_column("school_users", "email")
