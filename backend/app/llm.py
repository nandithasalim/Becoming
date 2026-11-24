from google import genai
from google.genai import types
from .retry import retry
from .config import get_settings
import logging
from  google.genai import errors
log = logging.getLogger(__name__)      # a logger named after this file: "app.llm"
import httpx
from pydantic import BaseModel
    
def temp_should_retry(e:Exception) -> bool:
    if isinstance(e, (TimeoutError, httpx.TransportError)):  #Google’s library sends requests through httpx
        return True
    if isinstance(e, errors.APIError):
        if e.code in [429, 500, 502, 503, 504]:
            return True
    return False

class LLM:
    def __init__(self):
        settings = get_settings()
        self.model = settings.llm_model
        self.client = genai.Client(api_key=settings.gemini_api_key, http_options=types.HttpOptions(timeout=30000,api_version="v1beta"))

    # 1. The courier: only sends the request to Google
    async def call_gemini(self, system: str, prompt: str, temperature: float, max_tokens: int, schema=None):
        extra = {}
        if schema is not None:
            extra = {"response_mime_type": "application/json", "response_schema": schema}
        return await self.client.aio.models.generate_content(
            model=self.model,
            contents=prompt,
            config=types.GenerateContentConfig(
                system_instruction=system,
                temperature=temperature,
                max_output_tokens=max_tokens,
                **extra,
            ),
        )

    # 2. The shared steps, written ONCE
    async def _ask(self, system: str, prompt: str, temperature: float, max_tokens: int, schema=None) -> str:
        response = await retry(
            self.call_gemini,
            system=system,
            prompt=prompt,
            temperature=temperature,
            max_tokens=max_tokens,
            schema=schema,                 # None for text, a class for JSON
            should_retry=temp_should_retry,
        )
        usage = response.usage_metadata
        if usage:
            log.info("gemini call: model=%s in=%s out=%s",
                     self.model, usage.prompt_token_count, usage.candidates_token_count)
        if not response.text:
            raise ValueError("No response from Gemini API")
        return response.text               # always gives back plain text

    # 3a. For chat: just the text
    async def generate_text(self, system: str, prompt: str, temperature: float, max_tokens: int) -> str:
        return await self._ask(system, prompt, temperature, max_tokens)

    # 3b. For the profile: JSON, checked
    async def generate_json(self, system: str, prompt: str, schema: type[BaseModel],
                            temperature: float, max_tokens: int) -> BaseModel:
        text = await self._ask(system, prompt, temperature, max_tokens, schema=schema)
        return schema.model_validate_json(text)



class FakeLLM:
    """A pretend LLM for tests: same methods as LLM, but never calls Google."""

    def __init__(self, reply: str = "Fake reply from the future."):
        self.reply = reply      # for generate_json, give a JSON string here
        self.calls = []
        self.model = "fake"

    async def generate_text(self, system: str, prompt: str, temperature: float, max_tokens: int) -> str:
        self.calls.append({"system": system, "prompt": prompt,
                           "temperature": temperature, "max_tokens": max_tokens})
        return self.reply

    async def generate_json(self, system: str, prompt: str, schema: type[BaseModel],
                            temperature: float, max_tokens: int) -> BaseModel:
        self.calls.append({"system": system, "prompt": prompt,
                           "temperature": temperature, "max_tokens": max_tokens})
        return schema.model_validate_json(self.reply)  