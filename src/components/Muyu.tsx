import { useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import { drawGrid } from "../sprite/lotCylinder";
import { MALLET_H, MALLET_W, malletGrid, MUYU_H, MUYU_PALETTE, MUYU_W, muyuGrid } from "../sprite/muyu";

interface Props {
  /** 木鱼左上角（窗口内 CSS 像素） */
  x: number;
  y: number;
  /** 每格 CSS 像素，和角色一致 */
  cell: number;
  /** 每变一次敲一下：木槌落下、木鱼一震 */
  strike: number;
  onKnock: () => void;
}

/** 小和尚身边的像素木鱼和木槌 */
export function Muyu({ x, y, cell, strike, onKnock }: Props) {
  const { t } = useTranslation();
  const fishRef = useRef<HTMLCanvasElement>(null);
  const malletRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (fishRef.current) drawGrid(fishRef.current, muyuGrid(), cell, MUYU_PALETTE);
    if (malletRef.current) drawGrid(malletRef.current, malletGrid(), cell, MUYU_PALETTE);
  }, [cell]);

  useEffect(() => {
    if (!strike) return;
    // 木槌从举起的位置落下再弹回；木鱼在落下那一刻往下一震（都按格跳变）
    malletRef.current?.animate(
      [{ transform: "rotate(0deg)" }, { transform: "rotate(-35deg)", offset: 0.45 }, { transform: "rotate(0deg)" }],
      { duration: 260, easing: "steps(6, end)" },
    );
    fishRef.current?.animate(
      [{ transform: "translate(0, 0)" }, { transform: `translate(0, ${cell}px)`, offset: 0.4 }, { transform: `translate(${-cell}px, 0)`, offset: 0.7 }, { transform: "translate(0, 0)" }],
      { duration: 240, delay: 100, easing: "steps(4, end)" },
    );
  }, [strike, cell]);

  return (
    <button type="button" className="muyu" style={{ left: x, top: y - 9 * cell, width: (MUYU_W + 3) * cell, height: (MUYU_H + 9) * cell }} aria-label={t("muyu.knock")} onClick={onKnock}>
      <canvas ref={fishRef} className="muyu__fish" style={{ left: 0, top: 9 * cell }} />
      <canvas
        ref={malletRef}
        className="muyu__mallet"
        style={{
          // 转轴（柄尾）在木鱼右上方
          left: (MUYU_W + 1 - (MALLET_W - 1)) * cell,
          top: (14 - (MALLET_H - 1)) * cell,
          transformOrigin: `${(MALLET_W - 0.5) * cell}px ${(MALLET_H - 0.5) * cell}px`,
          width: MALLET_W * cell,
        }}
      />
    </button>
  );
}
