"use client";
import { Suspense, useEffect, useMemo, useRef, useState, type MutableRefObject } from "react";
import { Canvas, useFrame, useThree, type ThreeEvent } from "@react-three/fiber";
import { useTexture } from "@react-three/drei";
import * as THREE from "three";
import archiveData from "../../data/archive.json";
import type { ArchivePhoto, TimelineEvent } from "../../types";
import { bigDate, DIM_HEX, imgUrl, propOf, type PropKind } from "./shared";

/** Separación entre hitos a lo largo del pasillo (unidades de escena). */
export const SPACING = 4.6;
const BG = "#17120e";
const INK = "#121110";
const PAPER = "#f3eee3";

interface Props {
  events: TimelineEvent[];
  /** Posición objetivo en unidades de hito (0..n-1), escrita por el scroll / arrastre. */
  target: MutableRefObject<number>;
  onPick: (i: number) => void;
  reduced: boolean;
  lite: boolean;
  active: boolean;
}

export function TimelineCanvas({ events, target, onPick, reduced, lite, active }: Props) {
  const [font, setFont] = useState<string | null>(null);
  useEffect(() => {
    let alive = true;
    const fam = getComputedStyle(document.documentElement).getPropertyValue("--font-jost").trim() || "Futura, 'Century Gothic', sans-serif";
    document.fonts.ready.then(() => alive && setFont(fam));
    return () => { alive = false; };
  }, []);
  return (
    <Canvas
      dpr={lite ? 1 : [1, 1.6]}
      frameloop={active ? "always" : "never"}
      camera={{ fov: lite ? 52 : 40, position: [0, 0.3, lite ? 7.6 : 6.4], near: 0.1, far: 60 }}
      gl={{ antialias: !lite, powerPreference: "high-performance" }}
      onCreated={({ gl, scene }) => {
        gl.setClearColor(BG);
        scene.fog = new THREE.Fog(BG, 7, lite ? 15 : 19);
      }}
    >
      <Suspense fallback={null}>
        {font && <Corridor events={events} target={target} onPick={onPick} reduced={reduced} lite={lite} font={font} />}
      </Suspense>
    </Canvas>
  );
}

/* ---------- texturas dibujadas: fechas, notas, objetos recortados ---------- */

function canvasTex(w: number, h: number, draw: (c: CanvasRenderingContext2D) => void) {
  const cv = document.createElement("canvas");
  cv.width = w; cv.height = h;
  const c = cv.getContext("2d")!;
  draw(c);
  const t = new THREE.CanvasTexture(cv);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}

function grain(c: CanvasRenderingContext2D, w: number, h: number, a = 0.06) {
  for (let i = 0; i < (w * h) / 90; i++) {
    c.fillStyle = `rgba(58,54,49,${Math.random() * a})`;
    c.fillRect(Math.random() * w, Math.random() * h, 1.5, 1.5);
  }
}

/** Fecha como letras recortadas: relleno de color, borde de papel y sombra dura. */
function dateTexture(text: string, color: string, font: string) {
  return canvasTex(1024, 320, (c) => {
    const size = text.length > 6 ? 150 : 210;
    c.font = `600 ${size}px ${font}`;
    c.textAlign = "center"; c.textBaseline = "middle";
    c.lineJoin = "round";
    c.shadowColor = "rgba(0,0,0,0.55)"; c.shadowOffsetX = 10; c.shadowOffsetY = 10;
    c.lineWidth = 26; c.strokeStyle = PAPER; c.strokeText(text, 512, 170);
    c.shadowColor = "transparent";
    c.fillStyle = color; c.fillText(text, 512, 170);
  });
}

function wrap(c: CanvasRenderingContext2D, text: string, maxW: number) {
  const words = text.split(" "); const lines: string[] = []; let cur = "";
  for (const w of words) {
    const t = cur ? `${cur} ${w}` : w;
    if (c.measureText(t).width > maxW && cur) { lines.push(cur); cur = w; } else cur = t;
  }
  if (cur) lines.push(cur);
  return lines;
}

