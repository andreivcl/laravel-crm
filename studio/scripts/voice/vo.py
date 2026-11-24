#!/usr/bin/env python3
"""Narration with Kokoro (Apache-2.0, offline) + estimated word timings.

  python3 scripts/voice/vo.py src/films/numbers/script.json public/audio/numbers-vo.wav
Writes the WAV and <script>.vo.json next to the script:
  {sr, dur, lines: [{id, text, start, end, words: [{w, start, end}]}]}

Kokoro gives no timestamps, so each line is synthesized on its own (exact line
boundaries); inside a line, clause boundaries snap to the largest silent gaps
and words are spread by estimated syllables. Accuracy is ~±80 ms, which is
fine for one-word captions. Model files: KOKORO_DIR (kokoro-v1.0.onnx,
voices-v1.0.bin from github.com/thewh1teagle/kokoro-onnx releases).
"""
import json, os, re, sys
import numpy as np
import soundfile as sf
from kokoro_onnx import Kokoro

script_path, out_wav = sys.argv[1], sys.argv[2]
spec = json.load(open(script_path))
kdir = os.environ.get("KOKORO_DIR", os.path.expanduser("~/.cache/kokoro"))
k = Kokoro(f"{kdir}/kokoro-v1.0.onnx", f"{kdir}/voices-v1.0.bin")

ONES = "zero one two three four five six seven eight nine ten eleven twelve thirteen fourteen fifteen sixteen seventeen eighteen nineteen".split()
TENS = "_ _ twenty thirty forty fifty sixty seventy eighty ninety".split()
def say(n):
    if n < 20: return ONES[n]
    if n < 100: return TENS[n // 10] + ("" if n % 10 == 0 else " " + ONES[n % 10])
    if n < 1000: return ONES[n // 100] + " hundred" + ("" if n % 100 == 0 else " " + say(n % 100))
    return say(n // 1000) + " thousand" + ("" if n % 1000 == 0 else " " + say(n % 1000))

def syllables(word):
    w = re.sub(r"[^\w,]", "", word)
    if re.fullmatch(r"[\d,]+", w):
        return max(1, sum(syllables(x) for x in say(int(w.replace(",", ""))).split()))
    w = w.lower()
    n = len(re.findall(r"[aeiouy]+", w))
    if w.endswith("e") and n > 1 and not w.endswith("le"): n -= 1
    return max(1, n)

def trim(a, thr=0.008):
    idx = np.where(np.abs(a) > thr)[0]
    return a[max(0, idx[0] - 240): idx[-1] + 480] if len(idx) else a

def gaps(a, sr, min_len=0.08):
    win = int(0.01 * sr)
    env = np.array([np.sqrt(np.mean(a[i:i + win] ** 2)) for i in range(0, len(a) - win, win)])
    quiet = env < max(0.004, env.max() * 0.04)
    out, s = [], None
    for i, q in enumerate(quiet):
        if q and s is None: s = i
        if not q and s is not None:
            if (i - s) * 0.01 >= min_len: out.append(((s + i) / 2 * 0.01, (i - s) * 0.01))
            s = None
    return out  # (centre seconds, length)

chunks, lines, t = [], [], 0.0
sr = 24000
for ln in spec["lines"]:
    a, sr = k.create(ln["text"], voice=spec["voice"], speed=spec.get("speed", 1.0), lang="en-us")
    a = trim(a.astype(np.float32))
    dur = len(a) / sr
    words = ln["text"].split()
    # clauses end at punctuation; snap internal boundaries to the biggest gaps
    clauses, cur = [], []
    for w in words:
        cur.append(w)
        if re.search(r"[.,?!;:]$", w): clauses.append(cur); cur = []
    if cur: clauses.append(cur)
    g = sorted(gaps(a, sr), key=lambda x: -x[1])[: len(clauses) - 1]
    cuts = sorted(c for c, _ in g)
    if len(cuts) < len(clauses) - 1:  # fall back to syllable proportions
        tot = sum(syllables(w) for w in words); acc = 0; cuts = []
        for c in clauses[:-1]:
            acc += sum(syllables(w) for w in c); cuts.append(dur * acc / tot)
    bounds = [0.0] + cuts + [dur]
    wl = []
    for ci, c in enumerate(clauses):
        c0, c1 = bounds[ci], bounds[ci + 1]
        if ci > 0: c0 += 0.04
        if ci < len(clauses) - 1: c1 -= 0.04
        weights = [syllables(w) + 0.3 for w in c]; tot = sum(weights); x = c0
        for w, wt in zip(c, weights):
            d = (c1 - c0) * wt / tot
            wl.append({"w": w, "start": round(t + x, 3), "end": round(t + x + d, 3)}); x += d
    lines.append({"id": ln["id"], "text": ln["text"], "start": round(t, 3), "end": round(t + dur, 3), "words": wl})
    pause = ln.get("pause", 0.25)
    chunks += [a, np.zeros(int(pause * sr), np.float32)]
    t += dur + pause

lead = 0.15  # tiny lead-in so frame 0 isn't mid-word
audio = np.concatenate([np.zeros(int(lead * sr), np.float32)] + chunks)
for ln in lines:
    ln["start"] += lead; ln["end"] += lead
    for w in ln["words"]: w["start"] = round(w["start"] + lead, 3); w["end"] = round(w["end"] + lead, 3)
sf.write(out_wav, audio, sr)
out_json = re.sub(r"\.json$", ".vo.json", script_path)
json.dump({"sr": sr, "dur": round(len(audio) / sr, 3), "voice": spec["voice"], "lines": lines}, open(out_json, "w"), indent=1)
print(f"✓ {out_wav} {len(audio)/sr:.2f} s, {sum(len(l['words']) for l in lines)} words → {out_json}")
