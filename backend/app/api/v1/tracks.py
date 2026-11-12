from fastapi import APIRouter, Depends, status, HTTPException
from sqlalchemy.orm import Session
from app.core.deps import get_db, require_role

from app.db.models.user import User
from app.db.models.conference import Conference, Track, Deadline
from app.schemas.conference import TrackCreate, TrackOut, DeadlineCreate, DeadlineOut

router = APIRouter()

# --- Track Management ---
@router.post("/{conference_id}/tracks", response_model=TrackOut, status_code=status.HTTP_201_CREATED)
def create_track(
    conference_id: int,
    track_in: TrackCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("chair"))
):
    conf = db.query(Conference).filter(Conference.id == conference_id).first()
    if not conf:
        raise HTTPException(status_code=404, detail="Conference not found")
    
    track = Track(**track_in.model_dump(), conference_id=conference_id)
    db.add(track)
    db.commit()
    db.refresh(track)
    return track

@router.get("/{conference_id}/tracks", response_model=list[TrackOut])
def list_tracks(conference_id: int, db: Session = Depends(get_db)):
    if not db.get(Conference, conference_id):
        raise HTTPException(status_code=404, detail="Conference not found")
    return db.query(Track).filter(Track.conference_id == conference_id).all()
    




# --- Track-specific Deadlines ---
@router.post("/{conference_id}/tracks/{track_id}/deadlines", response_model=DeadlineOut, status_code=status.HTTP_201_CREATED)
def set_track_deadline(
    conference_id: int,
    track_id: int,
    deadline_in: DeadlineCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("chair"))
):
    track = db.query(Track).filter(Track.id == track_id, Track.conference_id == conference_id).first()
    if not track:
        raise HTTPException(status_code=404, detail="Track not found for this conference")
    
    deadline = Deadline(
        **deadline_in.model_dump(exclude={"track_id"}),
        conference_id=conference_id,
        track_id=track_id
    )
    db.add(deadline)
    db.commit()
    db.refresh(deadline)
    return deadline