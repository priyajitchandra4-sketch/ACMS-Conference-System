"""All the invitation rules live here. The routers only call these functions."""
import secrets
from datetime import datetime, timedelta, timezone

from fastapi import HTTPException
from sqlalchemy import func, or_
from sqlalchemy.orm import Session

from app.core import security
from app.core.config import settings
from app.db.models.conference import Conference, Track
from app.db.models.invitation import Invitation, Notification
from app.db.models.user import RoleAssignment, User
from app.services.audit_service import record as audit_record
from app.schemas.invitation import (
    AcceptInvite,
    CommitteeMemberOut,
    InvitationOut,
    InvitationPublicOut,
    MyRoleOut,
)

COMMITTEE_ROLES = ("track_chair", "meta_reviewer", "reviewer")
TRACK_CHAIR_CAN_INVITE = ("meta_reviewer", "reviewer", "external_reviewer")
ROLE_LABELS = {
    "track_chair": "Track Chair",
    "meta_reviewer": "Meta-Reviewer",
    "reviewer": "Reviewer",
    "external_reviewer": "External Reviewer",
}
USED_WORDS = {"accepted": "accepted", "declined": "declined", "revoked": "cancelled"}


def utcnow() -> datetime:
    """Current UTC time without tzinfo, matching the naive DateTime columns."""
    return datetime.now(timezone.utc).replace(tzinfo=None)


# ---------- user creation (adapts to your User model / security module names) ----------
def _hash_password(password: str) -> str:
    fn = getattr(security, "hash_password", None) or getattr(security, "get_password_hash")
    return fn(password)


def _password_column() -> str:
    return "password_hash" if hasattr(User, "password_hash") else "hashed_password"


def create_user_record(db: Session, email: str, full_name: str, affiliation: str | None, password: str) -> User:
    user = User(
        **{
            "email": email,
            "full_name": full_name,
            "affiliation": affiliation,
            "is_active": True,
            _password_column(): _hash_password(password),
        }
    )
    db.add(user)
    db.flush()  # gives the user an id without committing yet
    return user


# ---------- permission checks ----------
def is_chair(db: Session, user: User, conference_id: int) -> bool:
    return (
        db.query(RoleAssignment)
        .filter(
            RoleAssignment.user_id == user.id,
            RoleAssignment.role == "chair",
            or_(RoleAssignment.conference_id.is_(None), RoleAssignment.conference_id == conference_id),
        )
        .first()
        is not None
    )


def is_track_chair(db: Session, user: User, track_id: int) -> bool:
    return (
        db.query(RoleAssignment)
        .filter(
            RoleAssignment.user_id == user.id,
            RoleAssignment.role == "track_chair",
            RoleAssignment.track_id == track_id,
        )
        .first()
        is not None
    )


def can_manage(db: Session, user: User, conference_id: int, track_id: int | None, role: str) -> bool:
    """Chair: any committee role. Track Chair: only Meta-Reviewers and Reviewers, only in their own track."""
    if is_chair(db, user, conference_id):
        return True
    return bool(track_id) and role in TRACK_CHAIR_CAN_INVITE and is_track_chair(db, user, track_id)


# ---------- helpers ----------
def effective_status(inv: Invitation) -> str:
    if inv.status == "pending" and inv.expires_at < utcnow():
        return "expired"
    return inv.status


def to_out(inv: Invitation, track_names: dict[int, str]) -> InvitationOut:
    return InvitationOut(
        id=inv.id,
        email=inv.email,
        role=inv.role,
        conference_id=inv.conference_id,
        track_id=inv.track_id,
        track_name=track_names.get(inv.track_id) if inv.track_id else None,
        status=effective_status(inv),
        expires_at=inv.expires_at,
        created_at=inv.created_at,
    )


def _track_names(db: Session, invitations: list[Invitation]) -> dict[int, str]:
    ids = {i.track_id for i in invitations if i.track_id}
    if not ids:
        return {}
    return {t.id: t.name for t in db.query(Track).filter(Track.id.in_(ids)).all()}


def notify(db: Session, user_id: int, title: str, message: str) -> None:
    db.add(Notification(user_id=user_id, title=title, message=message))


