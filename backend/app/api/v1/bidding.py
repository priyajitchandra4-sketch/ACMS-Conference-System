"""Phase 5 — bidding router (Reviewer).

Register in app/main.py:
    from app.api.v1 import bidding, assignments
    app.include_router(bidding.router, prefix="/api/v1")
    app.include_router(assignments.router, prefix="/api/v1")
"""
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.deps import get_current_user, get_db, require_role
from app.core.roles import ROLE_REVIEWER
from app.db.models import User
from app.schemas.bidding import (
    BidIn, BidOut, ConflictIn, ConflictOut, ExpertiseBulkIn, ExpertiseOut,
    PaperForBidding, SubjectAreaOut,
)
from app.services import bidding_service

router = APIRouter(tags=["bidding"])

reviewer_only = require_role(ROLE_REVIEWER)


@router.get("/bidding/papers", response_model=list[PaperForBidding])
def papers_open_for_bidding(
    db: Session = Depends(get_db), user: User = Depends(reviewer_only),
):
    """Titles + abstracts only. No author names anywhere (double-blind)."""
    return bidding_service.list_papers_for_bidding(db, user)


@router.post("/bidding/papers/{paper_id}/bid", response_model=BidOut)
def place_bid(
    paper_id: int, data: BidIn,
    db: Session = Depends(get_db), user: User = Depends(reviewer_only),
):
    return bidding_service.place_bid(db, user, paper_id, data.value)


@router.post("/bidding/papers/{paper_id}/conflict", response_model=ConflictOut)
def declare_conflict(
    paper_id: int, data: ConflictIn,
    db: Session = Depends(get_db), user: User = Depends(reviewer_only),
):
    return bidding_service.declare_conflict(db, user, paper_id, data.reason)


@router.get("/bidding/subject-areas", response_model=list[SubjectAreaOut])
def subject_areas(
    db: Session = Depends(get_db), user: User = Depends(reviewer_only),
):
    return bidding_service.available_subject_areas(db, user)


@router.get("/bidding/expertise", response_model=list[ExpertiseOut])
def get_expertise(
    db: Session = Depends(get_db), user: User = Depends(reviewer_only),
):
    return bidding_service.get_expertise(db, user)


@router.put("/bidding/expertise", response_model=list[ExpertiseOut])
def put_expertise(
    data: ExpertiseBulkIn,
    db: Session = Depends(get_db), user: User = Depends(reviewer_only),
):
    return bidding_service.set_expertise(db, user, data)
