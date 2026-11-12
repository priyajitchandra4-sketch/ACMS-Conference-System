"""Phase 7–10 workflow records. Payment card data is never stored here."""
from datetime import datetime
from sqlalchemy import DateTime, ForeignKey, Integer, JSON, String, Text, UniqueConstraint, func
from sqlalchemy.orm import Mapped, mapped_column
from app.db.base import Base


class Decision(Base):
    __tablename__ = "paper_decisions"
    __table_args__ = (UniqueConstraint("paper_id", name="uq_decision_paper"),)

    id: Mapped[int] = mapped_column(primary_key=True)
    paper_id: Mapped[int] = mapped_column(ForeignKey("papers.id", ondelete="CASCADE"), index=True)
    decision: Mapped[str] = mapped_column(String(30))
    rationale: Mapped[str] = mapped_column(Text)
    decided_by: Mapped[int] = mapped_column(ForeignKey("users.id"))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())


class Rebuttal(Base):
    __tablename__ = "paper_rebuttals"
    __table_args__ = (UniqueConstraint("paper_id", name="uq_rebuttal_paper"),)

    id: Mapped[int] = mapped_column(primary_key=True)
    paper_id: Mapped[int] = mapped_column(ForeignKey("papers.id", ondelete="CASCADE"), index=True)
    author_id: Mapped[int] = mapped_column(ForeignKey("users.id"), index=True)
    rebuttal: Mapped[str] = mapped_column(Text)
    submitted_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())


class CameraReadySubmission(Base):
    __tablename__ = "camera_ready_submissions"
    __table_args__ = (UniqueConstraint("paper_id", name="uq_camera_ready_paper"),)

    id: Mapped[int] = mapped_column(primary_key=True)
    paper_id: Mapped[int] = mapped_column(ForeignKey("papers.id", ondelete="CASCADE"), index=True)
    version_id: Mapped[int] = mapped_column(ForeignKey("paper_versions.id", ondelete="CASCADE"), unique=True)
    author_id: Mapped[int] = mapped_column(ForeignKey("users.id"), index=True)
    copyright_confirmed: Mapped[bool] = mapped_column(default=False)
    submitted_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class DelegateRegistration(Base):
    __tablename__ = "delegate_registrations"
    __table_args__ = (UniqueConstraint("conference_id", "user_id", name="uq_delegate_conference_user"),)

    id: Mapped[int] = mapped_column(primary_key=True)
    conference_id: Mapped[int] = mapped_column(ForeignKey("conferences.id", ondelete="CASCADE"), index=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    attendee_name: Mapped[str] = mapped_column(String(120))
    email: Mapped[str] = mapped_column(String(255))
    affiliation: Mapped[str | None] = mapped_column(String(200))
    dietary_requirements: Mapped[str | None] = mapped_column(String(1000))
    accessibility_needs: Mapped[str | None] = mapped_column(String(1000))
    ticket_type: Mapped[str] = mapped_column(String(40), default="standard")
    status: Mapped[str] = mapped_column(String(20), default="pending", index=True)
    amount: Mapped[int] = mapped_column(Integer, default=0)  # minor units; configured by organizer
    currency: Mapped[str] = mapped_column(String(3), default="INR")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())


class DelegatePayment(Base):
    __tablename__ = "delegate_payments"
    __table_args__ = (UniqueConstraint("registration_id", name="uq_delegate_payment_registration"),)

    id: Mapped[int] = mapped_column(primary_key=True)
    registration_id: Mapped[int] = mapped_column(ForeignKey("delegate_registrations.id", ondelete="CASCADE"), index=True)
    status: Mapped[str] = mapped_column(String(20), default="pending", index=True)
    provider: Mapped[str | None] = mapped_column(String(40))
    provider_session_id: Mapped[str | None] = mapped_column(String(200), unique=True)
    checkout_url: Mapped[str | None] = mapped_column(String(1000))
    paid_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())


class AuditLog(Base):
    __tablename__ = "audit_logs"

    id: Mapped[int] = mapped_column(primary_key=True)
    actor_id: Mapped[int | None] = mapped_column(ForeignKey("users.id", ondelete="SET NULL"), index=True)
    conference_id: Mapped[int | None] = mapped_column(ForeignKey("conferences.id", ondelete="SET NULL"), index=True)
    action: Mapped[str] = mapped_column(String(100), index=True)
    object_type: Mapped[str] = mapped_column(String(80))
    object_id: Mapped[str | None] = mapped_column(String(80))
    details: Mapped[dict | None] = mapped_column(JSON)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), index=True)
