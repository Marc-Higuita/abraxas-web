"""Versiones livianas (320 px) de las fotos de la habitación para el primer montaje rápido.
La habitación se arma con estas y las fotos completas reemplazan cada textura al llegar."""
from pathlib import Path
from PIL import Image
root = Path(__file__).resolve().parents[1] / "public/assets/room-04"
src, out = root / "photos", root / "photos-lo"
out.mkdir(exist_ok=True)
for f in sorted(src.glob("*.jpg")):
    im = Image.open(f).convert("RGB"); im.thumbnail((320, 320), Image.LANCZOS)
    im.save(out / f.name, quality=62, optimize=True, progressive=False)
print(len(list(out.glob("*.jpg"))))
