from datetime import datetime
from sqlalchemy import String, Text, DateTime, ForeignKey, Boolean
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.db.base import Base

class Conference(Base):
    __tablename__ = 'conferences'

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    acronym: Mapped[str] = mapped_column(String(50), unique=True, index=True, nullable=False)
    description: Mapped[str | None] = mapped_column(Text)
    start_date: Mapped[datetime] = mapped_column(DateTime, nullable=False)
    end_date: Mapped[datetime] = mapped_column(DateTime, nullable=False)
    location: Mapped[str | None] = mapped_column(String(255))
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)

    # Relationships
    tracks: Mapped[list["Track"]] = relationship("Track", back_populates="conference", cascade="all, delete-orphan")
    deadlines: Mapped[list["Deadline"]] = relationship("Deadline", back_populates="conference", cascade="all, delete-orphan")
    call_for_papers: Mapped["CallForPapers | None"] = relationship("CallForPapers", back_populates="conference", uselist=False, cascade="all, delete-orphan")


class Track(Base):
    __tablename__ = 'tracks'

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    conference_id: Mapped[int] = mapped_column(ForeignKey("conferences.id", ondelete="CASCADE"), nullable=False)
    name: Mapped[str] = mapped_column(String(150), nullable=False)
    description: Mapped[str | None] = mapped_column(Text)

    # Relationships
    conference: Mapped["Conference"] = relationship("Conference", back_populates="tracks")


class SubjectArea(Base):
    __tablename__ = 'subject_areas'

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    conference_id: Mapped[int] = mapped_column(ForeignKey("conferences.id", ondelete="CASCADE"), nullable=False)
    name: Mapped[str] = mapped_column(String(150), nullable=False)


class TrackSubjectArea(Base):
    """Explicit many-to-many association between a track and its subject areas."""
    __tablename__ = "track_subject_areas"

    track_id: Mapped[int] = mapped_column(
        ForeignKey("tracks.id", ondelete="CASCADE"), primary_key=True
    )
    subject_area_id: Mapped[int] = mapped_column(
        ForeignKey("subject_areas.id", ondelete="CASCADE"), primary_key=True
    )


class Deadline(Base):
    __tablename__ = 'deadlines'

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    conference_id: Mapped[int] = mapped_column(ForeignKey("conferences.id", ondelete="CASCADE"), nullable=False)
    track_id: Mapped[int | None] = mapped_column(ForeignKey("tracks.id", ondelete="CASCADE"), nullable=True)
    deadline_type: Mapped[str] = mapped_column(String(50), nullable=False)  # e.g., 'submission', 'review', 'camera_ready'
    due_at: Mapped[datetime] = mapped_column(DateTime, nullable=False)
    grace_period_minutes: Mapped[int] = mapped_column(default=0)

    # Relationships
    conference: Mapped["Conference"] = relationship("Conference", back_populates="deadlines")


class CallForPapers(Base):
    __tablename__ = 'call_for_papers'

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    conference_id: Mapped[int] = mapped_column(ForeignKey("conferences.id", ondelete="CASCADE"), unique=True, nullable=False)
    content: Mapped[str] = mapped_column(Text, nullable=False)  # Markdown content

    # Relationships
    conference: Mapped["Conference"] = relationship("Conference", back_populates="call_for_papers")
