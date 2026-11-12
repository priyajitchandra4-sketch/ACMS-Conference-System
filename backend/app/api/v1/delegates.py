"""Phase 9 delegate registration and payment status; no card data is stored."""
from pydantic import BaseModel, Field
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.core.deps import get_current_user, get_db
from app.db.models import User
from app.services import workflow_service as svc

router = APIRouter(tags=["delegate registration"])


class RegistrationIn(BaseModel):
    conference_id: int | None = None
    attendee_name: str | None = Field(default=None, max_length=120)
    affiliation: str | None = Field(default=None, max_length=200)
    dietary_requirements: str | None = Field(default=None, max_length=1000)
    accessibility_needs: str | None = Field(default=None, max_length=1000)
    ticket_type: str = "standard"


class PaymentStatusIn(BaseModel):
    status: str


@router.get("/delegates/me/registration")
def get_my_registration(db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    return svc.my_registration(db, user)


@router.post("/delegates/registrations", status_code=201)
def register(payload: RegistrationIn, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    if payload.conference_id is None:
        raise HTTPException(422, "conference_id is required.")
    return svc.register_delegate(db, user, payload.conference_id, payload.ticket_type,
        payload.attendee_name, payload.affiliation, payload.dietary_requirements,
        payload.accessibility_needs)


@router.put("/delegates/me/registration")
def update_registration(payload: RegistrationIn, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    return svc.update_registration(db, user, payload.ticket_type, payload.attendee_name,
        payload.affiliation, payload.dietary_requirements, payload.accessibility_needs,
        payload.conference_id)


@router.get("/delegates/me/payment")
def get_my_payment(db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    return svc.my_payment(db, user)


@router.post("/delegates/payments/checkout")
def create_checkout(db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    return svc.create_checkout(db, user)


@router.get("/chair/delegates")
def list_delegates(conference_id: int | None = None, status: str | None = None,
                   db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    return svc.chair_registrations(db, user, conference_id, status)


@router.post("/chair/delegates/{registration_id}/payment")
def set_payment(registration_id: int, payload: PaymentStatusIn,
                db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    return svc.mark_payment(db, user, registration_id, payload.status)
