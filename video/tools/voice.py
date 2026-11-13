"""Voice every narration line from script.md with Kokoro, one WAV per line.

Usage: .venv/bin/python tools/voice.py [voice] [only-ids...]
       .venv/bin/python tools/voice.py --sample  (3 voices, one line each)
"""
import os, re, sys
from pathlib import Path
import soundfile as sf
from kokoro_onnx import Kokoro

ROOT = Path(__file__).resolve().parent.parent
CACHE = Path.home() / '.cache/hyperframes/tts'
kokoro = Kokoro(str(CACHE / 'models/kokoro-v1.0.onnx'), str(CACHE / 'voices/voices-v1.0.bin'))

# Words espeak gets wrong → the phonemes we want. Filled in after listening.
FIXES: dict[str, str] = {}


def lines() -> dict[str, str]:
    out = {}
    for row in (ROOT / 'script.md').read_text().splitlines():
        m = re.match(r'\|\s*(l\d\d)\s*\|\s*(.+?)\s*\|', row)
        if m:
            out[m.group(1)] = m.group(2)
    return out


def speak(text: str, voice: str, path: Path, speed=1.0):
    ph = kokoro.tokenizer.phonemize(text, 'en-us')
    for wrong, right in FIXES.items():
        ph = ph.replace(wrong, right)
    samples, sr = kokoro.create(ph, voice=voice, speed=speed, is_phonemes=True)
    path.parent.mkdir(parents=True, exist_ok=True)
    sf.write(path, samples, sr)
    return len(samples) / sr, ph


if __name__ == '__main__':
    args = sys.argv[1:]
    L = lines()
    if args and args[0] == '--sample':
        text = f"{L['l06']} {L['l07']} {L['l08']}"
        for v in ['am_michael', 'af_heart', 'bm_george']:
            d, ph = speak(text, v, ROOT / f'assets/vo/sample_{v}.wav')
            print(f'{v}: {d:.1f}s  {ph[:60]}')
        sys.exit()
    voice = args[0] if args else 'am_michael'
    only = set(args[1:])
    total_words = total_s = 0
    for lid, text in L.items():
        if only and lid not in only:
            continue
        d, _ = speak(text, voice, ROOT / f'assets/vo/{lid}.wav')
        w = len(text.split())
        total_words += w
        total_s += d
        print(f'{lid} {d:5.2f}s  {w:3d}w  {text[:60]}')
    if total_s:
        print(f'total {total_s:.1f}s, {total_words} words, {total_words / total_s * 60:.0f} wpm')
