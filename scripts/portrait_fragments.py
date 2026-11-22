"""Recorta fragmentos de fotos de Abraxas para el retrato escultórico (sección 04).

Cada fragmento se corta "a mano": borde irregular de tijera o papel rasgado, más un filo blanco de papel.
Modos:
  torn  · rectángulo con bordes rasgados (irregulares)
  cut   · silueta por GrabCut dentro de un rectángulo (borde de tijera suavizado)
  poly  · polígono dado (contorno marcado a mano) refinado con GrabCut
Uso: python3 -I portrait_fragments.py <carpeta_fuentes> <carpeta_salida>
"""
import sys, os, json
import numpy as np
import cv2
from PIL import Image, ImageOps

SRC, OUT = sys.argv[1], sys.argv[2]
os.makedirs(OUT, exist_ok=True)
rng = np.random.default_rng(7)

F = {
    "g": "AUYF7QL3BJNNVEY3IAQOXMNXBY.jpg",
    "i": "images.jpg",
    "m": "maxresdefault.jpg",
    "mu": "Murio-Abraxas-Aguilar-la-mente-detras-del-museo-del-collage-en-el-centro-de-Medellin.webp",
    "t1": "taller-de-abraxas-aguilar-m-18_49166523_20251104171742.webp",
    "t2": "taller-de-abraxas-aguilar-m_51929056_20261020130323.webp",
    "w": "ABRAXAS-web.jpg",
    "d44": "DSC_0244.JPG",
}

# nombre, fuente, modo, rect (x0,y0,x1,y1) en px de la foto original, extra
PIECES = [
    ("pelo-rosa", "i", "poly", None, {"poly": [(72, 92), (74, 60), (80, 36), (97, 22), (124, 12), (153, 16), (178, 25), (196, 40), (206, 62), (205, 95)], "cut_below": 64}),
    ("cara-roja", "g", "poly", None, {"poly": [(300, 192), (284, 120), (294, 50), (338, 12), (400, 2), (455, 18), (480, 80), (478, 150), (466, 200), (432, 226), (400, 234), (360, 224), (330, 206)]}),
    ("ojos-tira", "mu", "torn", (515, 286, 748, 352), {"rough": 0.16}),
    ("boca-tira", "m", "torn", (872, 212, 1016, 284), {"rough": 0.14}),
    ("cara-blanca", "t2", "poly", None, {"poly": [(495, 215), (488, 150), (492, 90), (520, 55), (569, 38), (625, 45), (665, 75), (683, 130), (683, 210), (655, 262), (604, 288), (548, 272)]}),
    ("cara-risa", "i", "torn", (84, 38, 206, 182), {"rough": 0.08}),
    ("torso-tigre", "i", "torn", (4, 176, 318, 398), {"rough": 0.05}),
    ("blusa-serpiente", "t1", "torn", (760, 228, 1132, 640), {"rough": 0.06, "diag": True}),
    ("camisa-satin", "mu", "torn", (330, 450, 905, 905), {"rough": 0.05}),
    ("manos", "m", "poly", None, {"poly": [(690, 470), (700, 420), (760, 385), (840, 370), (900, 362), (980, 368), (1060, 385), (1130, 420), (1140, 470), (1100, 505), (1000, 515), (900, 505), (800, 500), (720, 500)]}),
    ("brazo-baile", "w", "poly", None, {"poly": [(150, 150), (200, 145), (205, 260), (250, 300), (262, 345), (240, 378), (200, 375), (178, 330), (165, 290), (148, 220)]}),
    ("libro-manos", "t2", "poly", None, {"poly": [(476, 520), (500, 470), (560, 455), (620, 480), (720, 470), (860, 460), (905, 450), (940, 600), (950, 719), (530, 719), (520, 600), (480, 560)]}),
    ("espejo-baile", "w", "torn", (448, 28, 892, 562), {"rough": 0.04}),
    ("risa-hojas", "d44", "torn", (1330, 1240, 2380, 2620), {"rough": 0.07}),
]


def load(key):
    im = ImageOps.exif_transpose(Image.open(os.path.join(SRC, F[key]))).convert("RGB")
    return cv2.cvtColor(np.array(im), cv2.COLOR_RGB2BGR)


def jagged_rect_mask(h, w, rough, diag=False):
    """Rectángulo con bordes rasgados: perturbación de baja frecuencia + diente fino."""
    def edge(n, amp):
        base = np.cumsum(rng.normal(0, 1, n))
        base = cv2.GaussianBlur(base.reshape(1, -1).astype(np.float32), (1, 0), sigmaX=max(2, n / 30)).ravel()
        base = (base - base.min()) / (np.ptp(base) + 1e-6)
        fine = rng.uniform(0, 1, n) * 0.25
        return (base * 0.75 + fine) * amp
    mx, my = int(w * rough * 0.5) + 2, int(h * rough * 0.5) + 2
    top = edge(w, my); bot = edge(w, my); left = edge(h, mx); right = edge(h, mx)
    pts = [(x, top[x]) for x in range(0, w, 3)]
    pts += [(w - 1 - right[y], y) for y in range(0, h, 3)]
    pts += [(x, h - 1 - bot[x]) for x in range(w - 1, -1, -3)]
    pts += [(left[y], y) for y in range(h - 1, -1, -3)]
    mask = np.zeros((h, w), np.uint8)
    cv2.fillPoly(mask, [np.array(pts, np.int32)], 255)
    if diag:  # corte en diagonal de tijera en una esquina
        tri = np.array([(0, 0), (int(w * 0.38), 0), (0, int(h * 0.3))], np.int32)
        cv2.fillPoly(mask, [tri], 0)
    return mask


