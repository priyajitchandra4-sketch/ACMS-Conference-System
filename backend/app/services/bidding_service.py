"""Phase 5 — bidding rules. Everything a Reviewer does before assignment.

Business authorization, conflicts, self-review exclusions and blind payloads live here.
"""
from fastapi import HTTPException
from sqlalchemy import and_, or_, select, true
from sqlalchemy.orm import Session

from app.core.roles import ROLE_REVIEWER
from app.db.models import (
    Bid, ConflictOfInterest, Paper, PaperSubjectArea, ReviewerExpertise,
    RoleAssignment, SubjectArea, Track, TrackSubjectArea, User,
)
from app.schemas.bidding import (
    BidOut, ConflictOut, ExpertiseBulkIn, ExpertiseOut, PaperForBidding,
    SubjectAreaOut,
)
from app.services import scope
from app.services.audit_service import record as audit_record

BIDDABLE_STATUSES = ("submitted", "under_review")


def _reviewer_role_rows(db: Session, user_id: int) -> list[RoleAssignment]:
    return [r for r in scope.roles_of(db, user_id) if r.role == ROLE_REVIEWER]


def _track_scope_conditions(rows: list[RoleAssignment], track_model=Track):
    conditions = []
    for row in rows:
        pieces = [track_model.conference_id == row.conference_id if row.conference_id is not None else true()]
        if row.track_id is not None:
            pieces.append(track_model.id == row.track_id)
        conditions.append(and_(*pieces))
    return conditions


def _visible_papers(db: Session, user: User) -> list[Paper]:
    """Papers in the reviewer's exact track/conference scopes, excluding authors and conflicts."""
    rows = _reviewer_role_rows(db, user.id)
    track_scopes = _track_scope_conditions(rows)
    if not track_scopes:
        return []
    own = scope.author_paper_ids(db, user)
    conflicts = set(db.scalars(select(ConflictOfInterest.paper_id).where(
        ConflictOfInterest.reviewer_id == user.id)).all())
    stmt = select(Paper).join(Track, Track.id == Paper.track_id).where(
        or_(*track_scopes), Paper.status.in_(BIDDABLE_STATUSES))
    papers = db.scalars(stmt).all()
    excluded = own | conflicts
    return [p for p in papers if p.id not in excluded]


def list_papers_for_bidding(db: Session, user: User) -> list[PaperForBidding]:
    papers = _visible_papers(db, user)
    if not papers:
        return []
    paper_ids = [p.id for p in papers]
    track_ids = {p.track_id for p in papers if p.track_id is not None}
    tracks = {t.id: t.name for t in db.scalars(
        select(Track).where(Track.id.in_(track_ids))).all()} if track_ids else {}
    sa_rows = db.execute(select(PaperSubjectArea.paper_id, SubjectArea.name)
        .join(SubjectArea, SubjectArea.id == PaperSubjectArea.subject_area_id)
        .where(PaperSubjectArea.paper_id.in_(paper_ids))).all()
    areas_by_paper: dict[int, list[str]] = {}
    for pid, name in sa_rows:
        areas_by_paper.setdefault(pid, []).append(name)
    my_bids = {b.paper_id: b.value for b in db.scalars(select(Bid).where(
        Bid.paper_id.in_(paper_ids), Bid.reviewer_id == user.id)).all()}
    return [PaperForBidding(id=p.id, paper_number=p.paper_number, title=p.title,
        abstract=p.abstract, track_id=p.track_id, track_name=tracks.get(p.track_id),
        subject_areas=sorted(areas_by_paper.get(p.id, [])), my_bid=my_bids.get(p.id),
        has_conflict=False) for p in papers]


