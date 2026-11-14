import html
import json
import logging
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen

from app.core.config import settings

logger = logging.getLogger(__name__)

BREVO_SEND_URL = "https://api.brevo.com/v3/smtp/email"

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
    api_key = settings.brevo_api_key
    if not api_key:
        logger.error("Invitation email not sent: BREVO_API_KEY is not configured")
        return

    sender_email = settings.smtp_from_email
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

    subject = f"ACMS invitation: {role_label}"
    escaped_lines = "<br>".join(html.escape(line) for line in lines)
    safe_link = html.escape(invite_link, quote=True)
    html_content = (
        f"<p>{escaped_lines}</p>"
        f'<p><a href="{safe_link}">Open invitation</a></p>'
    )

    message = {
        "sender": {
            "name": "ACMS Conference System",
            "email": sender_email,
        },
        "to": [{"email": to_email}],
        "subject": subject,
        "textContent": "\n".join(lines),
        "htmlContent": html_content,
    }

    request = Request(
        BREVO_SEND_URL,
        data=json.dumps(message).encode("utf-8"),
        headers={
            "accept": "application/json",
            "api-key": api_key,
            "content-type": "application/json",
        },
        method="POST",
    )

    try:
        with urlopen(request, timeout=20) as response:
            response.read()
            logger.info("Brevo accepted invitation email for %s", to_email)
    except HTTPError as exc:
        # Log the response, but never log the API key.
        details = exc.read().decode("utf-8", errors="replace")
        logger.error("Brevo rejected invitation email (HTTP %s): %s", exc.code, details)
    except (URLError, TimeoutError, OSError):
        logger.exception("Could not connect to Brevo API to send invitation email")