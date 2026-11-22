"""Habitación v3: combina las 640 fotos del primer set con las 553 del segundo (23 sep 2026).
- Clasifica el set nuevo (techo, piso, friso, mobiliario/documento) a partir de la revisión visual de las hojas de contacto.
- Encadena fotos consecutivas por pared con ORB/RANSAC (altura y giro), igual que recon.py.
- Descarta fotos nuevas casi idénticas a las del primer set (ahash).
- Selección por cobertura en una cuadrícula más fina por pared + techo y piso reales.
- Exporta las fotos de la habitación y room-photos.json.
python3 -I recon_v3.py <old_out> <new_out> <app_dir>
"""
import sys, os, json, math
import numpy as np
import cv2
from PIL import Image, ImageOps

OLD, NEW, APP = sys.argv[1:4]
P_ROOM = os.path.join(APP, "public", "assets", "room-04", "photos")
DATA = os.path.join(APP, "src", "features", "room-04", "data")


def rng(a, b):
    return list(range(a, b + 1))


# Revisión visual del set nuevo (número = orden de toma, nseq)
NEW_TYPES = {
    "friso": rng(1, 21),
    "techo": [22, 23] + rng(157, 161) + rng(163, 166) + [173, 174] + rng(178, 180) + rng(182, 184),
    "piso": [167, 169, 170, 171, 172, 175, 176, 177, 181, 485, 486, 487, 504, 505],
    "mobiliario": rng(312, 316) + rng(329, 345) + rng(350, 408) + rng(424, 450) + rng(469, 484) + [506, 507] + rng(526, 553),
    "documento": [457, 458, 496, 497, 499, 502, 503],
}
WALLS = {"A": 30, "B": 120, "C": 210, "D": 300}
HALF, H = 4.0, 4.6


def angdiff(a, b):
    return (a - b + 180) % 360 - 180


old = json.load(open(os.path.join(OLD, "photos.json")))
new = json.load(open(os.path.join(NEW, "photos_cls.json")))
for x in old:
    x["_dir"] = OLD
    x["collage"] = x["seq"]
tmap = {s: t for t, ss in NEW_TYPES.items() for s in ss}


def ham(a, b):
    return bin(int(a, 16) ^ int(b, 16)).count("1")


old_hashes = [o["ahash"] for o in old if not o.get("dup")]
for x in new:
    x["_dir"] = NEW
    x["seq"] = 1000 + x["nseq"]  # cadena separada del primer set
    x["collage"] = 640 + x["nseq"]
    x["type"] = tmap.get(x["nseq"], "pared")
    x["dup"] = any(ham(x["ahash"], h) < 18 for h in old_hashes)
    h = x["heading"]
    x["wall"] = min(WALLS, key=lambda w: abs(angdiff(h, WALLS[w])))
    x["wall_off"] = angdiff(h, WALLS[x["wall"]])

orb = cv2.ORB_create(1200)
bf = cv2.BFMatcher(cv2.NORM_HAMMING)
cache = {}


def feats(x):
    if x["id"] not in cache:
        im = cv2.imread(os.path.join(x["_dir"], "thumb", x["id"] + ".jpg"), cv2.IMREAD_GRAYSCALE)
        kp, des = orb.detectAndCompute(im, None)
        cache[x["id"]] = (kp, des, im.shape)
    return cache[x["id"]]


def match(a, b):
    ka, da, sa = feats(a)
    kb, db, _ = feats(b)
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
    return dict(dy=M[1, 2] / sa[0], rot=math.degrees(math.atan2(M[1, 0], M[0, 0])))


