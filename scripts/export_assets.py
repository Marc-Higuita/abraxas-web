"""Export optimized assets + data JSON for the Next.js app.
python3 -I export_assets.py <out_dir> <books_dir> <brand_dir> <app_dir>
"""
import sys, os, json, math, shutil, subprocess
from PIL import Image, ImageOps

OUT, BOOKS, BRAND, APP = sys.argv[1:5]
PUB = os.path.join(APP, "public", "assets")
P_ROOM = os.path.join(PUB, "room-04", "photos")
P_ARCH = os.path.join(PUB, "room-04", "archive")
P_BOOK = os.path.join(PUB, "room-04", "books")
P_BRAND = os.path.join(PUB, "brand")
P_MISC = os.path.join(PUB, "room-04", "misc")
for p in (P_ROOM, P_ARCH, P_BOOK, P_BRAND, P_MISC):
    os.makedirs(p, exist_ok=True)
DATA = os.path.join(APP, "src", "features", "room-04", "data")
os.makedirs(DATA, exist_ok=True)

d = json.load(open(os.path.join(OUT, "photos.json")))
TYPE_ES = {"pared": "Pared", "friso": "Friso alto", "techo": "Techo", "piso": "Piso", "mobiliario": "Mobiliario",
           "documento": "Documento", "biblioteca": "Biblioteca", "objeto": "Objeto"}
WALL_ES = {"A": "Pared norte", "B": "Pared oriente", "C": "Pared sur", "D": "Pared occidente"}


def save(src, dst, size, q):
    im = Image.open(src)
    im = ImageOps.exif_transpose(im).convert("RGB")
    im.thumbnail((size, size), Image.LANCZOS)
    im.save(dst, "JPEG", quality=q, optimize=True, progressive=True)
    return im.size


room, archive = [], []
for x in d:
    if x["dup"]:
        continue
    w, h = save(os.path.join(OUT, "thumb", x["id"] + ".jpg"), os.path.join(P_ARCH, x["id"] + ".jpg"), 240, 70)
    rec = dict(id=x["id"], seq=x["seq"], file=x["file"], part=x["part"], time=x["datetime"][11:16],
               heading=None if x.get("heading") is None else round(x["heading"], 1),
               type=x["type"], wall=x.get("wall"), chain=x.get("chain"), matched=bool(x.get("match")),
               room=bool(x.get("room")), note=x.get("note"), w=w, h=h)
    if x.get("note"):
        save(os.path.join(OUT, "web", x["id"] + ".jpg"), os.path.join(P_MISC, x["id"] + ".jpg"), 1400, 78)
        rec["full"] = True
    archive.append(rec)
    if x.get("room"):
        rw, rh = save(os.path.join(OUT, "web", x["id"] + ".jpg"), os.path.join(P_ROOM, x["id"] + ".jpg"), 900, 72)
        r = dict(id=x["id"], seq=x["seq"], type=x["type"], wall=x.get("wall"),
                 heading=x.get("heading") if x.get("heading") is not None else 0.0,
                 aspect=round(rw / rh, 4), ly=round(x.get("ly", 2.0), 3), roll=round(x.get("lroll", 0.0), 2),
                 px=x.get("px"), pz=x.get("pz"), sharp=round(x["sharp"], 1),
                 matched=bool(x.get("match")), chain=x.get("chain"), note=x.get("note"))
        r["description"] = f"{TYPE_ES[x['type']]}" + (f" · {WALL_ES[x['wall']]}" if x.get("wall") and x["type"] not in ("techo", "piso") else "") + f" · foto #{x['seq']}, {x['datetime'][11:16]}"
        room.append(r)
room.sort(key=lambda r: r["seq"])
json.dump(room, open(os.path.join(DATA, "room-photos.json"), "w"), ensure_ascii=False)
json.dump(archive, open(os.path.join(DATA, "archive.json"), "w"), ensure_ascii=False)

# books: covers + quoted pages (PDF page index -> jpg)
QUOTED = {"prohibido": [1, 6, 10, 46, 49, 54, 67, 70, 75, 76, 88, 93, 129], "tesis": [1, 4, 25, 33, 52, 60, 72, 86, 108, 218]}
for book, pages in QUOTED.items():
    pdf = os.path.join(BOOKS, f"{book}.pdf")
    for pg in pages:
        tmp = os.path.join(P_BOOK, f"_{book}")
        subprocess.run(["pdftoppm", "-r", "110", "-f", str(pg), "-l", str(pg), "-jpeg", "-jpegopt", "quality=70", pdf, tmp], check=True)
        cands = [f for f in os.listdir(P_BOOK) if f.startswith(f"_{book}-")]
        for c in cands:
            os.replace(os.path.join(P_BOOK, c), os.path.join(P_BOOK, f"{book}-p{pg:03d}.jpg"))
# cover textures
for book in QUOTED:
    src = os.path.join(P_BOOK, f"{book}-p001.jpg")
    im = Image.open(src).convert("RGB")
    im.thumbnail((700, 1000))
    im.save(os.path.join(P_BOOK, f"{book}-cover.jpg"), quality=82)
# third book cover: photo of the real cover found in the archive (#617)
third = next(x for x in d if x["seq"] == 617)
im = Image.open(os.path.join(OUT, "web", third["id"] + ".jpg")).convert("RGB")
W, H = im.size
im = im.crop((int(W * 0.08), int(H * 0.06), int(W * 0.92), int(H * 0.94)))
im.thumbnail((700, 1000))
im.save(os.path.join(P_BOOK, "derecho-cover-photo.jpg"), quality=80)

# brand
for f in os.listdir(os.path.join(BRAND, "final")):
    shutil.copy(os.path.join(BRAND, "final", f), os.path.join(P_BRAND, f.replace("ó", "o")))
print("room", len(room), "archive", len(archive))
