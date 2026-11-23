"""Fotos para la impresora del interludio «Aquí las fotos no se toman, se hacen.»
Toma las fotos de pared más nítidas de la habitación, recorte centrado 4:5, 480 px, WebP."""
import json, os
from PIL import Image, ImageOps
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
d = json.load(open(os.path.join(ROOT, "src/features/room-04/data/room-photos.json")))
walls = [x for x in d if x.get("type") in ("pared", "friso") and x.get("wall") in list("ABCD")]
walls.sort(key=lambda x: -x.get("sharp", 0))
picked, seen = [], set()
for x in walls:  # alterna paredes para variedad
    if x["wall"] in seen and len(seen) < 4: continue
    seen.add(x["wall"]); picked.append(x)
    if len(seen) == 4: seen = set()
    if len(picked) == 12: break
out = os.path.join(ROOT, "public/assets/room-04/fotos-se-hacen")
for i, x in enumerate(picked, 1):
    src = os.path.join(ROOT, "public/assets/room-04/photos", x["id"] + ".jpg")
    if not os.path.exists(src): src = os.path.join(ROOT, "public/assets/room-04/photos-lo", x["id"] + ".jpg")
    im = ImageOps.exif_transpose(Image.open(src)).convert("RGB")
    im = ImageOps.fit(im, (480, 600), Image.LANCZOS)
    im.save(os.path.join(out, f"f-{i:02d}.webp"), "WEBP", quality=72)
    print(i, x["id"], x["wall"])
