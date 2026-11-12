"""All paper rules live here. The router only calls these functions."""
import re
from pathlib import Path

from fastapi import HTTPException, UploadFile
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.db.models.conference import Conference, SubjectArea, Track
from app.db.models.paper import Paper, PaperAuthor, PaperSubjectArea, PaperVersion
from app.services import file_storage, invitation_service
from app.services.deadline_service import ensure_deadline_open

# The draft screen creates drafts with this title. It must never be accepted as a real title.
PLACEHOLDER_TITLES = {"", "untitled", "untitled research paper"}


def normalize_title(title: str | None) -> str:
    return re.sub(r"\s+", " ", (title or "").lower().strip())


def _locked_paper(db: Session, paper_id: int, user_id: int) -> Paper:
    """Loads the paper and locks its row until the end of the request.
    Two requests for the same paper (for example an autosave and a submit) then run one after the other,
    instead of overlapping and duplicating authors or reading half-saved data."""
    paper = db.query(Paper).filter(Paper.id == paper_id).with_for_update().first()
    if not paper:
        raise HTTPException(404, "Paper not found")
    if paper.submitter_id != user_id:
        raise HTTPException(403, "You can only change your own papers.")
    return paper


def _require_draft(paper: Paper) -> None:
    if paper.status != "draft":
        raise HTTPException(409, "This paper has already been submitted and can no longer be changed.")


def _check_track(db: Session, conference_id: int, track_id: int) -> Track:
    track = db.get(Track, track_id)
    if not track or track.conference_id != conference_id:
        raise HTTPException(400, "That track does not belong to this conference.")
    return track


def can_view_paper(db: Session, user, paper: Paper) -> bool:
    if paper.submitter_id == user.id or any(a.user_id == user.id for a in paper.authors):
        return True
    if invitation_service.is_chair(db, user, paper.conference_id):
        return True
    return invitation_service.is_track_chair(db, user, paper.track_id)


# ---------------------------------------------------------------- drafts
def create_draft(db: Session, user_id: int, payload) -> Paper:
    conf = db.get(Conference, payload.conference_id)
    if not conf or not conf.is_active:
        raise HTTPException(404, "Conference not found")
    track = _check_track(db, conf.id, payload.track_id)
    ensure_deadline_open(db, conf.id, "submission", track_id=track.id)

    paper = Paper(
        conference_id=conf.id,
        track_id=track.id,
        title=(payload.title or "").strip(),
        abstract=getattr(payload, "abstract", None),
        status="draft",
        submitter_id=user_id,
    )
    db.add(paper)
    db.commit()
    db.refresh(paper)
    return paper


def update_draft(db: Session, paper_id: int, user_id: int, payload) -> Paper:
    paper = _locked_paper(db, paper_id, user_id)
    _require_draft(paper)

    if payload.title is not None:
        paper.title = payload.title.strip()
    if payload.abstract is not None:
        paper.abstract = payload.abstract
    if payload.track_id is not None and payload.track_id != paper.track_id:
        _check_track(db, paper.conference_id, payload.track_id)
        paper.track_id = payload.track_id

    if payload.authors is not None:
        db.query(PaperAuthor).filter(PaperAuthor.paper_id == paper.id).delete(synchronize_session=False)
        for order, author in enumerate(payload.authors):
            db.add(
                PaperAuthor(
                    paper_id=paper.id,
                    user_id=getattr(author, "user_id", None),
                    name=author.name.strip(),
                    email=author.email.strip().lower(),
                    affiliation=getattr(author, "affiliation", None),
                    display_order=order,
                )
            )

    if payload.subject_area_ids is not None:
        ids = set(payload.subject_area_ids)
        if ids:
            found = (
                db.query(SubjectArea)
                .filter(SubjectArea.id.in_(ids), SubjectArea.conference_id == paper.conference_id)
                .count()
            )
            if found != len(ids):
                raise HTTPException(400, "One or more subject areas do not belong to this conference.")
        db.query(PaperSubjectArea).filter(PaperSubjectArea.paper_id == paper.id).delete(synchronize_session=False)
        for area_id in ids:
            db.add(PaperSubjectArea(paper_id=paper.id, subject_area_id=area_id))

    db.commit()
    db.refresh(paper)
    return paper


