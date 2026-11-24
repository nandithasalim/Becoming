"""The shapes the AI must reply in. Gemini is told this shape, and Pydantic checks the reply."""
from pydantic import BaseModel, Field


class Chapter(BaseModel):
    """One stage of the journey from today to the future self."""

    title: str = Field(min_length=3, max_length=40)          # e.g. "The Decision"
    goal: str = Field(min_length=10, max_length=200)         # what changes in this chapter
    first_step: str = Field(min_length=5, max_length=140)    # one small first action
    days: int = Field(ge=7, le=30)                           # how long it lasts: 7 to 30 days


class FutureSelfDraft(BaseModel):
    """Everything Gemini writes about the future self. The traits are NOT here: the user chose those."""

    story: str = Field(min_length=200, max_length=900)                    # future-you's story, in first person
    values: list[str] = Field(min_length=3, max_length=3)                 # exactly 3 values
    habits: list[str] = Field(min_length=3, max_length=3)                 # exactly 3 small daily habits
    chapters: list[Chapter] = Field(min_length=3, max_length=5)           # 3 to 5 chapters
    today_note: str = Field(min_length=20, max_length=200)                # today's note from future-you