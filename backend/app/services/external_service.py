"""Phase 8 external reviewer invitations and scoped assignments."""
from datetime import datetime, timedelta, timezone
import secrets
from fastapi import HTTPException
from sqlalchemy import func, select
from sqlalchemy.orm import Session
from app.core.config import settings
from app.db.models import Assignment, Invitation, Paper, RoleAssignment, Track, User
from app.services import scope
from app.services.invitation_service import utcnow
from app.services.audit_service import record as audit_record


def _manager(db: Session, user: User, paper: Paper) -> None:
    track = scope.get_track_or_404(db, paper.track_id)
    if not scope.is_track_chair(db, user.id, track):
        raise HTTPException(403, "Track Chair or conference Chair access required.")


def create_invitation(db: Session, user: User, paper_id: int, email: str, due_at: datetime | None):
    paper = scope.get_paper_or_404(db, paper_id)
    _manager(db, user, paper)
    email = email.strip().lower()
    existing_user = db.scalar(select(User).where(func.lower(User.email) == email))
    if existing_user is not None and scope.is_author_of(db, existing_user, paper_id):
        raise HTTPException(409, "A paper author cannot be invited to review their own paper.")
    pending = db.scalar(select(Invitation).where(
        Invitation.paper_id == paper.id, func.lower(Invitation.email) == email,
        Invitation.role == "external_reviewer", Invitation.status == "pending"))
    if pending:
        raise HTTPException(409, "A pending external-review invitation already exists for this email.")
    if due_at is not None and due_at.tzinfo is not None:
        due_at = due_at.astimezone(timezone.utc).replace(tzinfo=None)
    inv = Invitation(email=email, role="external_reviewer", conference_id=paper.conference_id,
        track_id=paper.track_id, paper_id=paper.id, due_at=due_at,
        token=secrets.token_urlsafe(32), status="pending", invited_by_id=user.id,
        expires_at=utcnow() + timedelta(days=settings.invite_valid_days))
    db.add(inv)
    db.flush()
    audit_record(db, user, paper.conference_id, "external_review.invited", "paper", paper.id)
    db.commit()
    db.refresh(inv)
    return {"invitation_id": inv.id, "email": inv.email, "role": inv.role,
            "paper_id": inv.paper_id, "status": inv.status, "expires_at": inv.expires_at,
            "accept_url": f"{settings.frontend_url}/invite/{inv.token}"}


def list_for_manager(db: Session, user: User, conference_id: int | None = None) -> list[dict]:
    result: list[dict] = []
    rows = db.execute(select(Assignment, Paper, User).join(Paper, Paper.id == Assignment.paper_id)
        .join(User, User.id == Assignment.reviewer_id)
        .where(Assignment.kind == "external", Assignment.status != "cancelled")
        .order_by(Assignment.id.desc())).all()
    for assignment, paper, reviewer in rows:
        if conference_id and paper.conference_id != conference_id:
            continue
        try:
            _manager(db, user, paper)
        except HTTPException:
            continue
        result.append({"assignment_id": assignment.id, "paper_id": paper.id,
            "paper_number": paper.paper_number, "paper_title": paper.title,
            "external_email": reviewer.email, "reviewer_email": reviewer.email,
            "due_at": assignment.due_at, "status": assignment.status, "kind": assignment.kind})
    invitations = db.scalars(select(Invitation).where(Invitation.role == "external_reviewer",
        Invitation.status == "pending").order_by(Invitation.id.desc())).all()
    for inv in invitations:
        if not inv.paper_id:
            continue
        paper = db.get(Paper, inv.paper_id)
        if not paper or (conference_id and paper.conference_id != conference_id):
            continue
        try:
            _manager(db, user, paper)
        except HTTPException:
            continue
        result.append({"assignment_id": -inv.id, "paper_id": paper.id,
            "paper_number": paper.paper_number, "paper_title": paper.title,
            "external_email": inv.email, "reviewer_email": inv.email,
            "due_at": inv.due_at, "status": "pending", "kind": "external"})
    return result


def cancel(db: Session, user: User, assignment_id: int) -> None:
    if assignment_id < 0:
        inv = db.get(Invitation, -assignment_id)
        if inv is None or inv.role != "external_reviewer" or inv.status != "pending":
            raise HTTPException(404, "Pending external invitation not found.")
        paper = scope.get_paper_or_404(db, inv.paper_id)
        _manager(db, user, paper)
        inv.status = "revoked"
        audit_record(db, user, paper.conference_id, "external_review.invitation.cancelled", "paper", paper.id)
        db.commit()
        return
    assignment = db.get(Assignment, assignment_id)
    if assignment is None or assignment.kind != "external":
        raise HTTPException(404, "External assignment not found.")
    paper = scope.get_paper_or_404(db, assignment.paper_id)
    _manager(db, user, paper)
    if assignment.status == "accepted":
        raise HTTPException(409, "Accepted external reviews cannot be cancelled here.")
    assignment.status = "cancelled"
    audit_record(db, user, paper.conference_id, "external_review.assignment.cancelled", "paper", paper.id)
    db.commit()


def my_assignments(db: Session, user: User) -> list[dict]:
    rows = db.execute(select(Assignment, Paper).join(Paper, Paper.id == Assignment.paper_id)
        .where(Assignment.kind == "external", Assignment.reviewer_id == user.id,
               Assignment.status.in_(("pending", "accepted")))
        .order_by(Assignment.due_at.asc().nullslast())).all()
    return [{"id": a.id, "assignment_id": a.id, "paper_id": p.id,
        "paper_number": p.paper_number, "paper_title": p.title,
        "paper_abstract": p.abstract, "due_at": a.due_at, "status": a.status,
        "kind": a.kind, "anon_label": a.anon_label} for a, p in rows]
