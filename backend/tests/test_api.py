import pytest
from fastapi.testclient import TestClient
from sqlmodel import Session, SQLModel, create_engine
from sqlmodel.pool import StaticPool

from app import auth, db, main
from app.config import Settings, get_settings


@pytest.fixture
def client(monkeypatch):
    engine = create_engine("sqlite://", connect_args={"check_same_thread": False}, poolclass=StaticPool)
    monkeypatch.setattr(db, "_engine", engine)
    from app import models  # noqa: F401
    SQLModel.metadata.create_all(engine)

    settings = Settings(dev_login=True, google_client_id="test-client", jwt_secret="x" * 40)
    main.app.dependency_overrides[get_settings] = lambda: settings
    main.app.dependency_overrides[db.get_session] = lambda: (yield from _session(engine))
    with TestClient(main.app) as c:
        yield c
    main.app.dependency_overrides.clear()


def _session(engine):
    with Session(engine) as s:
        yield s


def login(client, email="nanditha@example.com", name="Nanditha"):
    r = client.post("/auth/dev", json={"email": email, "name": name})
    assert r.status_code == 200, r.text
    return {"Authorization": f"Bearer {r.json()['token']}"}


ANSWERS = {
    "display_name": "Nanditha", "current_feeling": "stuck", "situation": "job_hunting",
    "role": "designer", "place": "a flat in Bangalore", "feel": "calm",
    "traits": ["calm", "disciplined", "bold"], "let_go": ["overthinking"], "voice": "gentle",
}
DREAM = {"loved_as_kid": ["drawing", "music"], "would_try": "open a small studio", "focus_areas": ["career", "peace"]}


def saved(r):
    """The answer fields we sent, from a response (drops server-made fields)."""
    body = r.json() if hasattr(r, "json") else r
    return {k: body[k] for k in ANSWERS}


def test_health(client):
    assert client.get("/health").json() == {"ok": True}


def test_me_requires_login(client):
    assert client.get("/me").status_code == 401
    assert client.get("/me", headers={"Authorization": "Bearer nonsense"}).status_code == 401


def test_dev_login_and_empty_profile(client):
    h = login(client)
    me = client.get("/me", headers=h).json()
    assert me["user"]["email"] == "nanditha@example.com"
    assert me["answers"] is None


def test_save_and_update_answers(client):
    h = login(client)
    assert saved(client.put("/me/answers", json=ANSWERS, headers=h)) == ANSWERS
    changed = {**ANSWERS, "feel": "free"}
    client.put("/me/answers", json=changed, headers=h)
    assert saved(client.get("/me", headers=h).json()["answers"]) == changed


def test_answers_are_validated(client):
    h = login(client)
    assert client.put("/me/answers", json={**ANSWERS, "role": ""}, headers=h).status_code == 422


def test_users_do_not_see_each_others_answers(client):
    a = login(client, "a@example.com")
    b = login(client, "b@example.com")
    client.put("/me/answers", json=ANSWERS, headers=a)
    assert client.get("/me", headers=b).json()["answers"] is None


def test_same_email_logs_into_same_account(client):
    h1 = login(client, "Same@Example.com")
    client.put("/me/answers", json=ANSWERS, headers=h1)
    h2 = login(client, "same@example.com")
    assert saved(client.get("/me", headers=h2).json()["answers"]) == ANSWERS


def test_google_login(client, monkeypatch):
    monkeypatch.setattr(main, "verify_google_token", lambda cred, cid: {
        "sub": "google-123", "email": "g@example.com", "name": "G User", "email_verified": True, "iss": "accounts.google.com"})
    r = client.post("/auth/google", json={"credential": "fake"})
    assert r.status_code == 200
    h = {"Authorization": f"Bearer {r.json()['token']}"}
    assert client.get("/me", headers=h).json()["user"]["email"] == "g@example.com"


def test_google_login_rejects_bad_token(client, monkeypatch):
    def bad(cred, cid):
        raise ValueError("bad")
    monkeypatch.setattr(main, "verify_google_token", bad)
    assert client.post("/auth/google", json={"credential": "fake"}).status_code == 401


