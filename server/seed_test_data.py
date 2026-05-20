"""
Seed script: creates or clears 10 test students + 10 test staff for a given school.

Usage:
    python seed_test_data.py                      # uses first active school
    python seed_test_data.py <school_id>          # targets a specific school
    python seed_test_data.py --list-schools       # print available schools
    python seed_test_data.py --clear              # delete all seeded test data
    python seed_test_data.py --clear <school_id>  # clear for a specific school

Each student gets a parent guardian with a unique phone number.
Each staff member gets a unique mobile number.
Both are provisioned as SchoolUser entries so they can log in via OTP.

Phone ranges (safe, non-overlapping with real users):
  Students' parents : +91910000001 – +91910000010
  Staff             : +91920000001 – +91920000010

Re-running is safe: existing phones are skipped.
--clear is also safe to run multiple times.
"""

import asyncio
import sys
import uuid
from datetime import date, datetime

from sqlalchemy import select, func, text
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession

# Bootstrap app config & models
import os, pathlib
sys.path.insert(0, str(pathlib.Path(__file__).parent))

from app.config import settings
from app.database import Base
from app.models.auth import SchoolUser, UserRole
from app.models.core import AcademicYear
from app.models.staff import Staff, StaffJobDetail
from app.models.student import Student
from app.models.admission import ParentGuardian
from app.models.parent import Parent

# ── Data fixtures ─────────────────────────────────────────────────────────────

STUDENTS = [
    {"first_name": "Aarav",   "last_name": "Sharma",   "gender": "male",   "dob": date(2012, 3, 14), "blood_group": "A+"},
    {"first_name": "Diya",    "last_name": "Patel",    "gender": "female", "dob": date(2013, 7,  2), "blood_group": "B+"},
    {"first_name": "Rohan",   "last_name": "Mehta",    "gender": "male",   "dob": date(2011, 11, 20), "blood_group": "O+"},
    {"first_name": "Ananya",  "last_name": "Singh",    "gender": "female", "dob": date(2012, 5,  8), "blood_group": "AB+"},
    {"first_name": "Karan",   "last_name": "Verma",    "gender": "male",   "dob": date(2013, 1, 30), "blood_group": "A-"},
    {"first_name": "Priya",   "last_name": "Nair",     "gender": "female", "dob": date(2011, 9, 15), "blood_group": "B-"},
    {"first_name": "Arjun",   "last_name": "Gupta",    "gender": "male",   "dob": date(2012, 6, 22), "blood_group": "O-"},
    {"first_name": "Sneha",   "last_name": "Joshi",    "gender": "female", "dob": date(2013, 4, 11), "blood_group": "A+"},
    {"first_name": "Vivaan",  "last_name": "Reddy",    "gender": "male",   "dob": date(2011, 8,  5), "blood_group": "B+"},
    {"first_name": "Ishita",  "last_name": "Pillai",   "gender": "female", "dob": date(2012, 12, 27), "blood_group": "O+"},
]

PARENT_PHONES = [f"+9191000000{i}" for i in range(1, 11)]

STAFF = [
    {"first_name": "Sunita",   "last_name": "Kumar",    "gender": "female", "category": "teacher",     "designation": "Science Teacher",  "dob": date(1985, 4,  10)},
    {"first_name": "Rajesh",   "last_name": "Tiwari",   "gender": "male",   "category": "teacher",     "designation": "Math Teacher",     "dob": date(1980, 8,  22)},
    {"first_name": "Meera",    "last_name": "Iyer",     "gender": "female", "category": "teacher",     "designation": "English Teacher",  "dob": date(1990, 2,  14)},
    {"first_name": "Prakash",  "last_name": "Bose",     "gender": "male",   "category": "teacher",     "designation": "History Teacher",  "dob": date(1983, 6,  30)},
    {"first_name": "Kavitha",  "last_name": "Rao",      "gender": "female", "category": "teacher",     "designation": "Hindi Teacher",    "dob": date(1987, 11,  5)},
    {"first_name": "Deepak",   "last_name": "Malhotra", "gender": "male",   "category": "accounts",    "designation": "Accountant",       "dob": date(1979, 9,  18)},
    {"first_name": "Lakshmi",  "last_name": "Pillai",   "gender": "female", "category": "receptionist","designation": "Front Desk",       "dob": date(1992, 3,  27)},
    {"first_name": "Suresh",   "last_name": "Patil",    "gender": "male",   "category": "peon",        "designation": "Office Assistant", "dob": date(1975, 7,   9)},
    {"first_name": "Anita",    "last_name": "Desai",    "gender": "female", "category": "clerk",       "designation": "Admin Clerk",      "dob": date(1988, 1,  16)},
    {"first_name": "Vikram",   "last_name": "Menon",    "gender": "male",   "category": "teacher",     "designation": "PE Teacher",       "dob": date(1986, 5,  23)},
]

STAFF_PHONES = [f"+9192000000{i}" for i in range(1, 11)]

