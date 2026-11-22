"""Recorta cuerpos de las láminas del equipo (recortes2) para «Todo es trans».
Recortes a la altura del cuello/mentón: sin rostros reconocibles. Fondo -> alfa por flood fill + GrabCut.
Segmentación con rembg (u2net_human_seg / isnet-general-use) sobre la imagen completa.
El borde cortado (arriba) se rasga a mano. Salida: public/assets/room-04/trans/b-*.webp + manifest en stdout."""
import cv2, numpy as np, json, sys, os
SRC = "/home/claude/abx/raw/recortes2/recortes/"
OUT = "/home/claude/abx/app/public/assets/room-04/trans/"
# id, archivo, caja (x0,y0,x1,y1), tolerancia, rasgar arriba
JOBS = [
    ("b-torso-1", "Pieter Hugo’s New Portraits Capture the Confidence and Fragility of Youth.jpg", (0, 372, 525, 700), 26, True),
    ("b-torso-2", "descarga (1).jpg", (268, 168, 612, 736), 22, True),
    ("b-torso-3", "descarga.jpg", (0, 312, 526, 735), 24, True),
    ("b-torso-4", "Ideaal.jpg", (150, 80, 281, 242), 26, True),
    ("b-torso-5", "Neddy Merrill- just made up character- surreal.jpg", (222, 178, 386, 470), 18, True),
    ("b-escultura-1", "descarga (3).jpg", (80, 170, 371, 500), 20, False),
    ("b-manos-1", "descarga (4).jpg", (40, 60, 420, 515), 20, False),
    ("b-traje-1", "женщина, коллаж.jpg", (150, 285, 625, 915), 22, True),
    ("b-torso-6", next(f for f in os.listdir(SRC) if "Batory" in f), (165, 70, 470, 475), 24, False),
]

def torn_top(alpha, rng):
    h, w = alpha.shape
    y = np.zeros(w)
    v = 0.0
    for x in range(w):
        v += rng.normal(0, 1.1); v *= 0.93
        y[x] = 6 + abs(v) * 2 + rng.random() * 3
    for x in range(w):
        alpha[: int(y[x]), x] = 0
    return alpha

def segment(img, tol, rng):
    h, w = img.shape[:2]
    lab = cv2.cvtColor(img, cv2.COLOR_BGR2LAB)
    border = np.concatenate([lab[0], lab[-1], lab[:, 0], lab[:, -1]])
    light = border[border[:, 0] > np.percentile(border[:, 0], 40)]
    bg = np.median(light, axis=0)
    dist = np.linalg.norm(lab.astype(np.float32) - bg, axis=2)
    cand = (dist < tol).astype(np.uint8)
    # flood fill desde el borde sobre los píxeles candidatos a fondo
    ff = np.zeros((h + 2, w + 2), np.uint8)
    reach = np.zeros((h, w), np.uint8)
    num, labels = cv2.connectedComponents(cand)
    edge_labels = set(np.unique(np.concatenate([labels[0], labels[-1], labels[:, 0], labels[:, -1]]))) - {0}
    for l in edge_labels:
        if cand[labels == l].any():
            reach[labels == l] = 1
    fg_mask = np.where(reach == 1, cv2.GC_BGD, cv2.GC_PR_FGD).astype(np.uint8)
    core = cv2.erode((reach == 0).astype(np.uint8), np.ones((9, 9), np.uint8))
    fg_mask[core == 1] = cv2.GC_FGD
    if (fg_mask == cv2.GC_BGD).sum() > 50 and (fg_mask == cv2.GC_FGD).sum() > 50:
        bgd, fgd = np.zeros((1, 65)), np.zeros((1, 65))
        cv2.grabCut(img, fg_mask, None, bgd, fgd, 3, cv2.GC_INIT_WITH_MASK)
    a = np.where((fg_mask == cv2.GC_FGD) | (fg_mask == cv2.GC_PR_FGD), 255, 0).astype(np.uint8)
    # nos quedamos con la(s) componente(s) grande(s)
    n, lab2, st, _ = cv2.connectedComponentsWithStats(a)
    if n > 1:
        keep = np.zeros_like(a)
        big = st[1:, cv2.CC_STAT_AREA].max()
        for i in range(1, n):
            if st[i, cv2.CC_STAT_AREA] > big * 0.08:
                keep[lab2 == i] = 255
        a = keep
    a = cv2.morphologyEx(a, cv2.MORPH_CLOSE, np.ones((5, 5), np.uint8))
    a = cv2.GaussianBlur(a, (3, 3), 0)
    return a

rng = np.random.default_rng(7)
man = {}
from rembg import remove, new_session
from PIL import Image
SESS = {"h": new_session("u2net_human_seg"), "g": new_session("isnet-general-use")}
HUMAN = {"b-torso-1", "b-torso-2", "b-torso-3", "b-traje-1"}
cache = {}
for pid, f, (x0, y0, x1, y1), tol, torn in JOBS:
    img = cv2.imread(SRC + f, cv2.IMREAD_COLOR)
    key = (f, pid in HUMAN)
    if key not in cache:
        pil = Image.open(SRC + f).convert("RGB")
        cache[key] = np.array(remove(pil, session=SESS["h" if pid in HUMAN else "g"], only_mask=True))
    full_a = cache[key]
    crop = img[y0:y1, x0:x1].copy()
    a = full_a[y0:y1, x0:x1].copy()
    a = np.where(a > 128, 255, (a.astype(np.float32) * 1.6).clip(0, 255)).astype(np.uint8)
    n, lab2, st, _ = cv2.connectedComponentsWithStats((a > 60).astype(np.uint8))
    if n > 1:
        big = st[1:, cv2.CC_STAT_AREA].max(); keep = np.zeros_like(a)
        for i in range(1, n):
            if st[i, cv2.CC_STAT_AREA] > big * 0.15: keep[lab2 == i] = 1
        a = (a * keep).astype(np.uint8)
    if torn:
        a = torn_top(a, rng)
    ys, xs = np.where(a > 20)
    if len(xs) == 0:
        print("vacío", pid, file=sys.stderr); continue
    crop, a = crop[ys.min():ys.max() + 1, xs.min():xs.max() + 1], a[ys.min():ys.max() + 1, xs.min():xs.max() + 1]
    rgba = cv2.cvtColor(crop, cv2.COLOR_BGR2BGRA); rgba[:, :, 3] = a
    h, w = a.shape
    k = min(1.0, 700 / max(h, w))
    if k < 1: rgba = cv2.resize(rgba, (int(w * k), int(h * k)), interpolation=cv2.INTER_AREA)
    cv2.imwrite(OUT + pid + ".webp", rgba, [cv2.IMWRITE_WEBP_QUALITY, 84])
    man[pid] = {"cat": "cuerpos", "src": f"/assets/room-04/trans/{pid}.webp", "w": rgba.shape[1], "h": rgba.shape[0]}
print(json.dumps(man, ensure_ascii=False))
