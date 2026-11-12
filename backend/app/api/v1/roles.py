from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.deps import get_current_user, get_db
from app.db.models.user import User
from app.schemas.invitation import MyRoleOut
from app.services import invitation_service as svc

router = APIRouter()  # mounted with prefix="/roles"


@router.get("/mine", response_model=list[MyRoleOut])
def my_roles(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """Every role the logged-in user holds. The frontend uses this to build the sidebar."""
    return svc.my_roles(db, current_user)