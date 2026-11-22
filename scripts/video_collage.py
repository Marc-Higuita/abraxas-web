"""Recortes para el fondo del video (corrección 02): fragmentos de las fotos de las paredes
con bordes rasgados orgánicos (sin marcos blancos) y una silueta humana hecha de fragmentos,
separada en tres capas de profundidad para el parallax.
Uso: python3 -I video_collage.py <photos_dir> <out_dir>
"""
import sys, os, glob, random, math
from PIL import Image, ImageDraw, ImageFilter, ImageStat, ImageChops

SRC, OUT = sys.argv[1], sys.argv[2]
random.seed(42)
files = sorted(glob.glob(os.path.join(SRC, "*.jpg")))

def torn_mask(w, h, rough=0.06, pts=46):
    """Polígono irregular con borde 'rasgado' (ruido de alta frecuencia) y un leve suavizado."""
    m = Image.new("L", (w, h), 0)
    d = ImageDraw.Draw(m)
    cx, cy = w / 2, h / 2
    poly = []
    base = [random.uniform(0.82, 1.0) for _ in range(6)]
    for i in range(pts):
        a = i / pts * 2 * math.pi
        # forma general: elipse deformada por armónicos bajos + dientes finos de papel
        r = 1.0 + 0.1 * math.sin(3 * a + base[0] * 6) + 0.06 * math.sin(5 * a + base[1] * 9)
        r *= 1 - random.uniform(0, rough)
        x = cx + math.cos(a) * (w / 2) * 0.96 * r
        y = cy + math.sin(a) * (h / 2) * 0.96 * r
        poly.append((max(0, min(w - 1, x)), max(0, min(h - 1, y))))
    # dientes finos entre vértices
    fine = []
    for i in range(len(poly)):
        x0, y0 = poly[i]; x1, y1 = poly[(i + 1) % len(poly)]
        for t in (0, 0.33, 0.66):
            j = random.uniform(-1, 1) * min(w, h) * 0.012
            fine.append((x0 + (x1 - x0) * t + j, y0 + (y1 - y0) * t + j))
    d.polygon(fine, fill=255)
    return m.filter(ImageFilter.GaussianBlur(0.8))

def interesting_crop(im, cw, ch, tries=14):
    best, bs = None, -1
    W, H = im.size
    for _ in range(tries):
        x = random.randint(0, max(0, W - cw)); y = random.randint(0, max(0, H - ch))
        c = im.crop((x, y, x + cw, y + ch))
        st = ImageStat.Stat(c.convert("L").resize((32, 32)))
        sat = ImageStat.Stat(c.convert("HSV").split()[1].resize((32, 32))).mean[0]
        score = st.stddev[0] + sat * 0.35
        if score > bs: best, bs = c, score
    return best

# 1) fragmentos sueltos para el fondo
frag_files = random.sample(files, min(26, len(files)))
for k, f in enumerate(frag_files):
    im = Image.open(f).convert("RGB")
    W, H = im.size
    cw = int(min(W, H) * random.uniform(0.35, 0.6)); ch = int(cw * random.uniform(0.7, 1.35))
    c = interesting_crop(im, min(cw, W), min(ch, H))
    c.thumbnail((420, 420))
    m = torn_mask(*c.size)
    c.putalpha(m)
    c.save(os.path.join(OUT, f"frag-{k:02d}.webp"), quality=78)

# 2) silueta humana hecha de fragmentos, en tres capas (atrás, cuerpo, delante)
S = (720, 1180)
def body_mask():
    m = Image.new("L", S, 0); d = ImageDraw.Draw(m)
    d.ellipse((290, 40, 430, 205), fill=255)                         # cabeza
    d.polygon([(330, 195), (390, 195), (395, 245), (325, 245)], fill=255)  # cuello
    d.polygon([(205, 250), (515, 250), (540, 330), (500, 610), (220, 610), (180, 330)], fill=255)  # torso
    d.polygon([(205, 262), (170, 300), (110, 560), (150, 575), (215, 360)], fill=255)  # brazo izq
    d.polygon([(515, 262), (550, 300), (615, 540), (575, 560), (505, 360)], fill=255)  # brazo der (levantado)
    d.ellipse((92, 545, 160, 620), fill=255); d.ellipse((565, 530, 635, 600), fill=255)  # manos
    d.polygon([(225, 600), (500, 600), (520, 690), (205, 690)], fill=255)  # cadera
    d.polygon([(210, 680), (355, 680), (330, 1120), (250, 1120)], fill=255)  # pierna izq
    d.polygon([(370, 680), (515, 680), (470, 1120), (390, 1120)], fill=255)  # pierna der
    return m.filter(ImageFilter.GaussianBlur(1.2))

bm = body_mask()
layers = {"atras": Image.new("RGBA", S, (0, 0, 0, 0)), "cuerpo": Image.new("RGBA", S, (0, 0, 0, 0)), "delante": Image.new("RGBA", S, (0, 0, 0, 0))}
pool = random.sample(files, min(40, len(files)))
# mosaico de teselas rasgadas recortadas por la silueta
cells = []
for y in range(20, S[1], 74):
    for x in range(80, S[0] - 40, 68):
        cells.append((x + random.randint(-16, 16), y + random.randint(-14, 14)))
random.shuffle(cells)
for i, (x, y) in enumerate(cells):
    if bm.getpixel((min(S[0]-1, x), min(S[1]-1, y))) < 128: continue
    im = Image.open(pool[i % len(pool)]).convert("RGB")
    tw, th = random.randint(90, 150), random.randint(90, 160)
    c = interesting_crop(im, min(tw * 3, im.size[0]), min(th * 3, im.size[1]), 6).resize((tw, th))
    c = c.rotate(random.uniform(-25, 25), expand=True, resample=Image.BICUBIC)
    m = torn_mask(*c.size, rough=0.1, pts=18)
    c.putalpha(ImageChops.multiply(c.split()[3] if c.mode == "RGBA" else Image.new("L", c.size, 255), m))
    ox, oy = x - c.size[0] // 2, y - c.size[1] // 2
    tile = Image.new("RGBA", S, (0, 0, 0, 0)); tile.paste(c, (ox, oy), c)
    # recortado a la silueta con un margen rasgado
    a = ImageChops.multiply(tile.split()[3], bm)
    tile.putalpha(a)
    key = "atras" if i % 3 == 0 else ("cuerpo" if i % 3 == 1 else "delante")
    layers[key] = Image.alpha_composite(layers[key], tile)
# algunas piezas que se escapan de la silueta (delante), como papeles que se desprenden
for k in range(7):
    im = Image.open(random.choice(pool)).convert("RGB")
    c = interesting_crop(im, 300, 300, 6).resize((random.randint(70, 120),) * 2)
    c = c.rotate(random.uniform(-40, 40), expand=True)
    c.putalpha(torn_mask(*c.size, rough=0.12, pts=16))
    ang = random.uniform(0, 2 * math.pi)
    px, py = int(360 + math.cos(ang) * 300), int(560 + math.sin(ang) * 470)
    layers["delante"].alpha_composite(c, (max(0, min(S[0] - c.size[0], px)), max(0, min(S[1] - c.size[1], py))))
for k, im in layers.items():
    im.save(os.path.join(OUT, f"silueta-{k}.webp"), quality=80)
print("ok")
