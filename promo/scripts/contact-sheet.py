"""联系表：每 2 秒一帧拼成一张图，左上角标时间。python3 scripts/contact-sheet.py out/frames out/contact-sheet.png"""
import glob, sys
from PIL import Image, ImageDraw, ImageFont

files = sorted(glob.glob(f"{sys.argv[1]}/f*.png"))
cols, pad = 6, 8
w, h = Image.open(files[0]).size
rows = (len(files) + cols - 1) // cols
sheet = Image.new("RGB", (cols * (w + pad) + pad, rows * (h + pad) + pad), (239, 230, 214))
font = ImageFont.truetype("../fonts-src/EBGaramond.ttf", 24)
for i, f in enumerate(files):
    x, y = pad + (i % cols) * (w + pad), pad + (i // cols) * (h + pad)
    sheet.paste(Image.open(f).convert("RGB"), (x, y))
    d = ImageDraw.Draw(sheet)
    label = f"{i * 2}s"
    d.rectangle([x + 6, y + 6, x + 16 + d.textlength(label, font=font), y + 38], fill=(42, 36, 32))
    d.text((x + 11, y + 7), label, font=font, fill=(244, 238, 223))
sheet.save(sys.argv[2])
print(len(files), "frames", sheet.size)
