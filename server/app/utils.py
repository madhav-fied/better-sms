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
