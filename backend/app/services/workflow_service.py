"""Business rules for Phases 7, 9 and 10; API handlers remain thin."""
from datetime import datetime, timedelta, timezone
import csv
import io
import json
from fastapi import HTTPException
from sqlalchemy import func, select
from sqlalchemy.orm import Session
from app.core.roles import ROLE_CHAIR, ROLE_META_REVIEWER, ROLE_TRACK_CHAIR
from app.db.models import (
    Assignment, AuditLog, CameraReadySubmission, Conference, DelegatePayment,
    DelegateRegistration, Decision, Paper, PaperAuthor, PaperVersion, Rebuttal,
    Review, RoleAssignment, Track, User,
)
from app.services import file_storage, scope
from app.services.deadline_service import ensure_deadline_open

DECISIONS = {"accept", "minor_revisions", "major_revisions", "reject"}


def _roles(db: Session, user: User, paper: Paper) -> set[str]:
    return {r.role for r in db.scalars(select(RoleAssignment).where(
        RoleAssignment.user_id == user.id,
        (RoleAssignment.conference_id == paper.conference_id) | RoleAssignment.conference_id.is_(None),
        (RoleAssignment.track_id == paper.track_id) | RoleAssignment.track_id.is_(None),
    )).all()}


def _manager(db: Session, user: User, paper: Paper) -> bool:
    return scope.is_meta_for_paper(db, user.id, paper.id) or bool(
        _roles(db, user, paper) & {ROLE_CHAIR, ROLE_TRACK_CHAIR, ROLE_META_REVIEWER}
    )


def _require_author(db: Session, user: User, paper: Paper) -> None:
    if not scope.is_author_of(db, user, paper.id):
        raise HTTPException(403, "Only a listed author may access this submission.")


def _audit(db: Session, actor: User | None, conference_id: int | None, action: str,
           object_type: str, object_id: int | str | None, details: dict | None = None) -> None:
    db.add(AuditLog(actor_id=actor.id if actor else None, conference_id=conference_id,
                    action=action, object_type=object_type,
                    object_id=str(object_id) if object_id is not None else None,
                    details=details or None))


def decision_queue(db: Session, user: User, conference_id: int | None = None) -> list[dict]:
    papers = db.scalars(select(Paper).order_by(Paper.id.desc())).all()
    result = []
    for paper in papers:
        if conference_id and paper.conference_id != conference_id:
            continue
        if not _manager(db, user, paper):
            continue
        decision = db.scalar(select(Decision).where(Decision.paper_id == paper.id))
        count = db.scalar(select(func.count(Review.id)).join(
            Assignment, Assignment.id == Review.assignment_id
        ).where(Assignment.paper_id == paper.id, Review.status == "submitted")) or 0
        track = db.get(Track, paper.track_id)
        result.append({"paper_id": paper.id, "paper_number": paper.paper_number,
                       "title": paper.title, "track_name": track.name if track else None,
                       "status": paper.status, "decision": decision.decision if decision else None,
                       "submitted_reviews": count, "review_count": count})
    return result


def get_decision(db: Session, user: User, paper_id: int) -> dict:
    paper = scope.get_paper_or_404(db, paper_id)
    if not _manager(db, user, paper):
        _require_author(db, user, paper)
    decision = db.scalar(select(Decision).where(Decision.paper_id == paper.id))
    track = db.get(Track, paper.track_id)
    return {"paper_id": paper.id, "paper_number": paper.paper_number,
            "title": paper.title, "abstract": paper.abstract,
            "track_name": track.name if track else None,
            "decision": decision.decision if decision else None,
            "rationale": decision.rationale if decision else None,
            "decided_at": decision.updated_at if decision else None}


