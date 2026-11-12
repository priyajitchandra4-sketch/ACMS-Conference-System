"""Phase 7: decision letters, rebuttals and camera-ready uploads."""
from fastapi import APIRouter, Depends, File, Form, UploadFile
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session
from app.core.deps import get_current_user, get_db
from app.db.models import User
from app.services import workflow_service as svc

router = APIRouter(tags=["decisions and publication"])


class DecisionIn(BaseModel):
    decision: str = Field(min_length=1, max_length=30)
    rationale: str = Field(min_length=1, max_length=12000)


class RebuttalIn(BaseModel):
    rebuttal: str = Field(min_length=1, max_length=12000)


@router.get("/chair/decisions/queue")
def chair_queue(conference_id: int | None = None, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    return svc.decision_queue(db, user, conference_id)


@router.get("/author/decisions")
def author_decisions(db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    return svc.author_decisions(db, user)


@router.get("/papers/{paper_id}/decision")
def get_decision(paper_id: int, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    return svc.get_decision(db, user, paper_id)


@router.post("/papers/{paper_id}/decision")
def record_decision(paper_id: int, payload: DecisionIn, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    return svc.record_decision(db, user, paper_id, payload.decision, payload.rationale)


@router.get("/papers/{paper_id}/rebuttal")
def get_rebuttal(paper_id: int, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    return svc.get_rebuttal(db, user, paper_id)


@router.post("/papers/{paper_id}/rebuttal")
def submit_rebuttal(paper_id: int, payload: RebuttalIn, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    return svc.submit_rebuttal(db, user, paper_id, payload.rebuttal)


@router.get("/papers/{paper_id}/camera-ready")
def get_camera_ready(paper_id: int, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    return svc.camera_ready_info(db, user, paper_id)


@router.post("/papers/{paper_id}/camera-ready")
def upload_camera_ready(
    paper_id: int,
    file: UploadFile = File(...),
    copyright_confirmed: bool = Form(...),
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    return svc.submit_camera_ready(db, user, paper_id, file, copyright_confirmed)
