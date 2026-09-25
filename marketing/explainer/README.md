# PaceVelo explainer video (90 s)

A 2D flat-vector animated explainer (1920×1080, 30 fps) with a female voice-over, music and sound effects, shown on the homepage.

The published files live in `public/explainer/` and are served by the site:

- `/explainer` (redirects to `/explainer/index.html`): the interactive player, which plays `soundtrack.mp3` in sync after the viewer presses "Play with sound" (browsers block autoplaying audio)
- `/explainer/pacevelo-explainer.mp4`: the rendered video, with `/explainer/poster.jpg` as its poster frame

This folder only holds the tooling that produces them.

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

- `public/explainer/explainer.js`: the whole animation. `PV.frame(t)` returns the SVG for second `t` (pure function of time).
- `public/explainer/index.html`: the interactive player (play/pause, scrub). Open it in a browser to preview edits live.
- `public/explainer/nunito.woff2`: Nunito font (SIL OFL).
- `public/explainer/soundtrack.mp3`: the final mix (voice-over + music + SFX) used by the player.
- `music.py`: synthesizes the music bed and sound effects, timed to the scenes.
- `voiceover.py`: the narration script (`SCRIPT`), voiced with Kokoro-82M (`af_heart`, Apache-2.0, offline). It mixes the voice over the music with ducking and rewrites `CAPTIONS` in `explainer.js` to match the spoken words.
- `render.cjs`: captures every frame of the player in headless Chromium and encodes it with ffmpeg into `public/explainer/pacevelo-explainer.mp4`.

## Re-render

```bash
pip install numpy kokoro-onnx soundfile
python3 marketing/explainer/music.py /tmp/music.wav
# Kokoro-82M fp32 model + voices: see the docstring at the top of voiceover.py
python3 marketing/explainer/voiceover.py --model kokoro.onnx --voices voices.npz \
  --music /tmp/music.wav --out /tmp/soundtrack.wav
ffmpeg -i /tmp/soundtrack.wav -c:a libmp3lame -b:a 128k public/explainer/soundtrack.mp3
npm i --no-save playwright-core
CHROMIUM=/path/to/chrome FFMPEG=/path/to/ffmpeg \
  node marketing/explainer/render.cjs --audio /tmp/soundtrack.wav
# stills only:  node marketing/explainer/render.cjs --stills 5,25,60
```

To change what the narrator says, edit `SCRIPT` in `voiceover.py` and re-run it; it regenerates `CAPTIONS` in `public/explainer/explainer.js`. Scene boundaries live in `SCENES`.
After re-rendering, refresh the poster: `node marketing/explainer/render.cjs --stills 34.6` then `ffmpeg -i still-34_6.png -vf scale=1280:-1 -q:v 4 public/explainer/poster.jpg`.
