#!/usr/bin/env python3
"""
Full school onboarding: creates a school + its first admin user in one shot.

Why direct DB instead of API?
  The POST /api/v1/users endpoint scopes new users to the calling user's
  school_id.  Because the superadmin has no school_id, that endpoint cannot
  be used to provision the first admin for a specific school.  This script
  writes directly to the database to work around that constraint.

Usage:
  cd /proj/panda/better-sms/server
  python ../super-admins/scripts/seed_school.py

Environment variables (or set in super-admins/scripts/.env):
  DATABASE_URL   — async PostgreSQL URL (postgresql+asyncpg://...)
"""

import asyncio
import os
import sys
from pathlib import Path

# Load .env from this script's directory
env_file = Path(__file__).parent / ".env"
if env_file.exists():
    for line in env_file.read_text().splitlines():
        line = line.strip()
        if line and not line.startswith("#") and "=" in line:
            k, _, v = line.partition("=")
            os.environ.setdefault(k.strip(), v.strip())

DATABASE_URL = os.environ.get(
    "DATABASE_URL",
    "postgresql+asyncpg://postgres:postgres@localhost:5432/sms",
)

try:
    from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
    from sqlalchemy.orm import sessionmaker
except ImportError:
    print("sqlalchemy not found. Run: pip install sqlalchemy[asyncio] asyncpg")
    sys.exit(1)

# Add server to path so we can import app models
server_dir = Path(__file__).resolve().parents[3] / "server"
sys.path.insert(0, str(server_dir))

try:
    from app.models.core import School
    from app.models.auth import SchoolUser
except ImportError as e:
    print(f"Could not import app models: {e}")
    print("Run this script from the repo root or ensure the server dir is on PYTHONPATH.")
    sys.exit(1)


def prompt(label: str, default: str = "") -> str:
    suffix = f" [{default}]" if default else ""
    value = input(f"{label}{suffix}: ").strip()
    return value or default


async def main() -> None:
    print("=== Seed School — Full Onboarding ===\n")

    # ── School details ────────────────────────────────────────────────────────
    name = prompt("School name")
    if not name:
        print("School name is required.")
        sys.exit(1)

    branch_name = prompt("Branch name (optional)") or None
    address     = prompt("Address (optional)")     or None
    phone       = prompt("Contact phone (optional)") or None
    email       = prompt("Contact email (optional)") or None

    att_mode_input = prompt("Attendance mode", "period")
    attendance_mode = att_mode_input if att_mode_input in ("period",) else "period"

    sat_input    = prompt("Uses Saturday? [y/N]", "n")
    uses_saturday = sat_input.lower() in ("y", "yes")

    # ── Admin user details ────────────────────────────────────────────────────
    print()
    admin_phone = prompt("Admin user phone (they'll use this to log in via OTP)")
    if not admin_phone:
        print("Admin phone is required.")
        sys.exit(1)

    # ── Confirm ───────────────────────────────────────────────────────────────
    print("\n--- Summary ---")
    print(f"  School        : {name}" + (f" — {branch_name}" if branch_name else ""))
    print(f"  Address       : {address or '—'}")
    print(f"  Phone         : {phone or '—'}")
    print(f"  Email         : {email or '—'}")
    print(f"  Att. mode     : {attendance_mode}")
    print(f"  Uses Saturday : {uses_saturday}")
    print(f"  Admin phone   : {admin_phone}")

    confirm = input("\nCreate? [y/N]: ").strip().lower()
    if confirm not in ("y", "yes"):
        print("Aborted.")
        sys.exit(0)

    # ── Write to DB ───────────────────────────────────────────────────────────
    engine = create_async_engine(DATABASE_URL, echo=False)
    async_session = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

    async with async_session() as session:
        async with session.begin():
            school = School(
                name=name,
                branch_name=branch_name,
                address=address,
                phone=phone,
                email=email,
                attendance_mode=attendance_mode,
                uses_saturday=uses_saturday,
            )
            session.add(school)
            await session.flush()
            await session.refresh(school)

            admin_user = SchoolUser(
                school_id=school.id,
                phone=admin_phone,
                role="admin",
            )
            session.add(admin_user)
            await session.flush()
            await session.refresh(admin_user)

    await engine.dispose()

    print("\nDone!")
    print(f"  School ID   : {school.id}")
    print(f"  Admin user  : {admin_user.id}  (phone: {admin_phone})")
    print()
    print("Next steps:")
    print(f"  1. Share the school ID with the admin: {school.id}")
    print(f"  2. They log in at POST /api/v1/auth/otp/request with:")
    print(f"       {{ \"phone\": \"{admin_phone}\", \"school_id\": \"{school.id}\" }}")
    print(f"  3. Then verify the OTP at POST /api/v1/auth/otp/verify")


if __name__ == "__main__":
    asyncio.run(main())
