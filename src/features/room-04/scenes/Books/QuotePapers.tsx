"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { useFrame, useThree, type ThreeEvent } from "@react-three/fiber";
import * as THREE from "three";
import { useRoom } from "../../store";

/**
 * Frases de los libros como fragmentos de papel suspendidos en 3D.
 * - Biblioteca: pocas frases, DETRÁS de los libros y a distintas profundidades.
 * - Libro abierto: frases distintas, en columnas a los lados del pliego, a distintas profundidades.
 * El layout se calcula en píxeles de pantalla (para que nada quede cortado) y se proyecta a la
 * profundidad de cada papel en cada fotograma. El texto se rasteriza completo, sin recortes.
 */

export interface FloatQuote { key: string; book: number; text: string; page: number; title: string }

/** Papeles reales recortados (cutouts/papeles) y su margen interior en fracción del ancho. */
const PAPERS = [
  { src: "tira-rasgada-01.png", pad: [0.15, 0.1, 0.15, 0.09] },
  { src: "papel-rayado-01.png", pad: [0.12, 0.09, 0.11, 0.12] },
  { src: "papel-cuadriculado-01.png", pad: [0.1, 0.08, 0.1, 0.08] },
  { src: "nota-cinta-01.png", pad: [0.2, 0.12, 0.12, 0.12] },
  { src: "papel-acuarela-01.png", pad: [0.15, 0.12, 0.13, 0.12] },
  { src: "papel-rasgado-01.png", pad: [0.14, 0.13, 0.14, 0.14] },
] as const;

const imgCache = new Map<string, Promise<HTMLImageElement>>();
function loadImg(src: string) {
  let p = imgCache.get(src);
  if (!p) {
    p = new Promise((res, rej) => { const im = new Image(); im.onload = () => res(im); im.onerror = rej; im.src = src; });
    imgCache.set(src, p);
  }
  return p;
}

const TEX_W = 720; // ancho de la textura en px (el texto se dibuja a ~2.4x de su tamaño en pantalla)
const FONT = 33;
const LINE = 1.34;

function wrap(ctx: CanvasRenderingContext2D, text: string, max: number) {
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let cur = "";
  for (const w of words) {
    const t = cur ? `${cur} ${w}` : w;
    if (ctx.measureText(t).width > max && cur) { lines.push(cur); cur = w; } else cur = t;
  }
  if (cur) lines.push(cur);
  return lines;
}

/** Dibuja papel + frase + fuente en un canvas; devuelve textura y proporción alto/ancho. */
async function paperTexture(q: FloatQuote, paperIdx: number) {
  const pp = PAPERS[paperIdx % PAPERS.length];
  const img = await loadImg(`/assets/room-04/cutouts/papeles/${pp.src}`);
  const m = 22; // margen para la sombra
  const [pt, pr, pb, pl] = pp.pad.map((v) => v * TEX_W);
  const meas = document.createElement("canvas").getContext("2d")!;
  meas.font = `${FONT}px Arial, Helvetica, sans-serif`;
  const lines = wrap(meas, `«${q.text}»`, TEX_W - pl - pr);
  const srcH = 30;
  const textH = lines.length * FONT * LINE + 14 + srcH;
  const H = Math.round(Math.max(textH + pt + pb, TEX_W * 0.3));
  const c = document.createElement("canvas");
  c.width = TEX_W + m * 2;
  c.height = H + m * 2;
  const g = c.getContext("2d")!;
  g.save();
  g.shadowColor = "rgba(0,0,0,0.5)";
  g.shadowBlur = 18;
  g.shadowOffsetY = 8;
  g.drawImage(img, m, m, TEX_W, H);
  g.restore();
  g.fillStyle = "#2a2621";
  g.font = `${FONT}px Arial, Helvetica, sans-serif`;
  g.textBaseline = "top";
  let y = m + pt + (H - pt - pb - textH) / 2;
  for (const l of lines) { g.fillText(l, m + pl, y); y += FONT * LINE; }
  g.fillStyle = "#6b5a3c";
  g.font = `600 ${Math.round(FONT * 0.62)}px Arial, Helvetica, sans-serif`;
  g.fillText(`${q.title.toUpperCase()} · P. ${q.page}`, m + pl, y + 14);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  return { tex, ratio: c.height / c.width };
}

/** Slot en pantalla: centro (px desde el centro del lienzo), ancho en px y profundidad z de mundo. */
interface Slot { cx: number; cy: number; w: number; z: number; rot: number }

