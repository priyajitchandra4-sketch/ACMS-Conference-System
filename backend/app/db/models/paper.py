from datetime import datetime, timezone
from sqlalchemy import String, Text, Integer, ForeignKey, DateTime
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.db.base import Base

class Paper(Base):
    __tablename__ = 'papers'
    
    id: Mapped[int] = mapped_column(primary_key=True)
    conference_id: Mapped[int] = mapped_column(ForeignKey('conferences.id'), index=True)
    track_id: Mapped[int] = mapped_column(ForeignKey('tracks.id'), index=True)
    paper_number: Mapped[str | None] = mapped_column(String(50), unique=True, index=True)
    title: Mapped[str] = mapped_column(String(255), index=True)
    abstract: Mapped[str | None] = mapped_column(Text)
    status: Mapped[str] = mapped_column(String(50), default='draft', index=True)  # draft, submitted, under_review
    submitter_id: Mapped[int] = mapped_column(ForeignKey('users.id'), index=True)
    
    created_at: Mapped[datetime] = mapped_column(DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, 
        default=lambda: datetime.now(timezone.utc), 
        onupdate=lambda: datetime.now(timezone.utc)
    )
    
    authors = relationship("PaperAuthor", back_populates="paper", cascade="all, delete-orphan")
    versions = relationship("PaperVersion", back_populates="paper", cascade="all, delete-orphan")
    subject_areas = relationship("PaperSubjectArea", back_populates="paper", cascade="all, delete-orphan")

class PaperAuthor(Base):
    __tablename__ = 'paper_authors'
    
    id: Mapped[int] = mapped_column(primary_key=True)
    paper_id: Mapped[int] = mapped_column(ForeignKey('papers.id', ondelete='CASCADE'), index=True)
    user_id: Mapped[int | None] = mapped_column(ForeignKey('users.id', ondelete='SET NULL'), nullable=True, index=True)
    name: Mapped[str] = mapped_column(String(120))
    email: Mapped[str] = mapped_column(String(255))
    affiliation: Mapped[str | None] = mapped_column(String(200))
    display_order: Mapped[int] = mapped_column(Integer, default=0)
    
    paper = relationship("Paper", back_populates="authors")

class PaperSubjectArea(Base):
    __tablename__ = 'paper_subject_areas'
    
    id: Mapped[int] = mapped_column(primary_key=True)
    paper_id: Mapped[int] = mapped_column(ForeignKey('papers.id', ondelete='CASCADE'), index=True)
    subject_area_id: Mapped[int] = mapped_column(ForeignKey('subject_areas.id', ondelete='CASCADE'), index=True)
    
    paper = relationship("Paper", back_populates="subject_areas")

class PaperVersion(Base):
    __tablename__ = 'paper_versions'
    
    id: Mapped[int] = mapped_column(primary_key=True)
    paper_id: Mapped[int] = mapped_column(ForeignKey('papers.id', ondelete='CASCADE'), index=True)
    version_number: Mapped[int] = mapped_column(Integer, default=1)
    kind: Mapped[str] = mapped_column(String(50), default='initial')  # initial, revised, camera_ready
    file_path: Mapped[str] = mapped_column(String(500))
    sha256: Mapped[str] = mapped_column(String(64), index=True)
    original_filename: Mapped[str] = mapped_column(String(255))
    created_at: Mapped[datetime] = mapped_column(DateTime, default=lambda: datetime.now(timezone.utc))
    
    paper = relationship("Paper", back_populates="versions")