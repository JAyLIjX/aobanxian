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
  { id: "colors", beats: 16 },
  { id: "banner", beats: 12 },
  { id: "scroll", beats: 12 },
  { id: "detail", beats: 14 },
  { id: "lots", beats: 12 },
  { id: "gua", beats: 10 },
  { id: "zeri", beats: 10 },
  { id: "characters", beats: 13 },
  { id: "share", beats: 7 },
  { id: "languages", beats: 6 },
  { id: "ending", beats: 10 },
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
