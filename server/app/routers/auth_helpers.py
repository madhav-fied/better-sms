from typing import Optional


def resolve_school_id(school_id: Optional[str]) -> Optional[str]:
    if school_id is None or school_id == "":
        return None
    return school_id


def school_id_filter(column, school_id: Optional[str]):
    if school_id is None:
        return column.is_(None)
    return column == school_id


def login_option_label(role: str, school_name: str) -> str:
    if role == "superadmin":
        return "Edulink Platform"
    return school_name or "School"
