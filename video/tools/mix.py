"""Mix voice + music bed (ducked) + effects → assets/mix.wav, normalised to -14 LUFS / -1 dBTP.

Music: "Deep Urban" (Mixkit, Eugenio Mininni), 124.15 BPM. The drop is pinned 0.02 s before "Sublee";
near the end the bed splices, on the bar grid, to the track's own outro.
"""
import json, re, subprocess
from pathlib import Path
import numpy as np
import soundfile as sf

ROOT = Path(__file__).resolve().parent.parent
SR = 48000
cues = json.loads(re.sub(r'^window.CUES = |;\s*$', '', (ROOT / 'cues.js').read_text()))
events = json.loads((ROOT / 'events.json').read_text())
TOTAL = cues['total']
N = int(TOTAL * SR)


def decode(path, stereo=True):
    raw = subprocess.run(['ffmpeg', '-v', 'error', '-i', str(path), '-ac', '2' if stereo else '1', '-ar', str(SR), '-f', 'f32le', '-'], capture_output=True, check=True).stdout
    a = np.frombuffer(raw, dtype='float32')
    return a.reshape(-1, 2) if stereo else a


def db(x):
    return 10 ** (x / 20)


# ---- voice
voice, _ = sf.read(ROOT / 'assets/voice.wav', dtype='float32')
voice = np.pad(voice, (0, max(0, N - len(voice))))[:N]
mix = np.stack([voice, voice], 1).astype('float32')

# ---- music: drop on the name, outro splice on the bar grid
BPM, DROP = 124.15, 15.45
BAR = 4 * 60 / BPM
name_t = next(s for w, s, e, *_ in cues['words']['l06'] if w == 'sublee')
drop_film = name_t - 0.02
offset = drop_film - DROP                      # film time = track time + offset
splice_film = drop_film + round((cues['lines']['l31'][0] - 1.2 - drop_film) / BAR) * BAR
outro_track = DROP + round((239.7 - DROP) / BAR) * BAR
track = decode(ROOT / 'assets/music/m623.mp3')
bed = np.zeros((N, 2), dtype='float32')
start = int(offset * SR)
a_end = int(splice_film * SR)
seg = track[: a_end - start]
bed[start: start + len(seg)] = seg
tail = track[int(outro_track * SR): int(outro_track * SR) + (N - a_end)]
xf = int(0.04 * SR)
ramp = np.linspace(0, 1, xf)[:, None]
bed[a_end - xf: a_end] *= 1 - ramp
tail = tail.copy()
tail[:xf] *= ramp
bed[a_end - xf: a_end - xf + len(tail)] += tail
print(f'music offset {offset:.3f}s, drop {drop_film:.3f}s, splice film {splice_film:.3f}s → track {outro_track:.3f}s')

# bed level: -21 dB RMS after the drop
post = bed[int(drop_film * SR): int((drop_film + 30) * SR)]
bed *= db(-21) / max(1e-6, np.sqrt((post ** 2).mean()))

# gain envelope: fades, ducking under words, lower during the product demo
t = np.arange(N) / SR
g = np.ones(N, dtype='float32')
fade_in = np.clip((t - offset) / 1.5, 0, 1)
fade_out = np.clip((TOTAL - t) / 2.5, 0, 1)
g *= fade_in * fade_out
demo0, demo1 = cues['lines']['l11'][0] - 0.5, cues['lines']['l28'][0] - 0.5
demo = np.clip(np.minimum((t - demo0) / 1.5, (demo1 - t) / 1.5), 0, 1)
g *= db(-5 * demo)
duck = np.zeros(N, dtype='float32')
for ws in cues['words'].values():
    for w, s, e, *_ in ws:
        duck[int(max(0, s - 0.05) * SR): int(e * SR)] = 1
# attack 60 ms / release 350 ms smoothing
att, rel = np.exp(-1 / (0.06 * SR)), np.exp(-1 / (0.35 * SR))
sm = np.empty_like(duck)
acc = 0.0
# vectorised-ish: process in blocks of 1 ms for speed
blk = 48
for i in range(0, N, blk):
    target = duck[i: i + blk].max()
    k = att if target > acc else rel
    acc = target + (acc - target) * (k ** blk)
    sm[i: i + blk] = acc
duck_db = np.where(t < drop_film, -6.0, -9.0)
g *= db(duck_db * sm)
mix += bed * g[:, None]

# ---- effects, placed by peak (typing and sparkle by start)
NAMES = {'click': 'click', 'tick': 'click-soft', 'pop': 'pop', 'whoosh': 'whoosh', 'typing': 'typing', 'impact': 'impact-bass-1',
         'sparkle': 'sparkle', 'riser': 'riser', 'confirm': 'notification'}
TRIM = {'typing': 0.9, 'sparkle': 1.4, 'confirm': 1.3}
BY_START = {'typing', 'sparkle', 'confirm'}
cache = {}
for ev in events:
    name = ev['name']
    if name not in cache:
        a = decode(ROOT / f"assets/sfx/{NAMES[name]}.mp3")
        if name in TRIM:
            a = a[: int(TRIM[name] * SR)].copy()
            fl = int(0.08 * SR)
            a[-fl:] *= np.linspace(1, 0, fl)[:, None]
        a = a / max(1e-6, np.abs(a).max())
        w = int(0.01 * SR)
        env = np.convolve(np.abs(a).mean(1), np.ones(w) / w, 'same')
        cache[name] = (a, 0 if name in BY_START else int(np.argmax(env)))
    a, peak = cache[name]
    i = int(ev['t'] * SR) - peak
    pan = ev.get('pan', 0)
    lr = np.array([np.sqrt((1 - pan) / 2), np.sqrt((1 + pan) / 2)]) * np.sqrt(2)
    j0, j1 = max(0, i), min(N, i + len(a))
    if j1 > j0:
        mix[j0:j1] += a[j0 - i: j1 - i] * db(ev['gain']) * lr

sf.write(ROOT / 'assets/mix_raw.wav', mix, SR, subtype='FLOAT')

# ---- two-pass loudnorm to -14 LUFS, -1 dBTP
raw = str(ROOT / 'assets/mix_raw.wav')
p1 = subprocess.run(['ffmpeg', '-hide_banner', '-i', raw, '-af', 'loudnorm=I=-14:TP=-1:LRA=11:print_format=json', '-f', 'null', '-'], capture_output=True, text=True).stderr
m = json.loads(p1[p1.rindex('{'): p1.rindex('}') + 1])
af = (f"loudnorm=I=-14:TP=-1:LRA=11:measured_I={m['input_i']}:measured_TP={m['input_tp']}:measured_LRA={m['input_lra']}"
      f":measured_thresh={m['input_thresh']}:offset={m['target_offset']}:linear=true")
subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', raw, '-af', af, '-ar', str(SR), str(ROOT / 'assets/mix.wav')], check=True)
p2 = subprocess.run(['ffmpeg', '-hide_banner', '-i', str(ROOT / 'assets/mix.wav'), '-af', 'ebur128=peak=true', '-f', 'null', '-'], capture_output=True, text=True).stderr
summ = p2[p2.rindex('Summary:'):]
print(' '.join(summ.split()))
