"""Phase 5 — bidding schemas (what goes in and out of the bidding endpoints)."""
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field


class ExpertiseItem(BaseModel):
    subject_area_id: int
    level: int = Field(ge=1, le=3)  # 1 low, 2 medium, 3 high


class ExpertiseBulkIn(BaseModel):
    """Full replacement of the reviewer's expertise list."""
    items: list[ExpertiseItem]


class ExpertiseOut(ExpertiseItem):
    model_config = ConfigDict(from_attributes=True)
    subject_area_name: str | None = None


class SubjectAreaOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    name: str


class BidIn(BaseModel):
    value: Literal["want", "maybe", "no"]


class BidOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    paper_id: int
    value: str


class ConflictIn(BaseModel):
    reason: str = Field(min_length=3, max_length=500)


class ConflictOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    paper_id: int
    reason: str


class PaperForBidding(BaseModel):
    """DOUBLE-BLIND: this schema must NEVER contain author names, emails or
    affiliations. Titles and abstracts only, plus the reviewer's own bid/conflict.
    The anonymity test in tests/phase5 guards this."""
    id: int
    paper_number: str | None = None
    title: str
    abstract: str | None = None
    track_id: int | None = None
    track_name: str | None = None
    subject_areas: list[str] = []
    my_bid: str | None = None
    has_conflict: bool = False
