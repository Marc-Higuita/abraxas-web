"""Genera src/features/room-04/data/cutouts.json agrupando los recortes por parte del cuerpo
para el tablero «Tu figura, tu mensaje». python3 -I scripts/cutouts_manifest.py (desde app/)"""
import json, os, re
from PIL import Image

ROOT = "public/assets/room-04/cutouts"
OUT = "src/features/room-04/data/cutouts.json"
EXCLUDE = {"cuerpos/maniqui-01", "cuerpos/cuerpa-01"}  # láminas completas, ya separadas en piezas


def drawer(rel):
    f = rel.split("/")[1]
    if rel.startswith("cabezas/") or f.startswith(("cara-muneca", "cabeza-rubia")) or rel in ("cuerpos/bailarina-01", "cuerpos/muneca-01"):
        return "cabezas"
    if rel.startswith("rostros/") or f.startswith(("boca-ojo", "mirada", "fragmento-rostro")):
        return "rostros"
    if rel.startswith("torsos/") or rel in ("cuerpos/bailarina-08", "cuerpos/torso-brazos-01", "cuerpos/unicornio-01"):
        return "torsos"
    if rel.startswith("brazos/") or rel in ("cuerpos/bailarina-02", "cuerpos/bailarina-03", "cuerpos/bailarina-04", "cuerpos/bailarina-05", "cuerpos/muneca-02", "cuerpos/muneca-03"):
        return "brazos"
    if rel.startswith("piernas/") or rel in ("cuerpos/bailarina-06", "cuerpos/bailarina-07", "cuerpos/muneca-04", "cuerpos/muneca-05"):
        return "piernas"
    if f.startswith("silueta-estampada") and f != "silueta-estampada-18":
        return "vestuario"
    return "anadidos"


def label(rel):
    f = rel.split("/")[1]
    base = re.sub(r"-\d+$", "", f).replace("-", " ")
    names = {"abraxas cabeza": "Cabeza de Abraxas", "silueta estampada": "Vestido estampado", "boca ojo": "Boca u ojo", "cara muneca": "Cara de muñeca",
             "bailarina": "Bailarina", "muneca": "Muñeca", "torso brazos": "Torso con brazos", "unicornio": "Muñeca unicornio"}
    return names.get(base, base.capitalize())


items = []
for cat in sorted(os.listdir(ROOT)):
    for fn in sorted(os.listdir(os.path.join(ROOT, cat))):
        if not fn.endswith(".png"):
            continue
        rel = f"{cat}/{fn[:-4]}"
        if rel in EXCLUDE:
            continue
        w, h = Image.open(os.path.join(ROOT, cat, fn)).size
        d = drawer(rel)
        items.append(dict(id=rel, src=f"/assets/room-04/cutouts/{cat}/{fn}", cat=d, label=label(rel), w=w, h=h))
order = ["cabezas", "rostros", "torsos", "brazos", "piernas", "vestuario", "anadidos"]
items.sort(key=lambda x: (order.index(x["cat"]), x["id"] != "cabezas/abraxas-cabeza", x["id"]))
json.dump(items, open(OUT, "w"), ensure_ascii=False, indent=0)
from collections import Counter
print(len(items), Counter(i["cat"] for i in items))