def record_decision(db: Session, user: User, paper_id: int, decision_value: str, rationale: str) -> dict:
    paper = scope.get_paper_or_404(db, paper_id)
    if not _manager(db, user, paper):
        raise HTTPException(403, "Paper decision access is restricted to its Chair or Meta-Reviewer.")
    if decision_value not in DECISIONS:
        raise HTTPException(422, "Choose a valid decision.")
    rationale = rationale.strip()
    if not rationale:
        raise HTTPException(422, "A decision rationale is required.")
    submitted_count = db.scalar(select(func.count(Review.id)).join(
        Assignment, Assignment.id == Review.assignment_id
    ).where(Assignment.paper_id == paper.id, Review.status == "submitted")) or 0
    if submitted_count == 0:
        raise HTTPException(409, "At least one submitted review is required before a decision.")
    row = db.scalar(select(Decision).where(Decision.paper_id == paper.id))
    if row is None:
        row = Decision(paper_id=paper.id, decision=decision_value, rationale=rationale, decided_by=user.id)
        db.add(row)
    else:
        row.decision, row.rationale, row.decided_by = decision_value, rationale, user.id
    _audit(db, user, paper.conference_id, "paper.decision.recorded", "paper", paper.id,
           {"decision": decision_value})
    db.commit()
    db.refresh(row)
    return get_decision(db, user, paper.id)


def author_decisions(db: Session, user: User) -> list[dict]:
    ids = scope.author_paper_ids(db, user)
    if not ids:
        return []
    rows = db.execute(select(Paper, Decision).outerjoin(
        Decision, Decision.paper_id == Paper.id
    ).where(Paper.id.in_(ids)).order_by(Paper.id.desc())).all()
    output = []
    for paper, dec in rows:
        deadline = scope_deadline(db, paper.conference_id, "camera_ready", paper.track_id)
        output.append({"paper_id": paper.id, "paper_number": paper.paper_number,
                       "title": paper.title, "decision": dec.decision if dec else None,
                       "rationale": dec.rationale if dec else None,
                       "camera_ready_open": bool(dec and dec.decision in ("accept", "minor_revisions")
                                                  and (deadline is None or deadline >= datetime.now(timezone.utc)))})
    return output


def scope_deadline(db: Session, conference_id: int, kind: str, track_id: int):
    from app.services.deadline_service import get_effective_deadline, closes_at
    row = get_effective_deadline(db, conference_id, kind, track_id)
    return closes_at(row) if row else None


def get_rebuttal(db: Session, user: User, paper_id: int) -> dict:
    paper = scope.get_paper_or_404(db, paper_id)
    _require_author(db, user, paper)
    row = db.scalar(select(Rebuttal).where(Rebuttal.paper_id == paper.id))
    if row is None:
        raise HTTPException(404, "No rebuttal has been submitted.")
    return {"paper_id": row.paper_id, "rebuttal": row.rebuttal, "submitted_at": row.submitted_at}


def submit_rebuttal(db: Session, user: User, paper_id: int, text: str) -> dict:
    paper = scope.get_paper_or_404(db, paper_id)
    _require_author(db, user, paper)
    if not (text or "").strip():
        raise HTTPException(422, "Rebuttal cannot be blank.")
    decision = db.scalar(select(Decision).where(Decision.paper_id == paper.id))
    if decision is None or decision.decision not in ("minor_revisions", "major_revisions"):
        raise HTTPException(409, "A rebuttal is available only for a revision decision.")
    ensure_deadline_open(db, paper.conference_id, "rebuttal", paper.track_id)
    row = db.scalar(select(Rebuttal).where(Rebuttal.paper_id == paper.id))
    if row:
        raise HTTPException(409, "A submitted rebuttal is locked and cannot be replaced.")
    row = Rebuttal(paper_id=paper.id, author_id=user.id, rebuttal=text.strip())
    db.add(row)
    _audit(db, user, paper.conference_id, "paper.rebuttal.submitted", "paper", paper.id)
    db.commit()
    db.refresh(row)
    return {"paper_id": row.paper_id, "rebuttal": row.rebuttal, "submitted_at": row.submitted_at}


def camera_ready_info(db: Session, user: User, paper_id: int) -> dict:
    paper = scope.get_paper_or_404(db, paper_id)
    _require_author(db, user, paper)
    row = db.scalar(select(CameraReadySubmission).where(CameraReadySubmission.paper_id == paper.id))
    if not row:
        raise HTTPException(404, "No camera-ready submission yet.")
    version = db.get(PaperVersion, row.version_id)
    return {"paper_id": paper.id, "original_filename": version.original_filename,
            "copyright_confirmed": row.copyright_confirmed, "submitted_at": row.submitted_at}


