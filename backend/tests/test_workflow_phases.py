"""Phase 7–10 contract and authorization regression tests."""
from datetime import datetime, timezone
import pytest
from fastapi import HTTPException
from app.db.models import Assignment, DelegateRegistration, Decision, Paper
from app.services import external_service, report_service, workflow_service
from test_phase5 import db, world


def add_submitted_review(db, world):
    assignment = Assignment(paper_id=world["paper"].id, reviewer_id=world["reviewer"].id,
        kind="internal", status="accepted", anon_label="Reviewer 1")
    db.add(assignment)
    db.flush()
    from app.db.models import Review
    db.add(Review(assignment_id=assignment.id, summary="Useful", strengths="Clear",
        weaknesses="Small sample", rating=4, confidence=4, recommendation="weak_accept",
        status="submitted", submitted_at=datetime.now(timezone.utc)))
    db.commit()


def test_decision_requires_manager_and_submitted_review(db, world):
    with pytest.raises(HTTPException) as exc:
        workflow_service.record_decision(db, world["reviewer"], world["paper"].id, "accept", "Reason")
    assert exc.value.status_code == 403
    with pytest.raises(HTTPException) as exc:
        workflow_service.record_decision(db, world["meta"], world["paper"].id, "accept", "Reason")
    assert exc.value.status_code == 409
    add_submitted_review(db, world)
    result = workflow_service.record_decision(db, world["meta"], world["paper"].id, "minor_revisions", "Address the sample-size concern.")
    assert result["decision"] == "minor_revisions"
    assert workflow_service.get_decision(db, world["author"], world["paper"].id)["rationale"].startswith("Address")


def test_rebuttal_is_author_only_and_locked(db, world):
    add_submitted_review(db, world)
    workflow_service.record_decision(db, world["meta"], world["paper"].id, "major_revisions", "Please respond to the reviews.")
    with pytest.raises(HTTPException) as exc:
        workflow_service.submit_rebuttal(db, world["reviewer"], world["paper"].id, "not an author")
    assert exc.value.status_code == 403
    saved = workflow_service.submit_rebuttal(db, world["author"], world["paper"].id, "We have addressed the concerns.")
    assert saved["submitted_at"]
    with pytest.raises(HTTPException) as exc:
        workflow_service.submit_rebuttal(db, world["author"], world["paper"].id, "replace")
    assert exc.value.status_code == 409


def test_external_invitation_keeps_author_from_becoming_reviewer(db, world):
    with pytest.raises(HTTPException) as exc:
        external_service.create_invitation(db, world["tchair"], world["paper"].id,
                                           world["author"].email, None)
    assert exc.value.status_code == 409
    invite = external_service.create_invitation(db, world["tchair"], world["paper"].id,
                                                "outside@example.org", None)
    assert invite["role"] == "external_reviewer"
    assert external_service.list_for_manager(db, world["tchair"])[0]["status"] == "pending"


def test_delegate_registration_and_no_fake_checkout(db, world):
    payload = workflow_service.register_delegate(db, world["author"], world["conf"].id,
        "student", "Adam Author", "University", "vegetarian", None)
    assert payload["status"] == "pending"
    assert payload["ticket_type"] == "student"
    with pytest.raises(HTTPException) as exc:
        workflow_service.create_checkout(db, world["author"])
    assert exc.value.status_code == 503
    assert db.query(DelegateRegistration).count() == 1


def test_chair_reports_are_scope_checked(db, world):
    add_submitted_review(db, world)
    summary = report_service.overview(db, world["chair"], "all")
    assert summary["submissions"] == 1
    assert summary["reviews_submitted"] == 1
    with pytest.raises(HTTPException) as exc:
        report_service.overview(db, world["reviewer"], "all")
    assert exc.value.status_code == 403
