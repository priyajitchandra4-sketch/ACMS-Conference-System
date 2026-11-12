from fastapi import APIRouter, BackgroundTasks, Depends, status
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.deps import get_current_user, get_db
from app.db.models.conference import Conference, Track
from app.db.models.user import User
from app.schemas.invitation import AcceptInvite, InvitationOut, InvitationPublicOut, InviteCreate
from app.services import invitation_service as svc
from app.services.email_service import send_invitation_email

router = APIRouter()  # mounted in router.py with prefix="/invitations"


def _queue_email(background_tasks: BackgroundTasks, db: Session, inv) -> None:
    conf = db.get(Conference, inv.conference_id)
    track = db.get(Track, inv.track_id) if inv.track_id else None
    link = f"{settings.frontend_url}/invite/{inv.token}"
    background_tasks.add_task(
        send_invitation_email,
        inv.email,
        link,
        inv.role,
        conf.title if conf else None,
        track.name if track else None,
        settings.invite_valid_days,
    )


# ----- for Chair / Track Chair (login required) -----
@router.post("/", response_model=InvitationOut, status_code=status.HTTP_201_CREATED)
def create_invitation(
    payload: InviteCreate,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    inv = svc.create_invitation(db, current_user, payload.track_id, payload.email, payload.role)
    _queue_email(background_tasks, db, inv)
    return svc.to_out(inv, svc._track_names(db, [inv]))


@router.get("/", response_model=list[InvitationOut])
def list_invitations(
    conference_id: int | None = None,
    track_id: int | None = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return svc.list_invitations(db, current_user, conference_id, track_id)


@router.post("/{invitation_id}/revoke", response_model=InvitationOut)
def revoke_invitation(
    invitation_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    inv = svc.revoke_invitation(db, current_user, invitation_id)
    return svc.to_out(inv, svc._track_names(db, [inv]))


@router.post("/{invitation_id}/resend", response_model=InvitationOut)
def resend_invitation(
    invitation_id: int,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    inv = svc.resend_invitation(db, current_user, invitation_id)
    _queue_email(background_tasks, db, inv)
    return svc.to_out(inv, svc._track_names(db, [inv]))


# ----- for the invited person (public: the token is the key) -----
@router.get("/{token}", response_model=InvitationPublicOut)
def get_invitation_details(token: str, db: Session = Depends(get_db)):
    return svc.public_details(db, token)


@router.post("/{token}/accept")
def accept_invitation(token: str, payload: AcceptInvite, db: Session = Depends(get_db)):
    return svc.accept_invitation(db, token, payload)


@router.post("/{token}/decline")
def decline_invitation(token: str, db: Session = Depends(get_db)):
    return svc.decline_invitation(db, token)