from datetime import datetime, timedelta

import pytest

from app.db.models.conference import Conference, Deadline, SubjectArea, Track
from app.db.models.paper import Paper, PaperAuthor, PaperVersion
from app.services import file_storage
from app.services.invitation_service import utcnow

API = "/api/v1"
PLACEHOLDER = "Untitled Research Paper"


@pytest.fixture(autouse=True)
def tmp_uploads(monkeypatch, tmp_path):
    """Uploaded files go to a temporary folder, never into your real uploads/ folder."""
    monkeypatch.setattr(file_storage, "UPLOAD_DIR", tmp_path)
    return tmp_path


# ---------------------------------------------------------------- helpers
def pdf(content: bytes = b"one") -> bytes:
    return b"%PDF-1.4\n" + content


def make_draft(client, headers, conf_id, track_id, title=PLACEHOLDER):
    return client.post(
        f"{API}/papers/",
        json={"conference_id": conf_id, "track_id": track_id, "title": title, "abstract": "",
              "authors": [], "subject_area_ids": []},
        headers=headers,
    )


def upload(client, headers, paper_id, content=None, name="paper.pdf", mime="application/pdf"):
    return client.post(
        f"{API}/papers/{paper_id}/manuscript",
        files={"file": (name, pdf() if content is None else content, mime)},
        headers=headers,
    )


def fill(client, headers, paper_id, title="A Real Title"):
    return client.patch(
        f"{API}/papers/{paper_id}",
        json={"title": title, "abstract": "An abstract.",
              "authors": [{"name": "Ann Author", "email": "ann@uni.edu", "affiliation": "CU"}]},
        headers=headers,
    )


def ready_paper(client, headers, conf_id, track_id, title="A Real Title", content=b"one"):
    paper_id = make_draft(client, headers, conf_id, track_id).json()["id"]
    assert fill(client, headers, paper_id, title).status_code == 200
    assert upload(client, headers, paper_id, pdf(content)).status_code == 200
    return paper_id


def add_deadline(db, conf_id, due, grace=0, track_id=None, kind="submission"):
    db.add(Deadline(conference_id=conf_id, track_id=track_id, deadline_type=kind, due_at=due,
                    grace_period_minutes=grace))
    db.commit()


def second_conference(db):
    conf = Conference(title="Other Conf", acronym="OTH-2026", start_date=datetime(2027, 1, 1),
                      end_date=datetime(2027, 1, 3), location="Delhi", is_active=True)
    db.add(conf)
    db.commit()
    track = Track(conference_id=conf.id, name="Other Track")
    db.add(track)
    db.commit()
    return conf.id, track.id


# ---------------------------------------------------------------- creating a draft
def test_author_can_create_a_draft(client, world):
    res = make_draft(client, world.author_h, world.conf_id, world.track_a)
    assert res.status_code == 201, res.text
    assert res.json()["status"] == "draft"
    assert res.json()["paper_number"] is None


def test_draft_needs_login(client, world):
    assert make_draft(client, {}, world.conf_id, world.track_a).status_code == 401


def test_track_must_belong_to_the_conference(client, db, world):
    _, other_track = second_conference(db)
    assert make_draft(client, world.author_h, world.conf_id, other_track).status_code == 400


def test_unknown_conference_returns_404(client, world):
    assert make_draft(client, world.author_h, 99999, world.track_a).status_code == 404


def test_cannot_start_a_draft_after_the_deadline(client, db, world):
    add_deadline(db, world.conf_id, utcnow() - timedelta(days=1))
    res = make_draft(client, world.author_h, world.conf_id, world.track_a)
    assert res.status_code == 403
    assert "deadline has passed" in res.json()["detail"]


def test_grace_period_keeps_submission_open(client, db, world):
    add_deadline(db, world.conf_id, utcnow() - timedelta(minutes=10), grace=60)
    assert make_draft(client, world.author_h, world.conf_id, world.track_a).status_code == 201


