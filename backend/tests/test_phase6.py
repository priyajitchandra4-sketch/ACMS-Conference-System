"""Phase 6 tests. Run with: pytest tests/test_phase6.py -v"""
import pytest
from fastapi import HTTPException
from app.db.models import Assignment, DiscussionPost, Review
from app.schemas.review import DiscussionPostIn, ReviewUpsert
from app.services import assignment_service, review_service
from test_phase5 import db, world


def accepted_assignment(db, world):
    assignment = assignment_service.assign(db, world["meta"], world["paper"].id, world["reviewer"].id)
    return assignment_service.respond(db, world["reviewer"], assignment.id, accept=True)


def test_reviewer_can_save_draft_and_submit(db, world):
    accepted_assignment(db, world)
    draft = ReviewUpsert(summary="Useful work", strengths="Clear method", submit=False)
    result = review_service.save_review(db, world["reviewer"], world["paper"].id, draft)
    assert result["status"] == "draft"
    complete = ReviewUpsert(
        summary="Useful work", strengths="Clear method", weaknesses="Small sample",
        questions="How does it scale?", rating=4, confidence=3,
        recommendation="weak_accept", submit=True,
    )
    result = review_service.save_review(db, world["reviewer"], world["paper"].id, complete)
    assert result["status"] == "submitted"
    assert result["submitted_at"] is not None


def test_incomplete_review_cannot_be_submitted(db, world):
    accepted_assignment(db, world)
    data = ReviewUpsert(summary="Only summary", submit=True)
    with pytest.raises(HTTPException) as exc:
        review_service.save_review(db, world["reviewer"], world["paper"].id, data)
    assert exc.value.status_code == 422


def test_submitted_review_is_locked(db, world):
    accepted_assignment(db, world)
    data = ReviewUpsert(summary="S", strengths="S", weaknesses="W", rating=3, confidence=3, recommendation="borderline", submit=True)
    review_service.save_review(db, world["reviewer"], world["paper"].id, data)
    with pytest.raises(HTTPException) as exc:
        review_service.save_review(db, world["reviewer"], world["paper"].id, ReviewUpsert(summary="Changed"))
    assert exc.value.status_code == 409


def test_author_cannot_read_reviewer_review(db, world):
    accepted_assignment(db, world)
    with pytest.raises(HTTPException) as exc:
        review_service.get_my_review(db, world["author"], world["paper"].id)
    assert exc.value.status_code == 403


def test_manager_review_view_uses_anon_label_not_reviewer_identity(db, world):
    accepted_assignment(db, world)
    data = ReviewUpsert(summary="S", strengths="S", weaknesses="W", rating=3, confidence=3, recommendation="borderline", submit=True)
    review_service.save_review(db, world["reviewer"], world["paper"].id, data)
    output = review_service.paper_reviews(db, world["meta"], world["paper"].id)
    assert output[0]["anon_label"] == "Reviewer 1"
    assert "reviewer_name" not in output[0]
    assert "rev@x.com" not in str(output[0])


def test_discussion_anonymizes_participants_and_author_is_denied(db, world):
    accepted_assignment(db, world)
    review_service.add_discussion_post(db, world["reviewer"], world["paper"].id, "Could we clarify the baseline?")
    discussion = review_service.get_discussion(db, world["meta"], world["paper"].id)
    assert discussion["posts"][0]["author_label"] == "Reviewer 1"
    assert "Rita Reviewer" not in str(discussion)
    with pytest.raises(HTTPException) as exc:
        review_service.get_discussion(db, world["author"], world["paper"].id)
    assert exc.value.status_code == 403


def test_discussion_post_rejects_blank():
    with pytest.raises(ValueError):
        DiscussionPostIn(body="   ")
