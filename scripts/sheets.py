"""Chronological contact sheets for visual review. python3 -I sheets.py <out_dir>"""
import sys, os, json
from PIL import Image, ImageDraw, ImageFont

OUT = sys.argv[1]
d = json.load(open(os.path.join(OUT, "photos_raw.json")))
d.sort(key=lambda x: (x["datetime"], x["file"]))
for i, x in enumerate(d):
    x["seq"] = i + 1
json.dump(d, open(os.path.join(OUT, "photos_raw.json"), "w"), ensure_ascii=False, indent=1)
COLS, TW, TH, LAB = 12, 150, 200, 30
PER = 96
font = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf", 12)
os.makedirs(os.path.join(OUT, "review"), exist_ok=True)
for p in range(0, len(d), PER):
    chunk = d[p:p + PER]
    rows = (len(chunk) + COLS - 1) // COLS
    sheet = Image.new("RGB", (COLS * TW, rows * (TH + LAB)), "white")
    dr = ImageDraw.Draw(sheet)
    for k, x in enumerate(chunk):
        im = Image.open(os.path.join(OUT, "thumb", x["id"] + ".jpg"))
        im.thumbnail((TW - 4, TH - 4))
        cx, cy = (k % COLS) * TW, (k // COLS) * (TH + LAB)
        sheet.paste(im, (cx + (TW - im.width) // 2, cy + 2))
        hd = "-" if x.get("heading") is None else str(round(x["heading"]))
        dr.text((cx + 3, cy + TH), f"#{x['seq']} {x['datetime'][11:16]} h{hd}", fill="black", font=font)
        dr.text((cx + 3, cy + TH + 14), x["id"][:22], fill="#555", font=font)
    sheet.save(os.path.join(OUT, "review", f"sheet_{p // PER + 1:02d}.jpg"), quality=72)
print("ok")
