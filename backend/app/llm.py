from google import genai
from google.genai import types
from .retry import retry
from .config import get_settings
import logging
from  google.genai import errors
log = logging.getLogger(__name__)      # a logger named after this file: "app.llm"
import httpx

    
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
        self.client = genai.Client(api_key=settings.gemini_api_key,http_options=types.HttpOptions(timeout=30000))
    
    async def call_gemini(self, system: str, prompt: str, temperature: float, max_tokens: int) :
        return await self.client.aio.models.generate_content(
            model=self.model,
            contents=prompt,
            config=types.GenerateContentConfig(   #a class google created that we can directly use
                system_instruction=system,
                temperature=temperature,
                max_output_tokens=max_tokens,
            ),)
        

        
    async def generate_text(self, system: str, prompt: str, temperature: float, max_tokens: int) -> str:
            
        response= await retry(
            self.call_gemini,
            system=system,
            prompt=prompt,
            temperature=temperature,
            max_tokens=max_tokens,
            should_retry=temp_should_retry,
        )   

        usage = response.usage_metadata
        if usage:
            log.info(
            "gemini call: model=%s in=%s out=%s",
            self.model, usage.prompt_token_count, usage.candidates_token_count,)

        if not response.text :
            raise ValueError("No response from Gemini API")
        return response.text

        

class FakeLLM:
    """A pretend LLM for tests: same method as LLM, but never calls Google."""

    def __init__(self, reply: str = "Fake reply from the future."):
        self.reply = reply        # what it will always answer
        self.calls = []           # a notebook of every call it receives

    async def generate_text(self, system: str, prompt: str, temperature: float, max_tokens: int) -> str:
        self.calls.append({
            "system": system,
            "prompt": prompt,
            "temperature": temperature,
            "max_tokens": max_tokens,
        })
        return self.reply