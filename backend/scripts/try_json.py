import asyncio
import logging

from app.ai_schemas import FutureSelfDraft
from app.llm import LLM
from app.prompts.future_self import system_prompt, user_prompt

logging.basicConfig(level=logging.INFO)   # so you see the token log line

answers = {
    "display_name": "Nanditha", "current_feeling": "stuck", "situation": "job_hunting",
    "role": "AI engineer", "place": "Bangalore", "feel": "confident",
    "traits": ["curious", "disciplined", "brave"], "let_go": ["overthinking"],
    "voice": "coach", "loved_as_kid": ["drawing"], "would_try": "", "focus_areas": ["career"],
}

async def main():
    draft = await LLM().generate_json(
        system=system_prompt(),          # the rules from future_self_v1.txt
        prompt=user_prompt(answers),     # the answers inside <answers> tags
        schema=FutureSelfDraft,          # the form Gemini must fill
        temperature=0.8,                 # a bit creative
        max_tokens=2000,                 # enough room for the whole JSON
    )
    print("STORY:", draft.story, "\n")
    print("VALUES:", draft.values)
    print("HABITS:", draft.habits)
    for c in draft.chapters:
        print(f"- {c.title} ({c.days} days): {c.first_step}")
    print("\nTODAY:", draft.today_note)

asyncio.run(main())