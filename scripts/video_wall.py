"""Fondo rico para la sección del video (fase de correcciones 02).
1) muro.webp: un muro de collage a sangre (1920x1080) con recortes rasgados de las fotos de las paredes,
   superpuestos sin huecos, con una gradación cálida suave para que el video siga mandando.
2) frag-30..41.webp: más recortes sueltos de detalles y texturas para las capas con parallax.
Uso: python3 -I video_wall.py <photos_dir> <out_dir>"""
import sys, os, glob, random, importlib.util
from PIL import Image, ImageEnhance, ImageFilter

SRC, OUT = sys.argv[1], sys.argv[2]
spec = importlib.util.spec_from_file_location("vc", os.path.join(os.path.dirname(__file__), "video_collage_lib.py"))
random.seed(7)
files = sorted(glob.glob(os.path.join(SRC, "*.jpg")))

import math
from PIL import ImageDraw, ImageStat
def torn_mask(w, h, rough=0.07, pts=40):
    m = Image.new("L", (w, h), 0); d = ImageDraw.Draw(m)
    cx, cy = w / 2, h / 2; poly = []
    b = [random.uniform(0, 6) for _ in range(3)]
    for i in range(pts):
        a = i / pts * 2 * math.pi
        r = 1.0 + 0.08 * math.sin(3 * a + b[0]) + 0.05 * math.sin(5 * a + b[1])
        r *= 1 - random.uniform(0, rough)
        # forma más rectangular (como papel arrancado), no elíptica
        ca, sa = math.cos(a), math.sin(a)
        k = 1 / max(abs(ca), abs(sa)) ** 0.85
        poly.append((cx + ca * w / 2 * 0.97 * r * min(k, 1.25), cy + sa * h / 2 * 0.97 * r * min(k, 1.25)))
    poly = [(max(0, min(w - 1, x)), max(0, min(h - 1, y))) for x, y in poly]
    fine = []
    for i in range(len(poly)):
        x0, y0 = poly[i]; x1, y1 = poly[(i + 1) % len(poly)]
        for t in (0, 0.25, 0.5, 0.75):
            j = random.uniform(-1, 1) * min(w, h) * 0.01
            fine.append((x0 + (x1 - x0) * t + j, y0 + (y1 - y0) * t + j))
    d.polygon(fine, fill=255)
    return m.filter(ImageFilter.GaussianBlur(0.7))

def crop_rich(im, cw, ch, tries=10):
    best, bs = None, -1; W, H = im.size
    for _ in range(tries):
        x = random.randint(0, max(0, W - cw)); y = random.randint(0, max(0, H - ch))
        c = im.crop((x, y, x + cw, y + ch))
        s = ImageStat.Stat(c.convert("L").resize((24, 24))).stddev[0] + ImageStat.Stat(c.convert("HSV").split()[1].resize((24, 24))).mean[0] * 0.3
        if s > bs: best, bs = c, s
    return best

# 1) muro a sangre
W, H = 1920, 1080
wall = Image.new("RGB", (W, H), (120, 96, 70))
pool = files[:]
random.shuffle(pool)
cell = 210
pieces = []
for gy in range(-1, H // cell + 2):
    for gx in range(-1, W // cell + 2):
        pieces.append((gx * cell + random.randint(-60, 60), gy * cell + random.randint(-60, 60)))
random.shuffle(pieces)
for k, (x, y) in enumerate(pieces):
    im = Image.open(pool[k % len(pool)]).convert("RGB")
    w = random.randint(260, 420); h = int(w * random.uniform(0.7, 1.3))
    c = crop_rich(im, min(w, im.width), min(h, im.height)).resize((w, h))
    c = c.rotate(random.uniform(-9, 9), expand=True, resample=Image.BICUBIC)
    m = torn_mask(*c.size)
    wall.paste(c, (x - c.width // 2, y - c.height // 2), m)
wall = ImageEnhance.Color(wall).enhance(0.8)
warm = Image.new("RGB", wall.size, (214, 180, 132))
from PIL import ImageChops
wall = Image.blend(wall, ImageChops.multiply(wall, warm), 0.45)
wall = ImageEnhance.Brightness(wall).enhance(0.92)
wall.save(os.path.join(OUT, "muro.webp"), quality=70, method=6)

# 2) recortes sueltos extra
extra = random.sample(files, 12)
for k, f in enumerate(extra):
    im = Image.open(f).convert("RGB")
    cw = int(min(im.size) * random.uniform(0.3, 0.55)); ch = int(cw * random.uniform(0.7, 1.4))
    c = crop_rich(im, min(cw, im.width), min(ch, im.height), 14)
    c.thumbnail((380, 380))
    c.putalpha(torn_mask(*c.size))
    c.save(os.path.join(OUT, f"frag-{30 + k}.webp"), quality=76)
print("ok")
