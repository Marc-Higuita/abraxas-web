"""Poemario: fotos de celular del libro abierto -> páginas sueltas, rectificadas y en blanco limpio.

Paso 1 (split):  python3 -I poemario_pages.py split <carpeta_jpg> <salida_dir> [n ...]
Paso 2 (export): python3 -I poemario_pages.py export <salida_dir> <destino_webp>  (usa order.json)

Cada foto (2267x1707, doble página) se separa por el lomo (valle de tinta + sombra del pliegue),
cada mitad se rectifica por el contorno del papel, se normaliza la iluminación (papel blanco)
y se encaja en 620x877 como las demás páginas del sitio. El número de página se lee con OCR
para ordenar y quitar duplicados (se conserva la toma más nítida).
"""
import sys, os, glob, json, re, subprocess, tempfile
import cv2, numpy as np

OUT_W, OUT_H = 620, 877


def order_quad(pts):
    pts = np.array(pts, dtype=np.float32).reshape(-1, 2)
    s = pts.sum(1); d = np.diff(pts, axis=1).ravel()
    return np.array([pts[np.argmin(s)], pts[np.argmin(d)], pts[np.argmax(s)], pts[np.argmax(d)]], dtype=np.float32)


def paper_mask(img):
    hsv = cv2.cvtColor(img, cv2.COLOR_BGR2HSV)
    s, v = hsv[..., 1], hsv[..., 2]
    vt = max(105, int(np.percentile(v, 50)) - 30)
    m = ((s < 80) & (v > vt)).astype(np.uint8) * 255
    m = cv2.morphologyEx(m, cv2.MORPH_CLOSE, cv2.getStructuringElement(cv2.MORPH_RECT, (31, 31)))
    m = cv2.morphologyEx(m, cv2.MORPH_OPEN, cv2.getStructuringElement(cv2.MORPH_RECT, (11, 11)))
    return m


def largest(m):
    n, lab, st, _ = cv2.connectedComponentsWithStats(m)
    if n <= 1: return None
    i = 1 + int(np.argmax(st[1:, cv2.CC_STAT_AREA]))
    return (lab == i).astype(np.uint8) * 255


def quad_of(m):
    cs, _ = cv2.findContours(m, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    if not cs: return None
    hull = cv2.convexHull(max(cs, key=cv2.contourArea))
    peri = cv2.arcLength(hull, True)
    for eps in (0.02, 0.03, 0.045, 0.06):
        ap = cv2.approxPolyDP(hull, eps * peri, True)
        if len(ap) == 4: return order_quad(ap)
    h = hull.reshape(-1, 2).astype(np.float32)
    s = h.sum(1); d = h[:, 0] - h[:, 1]
    return np.array([h[np.argmin(s)], h[np.argmax(d)], h[np.argmax(s)], h[np.argmin(d)]], dtype=np.float32)


def ink(gray):
    """trazos oscuros pequeños (texto) independientes de la iluminación"""
    bh = cv2.morphologyEx(gray, cv2.MORPH_BLACKHAT, cv2.getStructuringElement(cv2.MORPH_RECT, (15, 15)))
    return (bh > 28).astype(np.float32)


def find_gutter(img, m):
    ys, xs = np.where(m > 0)
    x0, x1, y0, y1 = xs.min(), xs.max(), ys.min(), ys.max()
    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    band = slice(y0 + int((y1 - y0) * 0.08), y1 - int((y1 - y0) * 0.08))
    k = ink(gray)[band] * (m[band] > 0)
    prof_ink = k.mean(0)
    g = gray[band].astype(np.float32); g[m[band] == 0] = np.nan
    with np.errstate(all="ignore"):
        prof_lum = np.nanmean(g, 0)
    a, b = int(x0 + (x1 - x0) * 0.22), int(x0 + (x1 - x0) * 0.78)
    pi = cv2.GaussianBlur(prof_ink[a:b].reshape(1, -1), (0, 0), 9).ravel()
    pl = prof_lum[a:b].copy(); pl[~np.isfinite(pl)] = np.nanmax(pl)
    pl = cv2.GaussianBlur(pl.reshape(1, -1).astype(np.float32), (0, 0), 5).ravel()
    # valle de tinta (márgenes interiores) + sombra del pliegue (mínimo local de luz)
    si = (pi - pi.min()) / (np.ptp(pi) + 1e-6)
    sl = (pl - pl.min()) / (np.ptp(pl) + 1e-6)
    score = si + 0.6 * sl + 0.25 * np.linspace(-1, 1, si.size) ** 2
    return a + int(np.argmin(score))


def normalize(page):
    gray = cv2.cvtColor(page, cv2.COLOR_BGR2GRAY)
    bg = cv2.morphologyEx(gray, cv2.MORPH_CLOSE, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (35, 35)))
    bg = cv2.GaussianBlur(bg, (0, 0), 18).astype(np.float32)
    out = page.astype(np.float32) / np.maximum(bg[..., None], 1) * 250
    out = np.clip((out - 55) * (255 / (240 - 55)), 0, 255).astype(np.uint8)
    hsv = cv2.cvtColor(out, cv2.COLOR_BGR2HSV).astype(np.float32)
    hsv[..., 1] *= 0.45
    return cv2.cvtColor(hsv.astype(np.uint8), cv2.COLOR_HSV2BGR)