def test_track_deadline_beats_conference_deadline(client, db, world):
    add_deadline(db, world.conf_id, utcnow() + timedelta(days=30))
    add_deadline(db, world.conf_id, utcnow() - timedelta(days=1), track_id=world.track_b)
    assert make_draft(client, world.author_h, world.conf_id, world.track_a).status_code == 201
    assert make_draft(client, world.author_h, world.conf_id, world.track_b).status_code == 403


def test_newest_deadline_row_wins(client, db, world):
    add_deadline(db, world.conf_id, utcnow() - timedelta(days=5))  # old, already closed
    add_deadline(db, world.conf_id, utcnow() + timedelta(days=5))  # the Chair extended it
    assert make_draft(client, world.author_h, world.conf_id, world.track_a).status_code == 201


# ---------------------------------------------------------------- autosave
def test_autosave_updates_fields_and_replaces_authors(client, db, world):
    pid = make_draft(client, world.author_h, world.conf_id, world.track_a).json()["id"]
    for _ in range(3):  # saving the same data again and again must not duplicate authors
        res = fill(client, world.author_h, pid)
        assert res.status_code == 200, res.text
    assert res.json()["title"] == "A Real Title"
    db.expire_all()
    assert db.query(PaperAuthor).filter(PaperAuthor.paper_id == pid).count() == 1


def test_author_order_follows_the_list(client, db, world):
    pid = make_draft(client, world.author_h, world.conf_id, world.track_a).json()["id"]
    client.patch(f"{API}/papers/{pid}", headers=world.author_h, json={"authors": [
        {"name": "First", "email": "a@uni.edu"}, {"name": "Second", "email": "b@uni.edu"}]})
    db.expire_all()
    rows = db.query(PaperAuthor).filter(PaperAuthor.paper_id == pid).order_by(PaperAuthor.display_order).all()
    assert [r.name for r in rows] == ["First", "Second"]


def test_only_the_owner_can_edit(client, make_user, login, world):
    pid = make_draft(client, world.author_h, world.conf_id, world.track_a).json()["id"]
    make_user("other@uni.edu", roles=[("author", None, None)])
    assert fill(client, login("other@uni.edu"), pid).status_code == 403


def test_subject_areas_must_belong_to_the_conference(client, db, world):
    other_conf, _ = second_conference(db)
    mine = SubjectArea(conference_id=world.conf_id, name="AI")
    foreign = SubjectArea(conference_id=other_conf, name="Chemistry")
    db.add_all([mine, foreign])
    db.commit()
    pid = make_draft(client, world.author_h, world.conf_id, world.track_a).json()["id"]
    ok = client.patch(f"{API}/papers/{pid}", json={"subject_area_ids": [mine.id]}, headers=world.author_h)
    bad = client.patch(f"{API}/papers/{pid}", json={"subject_area_ids": [foreign.id]}, headers=world.author_h)
    assert ok.status_code == 200
    assert bad.status_code == 400


# ---------------------------------------------------------------- uploads
def test_pdf_upload_creates_a_version_with_a_hash(client, db, world, tmp_uploads):
    pid = make_draft(client, world.author_h, world.conf_id, world.track_a).json()["id"]
    res = upload(client, world.author_h, pid)
    assert res.status_code == 200, res.text
    db.expire_all()
    version = db.query(PaperVersion).filter(PaperVersion.paper_id == pid).one()
    assert len(version.sha256) == 64
    assert version.original_filename == "paper.pdf"
    assert len(list(tmp_uploads.iterdir())) == 1


def test_docx_with_a_generic_content_type_is_accepted(client, world):
    pid = make_draft(client, world.author_h, world.conf_id, world.track_a).json()["id"]
    res = upload(client, world.author_h, pid, b"PK\x03\x04 fake docx body", "paper.docx", "application/octet-stream")
    assert res.status_code == 200, res.text


