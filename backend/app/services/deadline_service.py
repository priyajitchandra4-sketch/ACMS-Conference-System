"""Deadline rules. Every 'is this still open?' question goes through here."""
from datetime import datetime, timedelta, timezone

from fastapi import HTTPException
from sqlalchemy.orm import Session

from app.db.models.conference import Deadline

LABELS = {
    "submission": "submission",
    "review": "review",
    "rebuttal": "rebuttal",
    "camera_ready": "camera-ready",
}


def as_utc(value: datetime) -> datetime:
    """The database hands back naive datetimes that are really UTC.
    Comparing a naive datetime with an aware one raises TypeError (a 500 error),
    so every deadline is converted to aware UTC before it is compared."""
    if value.tzinfo is None:
        return value.replace(tzinfo=timezone.utc)
    return value.astimezone(timezone.utc)


def _newest(db: Session, conference_id: int, deadline_type: str, track_id: int | None) -> Deadline | None:
    query = db.query(Deadline).filter(
        Deadline.conference_id == conference_id, Deadline.deadline_type == deadline_type
    )
    query = query.filter(Deadline.track_id.is_(None) if track_id is None else Deadline.track_id == track_id)
    # The Chair "changes" a deadline by adding a new row, so the newest row wins.
    return query.order_by(Deadline.id.desc()).first()


def get_effective_deadline(
    db: Session, conference_id: int, deadline_type: str, track_id: int | None = None
) -> Deadline | None:
    """A deadline set for the track beats the conference-wide one."""
    if track_id is not None:
        track_level = _newest(db, conference_id, deadline_type, track_id)
        if track_level:
            return track_level
    return _newest(db, conference_id, deadline_type, None)


def closes_at(deadline: Deadline) -> datetime:
    """Due date plus the grace period, as an aware UTC datetime."""
    return as_utc(deadline.due_at) + timedelta(minutes=deadline.grace_period_minutes or 0)


def is_open(
    db: Session, conference_id: int, deadline_type: str, track_id: int | None = None, now: datetime | None = None
) -> bool:
    deadline = get_effective_deadline(db, conference_id, deadline_type, track_id)
    if deadline is None:
        return True  # no deadline set yet means no limit
    return (now or datetime.now(timezone.utc)) <= closes_at(deadline)


def ensure_deadline_open(
    db: Session, conference_id: int, deadline_type: str, track_id: int | None = None, now: datetime | None = None
) -> None:
    deadline = get_effective_deadline(db, conference_id, deadline_type, track_id)
    if deadline is None:
        return
    when = closes_at(deadline)
    if (now or datetime.now(timezone.utc)) > when:
        label = LABELS.get(deadline_type, deadline_type)
        raise HTTPException(
            status_code=403,
            detail=f"The {label} deadline has passed (it closed on {when.strftime('%d %b %Y, %H:%M')} UTC).",
        )