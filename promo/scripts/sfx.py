"""
用代码合成宣传片的音效（不用任何录音素材）：python3 scripts/sfx.py audio/sfx
  click   鼠标点击：极短的高频「嗒」
  shake   签筒摇晃：一串竹签相碰的短促木质声
  drop    签掉落：一声清脆的竹木「嗒」+ 轻微低频
  muyu    木鱼：和软件里一样的参数（基音 560Hz 带下滑 + 两个泛音 + 12ms 带通噪声）
  unroll  卷轴展开：纸张摩擦的「唰」
  stamp   盖章：低频「咚」+ 纸面「啪」
  flip    翻页：轻的纸声
"""
import sys, wave
import numpy as np

SR = 44100
OUT = sys.argv[1]
rng = np.random.default_rng(7)  # 固定种子：每次生成完全一样


def env(n, attack, decay):
    t = np.arange(n) / SR
    e = np.minimum(1, t / max(attack, 1e-4)) * np.exp(-t / decay)
    return e


def bandpass(x, lo, hi):
    X = np.fft.rfft(x)
    f = np.fft.rfftfreq(len(x), 1 / SR)
    X[(f < lo) | (f > hi)] = 0
    return np.fft.irfft(X, len(x))


def tone(freq, dur, decay, gain, slide=1.0):
    n = int(dur * SR)
    t = np.arange(n) / SR
    f = freq * (slide + (1 - slide) * np.minimum(1, t / 0.03))
    phase = 2 * np.pi * np.cumsum(f) / SR
    return np.sin(phase) * env(n, 0.003, decay) * gain


def noise(dur, lo, hi, decay, gain):
    n = int(dur * SR)
    return bandpass(rng.standard_normal(n), lo, hi) * env(n, 0.001, decay) * gain


def mix(dur, *parts):
    out = np.zeros(int(dur * SR))
    for start, sig in parts:
        i = int(start * SR)
        out[i : i + len(sig)] += sig[: len(out) - i]
    return out


def save(name, x, peak=0.8):
    x = x / (np.abs(x).max() + 1e-9) * peak
    data = (x * 32767).astype(np.int16)
    with wave.open(f"{OUT}/{name}.wav", "wb") as w:
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(SR)
        w.writeframes(data.tobytes())


save("click", mix(0.08, (0, noise(0.05, 2500, 7000, 0.006, 1.0)), (0, tone(1800, 0.05, 0.01, 0.3))), 0.6)
# 签筒：16 下竹签碰撞，间隔略有快慢
ticks = []
t = 0.0
for i in range(16):
    ticks.append((t, noise(0.04, 1500, 5000, 0.008, 0.6 + 0.4 * rng.random()) + tone(900 + 400 * rng.random(), 0.04, 0.01, 0.25)))
    t += 0.045 + 0.02 * rng.random()
save("shake", mix(t + 0.1, *ticks), 0.7)
save("drop", mix(0.4, (0, noise(0.06, 1800, 6000, 0.01, 1.0)), (0, tone(1200, 0.12, 0.03, 0.6)), (0.0, tone(180, 0.25, 0.06, 0.5))), 0.8)
# 木鱼：参数同 src-tauri/src/woodblock.rs、src/platform/sound.ts
# 软件里每个泛音在 decay 秒内指数衰减到 0.0001，所以时间常数 = decay / ln(10⁴)
LN = np.log(1e4)
save("muyu", mix(0.3, (0, tone(560, 0.25, 0.16 / LN, 0.9, 1.04)), (0, tone(1180, 0.15, 0.08 / LN, 0.35, 1.04)), (0, tone(1890, 0.1, 0.05 / LN, 0.15, 1.04)), (0, noise(0.012, 2000, 2800, 0.004, 0.5))), 0.8)
n = int(0.45 * SR)
swish = bandpass(rng.standard_normal(n), 800, 6000) * np.sin(np.linspace(0, np.pi, n)) ** 2 * 0.5
save("unroll", swish, 0.5)
save("stamp", mix(0.5, (0, tone(90, 0.4, 0.09, 1.0)), (0, tone(140, 0.2, 0.05, 0.5)), (0.005, noise(0.08, 300, 3000, 0.02, 0.8))), 0.9)
n = int(0.25 * SR)
flip = bandpass(rng.standard_normal(n), 1500, 8000) * np.sin(np.linspace(0, np.pi, n)) ** 3 * 0.4
save("flip", flip, 0.4)
print("ok")
