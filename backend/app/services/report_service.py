"""Phase 10 aggregate reports, audit visibility, and security posture."""
from datetime import datetime, timedelta, timezone
import csv
import io
import json
from fastapi import HTTPException
from sqlalchemy import func, select, text
from sqlalchemy.orm import Session
from app.core.roles import ROLE_CHAIR
from app.db.models import (Assignment, AuditLog, Conference, DelegatePayment, DelegateRegistration,
                           Decision, Paper, Review, RoleAssignment, User)
from app.services import scope


def _conference_ids(db: Session, user: User) -> list[int]:
    roles = db.scalars(select(RoleAssignment).where(
        RoleAssignment.user_id == user.id, RoleAssignment.role == ROLE_CHAIR)).all()
    if any(r.conference_id is None for r in roles):
        return list(db.scalars(select(Conference.id)).all())
    return sorted({r.conference_id for r in roles if r.conference_id is not None})


def _require_chair(db: Session, user: User) -> list[int]:
    ids = _conference_ids(db, user)
    if not ids:
        raise HTTPException(403, "Conference Chair access required.")
    return ids


def _window(period: str | None):
    if not period or period in ("all", "current"):
        return None
    if period == "30d":
        return datetime.now(timezone.utc) - timedelta(days=30)
    raise HTTPException(422, "period must be all, current, or 30d")


def overview(db: Session, user: User, period: str = "all", conference_id: int | None = None) -> dict:
    accessible = _require_chair(db, user)
    if conference_id is not None:
        if conference_id not in accessible:
            raise HTTPException(403, "You cannot report on this conference.")
        ids = [conference_id]
    elif period == "current":
        current = db.scalar(select(Conference.id).where(Conference.id.in_(accessible),
            Conference.is_active.is_(True)).order_by(Conference.start_date.desc()).limit(1))
        ids = [current] if current else accessible
    else:
        ids = accessible
    cutoff = _window(period)

    paper_q = select(Paper).where(Paper.conference_id.in_(ids))
    if cutoff:
        paper_q = paper_q.where(Paper.created_at >= cutoff.replace(tzinfo=None))
    papers = db.scalars(paper_q).all()
    paper_ids = [p.id for p in papers]
    by_status = {}
    for p in papers:
        by_status[p.status] = by_status.get(p.status, 0) + 1

    review_q = select(func.count(Review.id)).join(Assignment, Assignment.id == Review.assignment_id).join(
        Paper, Paper.id == Assignment.paper_id).where(Paper.conference_id.in_(ids), Review.status == "submitted")
    pending_q = select(func.count(Assignment.id)).join(Paper, Paper.id == Assignment.paper_id).where(
        Paper.conference_id.in_(ids), Assignment.status.in_(("pending", "accepted")))
    decision_q = select(func.count(Decision.id)).join(Paper, Paper.id == Decision.paper_id).where(Paper.conference_id.in_(ids))
    reg_q = select(func.count(DelegateRegistration.id)).where(DelegateRegistration.conference_id.in_(ids))
    paid_q = select(func.count(DelegatePayment.id)).join(DelegateRegistration,
        DelegateRegistration.id == DelegatePayment.registration_id).where(
            DelegateRegistration.conference_id.in_(ids), DelegatePayment.status == "paid")
    if cutoff:
        review_q = review_q.where(Review.submitted_at >= cutoff)
        decision_q = decision_q.where(Decision.updated_at >= cutoff)
        reg_q = reg_q.where(DelegateRegistration.created_at >= cutoff)
    submitted_reviews = db.scalar(review_q) or 0
    reviews_pending = db.scalar(pending_q) or 0
    decision_count = db.scalar(decision_q) or 0
    registration_count = db.scalar(reg_q) or 0
    paid_count = db.scalar(paid_q) or 0

    return {"submissions": len(papers), "withdrawn": by_status.get("withdrawn", 0),
        "reviews_submitted": submitted_reviews, "reviews_pending": reviews_pending,
        "decisions_recorded": decision_count, "delegate_registrations": registration_count,
        "payments_paid": paid_count,
        "paper_stages": [{"status": k, "count": v} for k, v in sorted(by_status.items())],
        "system_status": [
            {"name": "Database", "detail": "Database query succeeded for this report.", "status": "operational"},
            {"name": "Payment checkout", "detail": "Provider integration must be configured before accepting online payment.", "status": "not configured"},
            {"name": "File storage", "detail": "Application-managed private upload directory.", "status": "review required"},
        ]}


