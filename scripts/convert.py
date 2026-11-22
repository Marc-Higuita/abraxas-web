"""Convert raw photos (HEIC/JPG) to web derivatives and extract EXIF metadata.
Usage: python3 -I convert.py <raw_dir> <out_dir>
"""
import sys, os, json, hashlib
from concurrent.futures import ProcessPoolExecutor
from PIL import Image, ImageOps
import pillow_heif

pillow_heif.register_heif_opener()

RAW, OUT = sys.argv[1], sys.argv[2]
WEB, THUMB = os.path.join(OUT, "web"), os.path.join(OUT, "thumb")
os.makedirs(WEB, exist_ok=True)
os.makedirs(THUMB, exist_ok=True)


def ratio(v):
    try:
        return float(v)
    except Exception:
        try:
            return v[0] / v[1]
        except Exception:
            return None


def ahash(im):
    g = im.convert("L").resize((16, 16), Image.LANCZOS)
    px = list(g.getdata())
    avg = sum(px) / len(px)
    bits = "".join("1" if p > avg else "0" for p in px)
    return hex(int(bits, 2))[2:].zfill(64)


def process(path):
    rel = os.path.relpath(path, RAW)
    part = rel.split(os.sep)[0]
    base = os.path.splitext(os.path.basename(path))[0]
    pid = f"{part}-{base}".replace("(", "").replace(")", "").replace(" ", "_").lower()
    try:
        im = Image.open(path)
        exif = im.getexif()
        ifd = exif.get_ifd(0x8769)
        gps = exif.get_ifd(0x8825)
        dt = ifd.get(36867) or exif.get(306)
        heading = ratio(gps.get(17)) if gps else None
        focal35 = ifd.get(41989)
        im = ImageOps.exif_transpose(im).convert("RGB")
        w, h = im.size
        web = im.copy()
        web.thumbnail((1600, 1600), Image.LANCZOS)
        web.save(os.path.join(WEB, pid + ".jpg"), "JPEG", quality=80, optimize=True, progressive=True)
        th = im.copy()
        th.thumbnail((360, 360), Image.LANCZOS)
        th.save(os.path.join(THUMB, pid + ".jpg"), "JPEG", quality=78)
        small = im.resize((48, 48), Image.BILINEAR)
        avg = tuple(int(c) for c in small.resize((1, 1), Image.BILINEAR).getpixel((0, 0)))
        return dict(id=pid, src=rel, part=part, file=os.path.basename(path), datetime=dt,
                    heading=heading, focal35=focal35, w=w, h=h,
                    orientation="landscape" if w > h * 1.05 else ("portrait" if h > w * 1.05 else "square"),
                    avg="#%02x%02x%02x" % avg, ahash=ahash(im))
    except Exception as e:
        return dict(id=pid, src=rel, part=part, file=os.path.basename(path), error=str(e))


if __name__ == "__main__":
    files = []
    for root, _, names in os.walk(RAW):
        for n in names:
            if n.lower().endswith((".heic", ".jpg", ".jpeg", ".png")):
                files.append(os.path.join(root, n))
    files.sort()
    with ProcessPoolExecutor(2) as ex:
        res = list(ex.map(process, files, chunksize=4))
    with open(os.path.join(OUT, "photos_raw.json"), "w") as f:
        json.dump(res, f, ensure_ascii=False, indent=1)
    print(len(res), "processed;", sum(1 for r in res if "error" in r), "errors")
