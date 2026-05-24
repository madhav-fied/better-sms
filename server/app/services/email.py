import logging
import smtplib
from email.message import EmailMessage

from app.config import settings

logger = logging.getLogger(__name__)


def send_email(to: str, subject: str, body_text: str, body_html: str | None = None) -> None:
    if settings.email_dev_mode:
        logger.warning("DEV EMAIL to=%s subject=%s\n%s", to, subject, body_text)
        return

    if not settings.smtp_host or not settings.smtp_user:
        logger.error("SMTP not configured; email not sent to %s", to)
        return

    msg = EmailMessage()
    msg["Subject"] = subject
    msg["From"] = settings.smtp_from or settings.smtp_user
    msg["To"] = to
    msg.set_content(body_text)
    if body_html:
        msg.add_alternative(body_html, subtype="html")

    with smtplib.SMTP(settings.smtp_host, settings.smtp_port) as server:
        if settings.smtp_use_tls:
            server.starttls()
        if settings.smtp_password:
            server.login(settings.smtp_user, settings.smtp_password)
        server.send_message(msg)


def send_password_reset_email(to: str, reset_url: str) -> None:
    subject = "Reset your Edulink password"
    text = (
        "You requested a password reset.\n\n"
        f"Open this link to set a new password (valid for {settings.password_reset_ttl_hours} hours):\n"
        f"{reset_url}\n\n"
        "If you did not request this, you can ignore this email."
    )
    html = (
        f"<p>You requested a password reset.</p>"
        f'<p><a href="{reset_url}">Reset your password</a></p>'
        f"<p>This link expires in {settings.password_reset_ttl_hours} hours.</p>"
        f"<p>If you did not request this, ignore this email.</p>"
    )
    send_email(to, subject, text, html)