def submit_camera_ready(db: Session, user: User, paper_id: int, file, copyright_confirmed: bool) -> dict:
    paper = scope.get_paper_or_404(db, paper_id)
    _require_author(db, user, paper)
    decision = db.scalar(select(Decision).where(Decision.paper_id == paper.id))
    if decision is None or decision.decision not in ("accept", "minor_revisions"):
        raise HTTPException(409, "A camera-ready version is not requested for this decision.")
    ensure_deadline_open(db, paper.conference_id, "camera_ready", paper.track_id)
    if not copyright_confirmed:
        raise HTTPException(422, "Copyright confirmation is required.")
    if db.scalar(select(CameraReadySubmission.id).where(CameraReadySubmission.paper_id == paper.id)):
        raise HTTPException(409, "A camera-ready version has already been submitted.")
    stored_path, digest, _size = file_storage.save_uploaded_file(file)
    try:
        latest = db.scalar(select(func.max(PaperVersion.version_number)).where(PaperVersion.paper_id == paper.id)) or 0
        version = PaperVersion(paper_id=paper.id, version_number=latest + 1,
                               kind="camera_ready", file_path=stored_path, sha256=digest,
                               original_filename=file.filename or "camera-ready")
        db.add(version)
        db.flush()
        row = CameraReadySubmission(paper_id=paper.id, version_id=version.id, author_id=user.id,
                                    copyright_confirmed=True)
        db.add(row)
        _audit(db, user, paper.conference_id, "paper.camera_ready.submitted", "paper", paper.id)
        db.commit()
        db.refresh(row)
    except Exception:
        db.rollback()
        file_storage.delete_file(stored_path)
        raise
    return {"paper_id": paper.id, "original_filename": version.original_filename,
            "copyright_confirmed": True, "submitted_at": row.submitted_at}


def _registration_out(db: Session, row: DelegateRegistration) -> dict:
    payment = db.scalar(select(DelegatePayment).where(DelegatePayment.registration_id == row.id))
    return {"registration_id": row.id, "id": row.id, "conference_id": row.conference_id,
            "attendee_name": row.attendee_name, "email": row.email,
            "affiliation": row.affiliation, "dietary_requirements": row.dietary_requirements,
            "accessibility_needs": row.accessibility_needs,
            "ticket_type": row.ticket_type, "status": row.status,
            "amount": row.amount / 100, "currency": row.currency,
            "payment_status": payment.status if payment else "unpaid",
            "checkout_url": payment.checkout_url if payment else None}


def my_registration(db: Session, user: User) -> dict | None:
    row = db.scalar(select(DelegateRegistration).where(DelegateRegistration.user_id == user.id)
                    .order_by(DelegateRegistration.id.desc()))
    return _registration_out(db, row) if row else None


def register_delegate(db: Session, user: User, conference_id: int, ticket_type: str,
                      attendee_name: str | None = None, affiliation: str | None = None,
                      dietary_requirements: str | None = None,
                      accessibility_needs: str | None = None) -> dict:
    conf = db.get(Conference, conference_id)
    if not conf or not conf.is_active:
        raise HTTPException(404, "Active conference not found.")
    if ticket_type not in {"student", "standard", "virtual"}:
        raise HTTPException(422, "Invalid ticket type.")
    row = db.scalar(select(DelegateRegistration).where(
        DelegateRegistration.user_id == user.id, DelegateRegistration.conference_id == conf.id))
    if row is None:
        row = DelegateRegistration(conference_id=conf.id, user_id=user.id,
            attendee_name=(attendee_name or user.full_name).strip(), email=user.email,
            affiliation=affiliation, dietary_requirements=dietary_requirements,
            accessibility_needs=accessibility_needs, ticket_type=ticket_type)
        db.add(row)
    else:
        if row.status == "confirmed":
            same = (row.ticket_type == ticket_type
                    and row.attendee_name == (attendee_name or user.full_name).strip()
                    and row.affiliation == affiliation
                    and row.dietary_requirements == dietary_requirements
                    and row.accessibility_needs == accessibility_needs)
            if same:
                return _registration_out(db, row)
            raise HTTPException(409, "Confirmed registrations cannot be changed online.")
        row.ticket_type = ticket_type
        row.attendee_name = (attendee_name or user.full_name).strip()
        row.affiliation = affiliation
        row.dietary_requirements = dietary_requirements
        row.accessibility_needs = accessibility_needs
        if row.status == "cancelled":
            row.status = "pending"
    _audit(db, user, conf.id, "delegate.registration.saved", "delegate_registration", row.id)
    db.commit()
    db.refresh(row)
    return _registration_out(db, row)


