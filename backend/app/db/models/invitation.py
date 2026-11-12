from datetime import datetime

from sqlalchemy import Boolean, DateTime, ForeignKey, String, func
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base  # same Base as every other model, so Alembic sees these tables


class Invitation(Base):
    __tablename__ = "invitations"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    email: Mapped[str] = mapped_column(String, index=True)
    role: Mapped[str] = mapped_column(String)  # 'track_chair', 'meta_reviewer', 'reviewer'
    conference_id: Mapped[int] = mapped_column(ForeignKey("conferences.id"))
    track_id: Mapped[int | None] = mapped_column(ForeignKey("tracks.id"), nullable=True)
    # Set only for external-review invitations; accepted invitations create that assignment.
    paper_id: Mapped[int | None] = mapped_column(ForeignKey("papers.id", ondelete="CASCADE"), nullable=True, index=True)
    due_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    token: Mapped[str] = mapped_column(String, unique=True, index=True)
    # 'pending', 'accepted', 'declined', 'revoked'   ('expired' is worked out from expires_at)
    status: Mapped[str] = mapped_column(String, default="pending")
    invited_by_id: Mapped[int] = mapped_column(ForeignKey("users.id"))
    expires_at: Mapped[datetime] = mapped_column(DateTime)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())


class Notification(Base):
    __tablename__ = "notifications"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), index=True)
    title: Mapped[str] = mapped_column(String)
    message: Mapped[str] = mapped_column(String)
    is_read: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
