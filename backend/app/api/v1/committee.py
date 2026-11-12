from fastapi import APIRouter, Depends, Response, status
from sqlalchemy.orm import Session

from app.core.deps import get_current_user, get_db
from app.db.models.user import User
from app.schemas.invitation import CommitteeMemberOut
from app.services import invitation_service as svc

router = APIRouter()  # mounted with prefix="/conferences"


@router.get("/{conference_id}/committee", response_model=list[CommitteeMemberOut])
def list_committee(
    conference_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return svc.list_committee(db, current_user, conference_id)


@router.delete("/{conference_id}/committee/{assignment_id}", status_code=status.HTTP_204_NO_CONTENT)
def remove_committee_member(
    conference_id: int,
    assignment_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    svc.remove_committee_member(db, current_user, conference_id, assignment_id)
    return Response(status_code=status.HTTP_204_NO_CONTENT)