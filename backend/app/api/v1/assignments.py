"""Phase 5 — assignments router (Reviewer / Meta-Reviewer / Track Chair)."""
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.core.deps import get_current_user, get_db, require_role
from app.core.roles import ROLE_META_REVIEWER, ROLE_REVIEWER, ROLE_TRACK_CHAIR
from app.db.models import User
from app.schemas.assignment import (
    AssignmentOut, AssignMetaIn, AssignReviewerIn, CandidateOut, MemberOut,
    MetaAssignmentOut, MetaPaperOut, MyAssignmentOut, PaperAssignmentOut,
    PaperOverviewOut, TrackOut,
)
from app.services import assignment_service, scope
from app.db.models import Track
from sqlalchemy import select

router = APIRouter(tags=["assignments"])

reviewer_only = require_role(ROLE_REVIEWER)
meta_only = require_role(ROLE_META_REVIEWER)
manager_roles = require_role(ROLE_META_REVIEWER, ROLE_TRACK_CHAIR, "chair")
chair_roles = require_role(ROLE_TRACK_CHAIR, "chair")


# ---- Reviewer ----

@router.get("/assignments/mine", response_model=list[MyAssignmentOut])
def my_assignments(
    db: Session = Depends(get_db), user: User = Depends(reviewer_only),
):
    return assignment_service.my_assignments(db, user)


@router.post("/assignments/{assignment_id}/accept", response_model=AssignmentOut)
def accept(
    assignment_id: int,
    db: Session = Depends(get_db), user: User = Depends(reviewer_only),
):
    return assignment_service.respond(db, user, assignment_id, accept=True)


@router.post("/assignments/{assignment_id}/decline", response_model=AssignmentOut)
def decline(
    assignment_id: int,
    db: Session = Depends(get_db), user: User = Depends(reviewer_only),
):
    return assignment_service.respond(db, user, assignment_id, accept=False)


# ---- Meta-Reviewer ----

@router.get("/meta/papers", response_model=list[MetaPaperOut])
def my_meta_papers(
    db: Session = Depends(get_db), user: User = Depends(meta_only),
):
    return assignment_service.my_meta_papers(db, user)


# ---- Meta-Reviewer / Track Chair (paper management) ----

@router.get("/papers/{paper_id}/candidates", response_model=list[CandidateOut])
def candidates(
    paper_id: int,
    db: Session = Depends(get_db), user: User = Depends(manager_roles),
):
    """Bids + expertise + conflicts side by side, best candidates first."""
    return assignment_service.candidates(db, user, paper_id)


@router.get("/papers/{paper_id}/assignments", response_model=list[PaperAssignmentOut])
def paper_assignments(
    paper_id: int,
    db: Session = Depends(get_db), user: User = Depends(manager_roles),
):
    return assignment_service.paper_assignments(db, user, paper_id)


@router.post("/papers/{paper_id}/assignments", response_model=AssignmentOut, status_code=201)
def assign_reviewer(
    paper_id: int, data: AssignReviewerIn,
    db: Session = Depends(get_db), user: User = Depends(manager_roles),
):
    return assignment_service.assign(db, user, paper_id, data.reviewer_id, data.due_at)


@router.delete("/assignments/{assignment_id}", status_code=204)
def cancel_assignment(
    assignment_id: int,
    db: Session = Depends(get_db), user: User = Depends(manager_roles),
):
    assignment_service.cancel(db, user, assignment_id)


# ---- Track Chair ----

@router.post("/papers/{paper_id}/meta-assignments", response_model=MetaAssignmentOut, status_code=201)
def assign_meta(
    paper_id: int, data: AssignMetaIn,
    db: Session = Depends(get_db), user: User = Depends(chair_roles),
):
    return assignment_service.assign_meta(db, user, paper_id, data.meta_reviewer_id)


@router.get("/tracks/mine", response_model=list[TrackOut])
def my_tracks(
    db: Session = Depends(get_db), user: User = Depends(chair_roles),
):
    ids = scope.my_track_ids(db, user.id)
    if not ids:
        return []
    tracks = db.scalars(select(Track).where(Track.id.in_(ids)).order_by(Track.name)).all()
    return [TrackOut.model_validate(t) for t in tracks]


@router.get("/tracks/{track_id}/assignment-overview", response_model=list[PaperOverviewOut])
def track_overview(
    track_id: int,
    db: Session = Depends(get_db), user: User = Depends(chair_roles),
):
    return assignment_service.track_overview(db, user, track_id)


@router.get("/tracks/{track_id}/members", response_model=list[MemberOut])
def track_members(
    track_id: int, role: str = Query(..., pattern="^(reviewer|meta_reviewer)$"),
    db: Session = Depends(get_db), user: User = Depends(chair_roles),
):
    return assignment_service.track_members(db, user, track_id, role)
