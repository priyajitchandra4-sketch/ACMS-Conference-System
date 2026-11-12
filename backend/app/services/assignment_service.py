"""Phase 5 — assignment rules. The heart of the phase.

assignment_service.assign() REFUSES (409) when:
  * the reviewer declared a conflict of interest on the paper
  * the reviewer is an author of the paper (matched by user_id OR email)
  * the reviewer is already assigned to the paper
It sets a due date and an anonymous label like 'Reviewer 2'.

Chain of authority:
  Track Chair  -> assigns Meta-Reviewers to papers (assign_meta)
  Meta-Reviewer -> assigns Reviewers to their papers (assign)
  Track Chair / Chair may also assign reviewers directly (oversight)
  Reviewer -> accepts or declines (respond)
"""
from datetime import datetime, timedelta, timezone

from fastapi import HTTPException
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.core.roles import ROLE_META_REVIEWER
from app.db.models import (
    Assignment, Bid, ConflictOfInterest, MetaAssignment, Paper,
    PaperSubjectArea, ReviewerExpertise, User,
)
from app.schemas.assignment import (
    AssignmentOut, CandidateOut, MemberOut, MetaAssignmentOut, MetaPaperOut,
    MyAssignmentOut, PaperAssignmentOut, PaperOverviewOut,
)
from app.services import scope
from app.services.audit_service import record as audit_record

DEFAULT_REVIEW_DAYS = 14


def _require_paper_manager(db: Session, user: User, paper: Paper) -> None:
    """Meta-Reviewer of this paper, Track Chair of its track, or Chair."""
    track = scope.get_track_or_404(db, paper.track_id) if paper.track_id else None
    if track and scope.is_track_chair(db, user.id, track):
        return
    if scope.is_meta_for_paper(db, user.id, paper.id):
        return
    raise HTTPException(403, "You do not manage assignments for this paper")


def assign(
    db: Session, user: User, paper_id: int, reviewer_id: int,
    due_at: datetime | None = None,
) -> AssignmentOut:
    paper = scope.get_paper_or_404(db, paper_id)
    _require_paper_manager(db, user, paper)

    reviewer = db.get(User, reviewer_id)
    if reviewer is None or not reviewer.is_active:
        raise HTTPException(422, "Reviewer account not found or inactive")
    if not scope.is_reviewer_for(db, reviewer_id, paper):
        raise HTTPException(422, "This user is not a reviewer for the paper's track")

    # Rule 1: declared conflict
    conflict = db.scalar(
        select(ConflictOfInterest).where(
            ConflictOfInterest.paper_id == paper_id,
            ConflictOfInterest.reviewer_id == reviewer_id,
        )
    )
    if conflict:
        raise HTTPException(409, f"Reviewer declared a conflict: {conflict.reason}")

    # Rule 2: reviewer is an author (user_id OR email — co-authors may have no account)
    if scope.is_author_of(db, reviewer, paper_id):
        raise HTTPException(409, "Reviewer is an author of this paper")

    # Rule 3: already assigned
    existing = db.scalar(
        select(Assignment).where(
            Assignment.paper_id == paper_id, Assignment.reviewer_id == reviewer_id
        )
    )
    if existing:
        raise HTTPException(409, "Reviewer is already assigned to this paper")

    # Anonymous label: next free number for this paper
    count = db.scalar(
        select(func.count(Assignment.id)).where(Assignment.paper_id == paper_id)
    ) or 0
    label = f"Reviewer {count + 1}"

    if due_at is None:
        due_at = datetime.now(timezone.utc) + timedelta(days=DEFAULT_REVIEW_DAYS)

    assignment = Assignment(
        paper_id=paper_id, reviewer_id=reviewer_id, kind="internal",
        status="pending", due_at=due_at, anon_label=label, assigned_by=user.id,
    )
    db.add(assignment)
    db.flush()
    audit_record(db, user, paper.conference_id, "review.assignment.created", "assignment", assignment.id,
                 {"kind": "internal"})
    db.commit()
    db.refresh(assignment)
    return AssignmentOut.model_validate(assignment)


def respond(db: Session, user: User, assignment_id: int, accept: bool) -> AssignmentOut:
    """Reviewer accepts or declines their own pending assignment."""
    a = db.get(Assignment, assignment_id)
    if a is None:
        raise HTTPException(404, "Assignment not found")
    if a.reviewer_id != user.id:
        raise HTTPException(403, "This is not your assignment")
    if a.status != "pending":
        raise HTTPException(409, f"Already {a.status}")
    a.status = "accepted" if accept else "declined"
    paper = scope.get_paper_or_404(db, a.paper_id)
    audit_record(db, user, paper.conference_id, f"review.assignment.{a.status}", "assignment", a.id)
    db.commit()
    db.refresh(a)
    return AssignmentOut.model_validate(a)


