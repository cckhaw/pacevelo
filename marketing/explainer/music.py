"""Synthesizes the explainer's 90 s music bed + sound effects to a WAV file.

    pip install numpy
    python3 marketing/explainer/music.py out.wav

Cues are timed to the scene timeline in explainer.js.
"""
import sys
import wave

import numpy as np

SR = 44100
DUR = 90.0
BPM = 112
BEAT = 60 / BPM
N = int(SR * DUR)
mix = np.zeros((N, 2))
rng = np.random.default_rng(7)


def add(sig, at, gain=1.0, pan=0.0):
    i = int(at * SR)
    if i >= N:
        return
    sig = sig[: N - i]
    l, r = np.sqrt((1 - pan) / 2), np.sqrt((1 + pan) / 2)
    mix[i : i + len(sig), 0] += sig * gain * l
    mix[i : i + len(sig), 1] += sig * gain * r


def env(n, a=0.005, d=0.2):
    t = np.arange(n) / SR
    return np.minimum(1, t / max(a, 1e-4)) * np.exp(-t / d)


def hz(note):
    return 440 * 2 ** ((note - 69) / 12)


def pluck(note, dur=0.35, bright=6, decay=0.18):
    n = int(dur * SR)
    t = np.arange(n) / SR
    f = hz(note)
    s = sum(np.sin(2 * np.pi * f * k * t) * np.exp(-t * k * 3) / k for k in range(1, bright))
    return s * env(n, 0.003, decay)


def pad(notes, dur, a=0.4):
    n = int(dur * SR)
    t = np.arange(n) / SR
    s = sum(np.sin(2 * np.pi * hz(m) * t * d) for m in notes for d in (0.997, 1.003))
    e = np.minimum(1, t / a) * np.minimum(1, (dur - t) / 0.3)
    return s * e / (2 * len(notes))


def kick():
    n = int(0.35 * SR)
    t = np.arange(n) / SR
    ph = 2 * np.pi * np.cumsum(45 + 110 * np.exp(-t * 30)) / SR
    return np.sin(ph) * np.exp(-t * 9)


def noise(dur):
    return rng.standard_normal(int(dur * SR))


def hat(dur=0.05):
    s = np.diff(np.diff(noise(dur + 2 / SR)))
    return s * env(len(s), 0.001, 0.015) * 0.25


def clap():
    s = np.diff(noise(0.25 + 1 / SR))
    return s * env(len(s), 0.001, 0.06) * 0.35


def tick():
    n = int(0.03 * SR)
    t = np.arange(n) / SR
    return np.sin(2 * np.pi * 2400 * t) * np.exp(-t * 300)


def whoosh(dur=0.9, up=True):
    s = noise(dur)
    t = np.linspace(0, 1, len(s))
    shape = np.sin(np.pi * t) ** 2
    # crude sweeping low-pass: blend smoothed and raw noise
    k = 40
    smooth = np.convolve(s, np.ones(k) / k, mode="same")
    w = t if up else 1 - t
    return (smooth * (1 - w) + s * w * 0.4) * shape * 0.8


def boom():
    n = int(2.0 * SR)
    t = np.arange(n) / SR
    ph = 2 * np.pi * np.cumsum(30 + 90 * np.exp(-t * 6)) / SR
    crack = np.diff(noise(2.0 + 1 / SR)) * np.exp(-t * 12) * 0.5
    return np.sin(ph) * np.exp(-t * 2.2) + crack


def chime(notes, gain=1):
    out = np.zeros(int(0.9 * SR))
    for i, m in enumerate(notes):
        p = pluck(m, 0.7, 4, 0.3)
        j = int(i * 0.07 * SR)
        out[j : j + len(p)] += p[: len(out) - j]
    return out * gain


def riser(dur):
    n = int(dur * SR)
    t = np.arange(n) / SR
    f = 200 + 1600 * (t / dur) ** 2
    return (np.sin(2 * np.pi * np.cumsum(f) / SR) * 0.3 + noise(dur) * 0.15) * (t / dur) ** 2


