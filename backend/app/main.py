"""Future Self API — Phase 1: accounts and onboarding answers."""
from contextlib import asynccontextmanager

from fastapi import Depends, FastAPI, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from sqlmodel import Session, select

from .auth import create_token, current_user, upsert_user, verify_google_token
from .config import Settings, get_settings
from .db import get_session, init_db
from .models import FutureSelf, User, now
from . import questions as Q
from .schemas import AnswersIn, AnswersOut, DevLogin, Dream, GoogleLogin, MeOut, TokenOut, UserOut


@asynccontextmanager
async def lifespan(_: FastAPI):
    init_db()
    yield


app = FastAPI(title="Future Self API", version="0.1.0", lifespan=lifespan)
app.add_middleware(
    CORSMiddleware,
    allow_origins=get_settings().cors_list,
    allow_methods=["*"],
    allow_headers=["*"],
)


def user_out(u: User) -> UserOut:
    return UserOut(id=u.id, email=u.email, name=u.name)


def answers_out(fs: FutureSelf | None) -> AnswersOut | None:
    if fs is None:
        return None
    return AnswersOut(
        display_name=fs.display_name, current_feeling=fs.current_feeling, situation=fs.situation,
        role=fs.role, place=fs.place, feel=fs.feel,
        traits=fs.traits, let_go=fs.let_go, voice=fs.voice,
        loved_as_kid=fs.loved_as_kid, would_try=fs.would_try, focus_areas=fs.focus_areas,
        dream_done=fs.dream_done_at is not None, updated_at=fs.updated_at,
    )


def find_future_self(session: Session, user: User) -> FutureSelf | None:
    return session.exec(select(FutureSelf).where(FutureSelf.user_id == user.id)).first()


def apply_dream(fs: FutureSelf, dream: Dream) -> None:
    fs.loved_as_kid = dream.loved_as_kid
    fs.would_try = dream.would_try
    fs.focus_areas = dream.focus_areas
    fs.dream_done_at = now()


@app.get("/health")
def health() -> dict:
    return {"ok": True}


@app.get("/questions")
def get_questions() -> dict:
    """The preset choices for every question, so the app and the API never disagree."""
    return {
        "current_feeling": Q.CURRENT_FEELING, "situation": Q.SITUATION,
        "role": Q.ROLE, "place": Q.PLACE, "feel": Q.FEEL,
        "traits": Q.TRAITS, "let_go": Q.LET_GO, "voice": Q.VOICE,
        "loved_as_kid": Q.LOVED_AS_KID, "focus_areas": Q.FOCUS_AREAS,
        "limits": {"traits": Q.TRAITS_COUNT, "focus_areas": Q.MAX_FOCUS, "list": Q.MAX_LIST, "text": Q.MAX_TEXT},
    }


@app.post("/auth/google", response_model=TokenOut)
def login_google(body: GoogleLogin, session: Session = Depends(get_session), settings: Settings = Depends(get_settings)):
    if not settings.google_client_id:
        raise HTTPException(status.HTTP_503_SERVICE_UNAVAILABLE, "Google sign-in is not configured")
    from google.auth.exceptions import GoogleAuthError, TransportError

    try:
        claims = verify_google_token(body.credential, settings.google_client_id)
    except TransportError:
        raise HTTPException(status.HTTP_503_SERVICE_UNAVAILABLE, "Could not reach Google, try again")
    except (ValueError, GoogleAuthError):
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Invalid Google sign-in")
    user = upsert_user(session, email=claims["email"], name=claims.get("name", ""), google_sub=claims["sub"])
    return TokenOut(token=create_token(user.id, settings), user=user_out(user))


@app.post("/auth/dev", response_model=TokenOut)
def login_dev(body: DevLogin, session: Session = Depends(get_session), settings: Settings = Depends(get_settings)):
    """Email-only login for local development. Disabled unless DEV_LOGIN=true."""
    if not settings.dev_login:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Not found")
    user = upsert_user(session, email=body.email, name=body.name, google_sub=None)
    return TokenOut(token=create_token(user.id, settings), user=user_out(user))


@app.get("/me", response_model=MeOut)
def me(user: User = Depends(current_user), session: Session = Depends(get_session)):
    return MeOut(user=user_out(user), answers=answers_out(find_future_self(session, user)))


@app.put("/me/answers", response_model=AnswersOut)
def save_answers(body: AnswersIn, user: User = Depends(current_user), session: Session = Depends(get_session)):
    """Save screens 1-3 (and screen 4 if it is included). Sending it again overwrites."""
    data = body.model_dump(exclude={"dream"})
    fs = find_future_self(session, user)
    if fs is None:
        fs = FutureSelf(user_id=user.id, **data)
    else:
        for k, v in data.items():
            setattr(fs, k, v)
        fs.updated_at = now()
    if body.dream is not None:
        apply_dream(fs, body.dream)
    session.add(fs)
    session.commit()
    session.refresh(fs)
    return answers_out(fs)


@app.put("/me/dream", response_model=AnswersOut)
def save_dream(body: Dream, user: User = Depends(current_user), session: Session = Depends(get_session)):
    """Screen 4 later, for people who tapped "Skip for now"."""
    fs = find_future_self(session, user)
    if fs is None:
        raise HTTPException(status.HTTP_409_CONFLICT, "Answer the first questions before the dream")
    apply_dream(fs, body)
    fs.updated_at = now()
    session.add(fs)
    session.commit()
    session.refresh(fs)
    return answers_out(fs)
