calls = 0
from app.retry import retry
from google.genai import errors
import asyncio
async def flaky():
    global calls
    calls += 1
    if calls < 3:
        raise TimeoutError("slow")
    return "ok"

print(asyncio.run(retry(flaky,should_retry=temp_should_retry)))   # prints "ok" after about 3 seconds
print(calls)                      