# el set nuevo se encadena y posiciona; el viejo conserva su reconstrucción
nwalls = sorted([x for x in new if x["type"] in ("pared", "friso") and not x["dup"]], key=lambda x: x["seq"])
for w in WALLS:
    seq = [x for x in nwalls if x["wall"] == w]
    cid, prev = 0, None
    for x in seq:
        r = match(prev, x) if prev and x["seq"] - prev["seq"] <= 4 else None
        if r is None:
            cid += 1
            x["chain"], x["cy"], x["croll"] = f"N{w}{cid}", 0.0, 0.0
        else:
            x["chain"], x["cy"], x["croll"], x["match"] = prev["chain"], prev["cy"] + r["dy"], prev["croll"] + r["rot"], r
        prev = x
    chains = {}
    for x in seq:
        chains.setdefault(x["chain"], []).append(x)
    for items in chains.values():
        ys = [i["cy"] for i in items]
        mid, span = (max(ys) + min(ys)) / 2, max(ys) - min(ys)
        for i in items:
            base = 3.7 if i["type"] == "friso" else 2.0
            k = 1.15 if span < 3 else 3.4 / span
            i["ly"] = float(np.clip(base - (i["cy"] - mid) * k, 0.55, H - 0.5))
            i["lx"] = float(np.clip(HALF * math.tan(math.radians(i["wall_off"])), -HALF + 0.4, HALF - 0.4))
            i["lroll"] = float(np.clip(-i["croll"] * 0.6, -9, 9))

allp = [x for x in old + new if not x.get("dup")]
walls = [x for x in allp if x["type"] in ("pared", "friso", "biblioteca") and "ly" in x]
GX, GY = 14, 6
sel = []
for w in WALLS:
    cells = {}
    for x in (x for x in walls if x["wall"] == w):
        cx = min(GX - 1, int((x["lx"] + HALF) / (2 * HALF) * GX))
        cy = min(GY - 1, int(x["ly"] / H * GY))
        score = x["sharp"] * (1.15 if x["_dir"] == NEW else 1.0)  # el set nuevo trae más luz y encuadres frontales
        if (cx, cy) not in cells or score > cells[(cx, cy)][0]:
            cells[(cx, cy)] = (score, x)
    sel += [v[1] for v in cells.values()]
for t, n in (("techo", 14), ("piso", 12)):
    items = sorted([x for x in allp if x["type"] == t], key=lambda x: -x["sharp"])[:n]
    for k, x in enumerate(items):
        a = math.radians((x.get("heading") or 0) + k * 13)
        r = 0.6 + (k % 4) * 0.85
        x["px"], x["pz"] = float(math.sin(a) * r), float(-math.cos(a) * r)
        sel.append(x)

os.makedirs(P_ROOM, exist_ok=True)
for f in os.listdir(P_ROOM):
    os.remove(os.path.join(P_ROOM, f))
TYPE_ES = {"pared": "Pared", "friso": "Friso alto", "techo": "Techo", "piso": "Piso", "biblioteca": "Biblioteca"}
room = []
for x in sel:
    im = ImageOps.exif_transpose(Image.open(os.path.join(x["_dir"], "web", x["id"] + ".jpg"))).convert("RGB")
    im.thumbnail((960, 960), Image.LANCZOS)
    im.save(os.path.join(P_ROOM, x["id"] + ".jpg"), "JPEG", quality=70, optimize=True, progressive=True)
    rw, rh = im.size
    room.append(dict(
        id=x["id"], seq=x["seq"], collage=x["collage"], type=x["type"], wall=x.get("wall"),
        heading=x.get("heading") or 0.0, aspect=round(rw / rh, 4), ly=round(x.get("ly", 2.0), 3),
        roll=round(x.get("lroll", 0.0), 2), px=x.get("px"), pz=x.get("pz"), sharp=round(x["sharp"], 1),
        matched=bool(x.get("match")), chain=x.get("chain"), note=x.get("note"),
        description=f"Collage #{x['collage']}",
    ))
room.sort(key=lambda r: (r["type"] in ("techo", "piso"), r["heading"]))
json.dump(room, open(os.path.join(DATA, "room-photos.json"), "w"), ensure_ascii=False)
from collections import Counter
print("nuevas descartadas por duplicado", sum(1 for x in new if x["dup"]))
print("encadenadas nuevas", sum(1 for x in nwalls if "match" in x), "/", len(nwalls))
print("habitación", len(room), Counter(r["type"] for r in room), Counter(r["wall"] for r in room if r["type"] not in ("techo", "piso")))
print("nuevas en la habitación", sum(1 for x in sel if x["_dir"] == NEW))