def test_wrong_extension_is_rejected(client, world):
    pid = make_draft(client, world.author_h, world.conf_id, world.track_a).json()["id"]
    assert upload(client, world.author_h, pid, b"hello", "notes.txt", "text/plain").status_code == 400


def test_fake_pdf_is_rejected(client, world):
    pid = make_draft(client, world.author_h, world.conf_id, world.track_a).json()["id"]
    assert upload(client, world.author_h, pid, b"this is not a pdf", "paper.pdf").status_code == 400


def test_empty_file_is_rejected(client, world):
    pid = make_draft(client, world.author_h, world.conf_id, world.track_a).json()["id"]
    assert upload(client, world.author_h, pid, b"", "paper.pdf").status_code == 400


def test_too_large_file_is_rejected(client, world, monkeypatch):
    monkeypatch.setattr(file_storage, "MAX_FILE_SIZE_BYTES", 10)
    pid = make_draft(client, world.author_h, world.conf_id, world.track_a).json()["id"]
    assert upload(client, world.author_h, pid, pdf(b"x" * 50)).status_code == 413


def test_each_upload_adds_a_new_version(client, db, world):
    pid = make_draft(client, world.author_h, world.conf_id, world.track_a).json()["id"]
    upload(client, world.author_h, pid, pdf(b"v1"))
    upload(client, world.author_h, pid, pdf(b"v2"))
    db.expire_all()
    numbers = [v.version_number for v in db.query(PaperVersion).filter(PaperVersion.paper_id == pid).order_by(PaperVersion.id)]
    assert numbers == [1, 2]


# ---------------------------------------------------------------- submitting
def test_submit_succeeds_and_gives_a_paper_number(client, world):
    pid = ready_paper(client, world.author_h, world.conf_id, world.track_a)
    res = client.post(f"{API}/papers/{pid}/submit", headers=world.author_h)
    assert res.status_code == 200, res.text
    assert res.json()["status"] == "submitted"
    assert res.json()["paper_number"] == "TC-2026-0001"


def test_submit_lists_everything_that_is_missing(client, world):
    pid = make_draft(client, world.author_h, world.conf_id, world.track_a).json()["id"]
    res = client.post(f"{API}/papers/{pid}/submit", headers=world.author_h)
    assert res.status_code == 400
    detail = res.json()["detail"]
    for word in ("real title", "abstract", "author", "manuscript"):
        assert word in detail


def test_placeholder_title_cannot_be_submitted(client, world):
    pid = make_draft(client, world.author_h, world.conf_id, world.track_a).json()["id"]
    client.patch(f"{API}/papers/{pid}", headers=world.author_h, json={
        "abstract": "x", "authors": [{"name": "A", "email": "a@uni.edu"}]})
    upload(client, world.author_h, pid)
    res = client.post(f"{API}/papers/{pid}/submit", headers=world.author_h)
    assert res.status_code == 400
    assert "real title" in res.json()["detail"]


def test_numbers_count_up_inside_a_conference(client, world):
    first = ready_paper(client, world.author_h, world.conf_id, world.track_a, "First", b"1")
    second = ready_paper(client, world.author_h, world.conf_id, world.track_b, "Second", b"2")
    assert client.post(f"{API}/papers/{first}/submit", headers=world.author_h).json()["paper_number"] == "TC-2026-0001"
    assert client.post(f"{API}/papers/{second}/submit", headers=world.author_h).json()["paper_number"] == "TC-2026-0002"


def test_numbers_do_not_collide_between_conferences(client, db, world):
    """Regression test: the old code numbered every conference ACMS-2026-0001, which crashed with a 500."""
    other_conf, other_track = second_conference(db)
    a = ready_paper(client, world.author_h, world.conf_id, world.track_a, "Paper A", b"a")
    b = ready_paper(client, world.author_h, other_conf, other_track, "Paper B", b"b")
    ra = client.post(f"{API}/papers/{a}/submit", headers=world.author_h)
    rb = client.post(f"{API}/papers/{b}/submit", headers=world.author_h)
    assert ra.status_code == 200 and rb.status_code == 200, rb.text
    assert ra.json()["paper_number"] == "TC-2026-0001"
    assert rb.json()["paper_number"] == "OTH-2026-0001"


