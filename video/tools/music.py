"""Measure a track's tempo from the kick band and find its drop. Usage: python tools/music.py file.mp3"""
import subprocess, sys
import numpy as np

SR = 22050


def load(path):
    raw = subprocess.run(['ffmpeg', '-v', 'error', '-i', path, '-ac', '1', '-ar', str(SR), '-f', 'f32le', '-'], capture_output=True, check=True).stdout
    return np.frombuffer(raw, dtype='float32')


def lowpass(a, cutoff=150):
    # one-pole low-pass, run twice
    k = np.exp(-2 * np.pi * cutoff / SR)
    for _ in range(2):
        y = np.empty_like(a)
        acc = 0.0
        b = 1 - k
        for i in range(0, len(a)):
            acc = b * a[i] + k * acc
            y[i] = acc
        a = y
    return a


def analyse(path):
    a = load(path)
    hop = 512
    # low-band envelope via FFT band energy (faster than the python loop)
    n = 2048
    frames = len(a) // hop - 4
    win = np.hanning(n)
    freqs = np.fft.rfftfreq(n, 1 / SR)
    lo = freqs < 150
    full = np.zeros(frames)
    low = np.zeros(frames)
    for i in range(frames):
        seg = a[i * hop: i * hop + n]
        if len(seg) < n:
            break
        spec = np.abs(np.fft.rfft(seg * win)) ** 2
        low[i] = spec[lo].sum()
        full[i] = spec.sum()
    fps = SR / hop
    onset = np.maximum(0, np.diff(np.log1p(low * 1e3)))
    onset -= onset.mean()
    ac = np.correlate(onset, onset, 'full')[len(onset) - 1:]
    best, bpm = 0, 0
    for b in np.arange(80, 160, 0.05):
        lag = 60 / b * fps
        score = sum(np.interp(lag * m, np.arange(len(ac)), ac) for m in (1, 2, 4, 8, 16))
        if score > best:
            best, bpm = score, b
    # loudness per second
    sec = int(len(low) / fps)
    lps = [10 * np.log10(low[int(s * fps): int((s + 1) * fps)].mean() + 1e-9) for s in range(sec)]
    fls = [10 * np.log10(full[int(s * fps): int((s + 1) * fps)].mean() + 1e-9) for s in range(sec)]
    bar = 4 * 60 / bpm
    jumps = []
    for s in range(4, sec - 4):
        jumps.append((np.mean(lps[s: s + 4]) - np.mean(lps[s - 4: s]), s))
    jumps.sort(reverse=True)
    print(f'{path}: {bpm:.2f} BPM, bar {bar:.3f}s, length {len(a) / SR:.1f}s')
    print('biggest low-band jumps (dB, second):', [(round(j, 1), s) for j, s in jumps[:6]])
    print('low dB per 4s:', ' '.join(f'{np.mean(lps[i:i + 4]):.0f}' for i in range(0, sec, 4)))
    print('full dB per 4s:', ' '.join(f'{np.mean(fls[i:i + 4]):.0f}' for i in range(0, sec, 4)))


for p in sys.argv[1:]:
    analyse(p)
