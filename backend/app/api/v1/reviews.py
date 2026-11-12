"""Phase 6 — reviewer forms, double-blind discussion and progress endpoints."""
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.core.deps import get_current_user, get_db, require_role
from app.core.roles import ROLE_REVIEWER
from app.db.models import User
from app.schemas.review import (
    DiscussionOut, DiscussionPostIn, ReviewManagerOut, ReviewOut,
    ReviewProgressOut, ReviewUpsert,
)
from app.services import review_service

router = APIRouter(tags=["reviews and discussion"])
reviewer_only = require_role(ROLE_REVIEWER)


@router.get("/reviews/mine", response_model=list[ReviewOut])
def my_reviews(db: Session = Depends(get_db), user: User = Depends(reviewer_only)):
    return review_service.my_reviews(db, user)


@router.get("/papers/{paper_id}/review", response_model=ReviewOut)
def my_paper_review(paper_id: int, db: Session = Depends(get_db), user: User = Depends(reviewer_only)):
    return review_service.get_my_review(db, user, paper_id)


@router.put("/papers/{paper_id}/review", response_model=ReviewOut)
def save_paper_review(paper_id: int, data: ReviewUpsert, db: Session = Depends(get_db), user: User = Depends(reviewer_only)):
    return review_service.save_review(db, user, paper_id, data)


@router.get("/papers/{paper_id}/reviews", response_model=list[ReviewManagerOut])
def reviews_for_manager(paper_id: int, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    return review_service.paper_reviews(db, user, paper_id)


@router.get("/tracks/{track_id}/review-progress", response_model=list[ReviewProgressOut])
def review_progress(track_id: int, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    return review_service.progress(db, user, track_id)


@router.get("/papers/{paper_id}/discussion", response_model=DiscussionOut)
def get_discussion(paper_id: int, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    return review_service.get_discussion(db, user, paper_id)


@router.post("/papers/{paper_id}/discussion", response_model=DiscussionOut, status_code=201)
def post_discussion(paper_id: int, data: DiscussionPostIn, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    return review_service.add_discussion_post(db, user, paper_id, data.body)