def cancel(db: Session, user: User, assignment_id: int) -> None:
    """Manager removes an assignment that has not been accepted yet."""
    a = db.get(Assignment, assignment_id)
    if a is None:
        raise HTTPException(404, "Assignment not found")
    paper = scope.get_paper_or_404(db, a.paper_id)
    _require_paper_manager(db, user, paper)
    if a.status == "accepted":
        raise HTTPException(409, "Cannot remove an accepted assignment; contact the Chair")
    a.status = "cancelled"
    audit_record(db, user, paper.conference_id, "review.assignment.cancelled", "assignment", a.id)
    db.commit()


def my_assignments(db: Session, user: User) -> list[MyAssignmentOut]:
    rows = db.execute(
        select(Assignment, Paper)
        .join(Paper, Paper.id == Assignment.paper_id)
        .where(
            Assignment.reviewer_id == user.id,
            Assignment.status.in_(("pending", "accepted")),
        )
        .order_by(Assignment.due_at)
    ).all()
    return [
        MyAssignmentOut(
            **AssignmentOut.model_validate(a).model_dump(),
            paper_number=p.paper_number,
            paper_title=p.title,     # title only — no author identities
            paper_status=p.status,
        )
        for a, p in rows
    ]


def paper_assignments(db: Session, user: User, paper_id: int) -> list[PaperAssignmentOut]:
    paper = scope.get_paper_or_404(db, paper_id)
    _require_paper_manager(db, user, paper)
    rows = db.execute(
        select(Assignment, User)
        .join(User, User.id == Assignment.reviewer_id)
        .where(Assignment.paper_id == paper_id, Assignment.status != "cancelled")
        .order_by(Assignment.anon_label)
    ).all()
    return [
        PaperAssignmentOut(
            **AssignmentOut.model_validate(a).model_dump(),
            reviewer_name=u.full_name, reviewer_email=u.email,
        )
        for a, u in rows
    ]


def candidates(db: Session, user: User, paper_id: int) -> list[CandidateOut]:
    """The 'Assign Reviewers' table: bids, expertise and conflicts side by side."""
    paper = scope.get_paper_or_404(db, paper_id)
    _require_paper_manager(db, user, paper)

    reviewer_ids = scope.reviewer_ids_for_paper(db, paper)
    if not reviewer_ids:
        return []
    users = db.scalars(select(User).where(User.id.in_(reviewer_ids))).all()

    bids = {
        b.reviewer_id: b.value
        for b in db.scalars(select(Bid).where(Bid.paper_id == paper_id)).all()
    }
    conflicts = {
        c.reviewer_id: c.reason
        for c in db.scalars(
            select(ConflictOfInterest).where(ConflictOfInterest.paper_id == paper_id)
        ).all()
    }
    paper_area_ids = set(db.scalars(
        select(PaperSubjectArea.subject_area_id).where(
            PaperSubjectArea.paper_id == paper_id
        )
    ).all())
    expertise_rows = db.scalars(
        select(ReviewerExpertise).where(
            ReviewerExpertise.reviewer_id.in_(reviewer_ids),
            ReviewerExpertise.subject_area_id.in_(paper_area_ids),
        )
    ).all() if paper_area_ids else []
    exp_by_user: dict[int, dict[int, int]] = {}
    for e in expertise_rows:
        exp_by_user.setdefault(e.reviewer_id, {})[e.subject_area_id] = e.level

    loads = dict(db.execute(
        select(Assignment.reviewer_id, func.count(Assignment.id))
        .where(
            Assignment.reviewer_id.in_(reviewer_ids),
            Assignment.status.in_(("pending", "accepted")),
        )
        .group_by(Assignment.reviewer_id)
    ).all())

    already = set(db.scalars(
        select(Assignment.reviewer_id).where(
            Assignment.paper_id == paper_id, Assignment.status != "cancelled"
        )
    ).all())

    out = []
    for u in users:
        is_author = scope.is_author_of(db, u, paper_id)
        exp = exp_by_user.get(u.id, {})
        out.append(CandidateOut(
            user_id=u.id, full_name=u.full_name, email=u.email,
            bid=bids.get(u.id), conflict=conflicts.get(u.id),
            expertise=exp, expertise_score=sum(exp.values()),
            active_load=loads.get(u.id, 0), is_author=is_author,
        ))
    # already-assigned reviewers drop out of the candidate list
    out = [c for c in out if c.user_id not in already]
    # best candidates first: no conflict/author, then bid, then expertise
    bid_rank = {"want": 0, "maybe": 1, None: 2, "no": 3}
    out.sort(key=lambda c: (
        c.is_author or c.conflict is not None,
        bid_rank.get(c.bid, 2),
        -c.expertise_score,
        c.active_load,
    ))
    return out