def test_submit_after_the_deadline_is_refused_with_a_message(client, db, world):
    pid = ready_paper(client, world.author_h, world.conf_id, world.track_a)
    add_deadline(db, world.conf_id, utcnow() - timedelta(hours=2))
    res = client.post(f"{API}/papers/{pid}/submit", headers=world.author_h)
    assert res.status_code == 403
    assert "deadline has passed" in res.json()["detail"]


def test_submit_inside_the_grace_period_works(client, db, world):
    pid = ready_paper(client, world.author_h, world.conf_id, world.track_a)
    add_deadline(db, world.conf_id, utcnow() - timedelta(minutes=5), grace=30)
    assert client.post(f"{API}/papers/{pid}/submit", headers=world.author_h).status_code == 200


def test_submit_before_the_deadline_works(client, db, world):
    pid = ready_paper(client, world.author_h, world.conf_id, world.track_a)
    add_deadline(db, world.conf_id, utcnow() + timedelta(days=3))
    assert client.post(f"{API}/papers/{pid}/submit", headers=world.author_h).status_code == 200


def test_cannot_submit_twice(client, world):
    pid = ready_paper(client, world.author_h, world.conf_id, world.track_a)
    assert client.post(f"{API}/papers/{pid}/submit", headers=world.author_h).status_code == 200
    assert client.post(f"{API}/papers/{pid}/submit", headers=world.author_h).status_code == 409


def test_submitted_paper_is_locked(client, world):
    pid = ready_paper(client, world.author_h, world.conf_id, world.track_a)
    client.post(f"{API}/papers/{pid}/submit", headers=world.author_h)
    assert fill(client, world.author_h, pid, "Changed").status_code == 409
    assert upload(client, world.author_h, pid, pdf(b"late")).status_code == 409


def test_nobody_else_can_submit_my_paper(client, make_user, login, world):
    pid = ready_paper(client, world.author_h, world.conf_id, world.track_a)
    make_user("other@uni.edu", roles=[("author", None, None)])
    assert client.post(f"{API}/papers/{pid}/submit", headers=login("other@uni.edu")).status_code == 403
    assert client.post(f"{API}/papers/{pid}/submit").status_code == 401


def test_duplicate_title_is_refused(client, world):
    first = ready_paper(client, world.author_h, world.conf_id, world.track_a, "Deep Learning for Cats", b"1")
    second = ready_paper(client, world.author_h, world.conf_id, world.track_a, "  deep   LEARNING for cats ", b"2")
    assert client.post(f"{API}/papers/{first}/submit", headers=world.author_h).status_code == 200
    res = client.post(f"{API}/papers/{second}/submit", headers=world.author_h)
    assert res.status_code == 409
    assert "title" in res.json()["detail"]


def test_same_title_in_another_conference_is_fine(client, db, world):
    other_conf, other_track = second_conference(db)
    a = ready_paper(client, world.author_h, world.conf_id, world.track_a, "Same Title", b"1")
    b = ready_paper(client, world.author_h, other_conf, other_track, "Same Title", b"2")
    assert client.post(f"{API}/papers/{a}/submit", headers=world.author_h).status_code == 200
    assert client.post(f"{API}/papers/{b}/submit", headers=world.author_h).status_code == 200


def test_same_file_is_refused_in_the_same_conference(client, world):
    first = ready_paper(client, world.author_h, world.conf_id, world.track_a, "Title One", b"same bytes")
    second = ready_paper(client, world.author_h, world.conf_id, world.track_a, "Title Two", b"same bytes")
    assert client.post(f"{API}/papers/{first}/submit", headers=world.author_h).status_code == 200
    res = client.post(f"{API}/papers/{second}/submit", headers=world.author_h)
    assert res.status_code == 409
    assert "file" in res.json()["detail"]


