"""Phase 6 review/discussion schemas. Identity fields are intentionally omitted."""
from datetime import datetime
from pydantic import BaseModel, ConfigDict, Field, field_validator

RECOMMENDATIONS = {"accept", "weak_accept", "borderline", "weak_reject", "reject"}


class ReviewUpsert(BaseModel):
    summary: str | None = Field(default=None, max_length=12000)
    strengths: str | None = Field(default=None, max_length=12000)
    weaknesses: str | None = Field(default=None, max_length=12000)
    questions: str | None = Field(default=None, max_length=12000)
    rating: int | None = Field(default=None, ge=1, le=5)
    confidence: int | None = Field(default=None, ge=1, le=5)
    recommendation: str | None = None
    confidential_comments: str | None = Field(default=None, max_length=12000)
    submit: bool = False

    @field_validator("recommendation")
    @classmethod
    def valid_recommendation(cls, value):
        if value is not None and value not in RECOMMENDATIONS:
            raise ValueError("Invalid recommendation")
        return value


class ReviewOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int | None = None
    assignment_id: int
    paper_id: int
    anon_label: str
    paper_number: str | None = None
    paper_title: str
    paper_abstract: str | None = None
    summary: str | None = None
    strengths: str | None = None
    weaknesses: str | None = None
    questions: str | None = None
    rating: int | None = None
    confidence: int | None = None
    recommendation: str | None = None
    confidential_comments: str | None = None
    status: str = "not_started"
    submitted_at: datetime | None = None
    due_at: datetime | None = None


class ReviewManagerOut(BaseModel):
    """Meta/management view: reviewer identity remains pseudonymous."""
    id: int | None = None
    assignment_id: int
    anon_label: str
    summary: str | None = None
    strengths: str | None = None
    weaknesses: str | None = None
    questions: str | None = None
    rating: int | None = None
    confidence: int | None = None
    recommendation: str | None = None
    confidential_comments: str | None = None
    status: str
    submitted_at: datetime | None = None


class ReviewProgressOut(BaseModel):
    paper_id: int
    paper_number: str | None = None
    paper_title: str
    assigned: int
    accepted: int
    submitted: int
    pending: int


class DiscussionPostIn(BaseModel):
    body: str = Field(min_length=1, max_length=10000)

    @field_validator("body")
    @classmethod
    def nonblank(cls, value):
        value = value.strip()
        if not value:
            raise ValueError("Post cannot be blank")
        return value


class DiscussionPostOut(BaseModel):
    id: int
    author_label: str
    body: str
    created_at: datetime
    edited_at: datetime | None = None


class DiscussionOut(BaseModel):
    paper_id: int
    paper_number: str | None = None
    paper_title: str
    paper_abstract: str | None = None
    status: str
    posts: list[DiscussionPostOut]
