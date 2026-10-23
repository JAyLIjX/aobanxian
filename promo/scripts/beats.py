"""
检测背景音乐的节拍：python3 scripts/beats.py out/bgm-mono.wav > src/beats.json
（先用 ffmpeg 把 m4a 转成单声道 22050Hz 的 wav）。只用 numpy：
  1. 短时傅里叶，谱通量（正向变化之和）作起音强度
  2. 起音强度自相关，在 70–180 BPM 里找节拍周期
  3. 按周期铺一串等间隔的拍点，选和起音强度最吻合的相位；再在每个拍点 ±60ms 内对齐到最近的起音峰
  4. 每拍的能量（RMS），用来找段落（安静 / 热闹）
"""
import json, sys, wave
import numpy as np

path = sys.argv[1]
with wave.open(path) as w:
    sr = w.getframerate()
    x = np.frombuffer(w.readframes(w.getnframes()), dtype=np.int16).astype(np.float32) / 32768

hop, win = 512, 2048
n = 1 + (len(x) - win) // hop
frames = np.lib.stride_tricks.as_strided(x, shape=(n, win), strides=(x.strides[0] * hop, x.strides[0]))
spec = np.abs(np.fft.rfft(frames * np.hanning(win), axis=1))
logspec = np.log1p(10 * spec)
flux = np.maximum(0, np.diff(logspec, axis=0)).sum(axis=1)
flux = np.concatenate([[0], flux])
flux -= np.convolve(flux, np.ones(16) / 16, mode="same")  # 去掉慢变化
flux = np.maximum(flux, 0)
fps = sr / hop

ac = np.correlate(flux, flux, mode="full")[len(flux) - 1 :]
lags = np.arange(len(ac))
bpm = 60 * fps / np.maximum(lags, 1)
ok = (bpm >= 70) & (bpm <= 180)
lag = lags[ok][np.argmax(ac[ok])]
period = lag / fps

best = None
for phase in np.arange(0, period, 1 / fps):
    t = np.arange(phase, len(x) / sr, period)
    idx = np.clip((t * fps).astype(int), 0, len(flux) - 1)
    score = flux[idx].sum()
    if best is None or score > best[0]:
        best = (score, phase)
phase = best[1]
beats = []
for t in np.arange(phase, len(x) / sr, period):
    c = int(round(t * fps))
    lo, hi = max(0, c - int(0.06 * fps)), min(len(flux), c + int(0.06 * fps) + 1)
    k = lo + int(np.argmax(flux[lo:hi]))
    beats.append(round(k / fps, 3))

rms = np.sqrt((frames ** 2).mean(axis=1))
energy = [round(float(rms[min(len(rms) - 1, int(b * fps)) : min(len(rms), int((b + period) * fps)) + 1].mean()), 4) for b in beats]
print(json.dumps({"bpm": round(60 / period, 2), "period": round(period, 4), "duration": round(len(x) / sr, 3), "beats": beats, "energy": energy}, indent=1))
