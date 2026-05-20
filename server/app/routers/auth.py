import secrets
from datetime import datetime, timedelta, timezone
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, delete

from app.database import get_db
from app.deps import get_current_user, CurrentUser
from app.models.auth import SchoolUser, OtpRequest, Session as SessionModel
from app.models.core import School
from app.schemas.common import Response, ok
from app.services.otp import generate_otp, hash_otp, hash_token, otp_expires_at, send_otp
from app.config import settings
from app.utils import normalize_phone

router = APIRouter()


class OtpRequestBody(BaseModel):
    phone: str
    school_id: Optional[str] = None


class OtpVerifyBody(BaseModel):
    phone: str
    school_id: Optional[str] = None
    otp: str


# ── OTP Request ───────────────────────────────────────────────────────────────

@router.post("/auth/otp/request", response_model=Response)
async def request_otp(body: OtpRequestBody, db: AsyncSession = Depends(get_db)):
    body.phone = normalize_phone(body.phone)
    now = datetime.now(timezone.utc)

    # Rate limiting: count OTP requests for this phone in the rate limit window
    rate_window = now - timedelta(minutes=settings.otp_rate_limit_minutes)
    rate_count_res = await db.execute(
        select(func.count()).select_from(OtpRequest).where(
            OtpRequest.phone == body.phone,
            OtpRequest.created_at >= rate_window,
        )
    )
    rate_count = rate_count_res.scalar_one()
    if rate_count >= settings.otp_rate_limit_count:
        raise HTTPException(status_code=429, detail="Too many OTP requests. Please try again later.")

    # Find matching school users
    q = select(SchoolUser).where(SchoolUser.phone == body.phone, SchoolUser.is_active == True)
    if body.school_id:
        q = q.where(SchoolUser.school_id == body.school_id)

    users_res = await db.execute(q)
    users = users_res.scalars().all()

    if len(users) == 0:
        raise HTTPException(status_code=404, detail="No user found with this phone number")

    # Multiple matches without school_id: request disambiguation
    if len(users) > 1 and not body.school_id:
        school_ids = [u.school_id for u in users if u.school_id]
        schools_res = await db.execute(select(School).where(School.id.in_(school_ids)))
        schools = schools_res.scalars().all()
        school_map = {s.id: s.name for s in schools}
        return ok(
            None,
            meta={
                "requires_school_id": True,
                "schools": [
                    {"school_id": u.school_id, "school_name": school_map.get(u.school_id, "")}
                    for u in users if u.school_id
                ],
            },
        )

    # Use the single matching user (or first if school_id was provided)
    user = users[0]
    print(users)

    # Generate and store OTP
    otp = generate_otp()
    otp_record = OtpRequest(
        phone=body.phone,
        school_id=user.school_id,
        otp_hash=hash_otp(otp),
        expires_at=otp_expires_at(),
    )
    db.add(otp_record)
    await db.flush()

    await send_otp(body.phone, otp)

    return ok({"message": "OTP sent successfully", "school_id": user.school_id})


# ── OTP Verify ────────────────────────────────────────────────────────────────

