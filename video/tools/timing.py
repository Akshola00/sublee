"""Lay voice lines on the timeline, write assets/voice.wav (48 kHz) and cues.js with line and word times.

Word times: each line is split into phrases at punctuation; the line's internal pauses (found from
the audio's energy) mark phrase boundaries when their count matches; words are spread across each
phrase by character length. Good to about ±0.2 s, which is enough to pin visual beats.
"""
import json, re
from pathlib import Path
import numpy as np
import soundfile as sf

ROOT = Path(__file__).resolve().parent.parent
SR = 48000
LEAD, TAIL, SHORT = 1.1, 5.0, 0.4
# Longer pause before these lines (scene changes).
LONG = {'l03': 0.7, 'l05': 0.8, 'l06': 1.6, 'l08': 0.9, 'l11': 1.6, 'l14': 1.4, 'l17': 1.4, 'l21': 1.4,
        'l25': 1.6, 'l28': 1.3, 'l31': 1.5}


def lines():
    out = {}
    for row in (ROOT / 'script.md').read_text().splitlines():
        m = re.match(r'\|\s*(l\d\d)\s*\|\s*(.+?)\s*\|', row)
        if m:
            out[m.group(1)] = m.group(2)
    return out


def load(path):
    a, sr = sf.read(path, dtype='float32')
    if a.ndim > 1:
        a = a.mean(1)
    if sr != SR:  # linear resample is fine for speech at this rate change
        n = int(len(a) * SR / sr)
        a = np.interp(np.linspace(0, len(a) - 1, n), np.arange(len(a)), a).astype('float32')
    return a


def trim(a, thr=0.01):
    idx = np.where(np.abs(a) > thr)[0]
    return a[max(0, idx[0] - 480): idx[-1] + 960] if len(idx) else a


def pauses(a, min_gap=0.14):
    """Internal silences (start, end) in seconds."""
    win = int(0.01 * SR)
    env = np.sqrt(np.convolve(a ** 2, np.ones(win) / win, 'same'))
    quiet = env < max(0.012, env.max() * 0.04)
    out, start = [], None
    for i in range(0, len(quiet), win):
        if quiet[i] and start is None:
            start = i
        elif not quiet[i] and start is not None:
            if (i - start) / SR >= min_gap and start > 0:
                out.append((start / SR, i / SR))
            start = None
    return out


def word_times(text, a, t0):
    words = text.split()
    dur = len(a) / SR
    phrases, cur = [], []
    for w in words:
        cur.append(w)
        if re.search(r'[.,?!;:]$', w):
            phrases.append(cur)
            cur = []
    if cur:
        phrases.append(cur)
    gaps = pauses(a)
    if len(phrases) > 1 and len(gaps) >= len(phrases) - 1:
        # keep the longest gaps, in time order
        gaps = sorted(sorted(gaps, key=lambda g: g[1] - g[0], reverse=True)[: len(phrases) - 1])
        spans, s = [], 0.0
        for g in gaps:
            spans.append((s, g[0]))
            s = g[1]
        spans.append((s, dur))
    else:
        phrases, spans = [words], [(0.0, dur)]
    out = []
    for ph, (s, e) in zip(phrases, spans):
        weights = [len(re.sub(r'\W', '', w)) + 2 for w in ph]
        tot, acc = sum(weights), s
        for w, k in zip(ph, weights):
            d = (e - s) * k / tot
            clean = re.sub(r"[^\w'%-]", '', w).lower()
            out.append([clean, round(t0 + acc, 3), round(t0 + acc + d, 3), w])
            acc += d
    return out


L = lines()
t = LEAD
clips, cue_lines, cue_words = [], {}, {}
for lid, text in L.items():
    t += LONG.get(lid, SHORT) if lid != 'l01' else 0
    a = trim(load(ROOT / f'assets/vo/{lid}.wav'))
    clips.append((t, a))
    cue_lines[lid] = [round(t, 3), round(t + len(a) / SR, 3)]
    cue_words[lid] = word_times(text, a, t)
    t += len(a) / SR
total = round(t + TAIL, 2)
mix = np.zeros(int(total * SR) + SR, dtype='float32')
for start, a in clips:
    i = int(start * SR)
    mix[i: i + len(a)] += a
mix = mix[: int(total * SR)]
mix *= 0.89 / max(1e-6, np.abs(mix).max())
sf.write(ROOT / 'assets/voice.wav', mix, SR)
(ROOT / 'cues.js').write_text('window.CUES = ' + json.dumps({'total': total, 'lines': cue_lines, 'words': cue_words}) + ';\n')
print(f'total {total}s')
for lid, (s, e) in cue_lines.items():
    print(lid, s, e, ' '.join(w for w, *_ in cue_words[lid][:6]))
