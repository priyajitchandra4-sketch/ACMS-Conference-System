"""Phase 8 external-reviewer invitation and review endpoints."""
from datetime import datetime
from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException
from pydantic import BaseModel, EmailStr
from sqlalchemy import select
from sqlalchemy.orm import Session
from app.core.config import settings
from app.core.deps import get_current_user, get_db
from app.db.models import Assignment, Conference, Paper, Track, User
from app.services import assignment_service, external_service, review_service
from app.services.email_service import send_invitation_email

router = APIRouter(tags=["external reviews"])


class ExternalInviteIn(BaseModel):
    paper_id: int
    email: EmailStr
    due_at: datetime | None = None
    kind: str = "external"


def _require_external_assignment(db: Session, user: User, paper_id: int) -> None:
    row = db.scalar(select(Assignment).where(Assignment.paper_id == paper_id,
        Assignment.reviewer_id == user.id, Assignment.kind == "external",
        Assignment.status == "accepted"))
    if row is None:
        raise HTTPException(403, "An accepted external assignment is required.")


@router.get("/external/assignments")
def mine(db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    return external_service.my_assignments(db, user)


@router.post("/external/assignments/{assignment_id}/accept")
def accept(assignment_id: int, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    row = db.get(Assignment, assignment_id)
    if row is None or row.kind != "external":
        raise HTTPException(404, "External assignment not found.")
    return assignment_service.respond(db, user, assignment_id, True)


@router.post("/external/assignments/{assignment_id}/decline")
def decline(assignment_id: int, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    row = db.get(Assignment, assignment_id)
    if row is None or row.kind != "external":
        raise HTTPException(404, "External assignment not found.")
    return assignment_service.respond(db, user, assignment_id, False)


@router.get("/external/papers/{paper_id}/review")
def get_external_review(paper_id: int, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    _require_external_assignment(db, user, paper_id)
    return review_service.get_my_review(db, user, paper_id)


@router.put("/external/papers/{paper_id}/review")
def save_external_review(paper_id: int, payload: dict, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    _require_external_assignment(db, user, paper_id)
    from app.schemas.review import ReviewUpsert
    data = ReviewUpsert.model_validate(payload)
    return review_service.save_review(db, user, paper_id, data)


@router.get("/chair/external-assignments")
def manager_list(conference_id: int | None = None, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    return external_service.list_for_manager(db, user, conference_id)


@router.post("/chair/external-assignments", status_code=201)
def invite_external(payload: ExternalInviteIn, background_tasks: BackgroundTasks,
                    db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    if payload.kind != "external":
        raise HTTPException(422, "This endpoint only creates external-kind assignments.")
    result = external_service.create_invitation(db, user, payload.paper_id, payload.email, payload.due_at)
    paper = db.get(Paper, payload.paper_id)
    conf = db.get(Conference, paper.conference_id) if paper else None
    track = db.get(Track, paper.track_id) if paper else None
    background_tasks.add_task(send_invitation_email, result["email"], result["accept_url"],
        "external_reviewer", conf.title if conf else None, track.name if track else None,
        settings.invite_valid_days)
    return {k: v for k, v in result.items() if k != "accept_url"}


@router.delete("/chair/external-assignments/{assignment_id}", status_code=204)
def cancel_external(assignment_id: int, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    external_service.cancel(db, user, assignment_id)

