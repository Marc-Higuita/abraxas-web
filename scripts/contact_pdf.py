"""Grouped contact sheet PDF. python3 -I contact_pdf.py <out_dir> <pdf_path>"""
import sys, os, json
from PIL import Image, ImageDraw, ImageFont

OUT, PDF = sys.argv[1], sys.argv[2]
d = json.load(open(os.path.join(OUT, "photos.json")))
F = "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf"
FB = "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"
f_t, f_h, f_s, f_xs = ImageFont.truetype(FB, 40), ImageFont.truetype(FB, 26), ImageFont.truetype(F, 15), ImageFont.truetype(F, 13)
PW, PH, M = 2480, 3508, 90  # A4 @300dpi
COLS, TW = 8, (2480 - 2 * 90) // 8
TH, LAB = int(TW * 1.33), 58
PAPER, INK, GOLD, RED = "#F3EEE3", "#121110", "#7D5A10", "#D9341F"
NAMES = {"A": "Pared norte (≈30°)", "B": "Pared oriente (≈120°)", "C": "Pared sur (≈210°)", "D": "Pared occidente (≈300°)"}
groups = []
for w in "ABCD":
    items = [x for x in d if x.get("wall") == w and x["type"] in ("pared", "friso", "biblioteca") and not x["dup"]]
    items.sort(key=lambda x: (x.get("lx", 0), -x.get("ly", 0)))
    groups.append((f"{w} · {NAMES[w]}", f"{len(items)} fotos · ordenadas de izquierda a derecha según rumbo de brújula", items))
for t, name in (("techo", "Techo de vigas"), ("piso", "Piso"), ("mobiliario", "Escritorio y mobiliario"),
                ("documento", "Documentos y archivo"), ("objeto", "Objetos")):
    items = sorted([x for x in d if x["type"] == t and not x["dup"]], key=lambda x: x["seq"])
    groups.append((name, f"{len(items)} fotos · orden cronológico", items))
extra = [x for x in d if x["type"] in ("pared", "friso", "biblioteca") and not x.get("wall") and not x["dup"]]
if extra:
    groups.append(("Sin rumbo", f"{len(extra)} fotos", extra))
dups = [x for x in d if x["dup"]]

pages = []


def new_page():
    p = Image.new("RGB", (PW, PH), PAPER)
    return p, ImageDraw.Draw(p)


page, dr = new_page()
y = M
dr.text((M, y), "Sala 04 · Vida y obra — mosaico de contacto", font=f_t, fill=INK)
y += 60
dr.text((M, y), f"{len(d)} fotografías de la oficina de Abraxas · 23 sep 2026 · ★ = usada en la reconstrucción 3D · ◆ = documento clave · ⟂ = encadenada por emparejamiento", font=f_s, fill=GOLD)
y += 50
for title, sub, items in groups:
    if y + 60 + TH + LAB > PH - M:
        pages.append(page); page, dr = new_page(); y = M
    dr.rectangle([M, y, PW - M, y + 4], fill=RED)
    y += 14
    dr.text((M, y), title, font=f_h, fill=INK)
    dr.text((M + 700, y + 8), sub, font=f_s, fill=GOLD)
    y += 46
    for k, x in enumerate(items):
        col = k % COLS
        if col == 0 and k:
            y += TH + LAB
        if y + TH + LAB > PH - M:
            pages.append(page); page, dr = new_page(); y = M
        cx = M + col * TW
        im = Image.open(os.path.join(OUT, "thumb", x["id"] + ".jpg"))
        im.thumbnail((TW - 10, TH - 6))
        page.paste(im, (cx + (TW - im.width) // 2, y + (TH - im.height) // 2))
        flags = ("★" if x.get("room") else "") + ("◆" if x.get("note") else "") + ("⟂" if x.get("match") else "")
        hd = "–" if x.get("heading") is None else f"{round(x['heading'])}°"
        dr.text((cx + 4, y + TH + 2), f"#{x['seq']} {flags}", font=f_s, fill=RED if x.get("note") else INK)
        dr.text((cx + 4, y + TH + 21), f"{x['id']}", font=f_xs, fill=INK)
        dr.text((cx + 4, y + TH + 37), f"{x['datetime'][11:16]} · {hd} · {x.get('chain', '')}", font=f_xs, fill=GOLD)
    y += TH + LAB + 20
pages.append(page)
pages[0].save(PDF, save_all=True, append_images=pages[1:], resolution=300, quality=70)
print(len(pages), "pages")