# ── Helpers ───────────────────────────────────────────────────────────────────

async def get_school_id(db: AsyncSession, arg: str | None) -> str:
    from app.models.core import School
    if arg:
        res = await db.execute(select(School).where(School.id == arg))
        school = res.scalar_one_or_none()
        if not school:
            raise SystemExit(f"School {arg!r} not found.")
        return school.id
    res = await db.execute(select(School).where(School.is_active == True).limit(1))
    school = res.scalar_one_or_none()
    if not school:
        raise SystemExit("No active school found. Create one first.")
    print(f"Using school: {school.name!r}  (id={school.id})")
    return school.id


async def list_schools(db: AsyncSession) -> None:
    from app.models.core import School
    res = await db.execute(select(School).order_by(School.created_at))
    for s in res.scalars().all():
        print(f"  {s.id}  {s.name!r}  active={s.is_active}")


async def phone_taken(db: AsyncSession, phone: str) -> bool:
    res = await db.execute(select(SchoolUser).where(SchoolUser.phone == phone))
    return res.scalar_one_or_none() is not None


async def next_admission_no(db: AsyncSession, school_id: str, ay_year: int, ay_id: str | None) -> str:
    if ay_id:
        q = select(func.count()).select_from(Student).where(
            Student.school_id == school_id,
            Student.academic_year_id == ay_id,
        )
    else:
        q = select(func.count()).select_from(Student).where(Student.school_id == school_id)
    seq = ((await db.execute(q)).scalar_one() or 0) + 1
    return f"{ay_year}{seq:04d}"


async def next_emp_code(db: AsyncSession, school_id: str) -> str:
    res = await db.execute(select(func.count()).select_from(Staff).where(Staff.school_id == school_id))
    seq = (res.scalar_one() or 0) + 1
    return f"EMP{seq:04d}"

# ── Main seed ─────────────────────────────────────────────────────────────────

async def seed(school_id_arg: str | None = None) -> None:
    engine = create_async_engine(settings.database_url, echo=False)
    Session = async_sessionmaker(engine, expire_on_commit=False, class_=AsyncSession)

    async with Session() as db:
        try:
            if "--list-schools" in sys.argv:
                await list_schools(db)
                return

            school_id = await get_school_id(db, school_id_arg)

            # Resolve active academic year (optional; creation still works without one)
            ay_res = await db.execute(
                select(AcademicYear).where(
                    AcademicYear.school_id == school_id,
                    AcademicYear.is_active == True,
                )
            )
            ay = ay_res.scalar_one_or_none()
            ay_id = ay.id if ay else None
            ay_year = ay.start_date.year if ay else date.today().year
            if ay:
                print(f"Active academic year: {ay.label!r}  (id={ay.id})")
            else:
                print("No active academic year found — students will be created without one.")

            # ── Students ──────────────────────────────────────────────────────
            print("\n── Creating students ──")
            created_students = 0
            for i, s_data in enumerate(STUDENTS):
                parent_phone = PARENT_PHONES[i]
                if await phone_taken(db, parent_phone):
                    print(f"  skip {s_data['first_name']} {s_data['last_name']} (parent phone {parent_phone} already exists)")
                    continue

                admission_no = await next_admission_no(db, school_id, ay_year, ay_id)
                student = Student(
                    id=str(uuid.uuid4()),
                    school_id=school_id,
                    academic_year_id=ay_id,
                    admission_no=admission_no,
                    first_name=s_data["first_name"],
                    last_name=s_data["last_name"],
                    gender=s_data["gender"],
                    dob=s_data["dob"],
                    blood_group=s_data.get("blood_group"),
                    student_type="new",
                    hosteller=False,
                    admission_type="regular",
                    status="active",
                )
                db.add(student)
                await db.flush()

                # Parent guardian + Parent entity + SchoolUser
                parent = Parent(
                    id=str(uuid.uuid4()),
                    school_id=school_id,
                    name=f"{s_data['first_name']} Parent",
                    phone=parent_phone,
                )
                db.add(parent)
                await db.flush()

                pg = ParentGuardian(
                    id=str(uuid.uuid4()),
                    student_id=student.id,
                    parent_id=parent.id,
                    relation="father",
                    first_name=f"{s_data['first_name']}",
                    last_name="Parent",
                    name=f"{s_data['first_name']} Parent",
                    phone=parent_phone,
                    is_primary=True,
                )
                db.add(pg)

                db.add(SchoolUser(
                    school_id=school_id,
                    role=UserRole.parent,
                    phone=parent_phone,
                    entity_id=parent.id,
                ))

                print(f"  ✓  {s_data['first_name']} {s_data['last_name']}  adm={admission_no}  parent={parent_phone}")
                created_students += 1

            # ── Staff ─────────────────────────────────────────────────────────
            print("\n── Creating staff ──")
            created_staff = 0
            for i, st_data in enumerate(STAFF):
                mobile = STAFF_PHONES[i]
                if await phone_taken(db, mobile):
                    print(f"  skip {st_data['first_name']} {st_data['last_name']} (mobile {mobile} already exists)")
                    continue

                emp_code = await next_emp_code(db, school_id)
                full_name = f"{st_data['first_name']} {st_data['last_name']}"
                staff = Staff(
                    id=str(uuid.uuid4()),
                    school_id=school_id,
                    emp_code=emp_code,
                    name=full_name,
                    first_name=st_data["first_name"],
                    last_name=st_data["last_name"],
                    gender=st_data["gender"],
                    category=st_data["category"],
                    designation=st_data.get("designation"),
                    dob=st_data.get("dob"),
                    mobile=mobile,
                    teaching_type="regular" if st_data["category"] == "teacher" else None,
                    status="active",
                )
                db.add(staff)
                await db.flush()

                db.add(StaffJobDetail(
                    id=str(uuid.uuid4()),
                    staff_id=staff.id,
                    joined_date=date(2024, 6, 1),
                    job_type="full_time",
                    job_status="active",
                    position=st_data.get("designation"),
                ))

                db.add(SchoolUser(
                    school_id=school_id,
                    role=UserRole.teacher if st_data["category"] == "teacher" else UserRole.staff,
                    phone=mobile,
                    entity_id=staff.id,
                ))

                print(f"  ✓  {full_name}  emp={emp_code}  mobile={mobile}  role={st_data['category']}")
                created_staff += 1

            await db.commit()
            print(f"\nDone. Created {created_students} student(s) and {created_staff} staff member(s).")

        except Exception:
            await db.rollback()
            raise
        finally:
            await engine.dispose()