def get_final_manuscript(db: Session, paper_id: int, user) -> tuple[PaperVersion, Path]:
    """Return only the newest manuscript file after checking paper visibility."""
    paper = db.get(Paper, paper_id)
    if not paper:
        raise HTTPException(404, "Paper not found")
    if not can_view_paper(db, user, paper):
        raise HTTPException(403, "You are not allowed to view this paper.")

    version = (
        db.query(PaperVersion)
        .filter(PaperVersion.paper_id == paper.id)
        .order_by(PaperVersion.version_number.desc())
        .first()
    )
    if not version:
        raise HTTPException(404, "No manuscript has been uploaded for this paper yet.")

    # Use only the stored basename so a database value cannot escape the upload directory.
    stored_file = file_storage.UPLOAD_DIR / Path(version.file_path).name
    if not stored_file.is_file():
        raise HTTPException(404, "The latest manuscript file could not be found on the server.")
    return version, stored_file


def add_manuscript(db: Session, paper_id: int, user_id: int, file: UploadFile) -> Paper:
    paper = _locked_paper(db, paper_id, user_id)
    _require_draft(paper)

    stored_path, digest, _ = file_storage.save_uploaded_file(file)
    try:
        latest = db.query(func.max(PaperVersion.version_number)).filter(PaperVersion.paper_id == paper.id).scalar() or 0
        db.add(
            PaperVersion(
                paper_id=paper.id,
                version_number=latest + 1,
                kind="initial",
                file_path=stored_path,
                sha256=digest,
                original_filename=file.filename or "manuscript",
            )
        )
        db.commit()
    except Exception:
        db.rollback()
        file_storage.delete_file(stored_path)  # do not leave an orphan file behind
        raise
    db.refresh(paper)
    return paper


# ---------------------------------------------------------------- submitting
def generate_paper_number(db: Session, conference_id: int) -> str:
    """Numbers are per conference and use its acronym, for example TC-2026-0001.
    (paper_number is unique across ALL conferences, so a shared prefix would collide.)
    The conference row is locked so two simultaneous submits cannot get the same number."""
    conf = db.query(Conference).filter(Conference.id == conference_id).with_for_update().one()
    prefix = f"{conf.acronym}-"
    numbers = (
        db.query(Paper.paper_number)
        .filter(Paper.conference_id == conference_id, Paper.paper_number.isnot(None))
        .all()
    )
    highest = 0
    for (number,) in numbers:
        if number.startswith(prefix) and number[len(prefix):].isdigit():
            highest = max(highest, int(number[len(prefix):]))
    return f"{prefix}{highest + 1:04d}"


def submit_paper(db: Session, paper_id: int, user_id: int) -> Paper:
    paper = _locked_paper(db, paper_id, user_id)
    if paper.status != "draft":
        raise HTTPException(409, "This paper has already been submitted.")

    ensure_deadline_open(db, paper.conference_id, "submission", track_id=paper.track_id)

    problems = []
    if normalize_title(paper.title) in PLACEHOLDER_TITLES:
        problems.append("give your paper a real title")
    if not (paper.abstract or "").strip():
        problems.append("write an abstract")
    if not paper.authors:
        problems.append("add at least one author")
    if not paper.versions:
        problems.append("upload the manuscript file")
    if problems:
        raise HTTPException(400, "Before submitting you need to: " + ", ".join(problems) + ".")

    others = db.query(Paper).filter(
        Paper.conference_id == paper.conference_id, Paper.id != paper.id, Paper.status != "draft"
    )
    wanted = normalize_title(paper.title)
    if any(normalize_title(other.title) == wanted for other in others.all()):
        raise HTTPException(409, "A paper with a matching title was already submitted to this conference.")

    newest = max(paper.versions, key=lambda v: v.version_number)
    same_file = (
        db.query(PaperVersion.id)
        .join(Paper, Paper.id == PaperVersion.paper_id)
        .filter(
            Paper.conference_id == paper.conference_id,
            Paper.id != paper.id,
            Paper.status != "draft",
            PaperVersion.sha256 == newest.sha256,
        )
        .first()
    )
    if same_file:
        raise HTTPException(409, "This exact manuscript file was already submitted to this conference.")

    if not paper.paper_number:
        paper.paper_number = generate_paper_number(db, paper.conference_id)
    paper.status = "submitted"
    db.commit()
    db.refresh(paper)
    return paper