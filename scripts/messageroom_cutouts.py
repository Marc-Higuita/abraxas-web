"""Recortes para las paredes de la habitación de mensajes (R4-D).
Toma detalles de las fotos de los muros de la casa y los exporta como WebP opacos de ~480 px.
El borde rasgado se aplica en tiempo real con una máscara procedural (sin marcos blancos)."""
import json, random, sys
from pathlib import Path
from PIL import Image, ImageEnhance

ROOT = Path(__file__).resolve().parents[1]
SRC = ROOT / "public/assets/room-04/photos"
OUT = ROOT / "public/assets/room-04/messageroom/cut"
OUT.mkdir(parents=True, exist_ok=True)
data = json.loads((ROOT / "src/features/room-04/data/room-photos.json").read_text())
walls = [p for p in data if p.get("type") in (None, "pared", "wall") or p.get("wall") in "ABCD"]
random.seed(int(sys.argv[1]) if len(sys.argv) > 1 else 7)
pool = sorted({Path(p.get("src", "")).name or "" for p in data} - {""})
files = sorted(SRC.glob("*.jpg"))
random.shuffle(files)
picked = files[:28]
out = []
for i, f in enumerate(picked):
    im = Image.open(f).convert("RGB")
    W, H = im.size
    asp = random.choice([0.72, 0.8, 1.0, 1.25, 1.45])
    cw = int(W * random.uniform(0.42, 0.62)); ch = int(cw / asp)
    if ch > H * 0.7: ch = int(H * 0.7); cw = int(ch * asp)
    x = random.randint(0, W - cw); y = random.randint(int(H * 0.08), max(int(H * 0.08), H - ch - int(H * 0.05)))
    c = im.crop((x, y, x + cw, y + ch))
    c.thumbnail((480, 480))
    c = ImageEnhance.Contrast(c).enhance(1.06)
    name = f"c{i:02d}.webp"
    c.save(OUT / name, "WEBP", quality=70, method=6)
    out.append({"src": f"/assets/room-04/messageroom/cut/{name}", "w": c.width, "h": c.height, "from": f.name})
(OUT / "index.json").write_text(json.dumps(out, indent=0))
print(len(out))
