"""Phase 5 regression tests; run with pytest tests/test_phase5.py -v."""
import pytest
from datetime import datetime, timezone
from fastapi import HTTPException
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.db.base import Base
import app.db.models  # noqa: F401
from app.db.models import (
    Assignment, Conference, MetaAssignment, Paper, PaperAuthor, PaperSubjectArea,
    RoleAssignment, SubjectArea, Track, TrackSubjectArea, User,
)
from app.services import assignment_service, bidding_service


@pytest.fixture()
def db():
    engine = create_engine("sqlite://", connect_args={"check_same_thread": False}, poolclass=StaticPool)
    Base.metadata.create_all(engine)
    Session = sessionmaker(bind=engine, autoflush=False)
    session = Session()
    yield session
    session.close()
    engine.dispose()


def make_user(db, email, name, role=None, conference_id=None, track_id=None):
    user = User(email=email, password_hash="x", full_name=name, is_active=True)
    db.add(user)
    db.flush()
    if role:
        db.add(RoleAssignment(user_id=user.id, role=role,
                              conference_id=conference_id, track_id=track_id))
    return user


@pytest.fixture()
def world(db):
    conf = Conference(title="ACMS 2026", acronym="ACMS26",
        start_date=datetime(2026, 6, 1, tzinfo=timezone.utc),
        end_date=datetime(2026, 6, 4, tzinfo=timezone.utc))
    db.add(conf)
    db.flush()
    track = Track(conference_id=conf.id, name="AI Track")
    db.add(track)
    db.flush()
    area = SubjectArea(conference_id=conf.id, name="Machine Learning")
    db.add(area)
    db.flush()
    db.add(TrackSubjectArea(track_id=track.id, subject_area_id=area.id))

    chair = make_user(db, "chair@x.com", "The Chair", "chair", conf.id)
    tchair = make_user(db, "tchair@x.com", "Track Chair", "track_chair", conf.id, track.id)
    meta = make_user(db, "meta@x.com", "Meta Reviewer", "meta_reviewer", conf.id, track.id)
    reviewer = make_user(db, "rev@x.com", "Rita Reviewer", "reviewer", conf.id, track.id)
    author = make_user(db, "author@x.com", "Adam Author", "author", conf.id)
    rev_author = make_user(db, "revauthor@x.com", "Bob Both", "reviewer", conf.id, track.id)

    paper = Paper(conference_id=conf.id, track_id=track.id, submitter_id=author.id,
        title="A Great Paper", abstract="We study things.", status="submitted",
        paper_number="ACMS26-0001")
    db.add(paper)
    db.flush()
    db.add(PaperAuthor(paper_id=paper.id, user_id=author.id, email=author.email, name=author.full_name))
    db.add(PaperAuthor(paper_id=paper.id, user_id=rev_author.id, email=rev_author.email, name=rev_author.full_name))
    db.add(PaperSubjectArea(paper_id=paper.id, subject_area_id=area.id))
    db.add(MetaAssignment(paper_id=paper.id, meta_reviewer_id=meta.id, assigned_by=tchair.id))
    db.commit()
    return dict(conf=conf, track=track, area=area, paper=paper, chair=chair,
        tchair=tchair, meta=meta, reviewer=reviewer, author=author, rev_author=rev_author)


def test_assign_author_to_own_paper_refused(db, world):
    with pytest.raises(HTTPException) as exc:
        assignment_service.assign(db, world["meta"], world["paper"].id, world["rev_author"].id)
    assert exc.value.status_code == 409
    assert "author" in exc.value.detail.lower()


def test_assign_by_email_match_refused(db, world):
    outsider = make_user(db, "ghost@x.com", "Ghost Coauthor", "reviewer", world["conf"].id, world["track"].id)
    db.add(PaperAuthor(paper_id=world["paper"].id, user_id=None,
                       email="ghost@x.com", name="Ghost Coauthor"))
    db.commit()
    with pytest.raises(HTTPException) as exc:
        assignment_service.assign(db, world["meta"], world["paper"].id, outsider.id)
    assert exc.value.status_code == 409


