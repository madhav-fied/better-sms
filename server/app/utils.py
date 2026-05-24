def format_school_code(code: int) -> str:
    return f"SCH{code:03d}"


def format_student_uid(uid: int) -> str:
    return f"STU{uid:05d}"


def format_full_student_uid(school_code: int, student_uid: int) -> str:
    return f"SCH{school_code:03d}-STU{student_uid:05d}"


def normalize_phone(phone: str) -> str:
    """Normalize an Indian phone number to +91XXXXXXXXXX format."""
    p = phone.strip()
    if p.startswith('+'):
        return p
    if p.startswith('91') and len(p) == 12:
        return '+' + p
    if len(p) == 10 and p.isdigit():
        return '+91' + p
    return p
