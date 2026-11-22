from app.llm import LLM, FakeLLM
import asyncio
async def try_llm():
    llm = LLM()                     # build the object
    reply=await llm.generate_text(system="You are the user's future self in 2031. Speak warmly.",
    prompt="I'm job hunting and feeling stuck. Say one line to me.",
    temperature=0.9,
    max_tokens=100)
    print(reply)

asyncio.run(try_llm())