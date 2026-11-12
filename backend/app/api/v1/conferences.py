from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

# CHANGED: Imported get_current_user to allow any authenticated user (e.g., authors) 
# to view conferences, rather than restricting it exclusively to chairs.
from app.core.deps import get_db, require_role, get_current_user

from app.db.models.conference import Conference, Deadline, CallForPapers
from app.schemas.conference import (
    ConferenceCreate, ConferenceUpdate, ConferenceOut,
    DeadlineCreate, DeadlineOut,
    CallForPapersCreate, CallForPapersOut,
)

router = APIRouter()          # tags are already set in router.py
chair_only = require_role("chair")


def get_conference_or_404(db: Session, conference_id: int) -> Conference:
    conf = db.get(Conference, conference_id)
    if not conf:
        raise HTTPException(status_code=404, detail="Conference not found")
    return conf


# ---- Public Endpoints (Must be placed BEFORE /{conference_id}) ----
@router.get("/public/cfps")
def list_public_cfps(db: Session = Depends(get_db)):
    """Public endpoint to list all conferences that have a Call for Papers."""
    cfps = db.query(CallForPapers).all()
    results = []
    
    for cfp in cfps:
        conf = cfp.conference
        if not conf:
            continue
            
        # Get the first conference-wide deadline as the submission deadline
        sub_deadline = db.query(Deadline).filter(
            Deadline.conference_id == conf.id,
            Deadline.track_id.is_(None)
        ).order_by(Deadline.due_at).first()
        
        # Extract track names if tracks relation exists
        tracks = [t.name for t in conf.tracks] if hasattr(conf, 'tracks') and conf.tracks else []

        results.append({
            "conference_id": conf.id,
            "acronym": conf.acronym,
            "title": conf.title,
            "location": conf.location,
            "start_date": conf.start_date,
            "end_date": conf.end_date,
            "submission_deadline": sub_deadline.due_at if sub_deadline else None,
            "tracks": tracks,
            "content": cfp.content
        })
        
    return results


# ---- Conferences ----
@router.post("/", response_model=ConferenceOut, status_code=status.HTTP_201_CREATED)
def create_conference(payload: ConferenceCreate, db: Session = Depends(get_db),
                      user=Depends(chair_only)):
    if db.query(Conference).filter(Conference.acronym == payload.acronym).first():
        raise HTTPException(400, f"A conference with acronym '{payload.acronym}' already exists.")
    conf = Conference(**payload.model_dump())
    db.add(conf)
    db.commit()
    db.refresh(conf)
    return conf


# CHANGED: Relaxed dependency from `chair_only` to `get_current_user`. 
# This permits authors and other authenticated users to list active conferences 
# for manuscript submission dropdowns without receiving a 403 Forbidden error.
@router.get("/", response_model=list[ConferenceOut])
def list_conferences(db: Session = Depends(get_db), user=Depends(get_current_user)):
    return db.query(Conference).order_by(Conference.id.desc()).all()


@router.get("/{conference_id}", response_model=ConferenceOut)
def get_conference(conference_id: int, db: Session = Depends(get_db), user=Depends(chair_only)):
    return get_conference_or_404(db, conference_id)


@router.patch("/{conference_id}", response_model=ConferenceOut)
def update_conference(conference_id: int, payload: ConferenceUpdate,
                      db: Session = Depends(get_db), user=Depends(chair_only)):
    conf = get_conference_or_404(db, conference_id)
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(conf, field, value)
    db.commit()
    db.refresh(conf)
    return conf


# ---- Conference-wide deadlines ----
@router.get("/{conference_id}/deadlines", response_model=list[DeadlineOut])
def list_conference_deadlines(conference_id: int, db: Session = Depends(get_db),
                            user=Depends(chair_only)):
    get_conference_or_404(db, conference_id)
    return (db.query(Deadline)
              .filter(Deadline.conference_id == conference_id, Deadline.track_id.is_(None))
              .order_by(Deadline.due_at).all())


@router.post("/{conference_id}/deadlines", response_model=DeadlineOut,
             status_code=status.HTTP_201_CREATED)
def create_conference_deadline(conference_id: int, payload: DeadlineCreate,
                               db: Session = Depends(get_db), user=Depends(chair_only)):
    get_conference_or_404(db, conference_id)
    deadline = Deadline(
        deadline_type=payload.deadline_type,
        due_at=payload.due_at,
        grace_period_minutes=payload.grace_period_minutes,
        conference_id=conference_id,
        track_id=payload.track_id,
    )
    db.add(deadline)
    db.commit()
    db.refresh(deadline)
    return deadline


# ---- Call for papers ----
@router.get("/{conference_id}/cfp")
def get_cfp(conference_id: int, db: Session = Depends(get_db)):
    cfp = db.query(CallForPapers).filter(CallForPapers.conference_id == conference_id).first()
    return {"content": cfp.content if cfp else ""}


@router.put("/{conference_id}/cfp", response_model=CallForPapersOut)
def upsert_cfp(conference_id: int, payload: CallForPapersCreate,
               db: Session = Depends(get_db), user=Depends(chair_only)):
    get_conference_or_404(db, conference_id)
    cfp = db.query(CallForPapers).filter(CallForPapers.conference_id == conference_id).first()
    if cfp:
        cfp.content = payload.content
    else:
        cfp = CallForPapers(conference_id=conference_id, content=payload.content)
        db.add(cfp)
    db.commit()
    db.refresh(cfp)
    return cfp