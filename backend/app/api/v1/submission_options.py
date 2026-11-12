"""What an author may submit to. Public, because the chair-only conference list is not for authors."""
from datetime import datetime

from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.core.deps import get_db
from app.db.models.conference import Conference, Track
from app.services.deadline_service import closes_at, get_effective_deadline, is_open

router = APIRouter()  # mounted with prefix="/conferences"


class OpenTrack(BaseModel):
    id: int
    name: str
    description: str | None = None
    closes_at: datetime | None = None  # aware UTC, or null when the Chair has not set a deadline


class OpenConference(BaseModel):
    id: int
    title: str
    acronym: str
    location: str | None = None
    start_date: datetime
    end_date: datetime
    tracks: list[OpenTrack]


@router.get("/public/open", response_model=list[OpenConference])
def conferences_open_for_submission(db: Session = Depends(get_db)):
    """Active conferences that have at least one track still accepting submissions."""
    result = []
    for conf in db.query(Conference).filter(Conference.is_active.is_(True)).order_by(Conference.start_date).all():
        tracks = []
        for track in db.query(Track).filter(Track.conference_id == conf.id).order_by(Track.name).all():
            if not is_open(db, conf.id, "submission", track_id=track.id):
                continue
            deadline = get_effective_deadline(db, conf.id, "submission", track.id)
            tracks.append(
                OpenTrack(
                    id=track.id,
                    name=track.name,
                    description=track.description,
                    closes_at=closes_at(deadline) if deadline else None,
                )
            )
        if tracks:
            result.append(
                OpenConference(
                    id=conf.id,
                    title=conf.title,
                    acronym=conf.acronym,
                    location=conf.location,
                    start_date=conf.start_date,
                    end_date=conf.end_date,
                    tracks=tracks,
                )
            )
    return result