def update_registration(db: Session, user: User, ticket_type: str, attendee_name: str | None = None,
                        affiliation: str | None = None, dietary_requirements: str | None = None,
                        accessibility_needs: str | None = None, conference_id: int | None = None) -> dict:
    row = db.scalar(select(DelegateRegistration).where(DelegateRegistration.user_id == user.id)
                    .order_by(DelegateRegistration.id.desc()))
    if row is None:
        raise HTTPException(404, "Register for a conference first.")
    if ticket_type not in {"student", "standard", "virtual"}:
        raise HTTPException(422, "Invalid ticket type.")
    if row.status == "confirmed":
        raise HTTPException(409, "Confirmed registrations cannot be changed online.")
    if conference_id is not None and conference_id != row.conference_id:
        raise HTTPException(409, "A separate registration is required for another conference.")
    row.ticket_type = ticket_type
    row.attendee_name = (attendee_name or user.full_name).strip()
    row.affiliation = affiliation
    row.dietary_requirements = dietary_requirements
    row.accessibility_needs = accessibility_needs
    db.commit()
    return _registration_out(db, row)


def my_payment(db: Session, user: User) -> dict | None:
    reg = db.scalar(select(DelegateRegistration).where(DelegateRegistration.user_id == user.id)
                    .order_by(DelegateRegistration.id.desc()))
    if reg is None:
        return None
    payment = db.scalar(select(DelegatePayment).where(DelegatePayment.registration_id == reg.id))
    return {"registration_id": reg.id, "status": payment.status if payment else "unpaid",
            "checkout_url": payment.checkout_url if payment else None,
            "amount": reg.amount / 100, "currency": reg.currency}


def create_checkout(db: Session, user: User) -> dict:
    reg = db.scalar(select(DelegateRegistration).where(DelegateRegistration.user_id == user.id)
                    .order_by(DelegateRegistration.id.desc()))
    if reg is None:
        raise HTTPException(404, "Register for a conference before checkout.")
    payment = db.scalar(select(DelegatePayment).where(DelegatePayment.registration_id == reg.id))
    if payment is None:
        payment = DelegatePayment(registration_id=reg.id, status="pending")
        db.add(payment)
        db.commit()
    if not payment.checkout_url:
        # No gateway integration/secret is present in the supplied project. Never return a fake success URL.
        raise HTTPException(503, "Payment checkout is not configured by the conference administrator.")
    return {"checkout_url": payment.checkout_url, "status": payment.status}


def chair_registrations(db: Session, user: User, conference_id: int | None, status: str | None) -> list[dict]:
    q = select(DelegateRegistration, Conference).join(Conference, Conference.id == DelegateRegistration.conference_id)
    if conference_id:
        q = q.where(DelegateRegistration.conference_id == conference_id)
    rows = db.execute(q.order_by(DelegateRegistration.id.desc())).all()
    result = []
    for reg, conf in rows:
        if ROLE_CHAIR not in {r.role for r in scope.roles_of(db, user.id)
                              if r.conference_id in (None, conf.id)}:
            continue
        row = _registration_out(db, reg)
        row["conference_name"] = conf.title
        if status and row["status"] != status:
            continue
        result.append(row)
    return result


def mark_payment(db: Session, user: User, registration_id: int, status: str) -> dict:
    reg = db.get(DelegateRegistration, registration_id)
    if reg is None:
        raise HTTPException(404, "Registration not found.")
    if not scope.is_chair(db, user.id, reg.conference_id):
        raise HTTPException(403, "Conference Chair access required.")
    if status not in {"paid", "pending", "refunded", "failed"}:
        raise HTTPException(422, "Invalid payment status.")
    payment = db.scalar(select(DelegatePayment).where(DelegatePayment.registration_id == reg.id))
    if payment is None:
        payment = DelegatePayment(registration_id=reg.id)
        db.add(payment)
    payment.status = status
    payment.paid_at = datetime.now(timezone.utc) if status == "paid" else None
    reg.status = "confirmed" if status == "paid" else "pending"
    _audit(db, user, reg.conference_id, "delegate.payment.status_changed", "delegate_registration", reg.id,
           {"status": status})
    db.commit()
    return _registration_out(db, reg)
