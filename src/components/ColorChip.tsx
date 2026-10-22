import type { ColorSwatch } from "../core/rules";

interface Props {
  color: ColorSwatch;
  /** 是否在色签旁写色名 */
  withName?: boolean;
}

/** 印泥色签：带纸纹的小方块色块 */
export function ColorChip({ color, withName = true }: Props) {
  const tip = color.traditional ? `${color.name} · ${color.traditional} ${color.hex}` : `${color.name} ${color.hex}`;
  return (
    <span className="color-chip" title={tip}>
      <i className="color-chip__seal" style={{ backgroundColor: color.hex }} />
      {withName && color.name}
    </span>
  );
}
