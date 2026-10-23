/**
 * 大字字体（马善政 / 志莽行书）没有「奧曆籤臘農閏」这几个繁体字，浏览器会逐字回退到霞鹜文楷，
 * 一行字里就会夹一两个楷体字（如「農曆九月十三」）。这种文字整行改用正文字体，字形一致。
 */
const MISSING_IN_DISPLAY = /[奧曆籤臘農閏]/;

/** 这段文字能不能用大字字体整行显示 */
export function displayCovers(text: string): boolean {
  return !MISSING_IN_DISPLAY.test(text);
}

/** 大字的 className：大字字体缺字时整行用正文字体 */
export function displayClass(text: string): string {
  return displayCovers(text) ? "display" : "display display--plain";
}
