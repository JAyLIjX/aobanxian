/**
 * 敲木鱼的声音。
 * 桌面版（Tauri）：交给 Rust 用系统音频播放（src-tauri/src/woodblock.rs，代码现场合成，不用音频文件）。
 * v0.3.0 在网页里用 Web Audio 合成，正式版里听不到，所以改成原生播放。
 * 浏览器里（npm run dev 调界面）退回 Web Audio，合成参数和 Rust 那边一样。
 */
import { invoke } from "@tauri-apps/api/core";
import { inTauri } from "./window";

let ctx: AudioContext | null = null;

function context(): AudioContext | null {
  if (typeof window === "undefined") return null;
  const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Ctor) return null;
  ctx ??= new Ctor();
  return ctx;
}

/** 敲一下木鱼：delay 秒后响 */
export function playWoodBlock(delay = 0, volume = 0.6): void {
  if (inTauri) {
    void invoke("play_woodblock", { delayMs: Math.round(delay * 1000) }).catch((err) => console.error("木鱼声播放失败", err));
    return;
  }
  const ac = context();
  if (!ac) return;
  if (ac.state !== "running") void ac.resume().catch(() => {});
  const t = ac.currentTime + 0.005 + delay;
  const out = ac.createGain();
  out.gain.value = volume;
  out.connect(ac.destination);

  // 木腔：基音带一点下滑，两个泛音衰减得更快
  for (const [freq, gain, decay] of [
    [560, 0.9, 0.16],
    [1180, 0.35, 0.08],
    [1890, 0.15, 0.05],
  ] as const) {
    const osc = ac.createOscillator();
    osc.type = "sine";
    osc.frequency.setValueAtTime(freq * 1.04, t);
    osc.frequency.exponentialRampToValueAtTime(freq, t + 0.03);
    const g = ac.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(gain, t + 0.003);
    g.gain.exponentialRampToValueAtTime(0.0001, t + decay);
    osc.connect(g).connect(out);
    osc.start(t);
    osc.stop(t + decay + 0.02);
  }

  // 敲击：12ms 的噪声过带通
  const len = Math.floor(ac.sampleRate * 0.012);
  const buf = ac.createBuffer(1, len, ac.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
  const noise = ac.createBufferSource();
  noise.buffer = buf;
  const band = ac.createBiquadFilter();
  band.type = "bandpass";
  band.frequency.value = 2400;
  band.Q.value = 1.2;
  const ng = ac.createGain();
  ng.gain.value = 0.5;
  noise.connect(band).connect(ng).connect(out);
  noise.start(t);
}
