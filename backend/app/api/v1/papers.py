from pathlib import Path
from typing import List
import mimetypes

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, status
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session

from app.core.deps import get_current_user, get_db
from app.db.models.paper import Paper
from app.schemas.paper import PaperCreate, PaperOut, PaperUpdate
from app.services import paper_service

router = APIRouter()  # mounted with prefix="/papers"


@router.post("/", response_model=PaperOut, status_code=status.HTTP_201_CREATED)
def create_paper_draft(payload: PaperCreate, db: Session = Depends(get_db), user=Depends(get_current_user)):
    return paper_service.create_draft(db, user.id, payload)


@router.get("/mine", response_model=List[PaperOut])
def list_my_papers(db: Session = Depends(get_db), user=Depends(get_current_user)):
    return db.query(Paper).filter(Paper.submitter_id == user.id).order_by(Paper.id.desc()).all()


@router.get("/{paper_id}", response_model=PaperOut)
def get_paper(paper_id: int, db: Session = Depends(get_db), user=Depends(get_current_user)):
    paper = db.get(Paper, paper_id)
    if not paper:
        raise HTTPException(status_code=404, detail="Paper not found")
    if not paper_service.can_view_paper(db, user, paper):
        raise HTTPException(status_code=403, detail="You are not allowed to view this paper.")
    return paper


@router.get("/{paper_id}/manuscript/final")
def get_final_manuscript(paper_id: int, db: Session = Depends(get_db), user=Depends(get_current_user)):
    """Stream only the latest manuscript version to an authorized viewer."""
    version, stored_file = paper_service.get_final_manuscript(db, paper_id, user)
    media_type = mimetypes.guess_type(version.original_filename or "")[0] or "application/octet-stream"
    return FileResponse(
        path=stored_file,
        media_type=media_type,
        filename=version.original_filename or Path(stored_file).name,
        content_disposition_type="inline",
    )


@router.patch("/{paper_id}", response_model=PaperOut)
def update_paper_draft(
    paper_id: int, payload: PaperUpdate, db: Session = Depends(get_db), user=Depends(get_current_user)
):
    return paper_service.update_draft(db, paper_id, user.id, payload)


@router.post("/{paper_id}/manuscript", response_model=PaperOut)
def upload_manuscript(
    paper_id: int,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    user=Depends(get_current_user),
):
    return paper_service.add_manuscript(db, paper_id, user.id, file)


@router.post("/{paper_id}/submit", response_model=PaperOut)
def submit_paper_endpoint(paper_id: int, db: Session = Depends(get_db), user=Depends(get_current_user)):
    return paper_service.submit_paper(db, paper_id, user.id)