def scissor(mask):
    """Suaviza la silueta y le da el quiebre poligonal de un corte de tijera."""
    mask = cv2.morphologyEx(mask, cv2.MORPH_OPEN, np.ones((5, 5), np.uint8))
    mask = cv2.morphologyEx(mask, cv2.MORPH_CLOSE, np.ones((9, 9), np.uint8))
    cnts, _ = cv2.findContours(mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_NONE)
    if not cnts:
        return mask
    c = max(cnts, key=cv2.contourArea)
    eps = 0.0035 * cv2.arcLength(c, True)
    c = cv2.approxPolyDP(c, eps, True)
    out = np.zeros_like(mask)
    cv2.fillPoly(out, [c], 255)
    return out


def grabcut(img, rect, poly=None):
    x0, y0, x1, y1 = rect
    mask = np.full(img.shape[:2], cv2.GC_BGD, np.uint8)
    mask[y0:y1, x0:x1] = cv2.GC_PR_BGD
    if poly is not None:
        pm = np.zeros(img.shape[:2], np.uint8)
        cv2.fillPoly(pm, [np.array(poly, np.int32)], 1)
        mask[pm == 1] = cv2.GC_PR_FGD
        er = cv2.erode(pm, np.ones((25, 25), np.uint8))
        mask[er == 1] = cv2.GC_FGD
    bgd, fgd = np.zeros((1, 65), np.float64), np.zeros((1, 65), np.float64)
    if poly is None:
        mask = np.zeros(img.shape[:2], np.uint8)
        cv2.grabCut(img, mask, (x0, y0, x1 - x0, y1 - y0), bgd, fgd, 6, cv2.GC_INIT_WITH_RECT)
    else:
        cv2.grabCut(img, mask, None, bgd, fgd, 6, cv2.GC_INIT_WITH_MASK)
    m = np.where((mask == cv2.GC_FGD) | (mask == cv2.GC_PR_FGD), 255, 0).astype(np.uint8)
    return m[y0:y1, x0:x1]


def finish(crop, mask, name, max_side=760):
    # filo de papel blanco alrededor del recorte
    rim = cv2.dilate(mask, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (7, 7)))
    rgb = crop.copy()
    paper = np.array([228, 236, 241], np.uint8)  # BGR casi blanco cálido
    edge = (rim > 0) & (mask == 0)
    rgb[edge] = paper
    a = cv2.GaussianBlur(rim, (3, 3), 0)
    rgba = cv2.cvtColor(rgb, cv2.COLOR_BGR2RGBA)
    rgba[..., 3] = a
    ys, xs = np.where(a > 8)
    rgba = rgba[ys.min(): ys.max() + 1, xs.min(): xs.max() + 1]
    im = Image.fromarray(rgba)
    s = max_side / max(im.size)
    if s < 1:
        im = im.resize((round(im.width * s), round(im.height * s)), Image.LANCZOS)
    path = os.path.join(OUT, f"{name}.webp")
    im.save(path, "WEBP", quality=88, method=6)
    return im.size


manifest = {}
for name, key, mode, rect, extra in PIECES:
    img = load(key)
    if mode == "poly":
        pts = np.array(extra["poly"], np.float32)
        pts += rng.uniform(-3, 3, pts.shape)  # pulso de tijera
        x0, y0 = np.floor(pts.min(0)).astype(int) - 4
        x1, y1 = np.ceil(pts.max(0)).astype(int) + 4
        x0, y0 = max(0, x0), max(0, y0)
        x1, y1 = min(img.shape[1], x1), min(img.shape[0], y1)
        crop = img[y0:y1, x0:x1]
        h, w = crop.shape[:2]
        mask = np.zeros((h, w), np.uint8)
        cv2.fillPoly(mask, [(pts - [x0, y0]).astype(np.int32)], 255)
    else:
        x0, y0, x1, y1 = rect
        x1, y1 = min(x1, img.shape[1]), min(y1, img.shape[0])
        crop = img[y0:y1, x0:x1]
        h, w = crop.shape[:2]
        mask = jagged_rect_mask(h, w, extra.get("rough", 0.06), extra.get("diag", False))
    if "cut_below" in extra:
        cut = extra["cut_below"] - y0
        line = (cut + np.cumsum(rng.normal(0, 1.4, w))).clip(cut - 10, cut + 10).astype(int)
        for x in range(w):
            mask[line[x]:, x] = 0
    size = finish(crop, mask, name)
    manifest[name] = {"w": size[0], "h": size[1], "src": F[key]}
    print(name, size)

with open(os.path.join(OUT, "fragmentos.json"), "w") as f:
    json.dump(manifest, f, indent=1, ensure_ascii=False)