def test_dev_login_off_by_default(client):
    main.app.dependency_overrides[get_settings] = lambda: Settings(dev_login=False, jwt_secret="x" * 40)
    assert client.post("/auth/dev", json={"email": "x@example.com"}).status_code == 404


def test_expired_token_rejected(client):
    from datetime import datetime, timedelta, timezone
    import jwt
    import uuid
    token = jwt.encode({"sub": str(uuid.uuid4()), "exp": datetime.now(timezone.utc) - timedelta(seconds=1)}, "x" * 40, algorithm="HS256")
    assert client.get("/me", headers={"Authorization": f"Bearer {token}"}).status_code == 401


# ---------- the new questions ----------

def put(client, h, **changes):
    return client.put("/me/answers", json={**ANSWERS, **changes}, headers=h)


def test_questions_endpoint(client):
    q = client.get("/questions").json()
    assert "designer" in q["role"] and q["limits"]["traits"] == 3


def test_typed_answers_are_allowed(client):
    h = login(client)
    r = put(client, h, role="pottery studio owner", place="  a cottage   in Munnar ", traits=["calm", "bold", "funny in a quiet way"])
    assert r.status_code == 200
    assert r.json()["role"] == "pottery studio owner"
    assert r.json()["place"] == "a cottage in Munnar"          # spaces cleaned
    assert "funny in a quiet way" in r.json()["traits"]


def test_answer_too_long_or_empty(client):
    h = login(client)
    assert put(client, h, role="x" * 61).status_code == 422
    assert put(client, h, place="   ").status_code == 422
    assert put(client, h, display_name="  ").status_code == 422


def test_exactly_three_different_traits(client):
    h = login(client)
    assert put(client, h, traits=["calm", "bold"]).status_code == 422
    assert put(client, h, traits=["calm", "bold", "kind", "focused"]).status_code == 422
    assert put(client, h, traits=["calm", "Calm", "bold"]).status_code == 422   # duplicate doesn't count


def test_let_go_needs_one_to_five(client):
    h = login(client)
    assert put(client, h, let_go=[]).status_code == 422
    assert put(client, h, let_go=["a", "b", "c", "d", "e", "f"]).status_code == 422


def test_voice_must_be_a_preset(client):
    h = login(client)
    assert put(client, h, voice="sarcastic").status_code == 422


def test_missing_required_answer(client):
    h = login(client)
    body = {k: v for k, v in ANSWERS.items() if k != "situation"}
    assert client.put("/me/answers", json=body, headers=h).status_code == 422


def test_skipping_the_dream(client):
    h = login(client)
    r = put(client, h).json()
    assert r["dream_done"] is False and r["loved_as_kid"] == [] and r["focus_areas"] == []


def test_dream_with_the_rest(client):
    h = login(client)
    r = put(client, h, dream=DREAM).json()
    assert r["dream_done"] is True and r["would_try"] == "open a small studio"


def test_dream_later(client):
    h = login(client)
    assert client.put("/me/dream", json=DREAM, headers=h).status_code == 409   # nothing saved yet
    put(client, h)
    r = client.put("/me/dream", json=DREAM, headers=h).json()
    assert r["dream_done"] is True and r["focus_areas"] == ["career", "peace"]
    assert r["role"] == "designer"                                              # the rest is untouched


def test_dream_limits(client):
    h = login(client)
    put(client, h)
    assert client.put("/me/dream", json={**DREAM, "focus_areas": ["career", "money", "health", "peace"]}, headers=h).status_code == 422
    assert client.put("/me/dream", json={**DREAM, "would_try": "x" * 201}, headers=h).status_code == 422


def test_resaving_without_dream_keeps_the_dream(client):
    h = login(client)
    put(client, h, dream=DREAM)
    r = put(client, h, feel="free").json()
    assert r["dream_done"] is True and r["loved_as_kid"] == ["drawing", "music"]
