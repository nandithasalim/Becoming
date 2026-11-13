"""Sign-in and session tokens.

Flow:
1. The web app shows the "Sign in with Google" button (Google Identity Services).
2. Google gives the browser an ID token (a signed JWT that proves who the user is).
3. The browser sends it to POST /auth/google. We verify it with Google's public keys.
4. We create/update the user and return OUR OWN token, which the browser sends as
   `Authorization: Bearer <token>` on every later request.
"""
import uuid
from datetime import datetime, timedelta, timezone

import jwt
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlmodel import Session, select

from .config import Settings, get_settings
from .db import get_session
from .models import User, now

ALGORITHM = "HS256"
bearer = HTTPBearer(auto_error=False)


def create_token(user_id: uuid.UUID, settings: Settings) -> str:
    exp = datetime.now(timezone.utc) + timedelta(days=settings.jwt_days)
    return jwt.encode({"sub": str(user_id), "exp": exp}, settings.jwt_secret, algorithm=ALGORITHM)


def verify_google_token(credential: str, client_id: str) -> dict:
    """Checks the Google ID token's signature, audience and expiry. Returns its claims."""
    from google.auth.transport import requests as google_requests
    from google.oauth2 import id_token

    claims = id_token.verify_oauth2_token(credential, google_requests.Request(), client_id)
    if claims.get("iss") not in ("accounts.google.com", "https://accounts.google.com"):
        raise ValueError("wrong issuer")
    if not claims.get("email_verified"):
        raise ValueError("email not verified")
    return claims


def upsert_user(session: Session, *, email: str, name: str, google_sub: str | None) -> User:
    user = None
    if google_sub:
        user = session.exec(select(User).where(User.google_sub == google_sub)).first()
    if user is None:
        user = session.exec(select(User).where(User.email == email.lower())).first()
    if user is None:
        user = User(email=email.lower(), name=name, google_sub=google_sub)
    else:
        user.name = name or user.name
        user.google_sub = google_sub or user.google_sub
        user.last_login_at = now()
    session.add(user)
    session.commit()
    session.refresh(user)
    return user


def current_user(
    creds: HTTPAuthorizationCredentials | None = Depends(bearer),
    session: Session = Depends(get_session),
    settings: Settings = Depends(get_settings),
) -> User:
    unauthorized = HTTPException(status.HTTP_401_UNAUTHORIZED, "Not signed in", headers={"WWW-Authenticate": "Bearer"})
    if creds is None:
        raise unauthorized
    try:
        payload = jwt.decode(creds.credentials, settings.jwt_secret, algorithms=[ALGORITHM])
        user_id = uuid.UUID(payload["sub"])
    except (jwt.PyJWTError, KeyError, ValueError):
        raise unauthorized
    user = session.get(User, user_id)
    if user is None:
        raise unauthorized
    return user
