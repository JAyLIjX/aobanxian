import { useTranslation } from "react-i18next";
import type { ColorSwatch } from "../core/rules";
import type { Lang } from "../i18n";
import { term } from "../i18n/terms";

interface Props {
  color: ColorSwatch;
  /** 是否在色签旁写色名 */
  withName?: boolean;
}

/** 印泥色签：带纸纹的小方块色块 */
export function ColorChip({ color, withName = true }: Props) {
  const lang = useTranslation().i18n.language as Lang;
  const name = term("color", color.name, lang);
  const traditional = color.traditional ? term("traditionalColor", color.traditional, lang) : "";
  const tip = [name, traditional, color.hex].filter(Boolean).join(" · ");
  return (
    <span className="color-chip" title={tip}>
      <i className="color-chip__seal" style={{ backgroundColor: color.hex }} />
      {withName && name}
    </span>
  );
}
