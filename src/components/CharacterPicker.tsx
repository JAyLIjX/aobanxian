import { useEffect, useMemo, useRef } from "react";
import { getDayDetail } from "../calendar/day";
import { effectiveDate } from "../core/dayBoundary";
import type { Element } from "../core/elements";
import type { Rules } from "../core/rules";
import type { Lang } from "../i18n";
import { CHARACTERS, type CharacterDef } from "../sprite/characters";
import { renderSprite, type Outfit, type Ramp } from "../sprite/sprite";

/** 缩略图每格多少 CSS 像素 */
const THUMB_CELL = 1;

function Thumb({ c, outfit }: { c: CharacterDef; outfit: Outfit }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const dpr = window.devicePixelRatio || 1;
    const px = Math.max(1, Math.round(THUMB_CELL * dpr));
    const { width: w, height: h } = c.data;
    const off = document.createElement("canvas");
    off.width = w;
    off.height = h;
    off.getContext("2d")!.putImageData(new ImageData(new Uint8ClampedArray(renderSprite(c.data, outfit)), w, h), 0, 0);
    canvas.width = w * px;
    canvas.height = h * px;
    const ctx = canvas.getContext("2d")!;
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(off, 0, 0, w * px, h * px);
    canvas.style.width = `${(w * px) / dpr}px`;
    canvas.style.height = `${(h * px) / dpr}px`;
  }, [c, outfit]);
  return <canvas ref={ref} className="picker__thumb" />;
}

/** 设置「外观 → 角色」：四个角色并排，穿今天的配色，点一下就换 */
export function CharacterPicker({ value, rules, lang, onChange }: { value: string; rules: Rules; lang: Lang; onChange: (id: string) => void }) {
  const outfit = useMemo<Outfit>(() => {
    const d = getDayDetail(effectiveDate(new Date(), rules.dayBoundary), rules);
    const ramp = (e: Element) => rules.pixelRamps[e].map((l) => l.hex) as Ramp;
    return { robe: ramp(d.outfit.primary.element), sash: ramp(d.outfit.accent.element) };
  }, [rules]);
  return (
    <div className="picker" role="radiogroup">
      {CHARACTERS.map((c) => (
        <button key={c.id} type="button" role="radio" aria-checked={c.id === value} className={`picker__item ${c.id === value ? "is-on" : ""}`} onClick={() => onChange(c.id)}>
          <span className="picker__stage">
            <Thumb c={c} outfit={outfit} />
          </span>
          <span className="picker__name">{c.name[lang]}</span>
        </button>
      ))}
    </div>
  );
}
