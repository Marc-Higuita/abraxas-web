"""Segmenta las láminas de alfabeto recortado en letras sueltas con alfa.
Uso: python3 -I segment_letters.py <revista.jpg> <papel.jpg> <out_dir>
Salida: <out_dir>/<set>/<id>.webp y <out_dir>/letters.json
"""
import sys, os, json
import numpy as np, cv2
from PIL import Image

REV, PAP, OUT = sys.argv[1], sys.argv[2], sys.argv[3]

def mask_of(img, thr):
    d = 255 - img.min(axis=2).astype(np.int16)
    m = (d > thr).astype(np.uint8) * 255
    m = cv2.morphologyEx(m, cv2.MORPH_CLOSE, np.ones((5, 5), np.uint8))
    h, w = m.shape
    ff = m.copy(); cv2.floodFill(ff, np.zeros((h + 2, w + 2), np.uint8), (0, 0), 255)
    return m | cv2.bitwise_not(ff)

def pieces(img, thr, ek, min_area):
    """Componentes separados con una erosión; cada uno vuelve a crecer dentro de la máscara."""
    m = mask_of(img, thr)
    er = cv2.erode(m, np.ones((ek, ek), np.uint8))
    n, lab, st, cen = cv2.connectedComponentsWithStats(er, 8)
    out = []
    for i in range(1, n):
        if st[i][4] < min_area: continue
        sel = cv2.dilate((lab == i).astype(np.uint8) * 255, np.ones((ek + 2, ek + 2), np.uint8)) & m
        out.append(sel)
    # partir piezas demasiado altas (dos letras apiladas que se tocan)
    hs = [cv2.boundingRect(s)[3] for s in out]; med = float(np.median(hs))
    res = []
    for s in out:
        x, y, w, h = cv2.boundingRect(s)
        if h > 1.8 * med:
            rowsum = (s[y:y + h, x:x + w] > 0).sum(axis=1)
            a, b = int(h * 0.3), int(h * 0.7)
            cut = y + a + int(np.argmin(rowsum[a:b]))
            top = s.copy(); top[cut:] = 0; bot = s.copy(); bot[:cut] = 0
            res += [top, bot]
        else:
            res.append(s)
    ws = [cv2.boundingRect(s)[2] for s in res]; medw = float(np.median(ws))
    res2 = []
    for s in res:
        x, y, w, h = cv2.boundingRect(s)
        if w > 1.7 * medw:
            colsum = (s[y:y + h, x:x + w] > 0).sum(axis=0)
            a, b = int(w * 0.3), int(w * 0.7)
            cut = x + a + int(np.argmin(colsum[a:b]))
            l = s.copy(); l[:, cut:] = 0; r = s.copy(); r[:, :cut] = 0
            res2 += [l, r]
        else:
            res2.append(s)
    res = res2
    items = []
    for s in res:
        x, y, w, h = cv2.boundingRect(s)
        items.append(dict(sel=s, x=x, y=y, w=w, h=h, cx=x + w / 2, cy=y + h / 2))
    return items

def rows(cs, k):
    cs = sorted(cs, key=lambda c: c["cy"])
    gaps = sorted(range(1, len(cs)), key=lambda i: cs[i]["cy"] - cs[i - 1]["cy"], reverse=True)[: k - 1]
    rs, start = [], 0
    for i in sorted(gaps) + [len(cs)]:
        rs.append(sorted(cs[start:i], key=lambda c: c["cx"])); start = i
    return rs

def save(img, c, path, pad=6):
    sel = cv2.GaussianBlur(c["sel"], (3, 3), 0)
    x0, y0 = max(0, c["x"] - pad), max(0, c["y"] - pad)
    x1, y1 = min(img.shape[1], c["x"] + c["w"] + pad), min(img.shape[0], c["y"] + c["h"] + pad)
    rgba = np.dstack([img[y0:y1, x0:x1], sel[y0:y1, x0:x1]])
    Image.fromarray(cv2.cvtColor(rgba, cv2.COLOR_BGRA2RGBA)).save(path, "WEBP", quality=88)
    return [int(x1 - x0), int(y1 - y0)]

manifest = {"sets": []}

def emit(setname, img, grid):
    os.makedirs(f"{OUT}/{setname}", exist_ok=True)
    items = []
    for row, chars in grid:
        if len(row) != len(chars): print(setname, "fila", chars, "tiene", len(row))
        count = {}
        for c, ch in zip(row, chars):
            count[ch] = count.get(ch, 0) + 1
            lid = f"{ch}-{count[ch]}"
            size = save(img, c, f"{OUT}/{setname}/{lid}.webp")
            items.append({"id": f"{setname}-{lid}", "char": ch.lower(), "src": f"/assets/room-04/letters/{setname}/{lid}.webp", "w": size[0], "h": size[1]})
    return items

# set 1: revista
img = cv2.imread(REV); H, W = img.shape[:2]
cs = [c for c in pieces(img, 28, 5, 500) if c["w"] > 22 and c["h"] > 30]
left = [c for c in cs if c["cx"] < W * 0.52]
right = [c for c in cs if c["cx"] >= W * 0.52 and not (c["cx"] > W * 0.88 and c["cy"] > H * 0.9)]  # quita el ":D"
L, R = rows(left, 12), rows(right, 13)
LCH = ["AaaA", "BbbB", "CccC", "ddDd", "eeEe", "ffFF", "GgGG", "hHhh", "iiii", "jJJj", "kkkk", "lLLl"]
RCH = ["mMM", "nnnN", "oooo", "PPPp", "qQqQ", "RrRr", "ssss", "tttt", "uuuU", "VVVV", "Www", "XXYy", "zZZ"]
# los caracteres solo sirven de etiqueta; la mayúscula/minúscula exacta no importa para el uso
manifest["sets"].append({"id": "revista", "label": "Letras de revista", "items": emit("revista", img, list(zip(L, [s.lower() for s in LCH])) + list(zip(R, [s.lower() for s in RCH])))})

# set 2: papel
img2 = cv2.imread(PAP)
cs2 = pieces(img2, 40, 7, 1500)
P = rows(cs2, 6)
PCH = ["abcde", "fghij", "klmn", "opqr", "stuv", "wxyz"]
manifest["sets"].append({"id": "papel", "label": "Letras de papel", "items": emit("papel", img2, list(zip(P, PCH)))})

json.dump(manifest, open(f"{OUT}/letters.json", "w"), ensure_ascii=False, indent=1)
print("total", sum(len(s["items"]) for s in manifest["sets"]))
