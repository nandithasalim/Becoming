"""Request and response shapes for the API, with the answer rules."""
import uuid
from datetime import datetime
from typing import Annotated

from pydantic import AfterValidator, BaseModel, EmailStr, Field, field_validator

from . import questions as Q


# ---------- answer rules ----------

def clean_text(v: str) -> str:
    """A choice answer: a preset value or the user's own words, 1 to 60 characters."""
    v = " ".join(v.split())  # trim and collapse spaces
    if not v:
        raise ValueError("answer is empty")
    if len(v) > Q.MAX_TEXT:
        raise ValueError(f"answer is longer than {Q.MAX_TEXT} characters")
    return v


def clean_list(v: list[str]) -> list[str]:
    """A multi-pick answer: each item cleaned, duplicates removed (keeps the order they picked)."""
    out: list[str] = []
    for item in v:
        item = clean_text(item)
        if item.lower() not in (o.lower() for o in out):
            out.append(item)
    return out


Choice = Annotated[str, AfterValidator(clean_text)]
Choices = Annotated[list[str], AfterValidator(clean_list)]


class Dream(BaseModel):
    """Screen 4, optional. Send it with the rest, or later via PUT /me/dream."""

    loved_as_kid: Choices = Field(default_factory=list, max_length=Q.MAX_LIST)
    would_try: str = Field(default="", max_length=Q.MAX_WOULD_TRY)
    focus_areas: Choices = Field(default_factory=list, max_length=Q.MAX_FOCUS)

    @field_validator("would_try")
    @classmethod
    def _trim(cls, v: str) -> str:
        return v.strip()


class AnswersIn(BaseModel):
    # Screen 1 · You, now
    display_name: str = Field(min_length=1, max_length=40)
    current_feeling: Choice
    situation: Choice
    # Screen 2 · Future you
    role: Choice
    place: Choice
    feel: Choice
    # Screen 3 · Who they are
    traits: Choices
    let_go: Choices = Field(min_length=1, max_length=Q.MAX_LIST)
    voice: str
    # Screen 4 · The dream (leave out = skipped)
    dream: Dream | None = None

    @field_validator("display_name")
    @classmethod
    def _name(cls, v: str) -> str:
        v = " ".join(v.split())
        if not v:
            raise ValueError("name is empty")
        return v

    @field_validator("traits")
    @classmethod
    def _three_traits(cls, v: list[str]) -> list[str]:
        if len(v) != Q.TRAITS_COUNT:
            raise ValueError(f"pick exactly {Q.TRAITS_COUNT} different traits")
        return v

    @field_validator("voice")
    @classmethod
    def _voice(cls, v: str) -> str:
        if v not in Q.VOICE:  # the voice drives the AI's tone, so only the 3 presets
            raise ValueError(f"voice must be one of {Q.VOICE}")
        return v


class AnswersOut(BaseModel):
    display_name: str
    current_feeling: str
    situation: str
    role: str
    place: str
    feel: str
    traits: list[str]
    let_go: list[str]
    voice: str
    loved_as_kid: list[str]
    would_try: str
    focus_areas: list[str]
    dream_done: bool
    updated_at: datetime


# ---------- auth ----------

class GoogleLogin(BaseModel):
    credential: str  # the ID token from Google Identity Services


class DevLogin(BaseModel):
    email: EmailStr
    name: str = ""


class UserOut(BaseModel):
    id: uuid.UUID
    email: str
    name: str


class TokenOut(BaseModel):
    token: str
    user: UserOut


class MeOut(BaseModel):
    user: UserOut
    answers: AnswersOut | None
