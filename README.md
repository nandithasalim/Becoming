# 2031 — Meet who you're becoming

A future-self app: you answer a few questions, meet the person you're becoming in a cinematic 3D reveal, and then get one small daily step, a note from your future self, and chapters that unlock as you show up.

## What's here

```
web/
  index.html   intro, the 4 questions, sign-in sheet, and the daily home screen
  app.js       flow logic (questions -> reveal -> sign in -> home)
  api.js       talks to the backend (does nothing if config.js has no apiBase)
  config.js    apiBase, googleClientId, devLogin
  reveal.html  the 3D reveal (three.js): figure rises, turns, lifts its head, opens its arms
backend/
  app/         FastAPI app: Google sign-in, JWT sessions, users + onboarding answers
  tests/       pytest
```

## Run it locally

Backend (terminal 1):

```bash
cd backend
python -m venv .venv && source .venv/bin/activate
pip install -r requirements-dev.txt
cp .env.example .env          # DEV_LOGIN=true lets you sign in with just an email
uvicorn app.main:app --reload --port 8001
pytest                        # 11 tests
```

Web (terminal 2):

```bash
cd web
# in config.js set: apiBase: 'http://localhost:8001', devLogin: true
python3 -m http.server 8000
# open http://localhost:8000
```

With `apiBase` empty the web app runs as a prototype with no accounts.

## API (Phase 1)

| Method | Path | What |
|---|---|---|
| GET | /health | liveness |
| POST | /auth/google | `{credential}` Google ID token -> our session token |
| POST | /auth/dev | `{email, name}` email-only login, only when `DEV_LOGIN=true` |
| GET | /questions | preset choices for every question |
| GET | /me | signed-in user + saved answers |
| PUT | /me/answers | save screens 1-3 (+ optional `dream`) |
| PUT | /me/dream | save screen 4 later (after "Skip for now") |

> The table changed in this version. If you ran the backend before, delete `backend/future_self.db` once so it is recreated.

Interactive docs at http://localhost:8001/docs.

## Going live

1. **Database:** create a free Supabase project, copy the Postgres connection string into `DATABASE_URL` (start it with `postgresql+psycopg://`).
2. **Google sign-in:** Google Cloud Console -> Credentials -> OAuth client ID (Web). Add your site's URL under Authorised JavaScript origins. Put the client ID in both `.env` (`GOOGLE_CLIENT_ID`) and `web/config.js`.
3. **Deploy the API** (Render / Railway / Fly.io): start command `uvicorn app.main:app --host 0.0.0.0 --port $PORT`. Set `JWT_SECRET`, `DATABASE_URL`, `GOOGLE_CLIENT_ID`, `CORS_ORIGINS`, and keep `DEV_LOGIN=false`.
4. **Deploy the web folder** (Vercel / Netlify / GitHub Pages) and set `apiBase` in `config.js` to the API URL.

## Reveal options (URL parameters on reveal.html)

- `theme=` mono (default), portal, golden, aurora, rose, star, phoenix
- `anim=` portal (default), fog, mirror
- `speed=` slow motion for previews, e.g. 0.25

## Next

See the build plan: backend (FastAPI), AI future-self generation, chat with memory, chapters and daily tasks.
