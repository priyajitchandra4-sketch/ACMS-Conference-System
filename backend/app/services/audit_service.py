"""Append-only audit event helper. Callers commit it with the business change."""
from app.db.models import AuditLog, User


def record(db, actor: User | None, conference_id: int | None, action: str,
           object_type: str, object_id: int | str | None, details: dict | None = None) -> None:
    db.add(AuditLog(actor_id=actor.id if actor else None, conference_id=conference_id,
        action=action, object_type=object_type,
        object_id=str(object_id) if object_id is not None else None,
        details=details or None))