ALL_TEST_PHONES = set(PARENT_PHONES + STAFF_PHONES)


async def clear(school_id_arg: str | None = None) -> None:
    engine = create_async_engine(settings.database_url, echo=False)
    Session = async_sessionmaker(engine, expire_on_commit=False, class_=AsyncSession)

    async with Session() as db:
        try:
            school_id = await get_school_id(db, school_id_arg)

            # 1. Find all test SchoolUsers
            su_res = await db.execute(
                select(SchoolUser).where(
                    SchoolUser.school_id == school_id,
                    SchoolUser.phone.in_(ALL_TEST_PHONES),
                )
            )
            school_users = su_res.scalars().all()
            parent_entity_ids = [su.entity_id for su in school_users if su.role == UserRole.parent and su.entity_id]
            staff_entity_ids  = [su.entity_id for su in school_users if su.role in (UserRole.staff, UserRole.teacher) and su.entity_id]

            # 2. Find student_ids via ParentGuardian → parent_id
            student_ids: list[str] = []
            if parent_entity_ids:
                pg_res = await db.execute(
                    select(ParentGuardian).where(ParentGuardian.parent_id.in_(parent_entity_ids))
                )
                pgs = pg_res.scalars().all()
                student_ids = [pg.student_id for pg in pgs if pg.student_id]
                for pg in pgs:
                    await db.delete(pg)

            # 3. Delete Students
            if student_ids:
                st_res = await db.execute(select(Student).where(Student.id.in_(student_ids)))
                for s in st_res.scalars().all():
                    print(f"  ✓  student  {s.first_name} {s.last_name}  adm={s.admission_no}")
                    await db.delete(s)

            # 4. Delete Parent entities
            if parent_entity_ids:
                p_res = await db.execute(select(Parent).where(Parent.id.in_(parent_entity_ids)))
                for p in p_res.scalars().all():
                    await db.delete(p)

            # 5. Delete StaffJobDetails then Staff
            if staff_entity_ids:
                jd_res = await db.execute(
                    select(StaffJobDetail).where(StaffJobDetail.staff_id.in_(staff_entity_ids))
                )
                for jd in jd_res.scalars().all():
                    await db.delete(jd)
                await db.flush()

                sf_res = await db.execute(select(Staff).where(Staff.id.in_(staff_entity_ids)))
                for s in sf_res.scalars().all():
                    print(f"  ✓  staff    {s.name}  emp={s.emp_code}")
                    await db.delete(s)

            # 6. Delete SchoolUsers last (no FK deps remaining)
            for su in school_users:
                await db.delete(su)

            await db.commit()
            print(f"\nCleared {len(student_ids)} student(s) and {len(staff_entity_ids)} staff member(s).")

        except Exception:
            await db.rollback()
            raise
        finally:
            await engine.dispose()


if __name__ == "__main__":
    flags = {a for a in sys.argv[1:] if a.startswith("--")}
    args  = [a for a in sys.argv[1:] if not a.startswith("--")]
    school_id_arg = args[0] if args else None

    if "--list-schools" in flags:
        asyncio.run(seed(None))  # seed() handles --list-schools internally
    elif "--clear" in flags:
        asyncio.run(clear(school_id_arg))
    else:
        asyncio.run(seed(school_id_arg))
