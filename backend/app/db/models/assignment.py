"""Phase 5 tables: reviewer expertise, bids, conflicts, assignments, meta-assignments.

IMPORTANT: after copying this file, register the models in app/db/models/__init__.py:

    from .assignment import (
        ReviewerExpertise, Bid, ConflictOfInterest, Assignment, MetaAssignment,
    )

Otherwise Alembic will not see them.
"""
from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, Integer, String, UniqueConstraint, func
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class ReviewerExpertise(Base):
    """A reviewer's self-declared expertise level for one subject area."""
    __tablename__ = "reviewer_expertise"
    __table_args__ = (
        UniqueConstraint("reviewer_id", "subject_area_id", name="uq_expertise_reviewer_area"),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    reviewer_id: Mapped[int] = mapped_column(ForeignKey("users.id"), index=True)
    subject_area_id: Mapped[int] = mapped_column(ForeignKey("subject_areas.id"), index=True)
    level: Mapped[int] = mapped_column(Integer, default=2)  # 1 = low, 2 = medium, 3 = high
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )


class Bid(Base):
    """A reviewer's bid on a paper: want | maybe | no."""
    __tablename__ = "bids"
    __table_args__ = (UniqueConstraint("paper_id", "reviewer_id", name="uq_bid_paper_reviewer"),)

    id: Mapped[int] = mapped_column(primary_key=True)
    paper_id: Mapped[int] = mapped_column(ForeignKey("papers.id"), index=True)
    reviewer_id: Mapped[int] = mapped_column(ForeignKey("users.id"), index=True)
    value: Mapped[str] = mapped_column(String(10))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )


class ConflictOfInterest(Base):
    """A reviewer declares they cannot review this paper (co-author, advisor, etc.)."""
    __tablename__ = "conflicts_of_interest"
    __table_args__ = (UniqueConstraint("paper_id", "reviewer_id", name="uq_coi_paper_reviewer"),)

    id: Mapped[int] = mapped_column(primary_key=True)
    paper_id: Mapped[int] = mapped_column(ForeignKey("papers.id"), index=True)
    reviewer_id: Mapped[int] = mapped_column(ForeignKey("users.id"), index=True)
    reason: Mapped[str] = mapped_column(String(500))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class Assignment(Base):
    """One reviewer assigned to one paper. Phase 8 reuses this with kind='external'."""
    __tablename__ = "assignments"
    __table_args__ = (
        UniqueConstraint("paper_id", "reviewer_id", name="uq_assignment_paper_reviewer"),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    paper_id: Mapped[int] = mapped_column(ForeignKey("papers.id"), index=True)
    reviewer_id: Mapped[int] = mapped_column(ForeignKey("users.id"), index=True)
    kind: Mapped[str] = mapped_column(String(20), default="internal", index=True)
    # pending -> accepted | declined ; cancelled = removed by a chair before review
    status: Mapped[str] = mapped_column(String(20), default="pending", index=True)
    due_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    anon_label: Mapped[str] = mapped_column(String(30))  # e.g. "Reviewer 2"
    assigned_by: Mapped[int | None] = mapped_column(ForeignKey("users.id"))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )


class MetaAssignment(Base):
    """A Meta-Reviewer assigned to a paper by the Track Chair."""
    __tablename__ = "meta_assignments"
    __table_args__ = (
        UniqueConstraint("paper_id", "meta_reviewer_id", name="uq_meta_paper_reviewer"),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    paper_id: Mapped[int] = mapped_column(ForeignKey("papers.id"), index=True)
    meta_reviewer_id: Mapped[int] = mapped_column(ForeignKey("users.id"), index=True)
    assigned_by: Mapped[int | None] = mapped_column(ForeignKey("users.id"))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
