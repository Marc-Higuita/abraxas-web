"""Classify photos and compute a Hockney-style room layout.
- wall from compass heading (4 walls ~30/120/210/300 deg)
- non-wall types from visual review (seq lists)
- vertical offset + roll from ORB feature matching between consecutive photos of a sweep
- coverage-based selection per wall
python3 -I recon.py <out_dir>
"""
import sys, os, json, math
import numpy as np
import cv2

OUT = sys.argv[1]
d = json.load(open(os.path.join(OUT, "photos_raw.json")))
bySeq = {x["seq"]: x for x in d}


def rng(a, b):
    return list(range(a, b + 1))


TYPES = {
    "friso": rng(1, 25),
    "techo": rng(187, 197) + [199, 208, 211, 212, 213],
    "piso": rng(200, 207) + [209, 210, 569, 570, 593, 594, 595],
    "mobiliario": rng(404, 445) + rng(452, 456) + rng(462, 491) + [625, 626, 629, 631, 633, 634, 637],
    "documento": rng(446, 451) + rng(457, 461) + rng(587, 592) + rng(614, 624) + [584, 627, 628, 630, 632, 635, 636, 638, 639, 640],
    "biblioteca": rng(511, 528) + [535, 549],
    "objeto": [186] + rng(529, 534) + rng(556, 566) + rng(581, 583),
}
DUPES = {"pate1-img_0631", "pate1-img_0633", "pate1-img_0635", "pate1-img_0643"}
# Archive highlights found during review (used by timeline / fichas)
HIGHLIGHTS = {
    351: "Tarjetón a la Alcaldía de Medellín con la casilla 74 a nombre de Jorge Hernán Betancur Aguilar",
    82: "Tarjetón presidencial y tarjetón a la Alcaldía de Medellín pegados en el collage",
    98: "Recortes políticos: «Con criterio», «Juntos hacemos magia», tarjetones",
    106: "Recortes: «¡Pacifista!», «Con criterio», «Lo que otros callan»",
    50: "Diploma de Abogado, Universidad Autónoma Latinoamericana, a nombre de Abraxas Aguilar Betancur",
    460: "Recorte de prensa: «Este museo en el centro tiene dos récords Guinness y está a punto de cerrar»",
    638: "Certificado Récords Guinness: el libro de collage más grande del mundo (8 de mayo de 1997)",
    587: "Carpeta manuscrita: «Libro de Abraxas · Constitución Universal · Un Nuevo Orden Mundial»",
    617: "Libro «El derecho: realidad, ficción o estafa»",
    513: "Guinness World Records 2016 en la biblioteca",
    581: "Busto con placa «Una meta cumplida»",
    30: "Pared «HELP» y «El país que queremos»",
}
WALLS = {"A": 30, "B": 120, "C": 210, "D": 300}
WALL_NAMES = {"A": "Pared norte · «OH» y Sacré-Cœur", "B": "Pared oriente · política y escritorio",
              "C": "Pared sur · «HELP» y diploma", "D": "Pared occidente · biblioteca"}

tmap = {}
for t, seqs in TYPES.items():
    for s in seqs:
        tmap[s] = t


def angdiff(a, b):
    return (a - b + 180) % 360 - 180


for x in d:
    x["dup"] = x["id"] in DUPES
    x["type"] = tmap.get(x["seq"], "pared")
    h = x.get("heading")
    if h is None:
        x["wall"] = None
    else:
        x["wall"] = min(WALLS, key=lambda w: abs(angdiff(h, WALLS[w])))
        x["wall_off"] = angdiff(h, WALLS[x["wall"]])
    if x["seq"] in HIGHLIGHTS:
        x["note"] = HIGHLIGHTS[x["seq"]]

# --- feature matching between consecutive photos (same wall, close in time) ---
orb = cv2.ORB_create(1200)
cache = {}


def feats(pid):
    if pid not in cache:
        im = cv2.imread(os.path.join(OUT, "thumb", pid + ".jpg"), cv2.IMREAD_GRAYSCALE)
        kp, des = orb.detectAndCompute(im, None)
        cache[pid] = (kp, des, im.shape)
    return cache[pid]


bf = cv2.BFMatcher(cv2.NORM_HAMMING)