# ---------- create / list ----------
def create_invitation(db: Session, inviter: User, track_id: int, email: str, role: str) -> Invitation:
    track = db.get(Track, track_id)
    if not track:
        raise HTTPException(404, "Track not found")
    if not can_manage(db, inviter, track.conference_id, track.id, role):
        raise HTTPException(403, "You are not allowed to invite this role for this track.")

    email = email.strip().lower()
    now = utcnow()

    pending = (
        db.query(Invitation)
        .filter(
            Invitation.email == email,
            Invitation.role == role,
            Invitation.track_id == track.id,
            Invitation.status == "pending",
            Invitation.expires_at > now,
        )
        .first()
    )
    if pending:
        raise HTTPException(409, "A pending invitation for this email and role already exists.")

    already = (
        db.query(RoleAssignment)
        .join(User, User.id == RoleAssignment.user_id)
        .filter(
            func.lower(User.email) == email,
            RoleAssignment.role == role,
            RoleAssignment.conference_id == track.conference_id,
            RoleAssignment.track_id == track.id,
        )
        .first()
    )
    if already:
        raise HTTPException(409, "This person already holds that role in this track.")

    inv = Invitation(
        email=email,
        role=role,
        conference_id=track.conference_id,
        track_id=track.id,
        token=secrets.token_urlsafe(32),
        status="pending",
        invited_by_id=inviter.id,
        expires_at=now + timedelta(days=settings.invite_valid_days),
    )
    db.add(inv)
    db.commit()
    db.refresh(inv)
    return inv


def list_invitations(db: Session, user: User, conference_id: int | None, track_id: int | None) -> list[InvitationOut]:
    query = db.query(Invitation)
    if track_id is not None:
        track = db.get(Track, track_id)
        if not track:
            raise HTTPException(404, "Track not found")
        if not (is_chair(db, user, track.conference_id) or is_track_chair(db, user, track.id)):
            raise HTTPException(403, "You cannot view invitations for this track.")
        query = query.filter(Invitation.track_id == track_id)
    elif conference_id is not None:
        if not is_chair(db, user, conference_id):
            raise HTTPException(403, "Only the Chair can view all invitations of a conference.")
        query = query.filter(Invitation.conference_id == conference_id)
    else:
        raise HTTPException(400, "Provide conference_id or track_id.")

    rows = query.order_by(Invitation.id.desc()).all()
    names = _track_names(db, rows)
    return [to_out(r, names) for r in rows]


# ---------- the invited person (public, found by token) ----------
def _get_usable(db: Session, token: str) -> Invitation:
    inv = db.query(Invitation).filter(Invitation.token == token).first()
    if not inv:
        raise HTTPException(404, "Invitation not found.")
    if inv.status != "pending":
        raise HTTPException(410, f"This invitation has already been {USED_WORDS.get(inv.status, inv.status)}.")
    if inv.expires_at < utcnow():
        raise HTTPException(410, "This invitation has expired.")
    return inv


def public_details(db: Session, token: str) -> InvitationPublicOut:
    inv = _get_usable(db, token)
    conf = db.get(Conference, inv.conference_id)
    track = db.get(Track, inv.track_id) if inv.track_id else None
    exists = db.query(User).filter(func.lower(User.email) == inv.email).first() is not None
    return InvitationPublicOut(
        email=inv.email,
        role=inv.role,
        role_label=ROLE_LABELS.get(inv.role, inv.role),
        conference_title=conf.title if conf else None,
        conference_acronym=conf.acronym if conf else None,
        track_name=track.name if track else None,
        expires_at=inv.expires_at,
        account_exists=exists,
    )


def accept_invitation(db: Session, token: str, payload: AcceptInvite) -> dict:
    inv = _get_usable(db, token)
    user = db.query(User).filter(func.lower(User.email) == inv.email).first()
    created = False

    if user is None:
        name = (payload.full_name or "").strip()
        if not name or not payload.password or len(payload.password) < 8:
            raise HTTPException(422, "Full name and a password of at least 8 characters are required.")
        user = create_user_record(db, inv.email, name, payload.affiliation, payload.password)
        created = True

    has_role = (
        db.query(RoleAssignment)
        .filter(
            RoleAssignment.user_id == user.id,
            RoleAssignment.role == inv.role,
            RoleAssignment.conference_id == inv.conference_id,
            RoleAssignment.track_id == inv.track_id,
        )
        .first()
    )
    if not has_role:
        db.add(
            RoleAssignment(
                user_id=user.id, role=inv.role, conference_id=inv.conference_id, track_id=inv.track_id
            )
        )

    if inv.role == "external_reviewer":
        if not inv.paper_id:
            raise HTTPException(409, "External review invitation is missing its paper scope.")
        from app.db.models import Assignment, Paper
        from app.services import scope
        paper = db.get(Paper, inv.paper_id)
        if paper is None or scope.is_author_of(db, user, paper.id):
            raise HTTPException(409, "An author cannot accept an external review assignment.")
        existing = db.query(Assignment).filter(
            Assignment.paper_id == paper.id, Assignment.reviewer_id == user.id
        ).first()
        if existing and existing.kind != "external":
            raise HTTPException(409, "You already have an internal assignment for this paper.")
        if not existing:
            count = db.query(Assignment).filter(Assignment.paper_id == paper.id).count()
            due_at = inv.due_at
            if due_at is not None and due_at.tzinfo is None:
                due_at = due_at.replace(tzinfo=timezone.utc)
            db.add(Assignment(
                paper_id=paper.id, reviewer_id=user.id, kind="external", status="pending",
                due_at=due_at or (datetime.now(timezone.utc) + timedelta(days=14)),
                anon_label=f"External Reviewer {count + 1}", assigned_by=inv.invited_by_id,
            ))

    inv.status = "accepted"
    if inv.role == "external_reviewer" and inv.paper_id:
        audit_record(db, user, inv.conference_id, "external_review.assignment.accepted", "paper", inv.paper_id)
    who = user.full_name or user.email
    notify(db, inv.invited_by_id, "Invitation accepted", f"{who} accepted the invitation as {ROLE_LABELS.get(inv.role, inv.role)}.")
    db.commit()
    return {"message": "Invitation accepted.", "account_created": created}


