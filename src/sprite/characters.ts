/**
 * 角色清单。每个角色 = assets/character/<id>/character.json（名字、书写物排法）
 *                      + scripts/process-sprite.py 生成的 src/assets/sprite/<id>.json（像素、换色区、书写区、点击区）。
 * 两个文件都在，角色就自动出现在设置「外观 → 角色」里，不用改代码。
 * 点击分区：书写物（bannerMask）里的不透明格算「点书写物」（换字），其他不透明格算「点人」（展开 / 收起）。
 */
import type { Lang } from "../i18n";
import type { SpriteData } from "./sprite";

export interface CharacterMeta {
  id: string;
  name: Record<Lang, string>;
  writing: "vertical" | "horizontal";
  /**
   * 点人展开日历时：writing = 书写物收起，卡片在人物上下展开（道士的幡）；
   * inPlace = 书写物原地展开成卡片、把它盖住（青天大老爷的告示）；body = 书写物不动，卡片从人物下方展开（扇面、木牌）
   */
  unroll: "writing" | "inPlace" | "body";
}

export interface CharacterDef extends CharacterMeta {
  data: SpriteData;
}

const sprites = import.meta.glob<{ default: SpriteData }>("../assets/sprite/*.json", { eager: true });
const metas = import.meta.glob<{ default: CharacterMeta }>("../../assets/character/*/character.json", { eager: true });

export const CHARACTERS: CharacterDef[] = Object.values(metas)
  .map(({ default: meta }) => {
    const data = Object.values(sprites).find((m) => m.default.id === meta.id)?.default;
    const unroll = meta.unroll === "body" || meta.unroll === "inPlace" ? meta.unroll : "writing";
    return data ? { ...meta, unroll, data } : null;
  })
  .filter((c): c is CharacterDef => !!c)
  // 道士永远排第一（默认角色）
  .sort((a, b) => (a.id === "daoshi" ? -1 : b.id === "daoshi" ? 1 : a.id.localeCompare(b.id)));

export const DEFAULT_CHARACTER = "daoshi";
export const CHARACTER_IDS = CHARACTERS.map((c) => c.id);

export function getCharacter(id: string): CharacterDef {
  return CHARACTERS.find((c) => c.id === id) ?? CHARACTERS.find((c) => c.id === DEFAULT_CHARACTER)!;
}
