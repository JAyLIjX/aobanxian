/**
 * 求签那段的姿势：道士双手捧签筒。软件里的道士一手捋须、一手扶幡杆，这里在像素上改一下（只用于宣传片）：
 *   - 去掉幡杆和握杆的拳头（右袖口的里衬保留）
 *   - 捋胡子的那只手换成肩和胸前的衣服（衣服用当天道袍的三档颜色）
 * 两只手和签筒另外画在前面（Lots.tsx）。
 */
import type { Outfit } from "../../../src/sprite/sprite";

const OUTLINE = "#180204";
const LINING = "#dac9ae";
const NECK = "#f3935b";

/** 从 (12, 58) 起的补丁：. ? 不改，a 描边，D x A 道袍暗/中/亮，z 袖里衬，c 脖子 */
const PATCH_AT = { x: 12, y: 58 };
const PATCH = `..aaaaaaaaj?
......acccja
.....aDxccaa
....aDDxxac.
..aaDDxxAAa.
.aDxDxxAAAAa
aaxxDxxAAAAA
AxDxxDxAAAAA
xxDDxxDxAAAA
..zDDxxDxAAA
..zaDDxxAA..
..zzaDDxxA..
..zzaDDxxx..
..?zaDDxxx..
..zza.......
..zza.......`.split("\n");

function rgb(hex: string): [number, number, number] {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

export function holdCylinderPose(px: Uint8ClampedArray, width: number, height: number, outfit: Outfit): Uint8ClampedArray {
  const out = new Uint8ClampedArray(px);
  const set = (x: number, y: number, c: [number, number, number] | null) => {
    const i = (y * width + x) * 4;
    if (!c) out[i + 3] = 0;
    else out.set([...c, 255], i);
  };
  // 幡杆在 x 53 往右；握杆的拳头在右袖上方（74 行以上、x 50 往右）；x 52 的一列在袖口以下是杆的描边
  for (let y = 60; y < height; y++)
    for (let x = 50; x < width; x++) if (x >= 53 || y < 74 || (x === 52 && y >= 95)) set(x, y, null);
  const colors: Record<string, [number, number, number]> = { a: rgb(OUTLINE), z: rgb(LINING), c: rgb(NECK), D: rgb(outfit.robe[0]), x: rgb(outfit.robe[1]), A: rgb(outfit.robe[2]) };
  PATCH.forEach((row, dy) => [...row].forEach((ch, dx) => colors[ch] && set(PATCH_AT.x + dx, PATCH_AT.y + dy, colors[ch])));
  return out;
}
