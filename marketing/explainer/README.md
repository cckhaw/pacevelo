# PaceVelo explainer video (90 s)

A 2D flat-vector animated explainer: `pacevelo-explainer.mp4` (1920×1080, 30 fps, with music + SFX).

| Time | Scene |
| --- | --- |
| 0:00–0:10 | The HR chaos: Dana buried in spreadsheets, spinning clock, employee pings |
| 0:10–0:20 | The fitness gap: jetpack super-athlete vs. the exhausted office worker |
| 0:20–0:35 | Enter PaceVelo: hero phone mascot, lightning, 3-step / 5-minute setup |
| 0:35–0:50 | 1-tap wearable sync: smartwatch taps beam activities into the app, HR sips coffee |
| 0:50–1:05 | Fair-Play Engine: walker vs. cyclist balance scale, team standings, badges |
| 1:05–1:15 | Social hype: high-fives, chat bubbles, Slack shout-out cards |
| 1:15–1:30 | Finale & CTA: laptop + phone landing page, CTA click, confetti, end card |

## Files

- `explainer.js`: the whole animation. `PV.frame(t)` returns the SVG for second `t` (pure function of time).
- `index.html`: an interactive player (play/pause, scrub). Open it in a browser to preview edits live.
- `music.py`: synthesizes the music bed and sound effects, timed to the scenes.
- `render.cjs`: captures every frame in headless Chromium and encodes it with ffmpeg.
- `nunito.woff2`: Nunito font (SIL OFL).

## Re-render

```bash
pip install numpy
python3 marketing/explainer/music.py /tmp/music.wav
npm i --no-save playwright-core
CHROMIUM=/path/to/chrome FFMPEG=/path/to/ffmpeg \
  node marketing/explainer/render.cjs --audio /tmp/music.wav
# stills only:  node marketing/explainer/render.cjs --stills 5,25,60
```

Captions and their timing live in `CAPTIONS` in `explainer.js`. Scene boundaries live in `SCENES`.
