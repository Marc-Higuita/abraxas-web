"""Endereza las portadas de los Guinness World Records que aparecen en nuestras fotos.
Uso: python3 -I guinness_covers.py <foto_sosteniendo_2014_2006> <joiner_collage> <out_dir>
"""
import sys, cv2, numpy as np
HOLD, JOIN, OUT = sys.argv[1:4]
W, H = 600, 780
def warp(img, pts, name, sharpen=False):
    src = np.float32(pts); dst = np.float32([[0, 0], [W, 0], [W, H], [0, H]])
    M = cv2.getPerspectiveTransform(src, dst)
    out = cv2.warpPerspective(img, M, (W, H), flags=cv2.INTER_CUBIC, borderMode=cv2.BORDER_REPLICATE)
    if sharpen:
        blur = cv2.GaussianBlur(out, (0, 0), 3); out = cv2.addWeighted(out, 1.6, blur, -0.6, 0)
    cv2.imwrite(f"{OUT}/{name}.webp", out, [cv2.IMWRITE_WEBP_QUALITY, 86])
h = cv2.imread(HOLD); j = cv2.imread(JOIN)
warp(h, [[-8, 104], [172, 48], [280, 325], [58, 410]], "gwr-2014", True)
warp(h, [[552, 137], [765, 137], [707, 417], [482, 397]], "gwr-2006", True)
warp(j, [[203, 72], [335, 75], [333, 228], [193, 228]], "gwr-2016", True)
print("ok")
