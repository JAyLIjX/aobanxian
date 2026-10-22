import { useTranslation } from "react-i18next";
import type { ColorSwatch } from "../core/rules";
import type { Lang } from "../i18n";
import { term } from "../i18n/terms";

interface Props {
  color: ColorSwatch;
  /** 色签旁写什么：传统色名（默认）/ 普通色名 / 不写 */
  label?: "traditional" | "name" | "none";
}

/** 印泥色签：带纸纹的小方块色块 */
export function ColorChip({ color, label = "traditional" }: Props) {
  const lang = useTranslation().i18n.language as Lang;
  const name = term("color", color.name, lang);
  const traditional = color.traditional ? term("traditionalColor", color.traditional, lang) : name;
  // 悬停显示传统色名
  const tip = [traditional, color.hex].join(" · ");
  return (
    <span className="color-chip" title={tip}>
      <i className="color-chip__seal" style={{ backgroundColor: color.hex }} />
      {label === "traditional" ? traditional : label === "name" ? name : null}
    </span>
  );
}
