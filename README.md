# 2031 — Meet who you're becoming

A future-self app: you answer a few questions, meet the person you're becoming in a cinematic 3D reveal, and then get one small daily step, a note from your future self, and chapters that unlock as you show up.

## What's here

```
web/
  index.html   intro, the 4 questions, and the daily home screen (journal style)
  app.js       flow logic for index.html (questions -> reveal -> home)
  reveal.html  the 3D reveal (three.js): figure rises, turns, lifts its head, opens its arms
```

Everything is static HTML/JS. three.js loads from the jsDelivr CDN.

## Run it locally

```bash
cd web
python3 -m http.server 8000
# open http://localhost:8000
```

## Reveal options (URL parameters on reveal.html)

- `theme=` mono (default), portal, golden, aurora, rose, star, phoenix
- `anim=` portal (default), fog, mirror
- `speed=` slow motion for previews, e.g. 0.25

## Next

See the build plan: backend (FastAPI), AI future-self generation, chat with memory, chapters and daily tasks.
