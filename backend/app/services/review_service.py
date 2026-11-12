"""Phase 6 business rules. Routers only validate/dispatch; privacy and access live here."""
from datetime import datetime, timezone
from fastapi import HTTPException
from sqlalchemy import func, select
from sqlalchemy.orm import Session
from app.core.roles import ROLE_CHAIR, ROLE_META_REVIEWER, ROLE_REVIEWER, ROLE_TRACK_CHAIR
from app.db.models import Assignment, DiscussionPost, DiscussionThread, MetaAssignment, Paper, Review, RoleAssignment, User
from app.schemas.review import RECOMMENDATIONS
from app.services import scope
from app.services.deadline_service import ensure_deadline_open
from app.services.audit_service import record as audit_record


def _reviewer_assignment(db: Session, user: User, paper: Paper) -> Assignment:
    assignment = db.scalar(select(Assignment).where(
        Assignment.paper_id == paper.id,
        Assignment.reviewer_id == user.id,
        Assignment.status == "accepted",
    ))
    if assignment is None:
        raise HTTPException(403, "An accepted reviewer assignment is required")
    return assignment


def _manager_access(db: Session, user: User, paper: Paper) -> bool:
    if db.scalar(select(MetaAssignment.id).where(
        MetaAssignment.paper_id == paper.id,
        MetaAssignment.meta_reviewer_id == user.id,
    )):
        return True
    return any(
        ra.role in (ROLE_META_REVIEWER, ROLE_TRACK_CHAIR, ROLE_CHAIR)
        and ra.conference_id == paper.conference_id
        and ra.track_id in (None, paper.track_id)
        for ra in db.scalars(select(RoleAssignment).where(RoleAssignment.user_id == user.id)).all()
    )


def _can_review_or_manage(db: Session, user: User, paper: Paper) -> bool:
    if _manager_access(db, user, paper):
        return True
    return db.scalar(select(Assignment.id).where(
        Assignment.paper_id == paper.id,
        Assignment.reviewer_id == user.id,
        Assignment.status == "accepted",
    )) is not None


def _paper(db: Session, paper_id: int) -> Paper:
    return scope.get_paper_or_404(db, paper_id)


def my_reviews(db: Session, user: User):
    rows = db.execute(
        select(Assignment, Paper, Review)
        .join(Paper, Paper.id == Assignment.paper_id)
        .outerjoin(Review, Review.assignment_id == Assignment.id)
        .where(Assignment.reviewer_id == user.id, Assignment.status == "accepted")
        .order_by(Assignment.due_at.asc().nullslast(), Assignment.id)
    ).all()
    return [dict(
        id=review.id if review else None,
        assignment_id=a.id,
        paper_id=p.id,
        anon_label=a.anon_label,
        paper_number=p.paper_number,
        paper_title=p.title,
        paper_abstract=p.abstract,
        summary=review.summary if review else None,
        strengths=review.strengths if review else None,
        weaknesses=review.weaknesses if review else None,
        questions=review.questions if review else None,
        rating=review.rating if review else None,
        confidence=review.confidence if review else None,
        recommendation=review.recommendation if review else None,
        confidential_comments=review.confidential_comments if review else None,
        status=review.status if review else "not_started",
        submitted_at=review.submitted_at if review else None,
        due_at=a.due_at,
    ) for a, p, review in rows]


def get_my_review(db: Session, user: User, paper_id: int):
    paper = _paper(db, paper_id)
    assignment = _reviewer_assignment(db, user, paper)
    review = db.scalar(select(Review).where(Review.assignment_id == assignment.id))
    return _review_payload(paper, assignment, review)


def _review_payload(paper, assignment, review):
    return dict(
        id=review.id if review else None, assignment_id=assignment.id,
        paper_id=paper.id, anon_label=assignment.anon_label,
        paper_number=paper.paper_number, paper_title=paper.title,
        paper_abstract=paper.abstract,
        summary=review.summary if review else None,
        strengths=review.strengths if review else None,
        weaknesses=review.weaknesses if review else None,
        questions=review.questions if review else None,
        rating=review.rating if review else None,
        confidence=review.confidence if review else None,
        recommendation=review.recommendation if review else None,
        confidential_comments=review.confidential_comments if review else None,
        status=review.status if review else "not_started",
        submitted_at=review.submitted_at if review else None,
        due_at=assignment.due_at,
    )


def save_review(db: Session, user: User, paper_id: int, data):
    paper = _paper(db, paper_id)
    assignment = _reviewer_assignment(db, user, paper)
    ensure_deadline_open(db, paper.conference_id, "review", track_id=paper.track_id)
    review = db.scalar(select(Review).where(Review.assignment_id == assignment.id))
    if review and review.status == "submitted":
        raise HTTPException(409, "Submitted reviews are locked")
    if review is None:
        review = Review(assignment_id=assignment.id, status="draft")
        db.add(review)
    for field in ("summary", "strengths", "weaknesses", "questions", "rating", "confidence", "recommendation", "confidential_comments"):
        value = getattr(data, field)
        if value is not None:
            setattr(review, field, value.strip() if isinstance(value, str) else value)
    if data.submit:
        required = ("summary", "strengths", "weaknesses", "rating", "confidence", "recommendation")
        missing = [name for name in required if not getattr(review, name)]
        if missing:
            raise HTTPException(422, "Complete required review fields before submitting: " + ", ".join(missing))
        if review.recommendation not in RECOMMENDATIONS:
            raise HTTPException(422, "Choose a valid recommendation")
        review.status = "submitted"
        review.submitted_at = datetime.now(timezone.utc)
    else:
        review.status = "draft"
    if data.submit:
        audit_record(db, user, paper.conference_id, "review.submitted", "paper", paper.id)
    db.commit()
    db.refresh(review)
    return _review_payload(paper, assignment, review)


