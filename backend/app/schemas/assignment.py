"""Phase 5 — assignment schemas."""
from datetime import datetime

from pydantic import BaseModel, ConfigDict


class AssignReviewerIn(BaseModel):
    reviewer_id: int
    due_at: datetime | None = None  # defaults to now + 14 days in the service


class AssignMetaIn(BaseModel):
    meta_reviewer_id: int


class AssignmentOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    paper_id: int
    reviewer_id: int
    kind: str
    status: str
    due_at: datetime | None = None
    anon_label: str
    created_at: datetime


class MyAssignmentOut(AssignmentOut):
    """What a reviewer sees in 'My Assignments'. Paper title is fine;
    author identities are NOT included (double-blind)."""
    paper_number: str | None = None
    paper_title: str | None = None
    paper_status: str | None = None


class PaperAssignmentOut(AssignmentOut):
    """For Meta-Reviewers / Track Chairs only — they may see reviewer names.
    Never expose this schema to authors."""
    reviewer_name: str | None = None
    reviewer_email: str | None = None


class MetaAssignmentOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    paper_id: int
    meta_reviewer_id: int
    meta_reviewer_name: str | None = None
    created_at: datetime


class CandidateOut(BaseModel):
    """One row of the 'Assign Reviewers' table: bid, expertise and conflict
    side by side, exactly as the build guide asks."""
    user_id: int
    full_name: str
    email: str
    bid: str | None = None            # want | maybe | no | None (no bid yet)
    conflict: str | None = None       # reason text if a conflict was declared
    expertise: dict[int, int] = {}    # subject_area_id -> level, for this paper's areas
    expertise_score: int = 0          # sum of levels, for sorting
    active_load: int = 0              # pending + accepted assignments elsewhere
    is_author: bool = False           # computed so the UI can disable the button


class MetaPaperOut(BaseModel):
    """A paper assigned to me as Meta-Reviewer."""
    paper_id: int
    paper_number: str | None = None
    title: str
    status: str
    track_id: int | None = None
    reviewers_total: int = 0
    reviewers_accepted: int = 0


class TrackOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    name: str


class MemberOut(BaseModel):
    user_id: int
    full_name: str
    email: str


class PaperOverviewOut(BaseModel):
    """One row of the Track Chair's Assignments Manager."""
    paper_id: int
    paper_number: str | None = None
    title: str
    status: str
    meta_reviewers: list[MemberOut] = []
    pending: int = 0
    accepted: int = 0
    declined: int = 0
