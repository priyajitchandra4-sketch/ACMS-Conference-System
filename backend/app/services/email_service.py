import logging
import smtplib
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
):
    role_label = ROLE_LABELS.get(role, role.replace("_", " ").title())

    lines = [f"You have been invited to join the Academic Conference Management System as a {role_label}."]
    if conference_title:
        lines.append(f"Conference: {conference_title}")
    if track_name:
        lines.append(f"Track: {track_name}")
    lines.append("")
    lines.append("Open the link below to accept or decline the invitation:")
    lines.append(invite_link)
    if valid_days:
        lines.append("")
        lines.append(f"This link is valid for {valid_days} days.")

    msg = EmailMessage()
    msg.set_content("\n".join(lines))
    msg["Subject"] = f"ACMS invitation: {role_label}"
    msg["From"] = "noreply@acms.org"
    msg["To"] = to_email

    try:
        # MailHog in development. The timeout stops a missing server from hanging the request.
        with smtplib.SMTP(settings.smtp_host, settings.smtp_port, timeout=10) as server:
            server.send_message(msg)
    except Exception:
        logger.exception("Failed to send invitation email to %s", to_email)