def match(a, b):
    ka, da, sa = feats(a)
    kb, db, sb = feats(b)
    if da is None or db is None or len(ka) < 30 or len(kb) < 30:
        return None
    m = bf.knnMatch(da, db, k=2)
    good = [p[0] for p in m if len(p) == 2 and p[0].distance < 0.75 * p[1].distance]
    if len(good) < 25:
        return None
    pa = np.float32([ka[g.queryIdx].pt for g in good])
    pb = np.float32([kb[g.trainIdx].pt for g in good])
    M, inl = cv2.estimateAffinePartial2D(pb, pa, method=cv2.RANSAC, ransacReprojThreshold=4)
    if M is None or inl.sum() < 20:
        return None
    s = math.hypot(M[0, 0], M[1, 0])
    if not 0.6 < s < 1.6:
        return None
    rot = math.degrees(math.atan2(M[1, 0], M[0, 0]))
    h = sa[0]
    return dict(dx=M[0, 2] / h, dy=M[1, 2] / h, rot=rot, scale=s, inliers=int(inl.sum()))


walls = [x for x in d if x["type"] in ("pared", "friso", "biblioteca") and x["wall"] and not x["dup"]]
walls.sort(key=lambda x: x["seq"])
for w in WALLS:
    seq = [x for x in walls if x["wall"] == w]
    chain_id, prev = 0, None
    for x in seq:
        r = None
        if prev and x["seq"] - prev["seq"] <= 4:
            r = match(prev["id"], x["id"])
        if r is None:
            chain_id += 1
            x["chain"] = f"{w}{chain_id}"
            x["cy"], x["croll"] = 0.0, 0.0
        else:
            x["chain"] = prev["chain"]
            x["cy"] = prev["cy"] + r["dy"]
            x["croll"] = prev["croll"] + r["rot"]
            x["match"] = r
        prev = x

# sharpness for selection
for x in d:
    im = cv2.imread(os.path.join(OUT, "thumb", x["id"] + ".jpg"), cv2.IMREAD_GRAYSCALE)
    x["sharp"] = float(cv2.Laplacian(im, cv2.CV_64F).var())

# --- layout in room coordinates ---
# Room: width/depth 8 units, height 4.6. Wall plane local x in [-4,4], y in [0,4.6]
HALF, H = 4.0, 4.6
for w in WALLS:
    seq = [x for x in walls if x["wall"] == w]
    chains = {}
    for x in seq:
        chains.setdefault(x["chain"], []).append(x)
    for c, items in chains.items():
        ys = [i["cy"] for i in items]
        mid = (max(ys) + min(ys)) / 2
        span = max(ys) - min(ys)
        for i in items:
            # friso photos are near the ceiling
            base = 3.7 if i["type"] == "friso" else 2.0
            k = 1.15 if span < 3 else 3.4 / span
            i["ly"] = float(np.clip(base - (i["cy"] - mid) * k, 0.55, H - 0.5))
            i["lx"] = float(np.clip(HALF * math.tan(math.radians(i["wall_off"])) / math.tan(math.radians(45)), -HALF + 0.4, HALF - 0.4))
            i["lroll"] = float(np.clip(-i["croll"] * 0.6, -9, 9))

# coverage selection: per wall grid 9 x 5, best sharp per cell (+ friso row)
sel = []
for w in WALLS:
    seq = [x for x in walls if x["wall"] == w and "lx" in x]
    cells = {}
    for x in seq:
        cx = int((x["lx"] + HALF) / (2 * HALF) * 9)
        cy = int(x["ly"] / H * 5)
        key = (min(cx, 8), min(cy, 4))
        if key not in cells or x["sharp"] > cells[key]["sharp"]:
            cells[key] = x
    for x in cells.values():
        x["room"] = True
        sel.append(x)
# ceiling + floor: placed on planes by heading angle
for t, n in (("techo", 8), ("piso", 6)):
    items = sorted([x for x in d if x["type"] == t and not x["dup"]], key=lambda x: -x["sharp"])[:n]
    for k, x in enumerate(items):
        a = math.radians(x.get("heading") or k * 45)
        r = 1.4 + (k % 3) * 0.9
        x["px"], x["pz"] = float(math.sin(a) * r), float(-math.cos(a) * r)
        x["room"] = True
        sel.append(x)

json.dump(d, open(os.path.join(OUT, "photos.json"), "w"), ensure_ascii=False, indent=1)
chains = {}
for x in walls:
    chains.setdefault(x["chain"], 0)
    chains[x["chain"]] += 1
print("walls", {w: sum(1 for x in walls if x["wall"] == w) for w in WALLS})
print("chains", len(chains), "matched", sum(1 for x in walls if "match" in x))
print("selected for room", len(sel), {w: sum(1 for x in sel if x.get("wall") == w and x["type"] in ("pared", "friso", "biblioteca")) for w in WALLS})
from collections import Counter
print(Counter(x["type"] for x in d))
