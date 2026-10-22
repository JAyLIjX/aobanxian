/**
 * 敲木鱼的声音：用 Web Audio 现场合成一个短促的木头声（不用音频文件）。
 * 木头声 = 几个很快衰减的正弦（木腔共鸣）+ 一下极短的带通噪声（敲击的「嗒」）。
 */
let ctx: AudioContext | null = null;

function audio(): AudioContext | null {
  if (typeof window === "undefined" || !("AudioContext" in window)) return null;
  ctx ??= new AudioContext();
  if (ctx.state === "suspended") void ctx.resume();
  return ctx;
}

export function playWoodBlock(volume = 0.6): void {
  const ac = audio();
  if (!ac) return;
  const t = ac.currentTime + 0.005;
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

  // 敲击：10ms 的噪声过带通
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