def assign_meta(db: Session, user: User, paper_id: int, meta_reviewer_id: int) -> MetaAssignmentOut:
    """Track Chair (or Chair) assigns a Meta-Reviewer to a paper."""
    paper = scope.get_paper_or_404(db, paper_id)
    track = scope.get_track_or_404(db, paper.track_id) if paper.track_id else None
    if not track or not scope.is_track_chair(db, user.id, track):
        raise HTTPException(403, "Only the Track Chair can assign Meta-Reviewers")
    meta = db.get(User, meta_reviewer_id)
    if meta is None or not meta.is_active:
        raise HTTPException(422, "Meta-Reviewer account not found or inactive")
    if not scope.has_track_role(db, meta_reviewer_id, ROLE_META_REVIEWER, paper):
        raise HTTPException(422, "This user is not a Meta-Reviewer for the paper's track")
    if scope.is_author_of(db, meta, paper_id):
        raise HTTPException(409, "Meta-Reviewer is an author of this paper")
    existing = db.scalar(
        select(MetaAssignment).where(
            MetaAssignment.paper_id == paper_id,
            MetaAssignment.meta_reviewer_id == meta_reviewer_id,
        )
    )
    if existing:
        raise HTTPException(409, "Meta-Reviewer already assigned to this paper")
    ma = MetaAssignment(
        paper_id=paper_id, meta_reviewer_id=meta_reviewer_id, assigned_by=user.id
    )
    db.add(ma)
    db.flush()
    audit_record(db, user, paper.conference_id, "review.meta_assignment.created", "meta_assignment", ma.id)
    db.commit()
    db.refresh(ma)
    return MetaAssignmentOut.model_validate(ma)


def my_meta_papers(db: Session, user: User) -> list[MetaPaperOut]:
    rows = db.execute(
        select(Paper, MetaAssignment)
        .join(MetaAssignment, MetaAssignment.paper_id == Paper.id)
        .where(MetaAssignment.meta_reviewer_id == user.id)
        .order_by(Paper.id)
    ).all()
    out = []
    for p, _ma in rows:
        total = db.scalar(
            select(func.count(Assignment.id)).where(
                Assignment.paper_id == p.id, Assignment.status != "cancelled"
            )
        ) or 0
        accepted = db.scalar(
            select(func.count(Assignment.id)).where(
                Assignment.paper_id == p.id, Assignment.status == "accepted"
            )
        ) or 0
        out.append(MetaPaperOut(
            paper_id=p.id, paper_number=p.paper_number, title=p.title,
            status=p.status, track_id=p.track_id,
            reviewers_total=total, reviewers_accepted=accepted,
        ))
    return out


def track_overview(db: Session, user: User, track_id: int) -> list[PaperOverviewOut]:
    """Track Chair's Assignments Manager: every submitted paper in the track
    with its meta-reviewers and reviewer counts."""
    track = scope.get_track_or_404(db, track_id)
    if not scope.is_track_chair(db, user.id, track):
        raise HTTPException(403, "You are not the Track Chair of this track")
    papers = db.scalars(
        select(Paper).where(
            Paper.track_id == track_id,
            Paper.status.in_(("submitted", "under_review", "reviewed")),
        ).order_by(Paper.id)
    ).all()
    out = []
    for p in papers:
        metas = db.execute(
            select(User)
            .join(MetaAssignment, MetaAssignment.meta_reviewer_id == User.id)
            .where(MetaAssignment.paper_id == p.id)
        ).scalars().all()
        counts = dict(db.execute(
            select(Assignment.status, func.count(Assignment.id))
            .where(Assignment.paper_id == p.id)
            .group_by(Assignment.status)
        ).all())
        out.append(PaperOverviewOut(
            paper_id=p.id, paper_number=p.paper_number, title=p.title, status=p.status,
            meta_reviewers=[
                MemberOut(user_id=m.id, full_name=m.full_name, email=m.email)
                for m in metas
            ],
            pending=counts.get("pending", 0),
            accepted=counts.get("accepted", 0),
            declined=counts.get("declined", 0),
        ))
    return out


def track_members(db: Session, user: User, track_id: int, role: str) -> list[MemberOut]:
    """Members of a track holding a given role — feeds the assign dropdowns."""
    from app.db.models import RoleAssignment
    track = scope.get_track_or_404(db, track_id)
    if not scope.is_track_chair(db, user.id, track):
        raise HTTPException(403, "You are not the Track Chair of this track")
    rows = db.execute(
        select(User)
        .join(RoleAssignment, RoleAssignment.user_id == User.id)
        .where(
            RoleAssignment.role == role,
            RoleAssignment.conference_id == track.conference_id,
            (RoleAssignment.track_id == track_id) | (RoleAssignment.track_id.is_(None)),
        )
        .distinct()
    ).scalars().all()
    return [MemberOut(user_id=u.id, full_name=u.full_name, email=u.email) for u in rows]