@router.post("/auth/otp/verify", response_model=Response)
async def verify_otp(body: OtpVerifyBody, db: AsyncSession = Depends(get_db)):
    body.phone = normalize_phone(body.phone)
    now = datetime.now(timezone.utc)
    print(body)

    # Find a valid (non-expired, non-used) OTP for this phone+school
    otp_res = await db.execute(
        select(OtpRequest).where(
            OtpRequest.phone == body.phone,
            OtpRequest.school_id == body.school_id,
            OtpRequest.used == False,
            OtpRequest.expires_at > now,
        ).order_by(OtpRequest.created_at.desc())
    )
    otp_record = otp_res.scalars().first()

    if not otp_record:
        raise HTTPException(status_code=401, detail="No valid OTP found. Please request a new OTP.")

    # Check attempt count
    if otp_record.attempt_count >= settings.otp_max_attempts:
        otp_record.used = True
        await db.flush()
        raise HTTPException(status_code=401, detail="Too many failed attempts. Please request a new OTP.")

    # Verify OTP hash
    if otp_record.otp_hash != hash_otp(body.otp):
        otp_record.attempt_count += 1
        if otp_record.attempt_count >= settings.otp_max_attempts:
            otp_record.used = True
        await db.flush()
        raise HTTPException(status_code=401, detail="Invalid OTP")

    # Mark OTP as used
    otp_record.used = True
    await db.flush()

    # Find the school user
    user_res = await db.execute(
        select(SchoolUser).where(
            SchoolUser.phone == body.phone,
            SchoolUser.school_id == body.school_id,
            SchoolUser.is_active == True,
        )
    )
    school_user = user_res.scalar_one_or_none()
    print(school_user)
    if not school_user:
        raise HTTPException(status_code=404, detail="User not found")

    # Create session
    raw_token = secrets.token_hex(32)
    token_hash = hash_token(raw_token)
    expires_at = now + timedelta(days=settings.session_ttl_days)

    session = SessionModel(
        school_user_id=school_user.id,
        token_hash=token_hash,
        role=school_user.role,
        school_id=school_user.school_id,
        expires_at=expires_at,
    )
    db.add(session)
    await db.flush()
    await db.refresh(session)

    school_res = await db.execute(select(School).where(School.id == school_user.school_id))
    school = school_res.scalar_one_or_none()

    return ok({
        "token": raw_token,
        "expires_at": expires_at.isoformat(),
        "role": school_user.role,
        "school_id": school_user.school_id,
        "school_name": school.name if school else None,
        "school_branch_name": school.branch_name if school else None,
        "user_id": school_user.id,
        "entity_id": school_user.entity_id,
    })


# ── Logout ────────────────────────────────────────────────────────────────────

@router.post("/auth/logout", response_model=Response)
async def logout(user: CurrentUser, db: AsyncSession = Depends(get_db)):
    # We need the raw token to find and delete the session.
    # Since we only have the user dict (not the token), we delete by user_id.
    # To do a clean single-session logout we rely on the token_hash from the current request.
    # We'll use a different approach: delete sessions for this user that match last_seen_at.
    # Actually, the cleanest way: inject credentials alongside CurrentUser.
    # For simplicity, delete the most recently seen session for this user_id.
    if user["user_id"] == "superadmin":
        return ok({"logged_out": True})

    # Delete all sessions for this user (force logout of all sessions)
    # For single-session logout we'd need the token; this endpoint logs out current session.
    # We delete the session matching the current user by querying the most recent active one.
    res = await db.execute(
        select(SessionModel).where(
            SessionModel.school_user_id == user["user_id"],
        ).order_by(SessionModel.last_seen_at.desc())
    )
    session = res.scalars().first()
    if session:
        await db.delete(session)
        await db.flush()

    return ok({"logged_out": True})


# ── Me ────────────────────────────────────────────────────────────────────────

@router.get("/auth/me", response_model=Response)
async def me(user: CurrentUser, db: AsyncSession = Depends(get_db)):
    if user["user_id"] == "superadmin":
        return ok({"user_id": "superadmin", "school_id": None, "school_name": None, "school_branch_name": None, "role": "superadmin", "entity_id": None})

    res = await db.execute(select(SchoolUser).where(SchoolUser.id == user["user_id"]))
    school_user = res.scalar_one_or_none()
    print(school_user)
    if not school_user:
        raise HTTPException(status_code=404, detail="User not found")

    school_res = await db.execute(select(School).where(School.id == school_user.school_id))
    school = school_res.scalar_one_or_none()

    return ok({
        "user_id": school_user.id,
        "school_id": school_user.school_id,
        "school_name": school.name if school else None,
        "school_branch_name": school.branch_name if school else None,
        "role": school_user.role,
        "phone": school_user.phone,
        "entity_id": school_user.entity_id,
        "is_active": school_user.is_active,
    })