/** Documento de papel para hitos sin fotografía: fecha, título y sello. */
function noteTexture(e: TimelineEvent, font: string) {
  return canvasTex(560, 700, (c) => {
    c.fillStyle = PAPER; c.fillRect(0, 0, 560, 700);
    c.strokeStyle = "rgba(35,64,168,0.18)"; c.lineWidth = 2;
    for (let y = 120; y < 700; y += 36) { c.beginPath(); c.moveTo(0, y); c.lineTo(560, y); c.stroke(); }
    c.strokeStyle = "rgba(217,52,31,0.35)"; c.beginPath(); c.moveTo(70, 0); c.lineTo(70, 700); c.stroke();
    grain(c, 560, 700, 0.08);
    c.fillStyle = DIM_HEX[e.dimensions[0]]; c.font = `600 34px ${font}`;
    c.fillText(e.dateLabel.toUpperCase().slice(0, 30), 92, 80);
    c.fillStyle = INK; c.font = `500 52px ${font}`;
    wrap(c, e.title, 420).slice(0, 4).forEach((l, i) => c.fillText(l, 92, 190 + i * 64));
    c.font = `400 26px Arial, sans-serif`; c.fillStyle = "#3a3631";
    wrap(c, e.description, 420).slice(0, 7).forEach((l, i) => c.fillText(l, 92, 470 + i * 34));
  });
}

function glowTexture() {
  return canvasTex(256, 256, (c) => {
    const g = c.createRadialGradient(128, 128, 0, 128, 128, 128);
    g.addColorStop(0, "rgba(242,185,15,0.9)"); g.addColorStop(0.35, "rgba(212,161,42,0.38)"); g.addColorStop(1, "rgba(212,161,42,0)");
    c.fillStyle = g; c.fillRect(0, 0, 256, 256);
  });
}

function stitchTexture() {
  return canvasTex(128, 32, (c) => {
    c.strokeStyle = "#d4a12a"; c.lineWidth = 6; c.lineCap = "round";
    c.beginPath(); c.moveTo(18, 16); c.lineTo(84, 16); c.stroke();
  });
}