def decline_invitation(db: Session, token: str) -> dict:
    inv = _get_usable(db, token)
    inv.status = "declined"
    notify(db, inv.invited_by_id, "Invitation declined", f"{inv.email} declined the invitation as {ROLE_LABELS.get(inv.role, inv.role)}.")
    db.commit()
    return {"message": "Invitation declined."}


# ---------- revoke / resend ----------
def _load_manageable(db: Session, user: User, invitation_id: int) -> Invitation:
    inv = db.get(Invitation, invitation_id)
    if not inv:
        raise HTTPException(404, "Invitation not found")
    if not can_manage(db, user, inv.conference_id, inv.track_id, inv.role):
        raise HTTPException(403, "You are not allowed to manage this invitation.")
    return inv


def revoke_invitation(db: Session, user: User, invitation_id: int) -> Invitation:
    inv = _load_manageable(db, user, invitation_id)
    if inv.status != "pending":
        raise HTTPException(409, "Only pending invitations can be cancelled.")
    inv.status = "revoked"
    db.commit()
    db.refresh(inv)
    return inv


def resend_invitation(db: Session, user: User, invitation_id: int) -> Invitation:
    inv = _load_manageable(db, user, invitation_id)
    if inv.status != "pending":  # an expired invitation still has status 'pending'
        raise HTTPException(409, "Only pending or expired invitations can be re-sent.")
    inv.expires_at = utcnow() + timedelta(days=settings.invite_valid_days)
    db.commit()
    db.refresh(inv)
    return inv


# ---------- program committee ----------
def list_committee(db: Session, user: User, conference_id: int) -> list[CommitteeMemberOut]:
    if not is_chair(db, user, conference_id):
        raise HTTPException(403, "Only the Chair can view the program committee.")
    rows = (
        db.query(RoleAssignment, User, Track)
        .join(User, User.id == RoleAssignment.user_id)
        .outerjoin(Track, Track.id == RoleAssignment.track_id)
        .filter(
            RoleAssignment.conference_id == conference_id,
            RoleAssignment.role.in_(COMMITTEE_ROLES),
        )
        .order_by(RoleAssignment.role, User.full_name)
        .all()
    )
    return [
        CommitteeMemberOut(
            assignment_id=ra.id,
            user_id=u.id,
            full_name=u.full_name,
            email=u.email,
            affiliation=getattr(u, "affiliation", None),
            role=ra.role,
            track_id=ra.track_id,
            track_name=t.name if t else None,
        )
        for ra, u, t in rows
    ]


def remove_committee_member(db: Session, user: User, conference_id: int, assignment_id: int) -> None:
    if not is_chair(db, user, conference_id):
        raise HTTPException(403, "Only the Chair can remove committee members.")
    ra = (
        db.query(RoleAssignment)
        .filter(
            RoleAssignment.id == assignment_id,
            RoleAssignment.conference_id == conference_id,
            RoleAssignment.role.in_(COMMITTEE_ROLES),
        )
        .first()
    )
    if not ra:
        raise HTTPException(404, "Committee member not found")
    db.delete(ra)
    db.commit()


# ---------- my roles ----------
def my_roles(db: Session, user: User) -> list[MyRoleOut]:
    rows = (
        db.query(RoleAssignment, Conference, Track)
        .outerjoin(Conference, Conference.id == RoleAssignment.conference_id)
        .outerjoin(Track, Track.id == RoleAssignment.track_id)
        .filter(RoleAssignment.user_id == user.id)
        .all()
    )
    return [
        MyRoleOut(
            role=ra.role,
            conference_id=ra.conference_id,
            conference_acronym=c.acronym if c else None,
            track_id=ra.track_id,
            track_name=t.name if t else None,
        )
        for ra, c, t in rows
    ]
