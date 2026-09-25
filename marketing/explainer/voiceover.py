"""Female voice-over for the explainer, plus the final soundtrack mix.

Generates each narration line with Kokoro-82M (Apache-2.0, runs offline on CPU),
places it on the scene timeline, rewrites the CAPTIONS block in
public/explainer/explainer.js so the on-screen captions match what is spoken,
and mixes the voice over the music bed (ducking the music under speech).

    pip install kokoro-onnx soundfile numpy
    python3 marketing/explainer/music.py /tmp/music.wav
    python3 marketing/explainer/voiceover.py --model kokoro.onnx --voices voices.npz \
        --music /tmp/music.wav --out /tmp/soundtrack.wav

Model: Kokoro-82M fp32 ONNX (onnx-community/Kokoro-82M-v1.0-ONNX model.onnx, also on npm as
kokoro-fp32a/b/c-shards, whose part0..part18 files concatenate into the .onnx file).
Avoid the fp16 export: it produces NaN samples on some sentences on CPU.
Voices: an .npz of the voice style arrays keyed by name (the npm package kokoro-js ships
them as voices/<name>.bin float32 files of shape (510, 1, 256)).
"""
import argparse
import json
import re
import wave
from pathlib import Path

import numpy as np
import soundfile as sf
import onnxruntime as ort
from kokoro_onnx import Kokoro

SR = 24000
VOICE = "af_heart"
SPEED = 1.0

# (start second, text). Each start sits at the beat the scene's animation lands on.
SCRIPT = [
    (0.5, "Meet Dana. She runs her company's wellness challenge… with fourteen spreadsheets, a pile of screenshots, and zero free time."),
    (10.4, "Most fitness challenges crown the same few super-athletes. Everyone else gives up by week two."),
    (21.1, "Enter PaceVelo! Branded company fitness challenges, made fun."),
    (27.5, "HR picks a metric, chooses the sports, and hits launch. Your challenge is live in under five minutes."),
    (35.6, "Employees connect Strava in one tap, from any watch or phone."),
    (41.9, "From then on, every run, walk and ride syncs automatically. No screenshots. No data entry."),
    (50.5, "Different sports. One fair race."),
    (55.4, "Score by distance, active minutes or elevation, so walkers and cyclists compete on equal terms."),
    (65.5, "Automatic Slack shout-outs turn every workout into a team celebration. Kudos, high-fives, and bragging rights for everyone."),
    (75.8, "Healthier teams. Happier people. Zero spreadsheets."),
    (85.4, "PaceVelo. Launch your first challenge today."),
]
# The next cue (or the video end) each line must finish before.
DEADLINE_PAD = 0.25
DURATION = 90.0


class Narrator:
    """Kokoro inference, one sentence at a time with our own pauses between them.

    kokoro-onnx is only used for phonemization/tokenization: its batching step drops
    some lines entirely (returns empty audio) with the onnx-community model export.
    """

    def __init__(self, model, voices):
        self.kokoro = Kokoro(model, voices)
        self.sess = ort.InferenceSession(model, providers=["CPUExecutionProvider"])
        self.style = np.load(voices)[VOICE]

    def sentence(self, text, speed):
        tokens = self.kokoro.tokenizer.tokenize(self.kokoro.tokenizer.phonemize(text, "en-us"))
        assert 0 < len(tokens) < 510, text
        feeds = {
            "input_ids": np.array([[0, *tokens, 0]], dtype=np.int64),
            "style": self.style[len(tokens)].astype(np.float32),
            "speed": np.array([speed], dtype=np.float32),
        }
        audio = self.sess.run(None, feeds)[0].reshape(-1)
        if not np.isfinite(audio).all():  # the fp16 export overflows on some sentences; use fp32
            raise SystemExit(f"model produced non-finite samples for {text!r}")
        return trim(audio)

    def line(self, text, speed):
        out = []
        for part in re.findall(r".+?(?:[.!?…]+|$)(?=\s|$)", text.strip()):
            part = part.strip()
            if not part:
                continue
            out.append(self.sentence(part, speed))
            pause = 0.45 if part.endswith("…") else 0.28
            out.append(np.zeros(int(pause * SR / speed), dtype=np.float32))
        return np.concatenate(out[:-1])


def synth(narrator, text, max_len):
    speed = SPEED
    for _ in range(6):
        audio = narrator.line(text, speed)
        if len(audio) / SR <= max_len:
            return audio, speed
        speed = round(speed * min(1.12, (len(audio) / SR) / max_len + 0.01), 3)
    raise SystemExit(f"line too long for its slot even at speed {speed}: {text!r}")


