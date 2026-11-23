"""Recursos para el interludio «Aquí las fotos no se toman, se hacen.»:
hoja de contacto y tira de negativo construidas con fotos de las paredes de la casa (photos/)."""
import glob, random, sys
from PIL import Image, ImageDraw, ImageFont, ImageOps, ImageFilter
random.seed(7)
SRC = sorted(glob.glob("public/assets/room-04/photos/*.jpg"))
OUT = "public/assets/room-04/fotos-se-hacen/"
pick = [SRC[i] for i in sorted(random.sample(range(len(SRC)), 22))]

def crop(path, w, h):
    im = ImageOps.exif_transpose(Image.open(path)).convert("RGB")
    return ImageOps.fit(im, (w, h), Image.LANCZOS, centering=(0.5, 0.42))

try:
    font = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSansMono-Bold.ttf", 18)
except Exception:
    font = ImageFont.load_default()

def strip(frames, fw, fh, name, horiz=True, label=0):
    pad, hole = 38, 14
    W = len(frames) * (fw + 18) + 18
    H = fh + pad * 2
    im = Image.new("RGB", (W, H), (22, 18, 14))
    d = ImageDraw.Draw(im)
    for x in range(10, W - 10, 30):  # perforaciones
        d.rounded_rectangle([x, 11, x + 16, 11 + hole], 3, fill=(201, 168, 120))
        d.rounded_rectangle([x, H - 11 - hole, x + 16, H - 11], 3, fill=(201, 168, 120))
    for i, f in enumerate(frames):
        x = 18 + i * (fw + 18)
        im.paste(f, (x, pad))
        d.text((x + 4, H - pad + 6 - 30), f"{label + i * 2 + 1}A", fill=(255, 150, 40), font=font)
    return im

frames = [crop(p, 300, 220) for p in pick[:5]]
s = strip(frames, 300, 220, "tira")
s.save(OUT + "tira.webp", quality=80)
# negativo: misma tira invertida y con dominante ámbar
neg = ImageOps.invert(s).convert("RGB")
amber = Image.new("RGB", neg.size, (255, 140, 40))
neg = Image.blend(neg, amber, 0.18)
neg.save(OUT + "tira-negativo.webp", quality=80)

# hoja de contacto 4x3 (alta resolución para la lupa)
cols, rows, fw, fh = 4, 3, 330, 240
sheet = Image.new("RGB", (cols * (fw + 22) + 60, rows * (fh + 90) + 40), (239, 233, 220))
ds = ImageDraw.Draw(sheet)
k = 5
for r in range(rows):
    row = [crop(p, fw, fh) for p in pick[k:k + cols]]; k += cols
    st = strip(row, fw, fh, "", label=r * 8 + 10)
    sheet.paste(st, (30, 20 + r * (fh + 90)))
# marcas de grasa como en una hoja de contacto real
for (x, y, w, h) in [(120, 60, 330, 240), (760, 395, 330, 240)]:
    ds.rounded_rectangle([x - 6, y + 28, x + w + 10, y + h + 46], 30, outline=(217, 52, 31), width=5)
sheet = sheet.filter(ImageFilter.UnsharpMask(1, 40, 2))
sheet.save(OUT + "hoja-contacto.webp", quality=82)
print(s.size, sheet.size)