/** Objetos recortados en papel de color con borde blanco: un pequeño símbolo por hito. */
function propTexture(kind: PropKind, color: string) {
  return canvasTex(512, 512, (c) => {
    const p = new Path2D();
    const details: ((c: CanvasRenderingContext2D) => void)[] = [];
    const R = (x: number, y: number, w: number, h: number) => p.rect(x, y, w, h);
    const E = (x: number, y: number, rx: number, ry: number) => { p.moveTo(x + rx, y); p.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2); };
    const line = (pts: number[][], w = 10, col = INK) => details.push((k) => {
      k.strokeStyle = col; k.lineWidth = w; k.lineCap = "round"; k.lineJoin = "round"; k.beginPath();
      pts.forEach(([x, y], i) => (i ? k.lineTo(x, y) : k.moveTo(x, y))); k.stroke();
    });
    const dot = (x: number, y: number, r: number, col = INK) => details.push((k) => { k.fillStyle = col; k.beginPath(); k.arc(x, y, r, 0, Math.PI * 2); k.fill(); });
    const casa = (x: number, y: number, s: number) => { p.moveTo(x - s, y); p.lineTo(x, y - s * 0.9); p.lineTo(x + s, y); p.lineTo(x + s * 0.8, y); p.lineTo(x + s * 0.8, y + s); p.lineTo(x - s * 0.8, y + s); p.lineTo(x - s * 0.8, y); p.closePath(); };
    switch (kind) {
      case "corazon": p.moveTo(256, 410); p.bezierCurveTo(60, 290, 90, 110, 256, 190); p.bezierCurveTo(422, 110, 452, 290, 256, 410); break;
      case "casa": casa(256, 250, 150); details.push((k) => { k.fillStyle = INK; k.fillRect(226, 320, 60, 80); }); break;
      case "casas": casa(140, 260, 80); casa(372, 260, 80); casa(256, 220, 96); break;
      case "cruz": R(226, 90, 60, 330); R(146, 170, 220, 56); break;
      case "mascara": E(256, 250, 150, 175); dot(200, 220, 26); dot(312, 220, 26); line([[190, 320], [256, 360], [322, 320]], 14); break;
      case "birrete": p.moveTo(256, 130); p.lineTo(450, 215); p.lineTo(256, 300); p.lineTo(62, 215); p.closePath(); R(166, 250, 180, 100); line([[256, 215], [410, 250], [410, 340]], 8, "#f2b90f"); break;
      case "columnas": p.moveTo(90, 180); p.lineTo(256, 90); p.lineTo(422, 180); p.closePath(); [120, 200, 280, 360].forEach((x) => R(x, 200, 34, 170)); R(90, 380, 332, 36); break;
      case "poste": R(236, 80, 40, 350); R(150, 130, 212, 26); R(170, 200, 172, 22); line([[60, 140], [150, 143]], 5); line([[362, 143], [452, 150]], 5); break;
      case "moto": E(150, 340, 70, 70); E(370, 340, 70, 70); p.moveTo(150, 340); p.lineTo(230, 230); p.lineTo(330, 230); p.lineTo(370, 340); p.lineTo(300, 300); p.lineTo(220, 300); p.closePath(); dot(150, 340, 26, PAPER); dot(370, 340, 26, PAPER); line([[300, 230], [330, 170], [370, 165]], 12); break;
      case "maleta": p.roundRect(110, 190, 292, 210, 22); line([[200, 190], [200, 140], [312, 140], [312, 190]], 16); line([[110, 280], [402, 280]], 8); break;
      case "tijeras": E(160, 350, 62, 62); E(352, 350, 62, 62); p.moveTo(190, 300); p.lineTo(380, 80); p.lineTo(400, 96); p.lineTo(240, 320); p.closePath(); p.moveTo(322, 300); p.lineTo(132, 80); p.lineTo(112, 96); p.lineTo(272, 320); p.closePath(); dot(160, 350, 30, PAPER); dot(352, 350, 30, PAPER); break;
      case "libro": R(120, 110, 272, 300); details.push((k) => { k.fillStyle = "rgba(18,17,16,0.85)"; k.fillRect(120, 110, 36, 300); }); line([[190, 190], [350, 190]], 8, PAPER); line([[190, 230], [320, 230]], 8, PAPER); break;
      case "trofeo": p.moveTo(150, 110); p.lineTo(362, 110); p.bezierCurveTo(362, 260, 300, 300, 256, 300); p.bezierCurveTo(212, 300, 150, 260, 150, 110); R(236, 300, 40, 60); R(170, 360, 172, 50); line([[150, 140], [90, 150], [110, 220], [170, 240]], 12); line([[362, 140], [422, 150], [402, 220], [342, 240]], 12); break;
      case "tarjeton": R(110, 100, 292, 330); [0, 1, 2].forEach((r) => [0, 1].forEach((col) => line([[150 + col * 130, 160 + r * 90], [240 + col * 130, 160 + r * 90], [240 + col * 130, 220 + r * 90], [150 + col * 130, 220 + r * 90], [150 + col * 130, 160 + r * 90]], 6))); line([[290, 260], [350, 300]], 12, "#d9341f"); line([[350, 260], [290, 300]], 12, "#d9341f"); break;
      case "globo": E(256, 256, 160, 160); line([[96, 256], [416, 256]], 8); details.push((k) => { k.strokeStyle = INK; k.lineWidth = 8; k.beginPath(); k.ellipse(256, 256, 70, 160, 0, 0, Math.PI * 2); k.stroke(); }); break;
      case "espejo": E(256, 256, 130, 180); details.push((k) => { const g = k.createLinearGradient(160, 120, 360, 400); g.addColorStop(0, "#e9eef3"); g.addColorStop(0.5, "#9fb2c4"); g.addColorStop(1, "#e9eef3"); k.fillStyle = g; k.beginPath(); k.ellipse(256, 256, 100, 150, 0, 0, Math.PI * 2); k.fill(); }); line([[200, 180], [230, 140]], 10, "#ffffff"); break;
      case "periodico": R(110, 110, 292, 300); line([[140, 160], [372, 160]], 22); [0, 1, 2, 3, 4].forEach((i) => { line([[140, 220 + i * 36], [245, 220 + i * 36]], 6); line([[268, 220 + i * 36], [372, 220 + i * 36]], 6); }); break;
    }
    c.lineJoin = "round";
    c.shadowColor = "rgba(0,0,0,0.5)"; c.shadowOffsetX = 12; c.shadowOffsetY = 14; c.shadowBlur = 4;
    c.lineWidth = 30; c.strokeStyle = PAPER; c.stroke(p);
    c.shadowColor = "transparent";
    c.fillStyle = color; c.fill(p);
    details.forEach((d) => d(c));
  });
}

