"""Unfolded 2D preview of the computed wall layouts. python3 -I preview_room.py <out>"""
import sys, os, json
from PIL import Image, ImageDraw
OUT = sys.argv[1]
d = json.load(open(os.path.join(OUT, "photos.json")))
S = 120  # px per unit
W, H = 8, 4.6
canvas = Image.new("RGB", (int(4 * W * S + 60), int(H * S + 40)), "#121110")
dr = ImageDraw.Draw(canvas)
for wi, w in enumerate("ABCD"):
    ox = 20 + wi * (W * S + 10)
    dr.rectangle([ox, 20, ox + W * S, 20 + H * S], outline="#D4A12A")
    items = sorted([x for x in d if x.get("room") and x.get("wall") == w and "lx" in x], key=lambda x: x["sharp"])
    for x in items:
        im = Image.open(os.path.join(OUT, "thumb", x["id"] + ".jpg")).convert("RGBA")
        ph = 1.25 * S
        im = im.resize((int(ph * im.width / im.height), int(ph)))
        im = im.rotate(x["lroll"], expand=True)
        cx = ox + (x["lx"] + W / 2) * S
        cy = 20 + (H - x["ly"]) * S
        canvas.paste(im, (int(cx - im.width / 2), int(cy - im.height / 2)), im)
    dr.text((ox + 6, 24), w, fill="#F2B90F")
canvas.save(os.path.join(OUT, "review", "room_unfolded.jpg"), quality=75)
print(canvas.size)
