/**
 * 节拍与分镜：src/beats.json 是 scripts/beats.py 从 bgm 检测出的拍点（秒）。
 * 每一段占若干拍，段与段的切换、段内的关键动作都落在拍点上。
 */
import beatsJson from "../beats.json";

export const FPS = 30;
const BEATS: number[] = beatsJson.beats;

/** 第 i 拍在第几帧（从片头算） */
export function beatFrame(i: number): number {
  if (i <= 0) return 0;
  return Math.round(BEATS[Math.min(i, BEATS.length - 1)] * FPS);
}

/** 分镜：每段多少拍（4 拍一小节） */
export const PLAN = [
  { id: "opening", beats: 8 },
  { id: "colors", beats: 12 },
  { id: "banner", beats: 10 },
  { id: "scroll", beats: 10 },
  { id: "detail", beats: 17 },
  { id: "lots", beats: 13 },
  { id: "gua", beats: 12 },
  { id: "zeri", beats: 13 },
  { id: "characters", beats: 11 },
  { id: "share", beats: 7 },
  { id: "languages", beats: 6 },
  { id: "ending", beats: 9 },
] as const;
export type SceneId = (typeof PLAN)[number]["id"];

export interface SceneTiming {
  id: SceneId;
  /** 第几拍开始 */
  beat: number;
  from: number;
  duration: number;
}

export const SCENES: SceneTiming[] = (() => {
  let b = 0;
  return PLAN.map((s) => {
    const from = beatFrame(b);
    const to = beatFrame(b + s.beats);
    const t = { id: s.id, beat: b, from, duration: to - from };
    b += s.beats;
    return t;
  });
})();

export const TOTAL_FRAMES = SCENES[SCENES.length - 1].from + SCENES[SCENES.length - 1].duration;

export function scene(id: SceneId): SceneTiming {
  return SCENES.find((s) => s.id === id)!;
}

/** 某段里第 k 拍（段内相对）的帧号，相对于这一段的开头 */
export function localBeat(id: SceneId, k: number): number {
  const s = scene(id);
  return beatFrame(s.beat + k) - s.from;
}

/** 段内第 k 拍（可以是小数，两拍之间按时间线性插值），相对这一段的开头 */
export function localBeatF(id: SceneId, k: number): number {
  const lo = Math.floor(k);
  const a = localBeat(id, lo);
  const b = localBeat(id, lo + 1);
  return Math.round(a + (b - a) * (k - lo));
}
