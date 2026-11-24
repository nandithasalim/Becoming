"""Loads the future-self prompt and builds the per-user part."""
import json
from pathlib import Path

PROMPT_VERSION = "future_self_v1"   # change the prompt? make a v2 file and bump this

_DIR = Path(__file__).parent        # the folder this file is in: app/prompts/


def system_prompt() -> str:
    """The fixed rules, read from the versioned .txt file."""
    return (_DIR / f"{PROMPT_VERSION}.txt").read_text(encoding="utf-8")


def user_prompt(answers: dict) -> str:
    """This one user's answers, wrapped in tags so the model treats them as data."""
    data = json.dumps(answers, ensure_ascii=False, indent=2)
    return (
        "Here are the user's answers.\n"
        f"<answers>\n{data}\n</answers>\n"
        "Write their future-self profile now."
    )