def place_bid(db: Session, user: User, paper_id: int, value: str) -> BidOut:
    paper = scope.get_paper_or_404(db, paper_id)
    if not scope.is_reviewer_for(db, user.id, paper):
        raise HTTPException(403, "You are not a reviewer for this paper's track")
    if scope.is_author_of(db, user, paper_id):
        raise HTTPException(409, "You cannot bid on your own paper")
    if paper.status not in BIDDABLE_STATUSES:
        raise HTTPException(409, "This paper is not open for bidding")
    conflict = db.scalar(select(ConflictOfInterest).where(
        ConflictOfInterest.paper_id == paper_id, ConflictOfInterest.reviewer_id == user.id))
    if conflict and value in ("want", "maybe"):
        raise HTTPException(409, "You declared a conflict of interest on this paper")
    bid = db.scalar(select(Bid).where(Bid.paper_id == paper_id, Bid.reviewer_id == user.id))
    if bid is None:
        bid = Bid(paper_id=paper_id, reviewer_id=user.id, value=value)
        db.add(bid)
    else:
        bid.value = value
    db.flush()
    audit_record(db, user, paper.conference_id, "review.bid.saved", "paper", paper.id, {"value": value})
    db.commit()
    db.refresh(bid)
    return BidOut.model_validate(bid)


def declare_conflict(db: Session, user: User, paper_id: int, reason: str) -> ConflictOut:
    paper = scope.get_paper_or_404(db, paper_id)
    if not scope.is_reviewer_for(db, user.id, paper):
        raise HTTPException(403, "You are not a reviewer for this paper's track")
    existing = db.scalar(select(ConflictOfInterest).where(
        ConflictOfInterest.paper_id == paper_id, ConflictOfInterest.reviewer_id == user.id))
    if existing:
        raise HTTPException(409, "Conflict already declared for this paper")
    coi = ConflictOfInterest(paper_id=paper_id, reviewer_id=user.id, reason=reason)
    db.add(coi)
    bid = db.scalar(select(Bid).where(Bid.paper_id == paper_id, Bid.reviewer_id == user.id))
    if bid and bid.value in ("want", "maybe"):
        bid.value = "no"
    db.flush()
    audit_record(db, user, paper.conference_id, "review.conflict.declared", "paper", paper.id)
    db.commit()
    db.refresh(coi)
    return ConflictOut.model_validate(coi)


def available_subject_areas(db: Session, user: User) -> list[SubjectAreaOut]:
    rows = _reviewer_role_rows(db, user.id)
    track_scopes = _track_scope_conditions(rows)
    if not track_scopes:
        return []
    track_ids = select(Track.id).where(or_(*track_scopes))
    area_ids = select(TrackSubjectArea.subject_area_id).where(TrackSubjectArea.track_id.in_(track_ids))
    areas = db.scalars(select(SubjectArea).where(SubjectArea.id.in_(area_ids)).order_by(SubjectArea.name)).all()
    return [SubjectAreaOut.model_validate(a) for a in areas]


def get_expertise(db: Session, user: User) -> list[ExpertiseOut]:
    rows = db.execute(select(ReviewerExpertise, SubjectArea.name)
        .join(SubjectArea, SubjectArea.id == ReviewerExpertise.subject_area_id)
        .where(ReviewerExpertise.reviewer_id == user.id)).all()
    return [ExpertiseOut(subject_area_id=e.subject_area_id, level=e.level, subject_area_name=name)
            for e, name in rows]


def set_expertise(db: Session, user: User, data: ExpertiseBulkIn) -> list[ExpertiseOut]:
    seen = set()
    allowed = {a.id for a in available_subject_areas(db, user)}
    for item in data.items:
        if item.subject_area_id in seen:
            raise HTTPException(422, "Duplicate subject area in list")
        seen.add(item.subject_area_id)
        if item.subject_area_id not in allowed:
            raise HTTPException(422, "Subject area is outside your reviewer track scope")
    db.query(ReviewerExpertise).filter(ReviewerExpertise.reviewer_id == user.id).delete(synchronize_session=False)
    for item in data.items:
        db.add(ReviewerExpertise(reviewer_id=user.id, subject_area_id=item.subject_area_id, level=item.level))
    conference_ids = {r.conference_id for r in _reviewer_role_rows(db, user.id) if r.conference_id is not None}
    audit_record(db, user, next(iter(conference_ids)) if len(conference_ids) == 1 else None,
                 "review.expertise.updated", "user", user.id, {"area_count": len(data.items)})
    db.commit()
    return get_expertise(db, user)
