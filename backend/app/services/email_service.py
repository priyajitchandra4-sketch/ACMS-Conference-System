import logging
import smtplib
import ssl
from email.message import EmailMessage

from app.core.config import settings

logger = logging.getLogger(__name__)

ROLE_LABELS = {
    "track_chair": "Track Chair",
    "meta_reviewer": "Meta-Reviewer",
    "reviewer": "Reviewer",
    "external_reviewer": "External Reviewer",
}


def send_invitation_email(
    to_email: str,
    invite_link: str,
    role: str,
    conference_title: str | None = None,
    track_name: str | None = None,
    valid_days: int | None = None,
) -> None:
    role_label = ROLE_LABELS.get(role, role.replace("_", " ").title())

    lines = [
        f"You have been invited to join the Academic Conference Management System as a {role_label}."
    ]
    if conference_title:
        lines.append(f"Conference: {conference_title}")
    if track_name:
        lines.append(f"Track: {track_name}")
    lines.extend(["", "Open the link below to accept or decline the invitation:", invite_link])
    if valid_days:
        lines.extend(["", f"This link is valid for {valid_days} days."])

    msg = EmailMessage()
    msg.set_content("\n".join(lines))
    msg["Subject"] = f"ACMS invitation: {role_label}"
    msg["From"] = settings.smtp_from_email
    msg["To"] = to_email

    if settings.smtp_starttls and settings.smtp_use_ssl:
        raise ValueError("Set only one of SMTP_STARTTLS or SMTP_USE_SSL.")

    username = settings.smtp_username
    password = settings.smtp_password
    if bool(username) != bool(password):
        raise ValueError("Both SMTP_USERNAME and SMTP_PASSWORD must be set together.")

    try:
        context = ssl.create_default_context()

        if settings.smtp_use_ssl:
            with smtplib.SMTP_SSL(
                settings.smtp_host,
                settings.smtp_port,
                timeout=15,
                context=context,
            ) as server:
                if username and password:
                    server.login(username, password)
                server.send_message(msg)
        else:
            with smtplib.SMTP(
                settings.smtp_host,
                settings.smtp_port,
                timeout=15,
            ) as server:
                server.ehlo()
                if settings.smtp_starttls:
                    server.starttls(context=context)
                    server.ehlo()
                if username and password:
                    server.login(username, password)
                server.send_message(msg)
    except Exception:
        logger.exception("Failed to send invitation email to %s", to_email)