def trim(a, thresh=0.01):
    idx = np.where(np.abs(a) > thresh)[0]
    if not len(idx):
        return a
    return a[max(0, idx[0] - int(0.03 * SR)) : idx[-1] + int(0.08 * SR)]


def caption_chunks(text, start, dur):
    """Split a spoken line into caption-sized pieces, timed by character share."""
    parts = []
    for p in (p.strip() for p in re.split(r"(?<=[.!?…])\s+", text) if p.strip()):
        while len(p) > 72 and ", " in p:  # break long sentences at the comma nearest the middle
            cuts = [m.end() for m in re.finditer(", ", p)]
            c = min(cuts, key=lambda x: abs(x - len(p) / 2))
            parts.append(p[:c].strip())
            p = p[c:].strip()
        parts.append(p)
    merged = []
    for p in parts:  # keep very short sentences together
        if merged and (len(merged[-1]) < 28 or len(p) < 20) and len(merged[-1]) + len(p) < 70:
            merged[-1] += " " + p
        else:
            merged.append(p)
    total = sum(len(p) for p in merged)
    out, t = [], start
    for p in merged:
        d = dur * len(p) / total
        out.append([round(t - 0.15, 2), round(t + d + 0.15, 2), p])
        t += d
    # avoid overlaps between neighbouring chunks
    for a, b in zip(out, out[1:]):
        mid = round((a[1] + b[0]) / 2, 2)
        a[1], b[0] = round(mid - 0.05, 2), round(mid + 0.05, 2)
    return out


def load_wav(path):
    with wave.open(str(path)) as w:
        sr, ch = w.getframerate(), w.getnchannels()
        data = np.frombuffer(w.readframes(w.getnframes()), dtype="<i2").astype(np.float32) / 32768
    return data.reshape(-1, ch), sr


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--model", required=True)
    ap.add_argument("--voices", required=True)
    ap.add_argument("--music", required=True)
    ap.add_argument("--out", required=True)
    ap.add_argument("--explainer", default=str(Path(__file__).resolve().parents[2] / "public/explainer/explainer.js"))
    args = ap.parse_args()

    narrator = Narrator(args.model, args.voices)
    music, msr = load_wav(args.music)
    n = int(DURATION * msr)
    music = np.pad(music, ((0, max(0, n - len(music))), (0, 0)))[:n]

    voice = np.zeros(n, dtype=np.float32)
    captions = []
    for i, (start, text) in enumerate(SCRIPT):
        deadline = (SCRIPT[i + 1][0] if i + 1 < len(SCRIPT) else DURATION - 0.6) - DEADLINE_PAD
        audio, speed = synth(narrator, text, deadline - start)
        # resample 24 kHz -> music rate
        dur = len(audio) / SR
        m = int(dur * msr)
        audio = np.interp(np.linspace(0, len(audio) - 1, m), np.arange(len(audio)), audio).astype(np.float32)
        j = int(start * msr)
        voice[j : j + m] += audio[: n - j]
        captions += caption_chunks(text, start, dur)
        print(f"{start:5.1f}s +{dur:4.1f}s (speed {speed})  {text}")

    voice /= np.max(np.abs(voice)) + 1e-9
    voice *= 0.95
    # duck the music under speech with a smoothed envelope
    active = np.convolve((np.abs(voice) > 0.02).astype(np.float32), np.ones(int(0.25 * msr)), mode="same") > 0
    k = int(0.3 * msr)
    duck = np.convolve(active.astype(np.float32), np.ones(k) / k, mode="same")
    music_gain = 0.55 - 0.33 * duck
    mix = music * music_gain[:, None] + voice[:, None] * 0.9
    # loudness: bring the programme to about -17 dBFS RMS, soft-limiting the peaks
    mix *= 10 ** (-17 / 20) / np.sqrt(np.mean(mix**2))
    mix = np.tanh(mix / 0.95) * 0.95
    sf.write(args.out, mix, msr, subtype="PCM_16")
    print("wrote", args.out)

    # sync the on-screen captions with the narration
    js = Path(args.explainer)
    src = js.read_text()
    body = ",\n".join(f"    [{a}, {b}, {json.dumps(t, ensure_ascii=False)}]" for a, b, t in captions)
    new, count = re.subn(r"(// narration captions: start\n  const CAPTIONS = \[\n).*?(\n  \];)", lambda mm: mm.group(1) + body + mm.group(2), src, flags=re.S)
    if count != 1:
        raise SystemExit("CAPTIONS block markers not found in explainer.js")
    js.write_text(new)
    print("updated captions in", js)


if __name__ == "__main__":
    main()