/* ---------- escena ---------- */

interface Slot {
  hang: THREE.Group | null;
  main: THREE.Group | null;
  photoMats: THREE.MeshBasicMaterial[];
  date: THREE.MeshBasicMaterial | null;
  glow: THREE.MeshBasicMaterial | null;
  prop: THREE.Group | null;
  propMat: THREE.MeshBasicMaterial | null;
}

function Corridor({ events, target, onPick, reduced, lite, font }: Omit<Props, "active"> & { font: string }) {
  const { camera, pointer } = useThree();
  const cur = useRef(target.current);
  const slots = useRef<Slot[]>([]);
  slots.current.length = events.length;

  // texturas de fotos (una por hito como máximo dos)
  const urls = useMemo(() => {
    const u = new Set<string>();
    events.forEach((e) => e.images.slice(0, lite ? 1 : 2).forEach((im) => u.add(imgUrl(im.id))));
    return [...u];
  }, [events, lite]);
  const texList = useTexture(urls.length ? urls : ["/assets/room-04/misc/video-poster.jpg"]);
  const texMap = useMemo(() => {
    const m = new Map<string, THREE.Texture>();
    (Array.isArray(texList) ? texList : [texList]).forEach((t, i) => { t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; m.set(urls[i], t); });
    return m;
  }, [texList, urls]);

  const drawn = useMemo(() => ({
    dates: events.map((e) => dateTexture(bigDate(e), DIM_HEX[e.dimensions[0]], font)),
    notes: events.map((e) => (e.images.length ? null : noteTexture(e, font))),
    props: events.map((e) => propTexture(propOf(e.id), DIM_HEX[e.dimensions[e.dimensions.length > 1 ? 1 : 0]])),
    glow: glowTexture(),
    stitch: stitchTexture(),
  }), [events, font]);
  useEffect(() => () => {
    drawn.dates.forEach((t) => t.dispose()); drawn.notes.forEach((t) => t?.dispose()); drawn.props.forEach((t) => t.dispose());
    drawn.glow.dispose(); drawn.stitch.dispose();
  }, [drawn]);

  const total = Math.max(1, events.length - 1) * SPACING;
  useMemo(() => { drawn.stitch.wrapS = THREE.RepeatWrapping; drawn.stitch.repeat.set((total + 24) / 0.55, 1); }, [drawn, total]);

  useFrame((state, dt) => {
    const t = Math.min(Math.max(target.current, 0), Math.max(0, events.length - 1));
    cur.current = reduced ? t : THREE.MathUtils.damp(cur.current, t, 3.2, dt);
    const c = cur.current;
    const x = c * SPACING;
    const z = lite ? 7.6 : 6.4;
    camera.position.set(x + 0.15, 0.3 + (reduced ? 0 : pointer.y * 0.18), z);
    camera.lookAt(x + 0.1 + (reduced ? 0 : pointer.x * 0.35), 0.15, -1.4);
    if (!reduced) camera.rotateZ(THREE.MathUtils.clamp((t - c) * -0.025, -0.04, 0.04));
    const time = state.clock.elapsedTime;
    slots.current.forEach((s, i) => {
      if (!s) return;
      const d = Math.abs(c - i);
      const f = THREE.MathUtils.smoothstep(1 - Math.min(d, 1), 0, 1);
      if (s.main) s.main.scale.setScalar(0.86 + 0.24 * f);
      if (s.hang && !reduced) s.hang.rotation.z = Math.sin(time * 0.7 + i * 1.7) * 0.025 * (1 - f * 0.6);
      s.photoMats.forEach((m) => m.color.setScalar(0.3 + 0.7 * f));
      if (s.date) s.date.opacity = 0.16 + 0.84 * f;
      if (s.glow) s.glow.opacity = 0.9 * f;
      if (s.propMat) s.propMat.color.setScalar(0.4 + 0.6 * f);
      if (s.prop) {
        s.prop.scale.setScalar(0.75 + 0.35 * f);
        if (!reduced) { s.prop.position.y = -1.15 + Math.sin(time * 1.3 + i) * 0.06; s.prop.rotation.z = Math.sin(time * 0.9 + i * 2.1) * 0.08; }
      }
    });
  });

  const pick = (i: number) => (e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation();
    if (e.delta > 6) return;
    onPick(i);
  };

  return (
    <group>
      {/* hilo cosido del suelo, la línea del tiempo */}
      <mesh position={[total / 2, -1.95, 0.2]}>
        <planeGeometry args={[total + 24, 0.07]} />
        <meshBasicMaterial map={drawn.stitch} transparent depthWrite={false} />
      </mesh>
      {!lite && <BackWall total={total} />}

      {events.map((e, i) => {
        const x = i * SPACING;
        const zMain = [0, -0.9, -0.4][i % 3];
        const yMain = [0.25, 0.45, 0.1][i % 3];
        const side = i % 2 ? -1 : 1;
        const H = lite ? 1.6 : 1.85;
        const img0 = e.images[0] ? texMap.get(imgUrl(e.images[0].id)) : undefined;
        const img1 = !lite && e.images[1] ? texMap.get(imgUrl(e.images[1].id)) : undefined;
        const asp = (t?: THREE.Texture) => { const im = t?.image as { width?: number; height?: number } | undefined; return im?.width && im?.height ? im.width / im.height : 0.8; };
        const mainTex = img0 ?? drawn.notes[i]!;
        const W = H * (img0 ? asp(img0) : 0.8);
        const topY = 4.4;
        const slot: Slot = slots.current[i] ?? { hang: null, main: null, photoMats: [], date: null, glow: null, prop: null, propMat: null };
        slot.photoMats = [];
        slots.current[i] = slot;
        const dim = DIM_HEX[e.dimensions[0]];
        return (
          <group key={e.id} position={[x, 0, 0]}>
            {/* nudo de color sobre el hilo */}
            <mesh position={[0, -1.95, 0.25]}>
              <circleGeometry args={[0.09, 20]} />
              <meshBasicMaterial color={dim} />
            </mesh>
            {/* fecha recortada, al fondo */}
            <mesh position={[-1.05 * side, 1.95, -2.6]}>
              <planeGeometry args={[3.4, 1.06]} />
              <meshBasicMaterial ref={(m) => { slot.date = m; }} map={drawn.dates[i]} transparent depthWrite={false} />
            </mesh>
            {/* resplandor del hito activo */}
            <mesh position={[0, yMain, zMain - 0.4]}>
              <planeGeometry args={[W * 2.6, H * 2.2]} />
              <meshBasicMaterial ref={(m) => { slot.glow = m; }} map={drawn.glow} transparent opacity={0} depthWrite={false} blending={THREE.AdditiveBlending} />
            </mesh>
            {/* fotografía o documento colgado de un hilo */}
            <group ref={(g) => { slot.hang = g; }} position={[0, topY, zMain]}>
              <mesh position={[0, (yMain + H / 2 - topY) / 2, -0.01]}>
                <planeGeometry args={[0.012, topY - (yMain + H / 2)]} />
                <meshBasicMaterial color="#c9b79a" />
              </mesh>
              <group ref={(g) => { slot.main = g; }} position={[0, yMain - topY, 0]}>
                <mesh position={[0, 0, -0.006]}>
                  <planeGeometry args={[W + 0.09, H + 0.09]} />
                  <meshBasicMaterial ref={(m) => { if (m) slot.photoMats.push(m); }} color={PAPER} />
                </mesh>
                <mesh onClick={pick(i)}>
                  <planeGeometry args={[W, H]} />
                  <meshBasicMaterial ref={(m) => { if (m) slot.photoMats.push(m); }} map={mainTex} toneMapped={false} />
                </mesh>
                {/* pinza */}
                <mesh position={[0, H / 2 + 0.02, 0.01]}>
                  <planeGeometry args={[0.13, 0.26]} />
                  <meshBasicMaterial color={dim} />
                </mesh>
              </group>
            </group>
            {/* segundo documento, más atrás y girado */}
            {img1 && (
              <mesh position={[1.45 * side, -0.7, zMain - 1.4]} rotation={[0, -0.18 * side, 0.07 * side]} onClick={pick(i)}>
                <planeGeometry args={[H * 0.62 * asp(img1), H * 0.62]} />
                <meshBasicMaterial ref={(m) => { if (m) slot.photoMats.push(m); }} map={img1} toneMapped={false} />
              </mesh>
            )}
            {/* objeto recortado */}
            <group ref={(g) => { slot.prop = g; }} position={[-1.35 * side, -1.15, 0.8]}>
              <mesh>
                <planeGeometry args={[0.95, 0.95]} />
                <meshBasicMaterial ref={(m) => { slot.propMat = m; }} map={drawn.props[i]} transparent depthWrite={false} />
              </mesh>
            </group>
          </group>
        );
      })}
    </group>
  );
}

