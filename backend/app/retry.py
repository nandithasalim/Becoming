import asyncio
import random
import logging
log = logging.getLogger(__name__)
async def retry(func,*args,max_attempts=3,backoff=0.5,should_retry= lambda e:True,**kwargs):
    for i in range(max_attempts):
        try:
            return await func(*args, **kwargs)
        except Exception as e:
            
            if i < max_attempts-1 and should_retry(e)  :
                wait = backoff * 2 ** i + random.uniform(0, 0.3)
                log.warning("attempt %s failed (%s), retrying in %.1fs", i + 1, e, wait)
                await asyncio.sleep(wait)
            else:
                raise 

