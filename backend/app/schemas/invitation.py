from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, EmailStr

InviteRole = Literal["track_chair", "meta_reviewer", "reviewer"]


class InviteCreate(BaseModel):
    email: EmailStr
    role: InviteRole
    track_id: int


class InvitationOut(BaseModel):
    """What the chair / track chair sees. The token is deliberately NOT included."""
    id: int
    email: str
    role: str
    conference_id: int
    track_id: int | None = None
    track_name: str | None = None
    status: str  # pending | accepted | declined | revoked | expired
    expires_at: datetime
    created_at: datetime | None = None


class InvitationPublicOut(BaseModel):
    """What the invited person sees on the accept page (found by token)."""
    email: str
    role: str
    role_label: str
    conference_title: str | None = None
    conference_acronym: str | None = None
    track_name: str | None = None
    expires_at: datetime
    account_exists: bool


class AcceptInvite(BaseModel):
    # Only needed when the person has no account yet
    full_name: str | None = None
    affiliation: str | None = None
    password: str | None = None


class NotificationOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    title: str
    message: str
    is_read: bool
    created_at: datetime | None = None


class CommitteeMemberOut(BaseModel):
    assignment_id: int
    user_id: int
    full_name: str | None = None
    email: str
    affiliation: str | None = None
    role: str
    track_id: int | None = None
    track_name: str | None = None


class MyRoleOut(BaseModel):
    role: str
    conference_id: int | None = None
    conference_acronym: str | None = None
    track_id: int | None = None
    track_name: str | None = None