/** Muro del fondo: fragmentos de la casa, apagados, que dan profundidad al pasillo. */
function BackWall({ total }: { total: number }) {
  const picks = useMemo(() => {
    const room = (archiveData as ArchivePhoto[]).filter((a) => (a as ArchivePhoto & { room?: boolean }).room);
    const out: { url: string; x: number; y: number; z: number; r: number; s: number }[] = [];
    const n = Math.min(46, Math.round(total / 2.2) + 10);
    for (let k = 0; k < n; k++) {
      const a = room[(k * 37) % room.length];
      out.push({ url: `/assets/room-04/archive/${a.id}.jpg`, x: -8 + ((k * 7.3) % (total + 16)), y: -1 + ((k * 2.9) % 6.4), z: -5.6 + (k % 4) * 0.12, r: ((k * 13) % 11 - 5) * 0.02, s: 1.1 + ((k * 5) % 7) * 0.12 });
    }
    return out;
  }, [total]);
  const tex = useTexture(picks.map((p) => p.url));
  return (
    <group>
      <mesh position={[total / 2, 1.5, -6]}>
        <planeGeometry args={[total + 40, 16]} />
        <meshBasicMaterial color="#241c16" />
      </mesh>
      {picks.map((p, k) => (
        <mesh key={k} position={[p.x, p.y, p.z]} rotation={[0, 0, p.r]}>
          <planeGeometry args={[p.s * 0.75, p.s]} />
          <meshBasicMaterial map={tex[k]} color="#5e544a" toneMapped={false} />
        </mesh>
      ))}
    </group>
  );
}