def audit_log(db: Session, user: User, page: int = 1, page_size: int = 25,
              action: str | None = None, conference_id: int | None = None) -> dict:
    accessible = _require_chair(db, user)
    if page < 1 or page_size < 1 or page_size > 100:
        raise HTTPException(422, "page must be positive and page_size between 1 and 100")
    ids = [conference_id] if conference_id is not None else accessible
    if any(i not in accessible for i in ids):
        raise HTTPException(403, "You cannot view audit events for this conference.")
    q = select(AuditLog, User).outerjoin(User, User.id == AuditLog.actor_id).where(
        AuditLog.conference_id.in_(ids))
    count_q = select(func.count(AuditLog.id)).where(AuditLog.conference_id.in_(ids))
    if action:
        q = q.where(AuditLog.action.ilike(f"%{action.strip()}%"))
        count_q = count_q.where(AuditLog.action.ilike(f"%{action.strip()}%"))
    total = db.scalar(count_q) or 0
    rows = db.execute(q.order_by(AuditLog.created_at.desc(), AuditLog.id.desc())
                      .offset((page - 1) * page_size).limit(page_size)).all()
    return {"items": [{"id": log.id, "created_at": log.created_at,
        "actor_id": log.actor_id, "actor_label": actor.full_name if actor else "System",
        "action": log.action, "resource_type": log.object_type,
        "resource_id": log.object_id, "result": "success", "details": log.details}
        for log, actor in rows], "total": total, "page": page, "page_size": page_size}


def export_report(db: Session, user: User, period: str, fmt: str, conference_id: int | None = None) -> tuple[str, str]:
    data = overview(db, user, period, conference_id)
    if fmt == "json":
        return json.dumps(data, default=str, indent=2), "application/json"
    if fmt != "csv":
        raise HTTPException(422, "format must be csv or json")
    out = io.StringIO()
    writer = csv.writer(out)
    writer.writerow(["metric", "value"])
    for key in ("submissions", "withdrawn", "reviews_submitted", "reviews_pending",
                "decisions_recorded", "delegate_registrations", "payments_paid"):
        writer.writerow([key, data[key]])
    writer.writerow([])
    writer.writerow(["paper_status", "count"])
    for stage in data["paper_stages"]:
        writer.writerow([stage["status"], stage["count"]])
    return out.getvalue(), "text/csv; charset=utf-8"


def security_overview(db: Session, user: User) -> dict:
    _require_chair(db, user)
    db.execute(text("SELECT 1"))
    from app.services import file_storage
    checks = [
        {"name": "Passwords", "status": "implemented", "detail": "Argon2 password hashing is configured; review password policy before production."},
        {"name": "Authorization", "status": "implemented", "detail": "Sensitive Phase 5–10 services enforce server-side scope checks."},
        {"name": "Double-blind", "status": "implemented", "detail": "Reviewer payloads omit author fields; assignment rules block self-review."},
        {"name": "Uploads", "status": "implemented", "detail": f"Private upload directory: {file_storage.UPLOAD_DIR.name}; content signatures and size are checked."},
        {"name": "Payments", "status": "not configured", "detail": "No payment provider integration or secret is configured; no card data is stored."},
        {"name": "Audit", "status": "partial", "detail": "Workflow decisions, rebuttals, camera-ready submissions and payment status changes are logged."},
    ]
    return {"checked_at": datetime.now(timezone.utc), "checks": checks}