# ---------------------------------------------------------------- reading
def test_mine_lists_only_my_papers(client, make_user, login, world):
    make_draft(client, world.author_h, world.conf_id, world.track_a)
    make_user("other@uni.edu", roles=[("author", None, None)])
    other = login("other@uni.edu")
    make_draft(client, other, world.conf_id, world.track_a)
    make_draft(client, other, world.conf_id, world.track_b)
    assert len(client.get(f"{API}/papers/mine", headers=world.author_h).json()) == 1
    assert len(client.get(f"{API}/papers/mine", headers=other).json()) == 2


def test_who_may_view_a_paper(client, make_user, login, world):
    pid = make_draft(client, world.author_h, world.conf_id, world.track_a).json()["id"]
    url = f"{API}/papers/{pid}"
    assert client.get(url, headers=world.author_h).status_code == 200  # the owner
    assert client.get(url, headers=world.chair_h).status_code == 200  # the Chair
    assert client.get(url, headers=world.tchair_h).status_code == 200  # Track Chair of that track

    make_user("tchairb@uni.edu", roles=[("track_chair", world.conf_id, world.track_b)])
    make_user("stranger@uni.edu", roles=[("author", None, None)])
    assert client.get(url, headers=login("tchairb@uni.edu")).status_code == 403  # other track
    assert client.get(url, headers=login("stranger@uni.edu")).status_code == 403
    assert client.get(url).status_code == 401
    assert client.get(f"{API}/papers/99999", headers=world.author_h).status_code == 404


def test_a_co_author_with_an_account_can_view(client, make_user, login, world):
    co = make_user("co@uni.edu", roles=[("author", None, None)])
    pid = make_draft(client, world.author_h, world.conf_id, world.track_a).json()["id"]
    client.patch(f"{API}/papers/{pid}", headers=world.author_h, json={"authors": [
        {"name": "Co Author", "email": "co@uni.edu", "user_id": co.id}]})
    assert client.get(f"{API}/papers/{pid}", headers=login("co@uni.edu")).status_code == 200


# ---------------------------------------------------------------- what an author may submit to
def test_open_conferences_need_no_login_and_list_tracks(client, world):
    res = client.get(f"{API}/conferences/public/open")
    assert res.status_code == 200
    body = res.json()
    assert [c["acronym"] for c in body] == ["TC-2026"]
    assert sorted(t["name"] for t in body[0]["tracks"]) == ["Machine Learning", "Security"]
    assert body[0]["tracks"][0]["closes_at"] is None  # the Chair has not set a deadline


def test_closed_tracks_and_conferences_are_hidden(client, db, world):
    add_deadline(db, world.conf_id, utcnow() - timedelta(days=1), track_id=world.track_b)
    tracks = client.get(f"{API}/conferences/public/open").json()[0]["tracks"]
    assert [t["name"] for t in tracks] == ["Machine Learning"]

    add_deadline(db, world.conf_id, utcnow() - timedelta(days=1))  # now the whole conference is closed
    add_deadline(db, world.conf_id, utcnow() - timedelta(days=1), track_id=world.track_a)
    assert client.get(f"{API}/conferences/public/open").json() == []


def test_closing_time_includes_grace_and_a_timezone(client, db, world):
    due = utcnow() + timedelta(hours=1)
    add_deadline(db, world.conf_id, due, grace=30)
    closes = client.get(f"{API}/conferences/public/open").json()[0]["tracks"][0]["closes_at"]
    assert closes.endswith("Z") or closes.endswith("+00:00")
    parsed = datetime.fromisoformat(closes.replace("Z", "+00:00")).replace(tzinfo=None)
    assert abs((parsed - (due + timedelta(minutes=30))).total_seconds()) < 2


def test_inactive_conferences_are_hidden(client, db, world):
    conf = db.get(Conference, world.conf_id)
    conf.is_active = False
    db.commit()
    assert client.get(f"{API}/conferences/public/open").json() == []