# --- 0-20 s: tense, minor, ticking clock ---
minor = [(57, [57, 60, 64]), (53, [53, 57, 60]), (48, [48, 52, 55]), (55, [55, 59, 62])]  # Am F C G
for bar in range(int(20 / (4 * BEAT)) + 1):
    t0 = bar * 4 * BEAT
    if t0 >= 20:
        break
    root, chord = minor[bar % 4]
    add(pad([m + 12 for m in chord], min(4 * BEAT, 20.6 - t0)), t0, 0.22)
    for b in range(8):
        tb = t0 + b * BEAT / 2
        if tb < 20:
            add(tick(), tb, 0.25 if b % 2 == 0 else 0.12, 0.3)
    motif = [0, 3, 7, 3, 12, 7, 3, 0] if bar % 2 == 0 else [0, 3, 5, 7, 5, 3, 2, 0]
    for b, iv in enumerate(motif):
        tb = t0 + b * BEAT / 2
        if tb < 20:
            add(pluck(root + 24 + iv - (3 if iv in (3,) and root in (53, 48) else 0), 0.25), tb, 0.18, -0.2)
    if t0 >= 10:
        for b in range(4):
            add(kick(), t0 + b * BEAT, 0.5)
            add(pluck(root - 12, 0.4, 3, 0.25), t0 + b * BEAT, 0.35)

add(riser(2.2), 18.55, 0.5)

# --- 20.75-89 s: upbeat major groove ---
major = [(48, [60, 64, 67]), (43, [59, 62, 67]), (45, [57, 60, 64]), (41, [57, 60, 65])]  # C G Am F
start = 20.75
bar = 0
while True:
    t0 = start + bar * 4 * BEAT
    if t0 >= 86:
        break
    root, chord = major[bar % 4]
    add(pad(chord, 4 * BEAT), t0, 0.18)
    for b in range(4):
        tb = t0 + b * BEAT
        add(kick(), tb, 0.55)
        if b % 2 == 1:
            add(clap(), tb, 0.5)
        for h in range(2):
            add(hat(), tb + h * BEAT / 2, 0.5 if h else 0.3, 0.4)
        add(pluck(root, 0.3, 3, 0.2), tb, 0.35)
        add(pluck(root + 12, 0.2, 3, 0.12), tb + BEAT / 2, 0.25)
    arp = chord + [chord[1] + 12, chord[2] + 12, chord[0] + 12, chord[2], chord[1]] * 2
    for k in range(16):
        add(pluck(arp[k % len(arp)] + 12, 0.18, 5, 0.1), t0 + k * BEAT / 4, 0.1 + 0.04 * (k % 4 == 0), 0.3 if k % 2 else -0.3)
    # melody hook every other bar
    if bar % 2 == 0 and t0 > 35:
        hook = [(0, 7), (1, 9), (1.5, 7), (2, 4), (3, 2)]
        for off, iv in hook:
            add(pluck(60 + 12 + iv, 0.4, 6, 0.25), t0 + off * BEAT, 0.13)
    bar += 1

# final chord + fade
add(pad([48, 60, 64, 67, 72], 4.5, 0.05), 86, 0.5)
add(chime([72, 76, 79, 84], 1.0), 86, 0.25)

# --- sound effects ---
add(boom(), 20.75, 0.9)
for b in (10, 35, 50, 65, 75):
    add(whoosh(0.9), b - 0.45, 0.35)
for a in (38.8, 40.2, 41.6, 43.0):  # smartwatch taps
    add(chime([79, 84]), a, 0.3, 0.2)
add(chime([72, 76, 79]), 37.8, 0.3)  # Strava connected
for a in (67.3, 68.6, 71.2, 72.8):  # high fives
    add(clap() * 1.5, a, 0.7)
    add(chime([84, 88]), a, 0.2)
add(chime([76, 79, 84, 88]), 83.25, 0.35)  # CTA click
add(chime([67, 72, 76]), 55.6, 0.3)  # fair-play balance

# master: fade in/out, soft clip, normalize
t = np.arange(N) / SR
mix *= np.minimum(1, t / 0.3)[:, None] * np.clip((DUR - t) / 2.5, 0, 1)[:, None]
mix = np.tanh(mix * 1.2)
mix /= np.max(np.abs(mix)) + 1e-9
mix *= 0.85

out = sys.argv[1] if len(sys.argv) > 1 else "music.wav"
with wave.open(out, "wb") as w:
    w.setnchannels(2)
    w.setsampwidth(2)
    w.setframerate(SR)
    w.writeframes((mix * 32767).astype("<i2").tobytes())
print("wrote", out)
