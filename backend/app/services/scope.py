"""Scope helpers shared by Phase 5 services.

These answer questions like "is this user a track chair of THIS track?"
or "is this user an author of THIS paper?". Routers never call these
directly — services do, so all rules stay in the service layer.

Assumed Phase 0-4 models (adjust names if yours differ):
  User(id, email, full_name, ...)
  RoleAssignment(user_id, role, conference_id, track_id)
  Conference(id, ...), Track(id, conference_id, name, ...)
  Paper(id, conference_id, track_id, title, abstract, status, paper_number)
  PaperAuthor(paper_id, user_id, email)   # user_id nullable
  SubjectArea(id, name), TrackSubjectArea(track_id, subject_area_id)
  PaperSubjectArea(paper_id, subject_area_id)
"""
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.roles import (
    ROLE_CHAIR, ROLE_META_REVIEWER, ROLE_REVIEWER, ROLE_TRACK_CHAIR,
)
from app.db.models import (
    MetaAssignment, Paper, PaperAuthor, RoleAssignment, Track, User,
)


def roles_of(db: Session, user_id: int) -> list[RoleAssignment]:
    return list(db.scalars(
        select(RoleAssignment).where(RoleAssignment.user_id == user_id)
    ).all())


def is_chair(db: Session, user_id: int, conference_id: int) -> bool:
    return any(
        ra.role == ROLE_CHAIR and ra.conference_id in (None, conference_id)
        for ra in roles_of(db, user_id)
    )


def is_track_chair(db: Session, user_id: int, track: Track) -> bool:
    """True for the conference Chair, or a Track Chair of this track.
    A track_chair assignment with track_id=None means 'all tracks'."""
    if is_chair(db, user_id, track.conference_id):
        return True
    return any(
        ra.role == ROLE_TRACK_CHAIR
        and ra.conference_id == track.conference_id
        and ra.track_id in (None, track.id)
        for ra in roles_of(db, user_id)
    )


def has_track_role(db: Session, user_id: int, role: str, paper: Paper) -> bool:
    """Does the user hold `role` for this paper's conference/track?
    An assignment with track_id=None covers the whole conference."""
    return any(
        ra.role == role
        and ra.conference_id == paper.conference_id
        and ra.track_id in (None, paper.track_id)
        for ra in roles_of(db, user_id)
    )


def is_reviewer_for(db: Session, user_id: int, paper: Paper) -> bool:
    return has_track_role(db, user_id, ROLE_REVIEWER, paper)


def is_meta_for_paper(db: Session, user_id: int, paper_id: int) -> bool:
    return db.scalar(
        select(MetaAssignment).where(
            MetaAssignment.paper_id == paper_id,
            MetaAssignment.meta_reviewer_id == user_id,
        )
    ) is not None


def author_paper_ids(db: Session, user: User) -> set[int]:
    """Papers where the user is an author — matched by user_id OR email,
    because co-authors may not have an account yet (Phase 4 rule)."""
    rows = db.execute(
        select(PaperAuthor.paper_id).where(
            (PaperAuthor.user_id == user.id)
            | (PaperAuthor.email.ilike(user.email))
        )
    ).scalars().all()
    submitted = db.scalars(select(Paper.id).where(Paper.submitter_id == user.id)).all()
    return set(rows) | set(submitted)


def is_author_of(db: Session, user: User, paper_id: int) -> bool:
    return paper_id in author_paper_ids(db, user)


def get_paper_or_404(db: Session, paper_id: int) -> Paper:
    from fastapi import HTTPException
    paper = db.get(Paper, paper_id)
    if paper is None:
        raise HTTPException(status_code=404, detail="Paper not found")
    return paper


def get_track_or_404(db: Session, track_id: int) -> Track:
    from fastapi import HTTPException
    track = db.get(Track, track_id)
    if track is None:
        raise HTTPException(status_code=404, detail="Track not found")
    return track


def reviewer_ids_for_paper(db: Session, paper: Paper) -> list[int]:
    """All users holding the reviewer role in this paper's track/conference."""
    rows = db.scalars(
        select(RoleAssignment.user_id).where(
            RoleAssignment.role == ROLE_REVIEWER,
            RoleAssignment.conference_id == paper.conference_id,
            RoleAssignment.track_id.in_([paper.track_id])
            | RoleAssignment.track_id.is_(None),
        )
    ).all()
    return sorted(set(rows))


def my_track_ids(db: Session, user_id: int) -> list[int]:
    """Tracks where the user is Track Chair (or Chair of the conference)."""
    from sqlalchemy import or_
    conditions = []
    for ra in roles_of(db, user_id):
        if ra.role == ROLE_TRACK_CHAIR:
            if ra.track_id is not None:
                conditions.append(Track.id == ra.track_id)
            else:
                conditions.append(Track.conference_id == ra.conference_id)
        elif ra.role == ROLE_CHAIR:
            conditions.append(Track.conference_id == ra.conference_id)
    if not conditions:
        return []
    tracks = db.scalars(select(Track).where(or_(*conditions))).all()
    return [t.id for t in tracks]