const rotOf = (i: number) => ((((i * 37) % 13) - 6) * 0.6 * Math.PI) / 180;

interface Props {
  library: FloatQuote[];
  open: FloatQuote[];
  selected: number | null;
  narrow: boolean;
  focusKey: string | null;
  onPick: (q: FloatQuote, inBook: boolean) => void;
  /** Fracción del ancho de pantalla que ocupa el pliego abierto (para las columnas laterales). */
  bookFrac: number;
}

export function QuotePapers({ library, open, selected, narrow, focusKey, onPick, bookFrac }: Props) {
  const { size } = useThree();
  const [texs, setTexs] = useState<Record<string, { tex: THREE.CanvasTexture; ratio: number }>>({});
  const all = useMemo(() => [...library, ...open], [library, open]);

  useEffect(() => {
    let alive = true;
    all.forEach((q, i) => {
      if (texs[q.key]) return;
      paperTexture(q, i).then((t) => { if (alive) setTexs((o) => (o[q.key] ? o : { ...o, [q.key]: t })); }).catch(() => {});
    });
    return () => { alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [all]);
  const texRef = useRef(texs);
  texRef.current = texs;
  useEffect(() => () => Object.values(texRef.current).forEach((t) => t.tex.dispose()), []);

  const openList = useMemo(() => (selected === null ? [] : open.filter((q) => q.book === selected)), [open, selected]);

  // layout en px: biblioteca detrás de los libros; libro abierto en columnas que caben en pantalla
  const slots = useMemo(() => {
    const W = size.width, H = size.height;
    const out: Record<string, Slot> = {};
    const fit = (cx: number, cy: number, w: number, h: number) => {
      const mx = 14, top = narrow ? 70 : 76, bottom = 64;
      const x = Math.min(W / 2 - mx - w / 2, Math.max(-W / 2 + mx + w / 2, cx));
      const y = Math.min(H / 2 - top - h / 2, Math.max(-H / 2 + bottom + h / 2, cy));
      return { x, y };
    };
    // biblioteca (coordenadas normalizadas: x ∈ [-1,1] a la derecha, y ∈ [-1,1] hacia arriba)
    const lib = narrow
      ? [{ nx: 0, ny: -0.58, z: -1.2 }]
      : [
          { nx: 0.31, ny: 0.64, z: -1.6 },
          { nx: 0.74, ny: 0.34, z: -0.9 },
          { nx: 0.36, ny: -0.6, z: -1.3 },
          { nx: -0.34, ny: -0.62, z: -1.8 },
          { nx: -0.76, ny: -0.2, z: -1.0 },
        ];
    const libW = narrow ? Math.min(300, W * 0.78) : Math.min(250, W * 0.2);
    library.slice(0, lib.length).forEach((q, i) => {
      const s = lib[i];
      const h = libW * (texs[q.key]?.ratio ?? 0.5);
      const p = fit((s.nx * W) / 2, (s.ny * H) / 2, libW, h);
      out[q.key] = { cx: p.x, cy: p.y, w: libW, z: s.z, rot: rotOf(i) };
    });
    // libro abierto: dos columnas a los lados del pliego
    if (!narrow && openList.length) {
      const side = (W * (1 - bookFrac)) / 2;
      const colW = Math.min(300, side - 36);
      if (colW >= 170) {
        const cols: FloatQuote[][] = [[], []];
        const used = [0, 0];
        const avail = H - 76 - 64 - 20;
        openList.forEach((q, i) => {
          const h = colW * (texs[q.key]?.ratio ?? 0.5) + 14;
          const c = used[0] <= used[1] ? 0 : 1;
          const alt = 1 - c;
          if (used[c] + h <= avail) { cols[c].push(q); used[c] += h; }
          else if (used[alt] + h <= avail) { cols[alt].push(q); used[alt] += h; }
          void i;
        });
        cols.forEach((list, c) => {
          const cx = (c === 0 ? -1 : 1) * (W / 2 - side / 2);
          let y = used[c] / 2;
          list.forEach((q, j) => {
            const h = colW * (texs[q.key]?.ratio ?? 0.5);
            const cy = y - h / 2;
            y -= h + 14;
            out[q.key] = { cx: cx + (j % 2 ? 10 : -10) * (c ? -1 : 1), cy, w: colW, z: [0.55, 0.15, 0.4, 0.05][j % 4], rot: rotOf(j + c * 3) * 0.7 };
          });
        });
      }
    }
    return out;
  }, [size.width, size.height, narrow, library, openList, texs, bookFrac]);

  const visible = selected === null ? library.filter((q) => slots[q.key]) : openList.filter((q) => slots[q.key]);

  return (
    <>
      {visible.map((q, i) =>
        texs[q.key] ? (
          <Paper
            key={q.key}
            q={q}
            i={i}
            tex={texs[q.key].tex}
            ratio={texs[q.key].ratio}
            slot={slots[q.key]}
            focused={focusKey === q.key}
            dim={focusKey !== null && focusKey !== q.key}
            onPick={() => onPick(q, selected !== null)}
          />
        ) : null,
      )}
    </>
  );
}

function Paper({ q, i, tex, ratio, slot, focused, dim, onPick }: {
  q: FloatQuote; i: number; tex: THREE.Texture; ratio: number; slot: Slot; focused: boolean; dim: boolean; onPick: () => void;
}) {
  const mesh = useRef<THREE.Mesh>(null);
  const mat = useRef<THREE.MeshBasicMaterial>(null);
  const hover = useRef(0);
  const [over, setOver] = useState(false);
  const reduced = useRoom((s) => s.reducedMotion);
  const st = useRef({ x: 0, y: 0, z: slot.z, s: 0, o: 0, init: false });
  const tmp = useMemo(() => new THREE.Vector3(), []);

  useFrame(({ camera, size, clock }, dt) => {
    const m = mesh.current;
    if (!m) return;
    const cam = camera as THREE.PerspectiveCamera;
    const tan = Math.tan(THREE.MathUtils.degToRad(cam.fov / 2));
    hover.current += ((over ? 1 : 0) - hover.current) * Math.min(1, dt * 8);
    let z: number, pxW: number, cx: number, cy: number;
    if (focused) {
      // se acerca al centro de la pantalla para leerla completa
      pxW = Math.min(560, size.width * 0.82);
      cx = 0; cy = 0;
      z = cam.position.z - 2.2;
    } else {
      pxW = slot.w * (1 + hover.current * 0.04);
      cx = slot.cx; cy = slot.cy;
      z = slot.z;
    }
    const d = Math.max(0.5, cam.position.z - z);
    const worldPerPx = (2 * d * tan) / size.height;
    const t = clock.elapsedTime;
    const bob = reduced || focused ? 0 : Math.sin(t * 0.6 + i * 1.7) * 5;
    const tx = cam.position.x + cx * worldPerPx;
    const ty = cam.position.y + (cy + bob) * worldPerPx;
    const k = reduced ? 1 : 1 - Math.exp(-dt * 5);
    const s = st.current;
    if (!s.init) { s.x = tx; s.y = ty - 40 * worldPerPx; s.z = z; s.init = true; }
    s.x += (tx - s.x) * k; s.y += (ty - s.y) * k; s.z += (z - s.z) * k;
    const targetS = pxW * worldPerPx;
    s.s += (targetS - s.s) * k;
    s.o += ((dim ? 0.22 : 1) - s.o) * Math.min(1, dt * 4);
    m.position.set(s.x, s.y, s.z);
    m.scale.set(s.s, s.s * ratio, 1);
    // leve giro hacia el centro y vaivén; enfocada, de frente
    const yaw = focused ? 0 : (-cx / size.width) * 0.35 + (reduced ? 0 : Math.sin(t * 0.4 + i) * 0.03);
    m.rotation.set(0, yaw, focused ? 0 : slot.rot);
    // los papeles lejanos se oscurecen un poco (profundidad)
    tmp.set(1, 1, 1).multiplyScalar(focused ? 1 : THREE.MathUtils.clamp(1 + slot.z * 0.12, 0.72, 1));
    if (mat.current) { mat.current.color.setRGB(tmp.x, tmp.y, tmp.z); mat.current.opacity = s.o; }
    m.renderOrder = focused ? 20 : 0;
  });

  const click = (e: ThreeEvent<MouseEvent>) => { e.stopPropagation(); onPick(); };
  return (
    <mesh
      ref={mesh}
      onClick={click}
      onPointerOver={(e) => { e.stopPropagation(); setOver(true); document.body.style.cursor = "pointer"; }}
      onPointerOut={() => { setOver(false); document.body.style.cursor = ""; }}
      userData={{ quote: q.key }}
    >
      <planeGeometry args={[1, 1]} />
      <meshBasicMaterial ref={mat} map={tex} transparent toneMapped={false} depthWrite={false} depthTest={!focused} />
    </mesh>
  );
}