def paper_reviews(db: Session, user: User, paper_id: int):
    paper = _paper(db, paper_id)
    if not _manager_access(db, user, paper):
        raise HTTPException(403, "Meta-Reviewer or conference/track chair access required")
    rows = db.execute(
        select(Assignment, Review)
        .outerjoin(Review, Review.assignment_id == Assignment.id)
        .where(Assignment.paper_id == paper.id, Assignment.status.in_(("accepted", "pending")))
        .order_by(Assignment.id)
    ).all()
    return [dict(
        id=r.id if r else 0, assignment_id=a.id, anon_label=a.anon_label,
        summary=r.summary if r else None, strengths=r.strengths if r else None,
        weaknesses=r.weaknesses if r else None, questions=r.questions if r else None,
        rating=r.rating if r else None, confidence=r.confidence if r else None,
        recommendation=r.recommendation if r else None,
        confidential_comments=r.confidential_comments if r else None,
        status=r.status if r else "not_started", submitted_at=r.submitted_at if r else None,
    ) for a, r in rows]


def progress(db: Session, user: User, track_id: int):
    track = scope.get_track_or_404(db, track_id)
    # verify that the requester manages this track/conference
    if not scope.is_track_chair(db, user.id, track):
        raise HTTPException(403, "Track Chair access required")
    papers = db.scalars(select(Paper).where(Paper.track_id == track.id).order_by(Paper.paper_number)).all()
    result = []
    for paper in papers:
        assignments = db.scalars(select(Assignment).where(Assignment.paper_id == paper.id)).all()
        accepted_ids = [a.id for a in assignments if a.status == "accepted"]
        submitted = db.scalar(select(func.count(Review.id)).where(
            Review.assignment_id.in_(accepted_ids), Review.status == "submitted"
        )) if accepted_ids else 0
        result.append(dict(
            paper_id=paper.id, paper_number=paper.paper_number, paper_title=paper.title,
            assigned=len(assignments), accepted=len(accepted_ids), submitted=submitted or 0,
            pending=sum(a.status == "pending" for a in assignments),
        ))
    return result


def _discussion_thread(db: Session, paper_id: int):
    thread = db.scalar(select(DiscussionThread).where(DiscussionThread.paper_id == paper_id))
    if thread is None:
        thread = DiscussionThread(paper_id=paper_id, status="open")
        db.add(thread)
        db.flush()
    return thread


def _discussion_label(db: Session, user_id: int, paper: Paper) -> str:
    assignment = db.scalar(select(Assignment).where(
        Assignment.paper_id == paper.id, Assignment.reviewer_id == user_id,
    ))
    if assignment:
        return assignment.anon_label
    roles = db.scalars(select(RoleAssignment).where(RoleAssignment.user_id == user_id)).all()
    role_set = {r.role for r in roles if r.conference_id == paper.conference_id and r.track_id in (None, paper.track_id)}
    if ROLE_META_REVIEWER in role_set or db.scalar(select(MetaAssignment.id).where(MetaAssignment.paper_id == paper.id, MetaAssignment.meta_reviewer_id == user_id)):
        return "Meta-Reviewer"
    if ROLE_TRACK_CHAIR in role_set:
        return "Track Chair"
    if ROLE_CHAIR in role_set:
        return "Chair"
    return "Conference Participant"


def get_discussion(db: Session, user: User, paper_id: int):
    paper = _paper(db, paper_id)
    if not _can_review_or_manage(db, user, paper):
        raise HTTPException(403, "Only assigned reviewers and paper managers may view this discussion")
    thread = _discussion_thread(db, paper.id)
    db.commit()
    posts = db.scalars(select(DiscussionPost).where(DiscussionPost.thread_id == thread.id).order_by(DiscussionPost.created_at, DiscussionPost.id)).all()
    return dict(
        paper_id=paper.id, paper_number=paper.paper_number,
        paper_title=paper.title, paper_abstract=paper.abstract, status=thread.status,
        posts=[dict(id=p.id, author_label=_discussion_label(db, p.author_id, paper), body=p.body, created_at=p.created_at, edited_at=p.edited_at) for p in posts],
    )


def add_discussion_post(db: Session, user: User, paper_id: int, body: str):
    paper = _paper(db, paper_id)
    if not _can_review_or_manage(db, user, paper):
        raise HTTPException(403, "Only assigned reviewers and paper managers may post")
    thread = _discussion_thread(db, paper.id)
    if thread.status != "open":
        raise HTTPException(409, "Discussion is closed")
    post = DiscussionPost(thread_id=thread.id, author_id=user.id, body=body.strip())
    db.add(post)
    audit_record(db, user, paper.conference_id, "review.discussion.posted", "paper", paper.id)
    db.commit()
    return get_discussion(db, user, paper_id)
