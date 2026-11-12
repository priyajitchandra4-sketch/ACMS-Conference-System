from datetime import datetime, timedelta, timezone
import pytest
from fastapi import HTTPException
from app.db.models.conference import Conference, Deadline
from app.services.deadline_service import ensure_deadline_open

@pytest.fixture
def sample_conference(db):
    conf = Conference(
        title="Test Conference 2026",
        acronym="TC2026",
        start_date=datetime(2026, 12, 1, tzinfo=timezone.utc),
        end_date=datetime(2026, 12, 5, tzinfo=timezone.utc),
        is_active=True
    )
    db.add(conf)
    db.commit()
    db.refresh(conf)
    return conf

def test_deadline_open_success(db, sample_conference):
    """Test that a future deadline is accepted successfully."""
    future_time = datetime.now(timezone.utc) + timedelta(days=5)
    deadline = Deadline(
        conference_id=sample_conference.id,
        deadline_type="submission",
        due_at=future_time,
        grace_period_minutes=0
    )
    db.add(deadline)
    db.commit()

    # Should not raise any exception
    ensure_deadline_open(db, sample_conference.id, "submission")

def test_deadline_passed_raises_error(db, sample_conference):
    """Test that a past deadline without grace period raises an HTTPException (400)."""
    past_time = datetime.now(timezone.utc) - timedelta(hours=2)
    deadline = Deadline(
        conference_id=sample_conference.id,
        deadline_type="submission",
        due_at=past_time,
        grace_period_minutes=0
    )
    db.add(deadline)
    db.commit()

    with pytest.raises(HTTPException) as exc_info:
        ensure_deadline_open(db, sample_conference.id, "submission")
    
    assert exc_info.value.status_code == 400
    assert "has passed" in exc_info.value.detail

def test_deadline_within_grace_period(db, sample_conference):
    """Test that a deadline that just passed but is still within the grace period is accepted."""
    # Due 10 minutes ago, but with a 30-minute grace period
    recent_past = datetime.now(timezone.utc) - timedelta(minutes=10)
    deadline = Deadline(
        conference_id=sample_conference.id,
        deadline_type="submission",
        due_at=recent_past,
        grace_period_minutes=30
    )
    db.add(deadline)
    db.commit()

    # Should pass because we are within the grace period window
    ensure_deadline_open(db, sample_conference.id, "submission")

def test_deadline_outside_grace_period(db, sample_conference):
    """Test that a deadline past its due date and grace period window raises an error."""
    # Due 50 minutes ago, with a 30-minute grace period (expired 20 mins ago)
    past_with_grace = datetime.now(timezone.utc) - timedelta(minutes=50)
    deadline = Deadline(
        conference_id=sample_conference.id,
        deadline_type="submission",
        due_at=past_with_grace,
        grace_period_minutes=30
    )
    db.add(deadline)
    db.commit()

    with pytest.raises(HTTPException) as exc_info:
        ensure_deadline_open(db, sample_conference.id, "submission")
    
    assert exc_info.value.status_code == 400