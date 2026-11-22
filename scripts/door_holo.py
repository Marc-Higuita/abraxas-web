"""Capas del reflejo holográfico de Abraxas en la puerta de vidrio (sección 01).
Toma fragmentos ya recortados de fotos de Abraxas, elimina el filo blanco de recorte,
difumina los bordes (alfa suave), baja un poco la saturación y entibia el color.
Salida: public/assets/room-04/door/holo-*.webp + holo.json (proporciones)."""
import json
from pathlib import Path
from PIL import Image, ImageFilter, ImageEnhance, ImageOps, ImageChops

ROOT = Path(__file__).resolve().parents[1] / "public/assets/room-04"
SRC = ROOT / "abraxas/fragmentos"
OUT = ROOT / "door"
OUT.mkdir(exist_ok=True)

LAYERS = {
    "cuerpo": (ROOT / "misc/abraxas-reflejo.webp", 6, 18, 520),
    "cara-roja": (SRC / "cara-roja.webp", 10, 16, 300),
    "cara-blanca": (SRC / "cara-blanca.webp", 10, 16, 300),
    "ojos": (SRC / "ojos-tira.webp", 6, 8, 300),
    "manos": (SRC / "manos.webp", 8, 12, 420),
    "satin": (SRC / "camisa-satin.webp", 10, 20, 460),
    "pelo": (SRC / "pelo-rosa.webp", 4, 6, 220),
}

meta = {}
for name, (path, erode, feather, maxw) in LAYERS.items():
    im = Image.open(path).convert("RGBA")
    k = min(1, maxw / im.width)
    im = im.resize((max(1, round(im.width * k)), max(1, round(im.height * k))), Image.LANCZOS)
    r, g, b, a = im.split()
    # quitar el filo blanco: erosionar el alfa y además apagar píxeles casi blancos del borde
    a = a.filter(ImageFilter.MinFilter(erode * 2 + 1))
    lum = ImageOps.grayscale(im.convert("RGB"))
    white = lum.point(lambda v: 255 if v > 232 else 0)
    a = ImageChops.subtract(a, white)
    # viñeta elíptica para que la presencia se disuelva hacia afuera
    vig = Image.new("L", im.size, 0)
    from PIL import ImageDraw
    d = ImageDraw.Draw(vig)
    pad = max(2, feather)
    d.ellipse([pad, pad, im.width - pad, im.height - pad], fill=255)
    vig = vig.filter(ImageFilter.GaussianBlur(feather * 1.6))
    a = ImageChops.multiply(a, vig).filter(ImageFilter.GaussianBlur(feather * 0.35))
    rgb = Image.merge("RGB", (r, g, b))
    rgb = ImageEnhance.Color(rgb).enhance(0.62)
    rgb = ImageEnhance.Contrast(rgb).enhance(0.92)
    warm = Image.new("RGB", rgb.size, (238, 214, 184))
    rgb = Image.blend(rgb, ImageChops.multiply(rgb, warm), 0.35)
    out = Image.merge("RGBA", (*rgb.split(), a))
    out.save(OUT / f"holo-{name}.webp", quality=82, method=6)
    meta[name] = {"src": f"/assets/room-04/door/holo-{name}.webp", "aspect": round(out.width / out.height, 4)}
(OUT / "holo.json").write_text(json.dumps(meta, indent=1))
print(json.dumps(meta, indent=1))