def test_bidding_list_has_no_author_identities(db, world):
    bidding_service.place_bid(db, world["reviewer"], world["paper"].id, "want")
    papers = bidding_service.list_papers_for_bidding(db, world["reviewer"])
    assert len(papers) == 1
    dumped = papers[0].model_dump()
    flat = str(dumped).lower()
    assert "adam author" not in flat and "author@x.com" not in flat and "bob both" not in flat
    for forbidden in ("authors", "author_names", "emails", "affiliation"):
        assert forbidden not in dumped


def test_own_and_conflicted_papers_hidden_from_bidding(db, world):
    assert bidding_service.list_papers_for_bidding(db, world["rev_author"]) == []
    bidding_service.declare_conflict(db, world["reviewer"], world["paper"].id, "same lab")
    assert bidding_service.list_papers_for_bidding(db, world["reviewer"]) == []


def test_reviewer_only_sees_bidding_papers_in_assigned_track(db, world):
    other = Track(conference_id=world["conf"].id, name="Robotics")
    db.add(other)
    db.flush()
    db.add(Paper(conference_id=world["conf"].id, track_id=other.id,
        submitter_id=world["author"].id, title="Private other-track title",
        abstract="Not in this reviewer's scope", status="submitted", paper_number="ACMS26-0002"))
    db.commit()
    titles = [p.title for p in bidding_service.list_papers_for_bidding(db, world["reviewer"])]
    assert titles == ["A Great Paper"]


def test_assign_conflicted_reviewer_refused(db, world):
    bidding_service.declare_conflict(db, world["reviewer"], world["paper"].id, "advisor")
    with pytest.raises(HTTPException) as exc:
        assignment_service.assign(db, world["meta"], world["paper"].id, world["reviewer"].id)
    assert exc.value.status_code == 409 and "conflict" in exc.value.detail.lower()


def test_assign_happy_path_sets_label_and_due(db, world):
    out = assignment_service.assign(db, world["meta"], world["paper"].id, world["reviewer"].id)
    assert out.status == "pending" and out.anon_label == "Reviewer 1" and out.due_at is not None


def test_duplicate_assignment_refused(db, world):
    assignment_service.assign(db, world["meta"], world["paper"].id, world["reviewer"].id)
    with pytest.raises(HTTPException) as exc:
        assignment_service.assign(db, world["meta"], world["paper"].id, world["reviewer"].id)
    assert exc.value.status_code == 409


def test_accept_and_decline(db, world):
    out = assignment_service.assign(db, world["meta"], world["paper"].id, world["reviewer"].id)
    accepted = assignment_service.respond(db, world["reviewer"], out.id, accept=True)
    assert accepted.status == "accepted"
    with pytest.raises(HTTPException) as exc:
        assignment_service.respond(db, world["reviewer"], out.id, accept=False)
    assert exc.value.status_code == 409


def test_other_reviewer_cannot_respond(db, world):
    out = assignment_service.assign(db, world["meta"], world["paper"].id, world["reviewer"].id)
    stranger = make_user(db, "s@x.com", "Stranger", "reviewer", world["conf"].id, world["track"].id)
    db.commit()
    with pytest.raises(HTTPException) as exc:
        assignment_service.respond(db, stranger, out.id, accept=True)
    assert exc.value.status_code == 403


def test_non_manager_cannot_assign(db, world):
    with pytest.raises(HTTPException) as exc:
        assignment_service.assign(db, world["reviewer"], world["paper"].id, world["reviewer"].id)
    assert exc.value.status_code == 403


def test_expertise_roundtrip(db, world):
    from app.schemas.bidding import ExpertiseBulkIn, ExpertiseItem
    data = ExpertiseBulkIn(items=[ExpertiseItem(subject_area_id=world["area"].id, level=3)])
    out = bidding_service.set_expertise(db, world["reviewer"], data)
    assert len(out) == 1 and out[0].level == 3
    cands = assignment_service.candidates(db, world["meta"], world["paper"].id)
    me = next(c for c in cands if c.user_id == world["reviewer"].id)
    assert me.expertise_score == 3