def warp(img, q, inset=0.01):
    w = int(max(np.linalg.norm(q[1] - q[0]), np.linalg.norm(q[2] - q[3])))
    h = int(max(np.linalg.norm(q[3] - q[0]), np.linalg.norm(q[2] - q[1])))
    if w < 80 or h < 80: return None
    M = cv2.getPerspectiveTransform(q, np.array([[0, 0], [w, 0], [w, h], [0, h]], dtype=np.float32))
    p = cv2.warpPerspective(img, M, (w, h), flags=cv2.INTER_CUBIC, borderValue=(255, 255, 255))
    dx, dy = int(w * inset), int(h * inset)
    return p[dy:h - dy, dx:w - dx]


def whiten_edges(page):
    """borra lo que no es papel (mesa, dedos, sombra) pintándolo de blanco"""
    m = largest(paper_mask(page))
    if m is None: return page
    m = cv2.dilate(m, cv2.getStructuringElement(cv2.MORPH_RECT, (9, 9)))
    out = page.copy(); out[m == 0] = 255
    return out


def fit(page):
    h, w = page.shape[:2]
    k = min(OUT_W / w, OUT_H / h) * 0.96
    nw, nh = max(1, int(w * k)), max(1, int(h * k))
    r = cv2.resize(page, (nw, nh), interpolation=cv2.INTER_AREA)
    can = np.full((OUT_H, OUT_W, 3), 255, np.uint8)
    can[(OUT_H - nh) // 2:(OUT_H - nh) // 2 + nh, (OUT_W - nw) // 2:(OUT_W - nw) // 2 + nw] = r
    return can


def page_number(page):
    """número impreso en el pie de página (OCR de la franja inferior)"""
    h = page.shape[0]
    strip = cv2.cvtColor(page[int(h * 0.88):, :], cv2.COLOR_BGR2GRAY)
    strip = cv2.resize(strip, None, fx=2, fy=2, interpolation=cv2.INTER_CUBIC)
    with tempfile.NamedTemporaryFile(suffix=".png", delete=False) as t:
        cv2.imwrite(t.name, strip)
        r = subprocess.run(["tesseract", t.name, "-", "--psm", "6", "-c", "tessedit_char_whitelist=0123456789"],
                           capture_output=True, text=True)
    os.unlink(t.name)
    nums = [int(x) for x in re.findall(r"\b(\d{1,3})\b", r.stdout) if 1 <= int(x) <= 320]
    return nums[0] if len(nums) == 1 else None


def process(path):
    img = cv2.imread(path)
    H, W = img.shape[:2]
    sc = 1100 / max(H, W)
    small = cv2.resize(img, (int(W * sc), int(H * sc)), interpolation=cv2.INTER_AREA)
    m = largest(paper_mask(small))
    if m is None: return []
    out = []
    if W > H:
        gx = find_gutter(small, m)
        for side in ("L", "R"):
            mm = m.copy()
            if side == "L": mm[:, gx:] = 0
            else: mm[:, :gx] = 0
            mm = largest(mm)
            if mm is None: continue
            q = quad_of(mm)
            p = warp(img, q / sc)
            if p is None: continue
            out.append((side, p))
    else:
        p = warp(img, quad_of(m) / sc)
        if p is not None: out.append(("S", p))
    res = []
    for side, p in out:
        ar = p.shape[1] / p.shape[0]
        sharp = cv2.Laplacian(cv2.cvtColor(cv2.resize(p, (600, int(600 / ar))), cv2.COLOR_BGR2GRAY), cv2.CV_64F).var()
        res.append({"side": side, "img": p, "sharp": float(sharp), "ar": float(ar)})
    return res


def cmd_split(src, out, only):
    os.makedirs(out, exist_ok=True)
    meta = []
    for f in sorted(glob.glob(os.path.join(src, "p-*.jpg"))):
        n = int(os.path.basename(f)[2:5])
        if only and n not in only: continue
        for r in process(f):
            name = f"{n:03d}{r['side']}.jpg"
            im = r["img"] if n == 1 else whiten_edges(normalize(r["img"]))
            cv2.imwrite(os.path.join(out, name), fit(im), [cv2.IMWRITE_JPEG_QUALITY, 92])
            num = page_number(normalize(r["img"])) if n > 1 else None
            meta.append({"src": n, "side": r["side"], "file": name, "sharp": round(r["sharp"], 1), "ar": round(r["ar"], 3), "num": num})
            print(name, meta[-1]["ar"], meta[-1]["sharp"], num, flush=True)
    json.dump(meta, open(os.path.join(out, "meta.json"), "w"), indent=0)


def cmd_export(out, dest):
    order = json.load(open(os.path.join(out, "order.json")))
    os.makedirs(dest, exist_ok=True)
    for f in glob.glob(os.path.join(dest, "p-*.webp")): os.remove(f)
    for i, name in enumerate(order, 1):
        im = cv2.imread(os.path.join(out, name))
        cv2.imwrite(os.path.join(dest, f"p-{i:03d}.webp"), im, [cv2.IMWRITE_WEBP_QUALITY, 66])
    print(len(order))


if __name__ == "__main__":
    if sys.argv[1] == "split": cmd_split(sys.argv[2], sys.argv[3], set(int(x) for x in sys.argv[4:]))
    else: cmd_export(sys.argv[2], sys.argv[3])
