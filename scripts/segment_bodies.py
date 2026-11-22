"""Segmenta hojas de recortes (cuerpos, rostros, manos, pelucas, clips) en piezas con alfa.
Uso: python3 -I segment_bodies.py <dir_hojas> <out_dir>
Cada pieza: <out_dir>/<hoja>-<k>.png ; además contact.jpg con los ids.
"""
import sys, os, glob, json, re
import numpy as np, cv2
from PIL import Image, ImageDraw

SRC, OUT = sys.argv[1], sys.argv[2]
os.makedirs(OUT, exist_ok=True)
# hojas permitidas (sin retratos de personas reales ni obras completas firmadas)
ALLOW = {
    "Cool Stuff!": "cool", "Untitled": "untitled", "faces": "faces", "hair style template": "hair",
    "👀": "ojos-color", "🦟": "piernas-bn", "Neddy Merrill- just made up character- surreal": "neddy",
    **{f"descarga ({n})": f"d{n}" for n in [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 15, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26]},
}
meta = []
for path in sorted(glob.glob(os.path.join(SRC, "*.jpg"))):
    name = os.path.splitext(os.path.basename(path))[0]
    if name not in ALLOW: continue
    key = ALLOW[name]
    img = cv2.imread(path)
    if img is None: continue
    h, w = img.shape[:2]
    if max(h, w) < 900:
        s = 900 / max(h, w); img = cv2.resize(img, (int(w * s), int(h * s)), interpolation=cv2.INTER_CUBIC); h, w = img.shape[:2]
    border = np.concatenate([img[:6].reshape(-1, 3), img[-6:].reshape(-1, 3), img[:, :6].reshape(-1, 3), img[:, -6:].reshape(-1, 3)])
    bg = np.median(border, axis=0)
    dist = np.linalg.norm(img.astype(np.float32) - bg, axis=2)
    m = (dist > 34).astype(np.uint8) * 255
    m = cv2.morphologyEx(m, cv2.MORPH_OPEN, np.ones((3, 3), np.uint8))
    m = cv2.morphologyEx(m, cv2.MORPH_CLOSE, np.ones((7, 7), np.uint8))
    ff = m.copy(); cv2.floodFill(ff, np.zeros((h + 2, w + 2), np.uint8), (0, 0), 255); m = m | cv2.bitwise_not(ff)
    n, lab, st, _ = cv2.connectedComponentsWithStats(m, 8)
    k = 0
    for i in range(1, n):
        x, y, cw, ch, a = st[i]
        if a < h * w * 0.004 or a > h * w * 0.85: continue
        if cw < 30 or ch < 30: continue
        sel = (lab == i).astype(np.uint8) * 255
        sel = cv2.GaussianBlur(sel, (3, 3), 0)
        pad = 4
        x0, y0, x1, y1 = max(0, x - pad), max(0, y - pad), min(w, x + cw + pad), min(h, y + ch + pad)
        rgba = cv2.cvtColor(np.dstack([img[y0:y1, x0:x1], sel[y0:y1, x0:x1]]), cv2.COLOR_BGRA2RGBA)
        k += 1
        pid = f"{key}-{k}"
        Image.fromarray(rgba).save(os.path.join(OUT, pid + ".png"))
        meta.append({"id": pid, "w": int(x1 - x0), "h": int(y1 - y0), "area": int(a)})
json.dump(meta, open(os.path.join(OUT, "pieces.json"), "w"), indent=0)
cols = 14; rows = (len(meta) + cols - 1) // cols
g = Image.new("RGB", (cols * 110, rows * 128), (70, 70, 70)); dr = ImageDraw.Draw(g)
for i, it in enumerate(meta):
    im = Image.open(os.path.join(OUT, it["id"] + ".png")); im.thumbnail((104, 104))
    g.paste(im, ((i % cols) * 110 + 3, (i // cols) * 128 + 3), im)
    dr.text(((i % cols) * 110 + 3, (i // cols) * 128 + 110), it["id"], fill="white")
g.save(os.path.join(OUT, "contact.jpg"), quality=82)
print(len(meta), "piezas")
