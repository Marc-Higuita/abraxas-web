"use client";
import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { Canvas, useFrame, useLoader, useThree, type ThreeEvent } from "@react-three/fiber";
import { Html } from "@react-three/drei";
import * as THREE from "three";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import { useRoom } from "../../store";
import { sound } from "@/lib/audio/useSound";
import { PORTRAIT_FACTS, factFicha, type PortraitFact } from "./facts";
import s from "./abraxas.module.css";

/**
 * 04 · Abraxas, por capas: una ESCULTURA FOTOGRÁFICA.
 * Fragmentos recortados a mano de fotografías de Abraxas de distintos momentos (rostros, ojos, boca,
 * pelo, camisas, manos, el libro, el espejo) se ensamblan en planos de profundidad distintos.
 * El cursor separa las capas y deja ver las interiores; en cuatro zonas (rostro, torso, el espejo
 * y el libro) un efecto Droste muestra la foto dentro de sí misma, hacia adentro, al acercarse.
 * Las miniaturas del archivo siguen cosidas.
 */

const A = "/assets/room-04";
const FR = `${A}/abraxas/fragmentos`;
const STRIP = `${A}/cutouts/papeles/tira-rasgada-01.png`;
const TAPE = `${A}/cutouts/papeles/cinta-rosa-01.png`;

/** Caja de la figura (unidades de escena): las miniaturas cosen sus hilos a puntos dentro de ella. */
const W = 3.6;
const H = 5.0;

interface Frag {
  id: string;
  /** centro (x, y), ancho en unidades, profundidad z, giro (rad), curvatura del papel */
  x: number; y: number; w: number; z: number; rot: number; bend: number;
  /** fragmento de una capa interior (se revela al separar las capas) */
  inner?: boolean;
  alt: string;
}

/** Proporciones alto/ancho de cada recorte (de fragmentos.json). */
const RATIO: Record<string, number> = {
  "pelo-rosa": 53 / 136, "cara-roja": 236 / 208, "ojos-tira": 66 / 233, "boca-tira": 72 / 144, "cara-blanca": 256 / 200,
  "cara-risa": 112 / 112, "torso-tigre": 222 / 314, "blusa-serpiente": 412 / 372, "camisa-satin": 455 / 575, manos: 162 / 459,
  "brazo-baile": 244 / 125, "libro-manos": 273 / 482, "espejo-baile": 534 / 352, "risa-hojas": 760 / 578,
  "cara-gafas": 144 / 136, "mano-mesa": 130 / 135, "cara-arbol": 530 / 530, "camisa-bronce": 760 / 570, "papa-noel": 689 / 760,
  "cara-taller": 610 / 590, "camisa-flores": 760 / 720, "figura-guinness": 600 / 240, "cartel-guinness": 760 / 349,
  "figura-entrevista": 670 / 290, "figura-pasillo": 760 / 314,
};

// De atrás hacia adelante. La figura: tres rostros de distintos años, el cuerpo de tres camisas, manos y libro.
const FRAGS: Frag[] = [
  // fondo: Abraxas de cuerpo entero en otros momentos (pasillo, entrevista, el libro Guinness) y el Papá Noel del patio
  { id: "figura-pasillo", x: -0.2, y: 0.45, w: 0.95, z: -1.5, rot: 0.03, bend: 0.05, inner: true, alt: "Abraxas de pie en el pasillo de la casa" },
  { id: "cartel-guinness", x: -1.6, y: 0.35, w: 1.12, z: -1.32, rot: -0.07, bend: 0.06, inner: true, alt: "El libro de collage Guinness de 1997" },
  { id: "figura-entrevista", x: 1.6, y: 0.2, w: 1.02, z: -1.22, rot: 0.06, bend: 0.06, inner: true, alt: "Abraxas durante una entrevista, con blusa amarilla" },
  { id: "figura-guinness", x: 1.3, y: -1.62, w: 0.74, z: -1.02, rot: -0.05, bend: 0.05, inner: true, alt: "Abraxas junto al libro Guinness" },
  { id: "papa-noel", x: -1.28, y: -1.78, w: 1.18, z: -0.72, rot: 0.07, bend: 0.07, inner: true, alt: "El Papá Noel del patio de la casa" },
  { id: "cara-taller", x: 0.98, y: 1.05, w: 1.02, z: -0.44, rot: 0.05, bend: 0.09, inner: true, alt: "Rostro de Abraxas en el taller, con el pelo rojo" },
  { id: "espejo-baile", x: 1.2, y: 0.85, w: 1.7, z: -0.95, rot: 0.06, bend: 0.06, inner: true, alt: "Abraxas bailando frente a los espejos de la casa" },
  { id: "risa-hojas", x: -1.3, y: -0.2, w: 1.25, z: -0.8, rot: -0.09, bend: 0.08, inner: true, alt: "Abraxas riendo entre hojas" },
  { id: "cara-blanca", x: -0.62, y: 1.48, w: 1.2, z: -0.55, rot: -0.07, bend: 0.1, inner: true, alt: "Rostro de Abraxas con el pelo blanco" },
  { id: "cara-risa", x: 0.66, y: 1.62, w: 0.82, z: -0.32, rot: 0.08, bend: 0.08, inner: true, alt: "Abraxas sonriendo, con el pelo rosado" },
  { id: "camisa-flores", x: -0.98, y: -1.42, w: 1.38, z: -0.26, rot: 0.06, bend: 0.06, alt: "Camisa de flores naranjas" },
  { id: "camisa-satin", x: 0.55, y: -1.1, w: 1.75, z: -0.12, rot: -0.04, bend: 0.06, alt: "Camisa de satín café" },
  { id: "camisa-bronce", x: 1.12, y: -0.92, w: 1.12, z: -0.04, rot: -0.07, bend: 0.06, alt: "Camisa de brillo bronce" },
  { id: "blusa-serpiente", x: -0.62, y: -0.66, w: 1.45, z: 0.04, rot: 0.08, bend: 0.07, alt: "Blusa estampada de serpiente" },
  { id: "cara-arbol", x: 0.08, y: 0.5, w: 0.95, z: 0.1, rot: 0.04, bend: 0.06, alt: "Cuello de la camisa bronce" },
  { id: "torso-tigre", x: 0.05, y: -0.04, w: 1.9, z: 0.18, rot: -0.03, bend: 0.05, alt: "Camisa de tigre" },
  { id: "pelo-rosa", x: 0.02, y: 2.18, w: 1.12, z: 0.36, rot: -0.05, bend: 0.12, alt: "Pelo rosado" },
  { id: "cara-roja", x: 0, y: 1.36, w: 1.36, z: 0.46, rot: 0.01, bend: 0.1, alt: "Rostro de Abraxas con el pelo rojo" },
  { id: "boca-tira", x: -0.02, y: 0.96, w: 0.62, z: 0.64, rot: 0.04, bend: 0.04, alt: "Boca de Abraxas hablando" },
  { id: "ojos-tira", x: 0.08, y: 1.43, w: 1.25, z: 0.72, rot: -0.05, bend: 0.05, alt: "Ojos de Abraxas" },
  { id: "brazo-baile", x: -1.48, y: -0.32, w: 0.72, z: 0.56, rot: 0.36, bend: 0.06, alt: "Brazo extendido" },
  { id: "libro-manos", x: 0.1, y: -1.86, w: 1.8, z: 0.6, rot: -0.03, bend: 0.06, alt: "Manos con el libro «El derecho: realidad, ficción o estafa»" },
  { id: "manos", x: 0.18, y: -0.58, w: 1.7, z: 0.78, rot: 0.02, bend: 0.05, alt: "Manos entrelazadas" },
  { id: "cara-gafas", x: -1.1, y: 1.9, w: 0.62, z: 0.86, rot: -0.12, bend: 0.04, alt: "Abraxas con gafas en su escritorio" },
  { id: "mano-mesa", x: 1.3, y: -2.05, w: 0.72, z: 0.92, rot: 0.1, bend: 0.04, alt: "La mano de Abraxas sobre la mesa" },
];

interface Props {
  active: boolean;
  narrow: boolean;
  touch: boolean;
  /** Progreso de entrada de la sección (0–1), viene del scroll. */
  enter: React.RefObject<number>;
}

export function PortraitCanvas({ active, narrow, touch, enter }: Props) {
  const low = useRoom((st) => st.lowPower);
  return (
    <Canvas
      dpr={low ? 1 : [1, 1.75]}
      frameloop={active ? "always" : "never"}
      camera={{ fov: 35, position: [0, 0, 12] }}
      gl={{ antialias: !low, alpha: true }}
      onCreated={({ gl }) => { gl.setClearColor(0x000000, 0); gl.toneMapping = THREE.ACESFilmicToneMapping; }}
    >
      <Suspense fallback={null}>
        <Scene narrow={narrow} touch={touch} active={active} enter={enter} />
      </Suspense>
    </Canvas>
  );
}

/* --------------------------------------------------------------------------------------------- */

const hash = (n: number) => {
  const x = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
};
const clamp01 = (x: number) => Math.min(1, Math.max(0, x));
const easeOut = (x: number) => 1 - Math.pow(1 - x, 3);

function useSrgb(url: string) {
  const tex = useLoader(THREE.TextureLoader, url);
  useEffect(() => {
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.anisotropy = 4;
    tex.needsUpdate = true;
  }, [tex]);
  return tex;
}

/** Puntero compartido (coordenadas de la figura en unidades de escena). */
interface PointerState {
  p: THREE.Vector2; // suavizado
  target: THREE.Vector2;
  hover: number;
  hoverTarget: number;
  lastInput: number;
}

/** Entorno de habitación (sin descargas) para los reflejos del vidrio y del metal. */
function RoomEnv() {
  const { gl, scene } = useThree();
  useEffect(() => {
    const pm = new THREE.PMREMGenerator(gl);
    const env = pm.fromScene(new RoomEnvironment(), 0.04).texture;
    scene.environment = env;
    return () => { scene.environment = null; env.dispose(); pm.dispose(); };
  }, [gl, scene]);
  return null;
}

function Scene({ narrow, touch, active, enter }: { narrow: boolean; touch: boolean; active: boolean; enter: React.RefObject<number> }) {
  const low = useRoom((st) => st.lowPower);
  const reduced = useRoom((st) => st.reducedMotion);
  const openFicha = useRoom((st) => st.openFicha);
  const group = useRef<THREE.Group>(null);
  const ptr = useRef<PointerState>({ p: new THREE.Vector2(0, 1), target: new THREE.Vector2(0, 1), hover: 0, hoverTarget: 0, lastInput: -10 });
  /** Armado: sube con el scroll de entrada (y con el tiempo, para no quedar a medias). */
  const build = useRef(reduced ? 1 : 0);
  const clockBuild = useRef(0);
  const { camera, size } = useThree();
  const sfx = useRef({ built: false });
  const frags = useMemo(() => (low ? FRAGS.filter((f) => !f.inner || f.id === "cara-blanca" || f.id === "cara-taller") : narrow ? FRAGS.filter((f) => !["risa-hojas", "figura-guinness", "papa-noel"].includes(f.id)) : FRAGS), [low, narrow]);

  // Encuadre: en anchas cabe la figura con las miniaturas; en angostas, solo la figura.
  useEffect(() => {
    const cam = camera as THREE.PerspectiveCamera;
    const aspect = size.width / Math.max(1, size.height);
    const t = Math.tan(THREE.MathUtils.degToRad(cam.fov / 2));
    const needW = narrow ? W + 0.6 : 9.6;
    const needH = narrow ? H + 0.9 : 6.9;
    cam.position.z = Math.max(needH / 2 / t, needW / 2 / (t * aspect));
    cam.updateProjectionMatrix();
  }, [camera, size, narrow]);

  useFrame((state, dt) => {
    const d = Math.min(dt, 0.05);
    const p = ptr.current;
    if (active) clockBuild.current = Math.min(1, clockBuild.current + d / 3.2);
    const target = reduced ? 1 : Math.max(clamp01((enter.current ?? 0) * 1.15), clockBuild.current * 0.999);
    build.current += (target - build.current) * (reduced ? 1 : 1 - Math.exp(-d * 4));
    if (active && !sfx.current.built && build.current > 0.12) { sfx.current.built = true; sound.play("collage-ensambla"); }
    const t = state.clock.elapsedTime;
    // en táctil, sin interacción reciente, el puntero vaga solo en un bucle lento
    if (touch && !reduced && t - p.lastInput > 3.5 && build.current > 0.95) {
      p.target.set(Math.sin(t * 0.31) * 1.1, 0.4 + Math.sin(t * 0.23 + 1.2) * 1.4);
      p.hoverTarget = 0.8;
    }
    const k = 1 - Math.exp(-d * 7);
    p.p.lerp(p.target, k);
    p.hover += (p.hoverTarget - p.hover) * (1 - Math.exp(-d * 4));
    // una "apertura" de capas = un sonido (el gestor evita repetirlo seguido)
    if (group.current) {
      const g = group.current;
      const tx = reduced ? 0 : touch ? Math.sin(t * 0.2) * 0.1 : state.pointer.x * 0.28;
      const ty = reduced ? 0 : touch ? Math.sin(t * 0.17) * 0.05 : -state.pointer.y * 0.14;
      g.rotation.y += (tx - g.rotation.y) * k * 0.5;
      g.rotation.x += (ty - g.rotation.x) * k * 0.5;
    }
  });

  const onMove = (e: ThreeEvent<PointerEvent>) => {
    if (!group.current) return;
    const local = group.current.worldToLocal(e.point.clone());
    ptr.current.target.set(local.x, local.y);
    ptr.current.lastInput = performance.now() / 1000;
  };

  return (
    <>
      <RoomEnv />
      <ambientLight intensity={0.9} />
      <directionalLight position={[2.5, 4, 6]} intensity={1.6} color="#fff4e2" />
      <directionalLight position={[-4, -1, 3]} intensity={0.5} color="#d4a12a" />
      <group ref={group}>
        {frags.map((f, i) => (
          <Fragment key={f.id} f={f} i={i} n={frags.length} ptr={ptr} build={build} reduced={reduced} shadows={!low} droste={low || narrow ? 4 : 7} />
        ))}
        <Strips ptr={ptr} build={build} low={low} />
        {!narrow && PORTRAIT_FACTS.map((f, i) => <Fact key={f.id} fact={f} i={i} build={build} reduced={reduced} onOpen={() => openFicha(factFicha(f))} />)}
        {/* superficie invisible que recibe el puntero sobre la figura */}
        <mesh
          position={[0, 0.1, 1.4]}
          onPointerMove={onMove}
          onPointerOver={() => (ptr.current.hoverTarget = 1)}
          onPointerOut={() => (ptr.current.hoverTarget = 0)}
          onPointerDown={(e) => { onMove(e); ptr.current.hoverTarget = 1; }}
        >
          <planeGeometry args={[W + 0.6, H + 0.4]} />
          <meshBasicMaterial transparent opacity={0} depthWrite={false} />
        </mesh>
      </group>
    </>
  );
}

/* -------------------------------- Fragmentos de la escultura --------------------------------- */

/** Plano subdividido con una leve curvatura de papel (las puntas se levantan hacia la cámara). */
function bentPlane(bend: number) {
  const g = new THREE.PlaneGeometry(1, 1, 18, 2);
  const pos = g.attributes.position as THREE.BufferAttribute;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    pos.setZ(i, x * x * bend * 1.6);
  }
  g.computeVertexNormals();
  return g;
}

function Fragment({ f, i, n, ptr, build, reduced, shadows, droste }: { f: Frag; i: number; n: number; ptr: React.RefObject<PointerState>; build: React.RefObject<number>; reduced: boolean; shadows: boolean; droste: number }) {
  const tex = useSrgb(`${FR}/${f.id}.webp`);
  const geo = useMemo(() => bentPlane(f.bend), [f.bend]);
  useEffect(() => () => geo.dispose(), [geo]);
  const g = useRef<THREE.Group>(null);
  const h = f.w * (RATIO[f.id] ?? 1);
  // de dónde llega cada fragmento al armarse: disperso, más lejos y girado
  const from = useMemo(() => {
    const a = hash(i + 3) * Math.PI * 2;
    const r = 4.5 + hash(i + 9) * 3;
    return { x: Math.cos(a) * r, y: Math.sin(a) * r * 0.7, z: -3 - hash(i + 5) * 4, rot: (hash(i + 7) - 0.5) * 2.4 };
  }, [i]);

  useFrame((state) => {
    const m = g.current;
    const p = ptr.current;
    if (!m || !p) return;
    // cada fragmento llega con su propio retraso: primero las capas interiores, al final las manos
    const b = easeOut(clamp01((build.current - (i / n) * 0.45) / 0.55));
    const t = state.clock.elapsedTime;
    // separación de capas: alrededor del cursor, las capas delanteras se apartan y dejan ver las interiores
    const dx = f.x - p.p.x, dy = f.y - p.p.y;
    const dist = Math.hypot(dx, dy);
    const near = Math.exp(-(dist * dist) / 1.4) * p.hover;
    const front = f.z > 0 ? 1 : -0.4;
    const push = near * front * 0.32;
    const len = dist || 1;
    const breathe = reduced ? 0 : Math.sin(t * 0.7 + i * 1.3) * 0.012;
    const x = f.x + (dx / len) * push;
    const y = f.y + (dy / len) * push + breathe;
    const z = f.z + near * (f.z > 0 ? 0.35 : -0.15) + (f.z * 0.6) * p.hover;
    m.position.set(
      THREE.MathUtils.lerp(from.x, x, b),
      THREE.MathUtils.lerp(from.y, y, b),
      THREE.MathUtils.lerp(from.z, z, b),
    );
    m.rotation.set(0, 0, THREE.MathUtils.lerp(from.rot, f.rot + (reduced ? 0 : Math.sin(t * 0.4 + i) * 0.008), b));
    const sc = THREE.MathUtils.lerp(0.6, 1, b);
    m.scale.setScalar(sc);
  });

  return (
    <group ref={g}>
      {shadows && (
        <mesh geometry={geo} position={[0.06, -0.08, -0.03]} scale={[f.w, h, 1]} renderOrder={1}>
          <meshBasicMaterial map={tex} color="#000" transparent opacity={0.42} depthWrite={false} toneMapped={false} />
        </mesh>
      )}
      <mesh geometry={geo} scale={[f.w, h, 1]} renderOrder={2}>
        <meshStandardMaterial map={tex} alphaTest={0.5} roughness={0.85} metalness={0} envMapIntensity={0.25} side={THREE.DoubleSide} />
      </mesh>
      {droste > 0 && DROSTE[f.id] && <DrosteZone f={f} tex={tex} h={h} geo={geo} ptr={ptr} build={build} levels={droste} reduced={reduced} />}
    </group>
  );
}

/* ---------------------------------------- Tiras de papel ------------------------------------- */

function Strips({ ptr, build, low }: { ptr: React.RefObject<PointerState>; build: React.RefObject<number>; low: boolean }) {
  const strip = useSrgb(STRIP);
  const tape = useSrgb(TAPE);
  const items = useMemo(
    () =>
      [
        { tex: "strip", w: 1.7, h: 1.7 * (270 / 588), pos: [-W / 2 - 0.15, H * 0.12, 0.25], rot: 0.32, depth: 0.55 },
        { tex: "strip", w: 1.5, h: 1.5 * (270 / 588), pos: [W / 2 + 0.05, -H * 0.3, 0.42], rot: -0.22, depth: 0.8 },
        { tex: "tape", w: 0.9, h: 0.9 * (182 / 520), pos: [-0.62, 2.0, 0.6], rot: -0.6, depth: 0.3 },
        { tex: "tape", w: 0.9, h: 0.9 * (182 / 520), pos: [0.66, 2.05, 0.6], rot: 0.55, depth: 0.3 },
      ].slice(0, low ? 2 : 4),
    [low],
  );
  const refs = useRef<(THREE.Mesh | null)[]>([]);
  useFrame((state) => {
    const p = ptr.current;
    if (!p) return;
    const show = clamp01((build.current - 0.8) / 0.2);
    items.forEach((it, i) => {
      const m = refs.current[i];
      if (!m) return;
      const dx = (p.p.x / W) * it.depth * 0.5 * p.hover;
      const dy = (p.p.y / H) * it.depth * 0.3 * p.hover;
      m.position.set(it.pos[0] + dx, it.pos[1] + dy + (1 - show) * 2.5, it.pos[2]);
      m.rotation.z = it.rot + Math.sin(state.clock.elapsedTime * 0.6 + i) * 0.015;
      (m.material as THREE.MeshBasicMaterial).opacity = show;
    });
  });
  return (
    <group>
      {items.map((it, i) => (
        <mesh key={i} ref={(el) => { refs.current[i] = el; }} renderOrder={3}>
          <planeGeometry args={[it.w, it.h]} />
          <meshBasicMaterial map={it.tex === "strip" ? strip : tape} transparent depthWrite={false} toneMapped={false} />
        </mesh>
      ))}
    </group>
  );
}

/* ------------------- Efecto Droste: la foto contiene su propia foto, hacia adentro ----------- */

/**
 * Zonas Droste: una ventana dentro del recorte muestra el MISMO recorte, que a su vez contiene la
 * ventana, y así sucesivamente. Al acercar el cursor (o al tocar) la ventana se abre y la imagen
 * avanza muy despacio hacia adentro, con un leve giro por nivel. En reposo solo queda un borde de
 * papel que sugiere la profundidad. Todo sale de la textura del propio fragmento: sin espirales genéricas.
 */
interface DrosteCfg { cx: number; cy: number; hx: number; hy: number; rot: number }
const DROSTE: Record<string, DrosteCfg> = {
  "cara-roja": { cx: 0.5, cy: 0.5, hx: 0.21, hy: 0.19, rot: 0.07 },
  "torso-tigre": { cx: 0.42, cy: 0.52, hx: 0.17, hy: 0.24, rot: -0.05 },
  "espejo-baile": { cx: 0.56, cy: 0.5, hx: 0.24, hy: 0.22, rot: 0.04 },
  "libro-manos": { cx: 0.62, cy: 0.5, hx: 0.16, hy: 0.26, rot: -0.06 },
};

const DROSTE_VS = /* glsl */ `
varying vec2 vUv;
void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }
`;
const DROSTE_FS = /* glsl */ `
uniform sampler2D map;
uniform vec2 uC; uniform vec2 uH; uniform float uRot; uniform float uOpen; uniform float uTime; uniform int uLevels;
varying vec2 vUv;
vec2 rot2(vec2 p, float a) { float c = cos(a), s = sin(a); return vec2(c * p.x - s * p.y, s * p.x + c * p.y); }
// distancia normalizada a la ventana: 1 = borde
float box(vec2 p) { vec2 q = abs(p - uC) / uH; return max(q.x, q.y); }
void main() {
  vec2 uv = vUv;
  float d0 = box(uv);
  // la ventana se abre desde un marco fino (reposo) hasta su tamaño completo (abierta)
  float open = smoothstep(0.0, 1.0, uOpen);
  if (d0 > 1.0) discard;
  float scale = max(uH.x, uH.y) * 2.0;            // cuánto ocupa la ventana dentro del recorte
  // zoom infinito: avanza una fracción de nivel; al completar uno, la imagen es idéntica (sin salto)
  float z = fract(uTime * 0.045) * open;
  vec2 p = uC + (uv - uC) * pow(scale, z);
  float level = 0.0;
  float edge = 1.0;
  for (int i = 0; i < 8; i++) {
    if (i >= uLevels) break;
    float d = box(p);
    if (d > 1.0) break;
    edge = min(edge, 1.0 - d);
    // dentro de la ventana: el recorte completo, reducido, girado y algo desplazado (perspectiva)
    vec2 local = (p - uC) / (uH * 2.0);
    local = rot2(local, uRot * (1.0 + level * 0.15));
    p = vec2(0.5) + local + vec2(0.01, -0.006) * level;
    level += 1.0;
  }
  vec4 c = texture2D(map, p);
  vec3 paper = vec3(0.91, 0.87, 0.79);
  vec3 col = mix(paper * 0.55, c.rgb, c.a);
  // cada nivel un poco más hondo y cálido, como fotos apiladas
  col *= 1.0 - 0.07 * level;
  col = mix(col, col * vec3(1.02, 0.97, 0.9), min(level * 0.12, 0.5));
  // borde de papel recortado en cada ventana + sombra interior
  float rim = smoothstep(0.035, 0.0, edge);
  col = mix(col, paper, rim * 0.9);
  float shade = smoothstep(0.12, 0.0, edge) * 0.25;
  col *= 1.0 - shade * (1.0 - rim);
  // en reposo solo se ve el marco (la profundidad se sugiere)
  float frame = smoothstep(0.84, 0.97, d0);
  float alpha = mix(frame * 0.85, 1.0, open);
  gl_FragColor = vec4(col, alpha);
  #include <colorspace_fragment>
}
`;

function DrosteZone({ f, tex, h, geo, ptr, build, levels, reduced }: { f: Frag; tex: THREE.Texture; h: number; geo: THREE.BufferGeometry; ptr: React.RefObject<PointerState>; build: React.RefObject<number>; levels: number; reduced: boolean }) {
  const cfg = DROSTE[f.id];
  const mat = useMemo(() => new THREE.ShaderMaterial({
    uniforms: {
      map: { value: tex }, uC: { value: new THREE.Vector2(cfg.cx, cfg.cy) }, uH: { value: new THREE.Vector2(cfg.hx, cfg.hy) },
      uRot: { value: cfg.rot }, uOpen: { value: 0 }, uTime: { value: 0 }, uLevels: { value: levels },
    },
    vertexShader: DROSTE_VS, fragmentShader: DROSTE_FS, transparent: true, depthWrite: false, side: THREE.DoubleSide,
  }), [tex, cfg, levels]);
  useEffect(() => () => mat.dispose(), [mat]);
  const opened = useRef(false);
  const time = useRef(0);
  useFrame((_, dt) => {
    const p = ptr.current;
    if (!p) return;
    // centro de la ventana en coordenadas de la figura
    const wx = f.x + (cfg.cx - 0.5) * f.w, wy = f.y + (cfg.cy - 0.5) * h;
    const dist = Math.hypot(p.p.x - wx, p.p.y - wy);
    const near = clamp01(1.25 - dist / Math.max(0.45, f.w * 0.42)) * p.hover * (build.current > 0.95 ? 1 : 0);
    const u = mat.uniforms;
    u.uOpen.value += (near - u.uOpen.value) * (1 - Math.exp(-Math.min(dt, 0.05) * 3));
    if (!reduced) time.current += Math.min(dt, 0.05) * u.uOpen.value;
    u.uTime.value = time.current;
    if (u.uOpen.value > 0.55 && !opened.current) { opened.current = true; sound.play("fotos-fragmentan"); }
    if (u.uOpen.value < 0.15) opened.current = false;
  });
  return <mesh geometry={geo} scale={[f.w, h, 1]} position={[0, 0, 0.004]} renderOrder={3} material={mat} />;
}

/* ----------------------------- Miniaturas flotantes con rótulo ------------------------------- */

function Fact({ fact, i, build, reduced, onOpen }: { fact: PortraitFact; i: number; build: React.RefObject<number>; reduced: boolean; onOpen: () => void }) {
  const tex = useSrgb(fact.thumb);
  const g = useRef<THREE.Group>(null);
  const [hot, setHot] = useState(false);
  const TW = 0.95;
  const TH = 0.72;
  // recorte tipo "cover" sin deformar la foto
  useEffect(() => {
    const img = tex.image as HTMLImageElement | undefined;
    if (!img?.width) return;
    const ia = img.width / img.height;
    const pa = TW / TH;
    tex.wrapS = tex.wrapT = THREE.ClampToEdgeWrapping;
    if (ia > pa) {
      tex.repeat.set(pa / ia, 1);
      tex.offset.set((1 - pa / ia) / 2, 0);
    } else {
      tex.repeat.set(1, ia / pa);
      tex.offset.set(0, (1 - ia / pa) / 2);
    }
    tex.needsUpdate = true;
  }, [tex]);

  const line = useMemo(() => {
    const ax = (fact.anchor[0] - 0.5) * W;
    const ay = (fact.anchor[1] - 0.5) * H;
    const geo = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(ax, ay, 0.06), new THREE.Vector3(...fact.pos)]);
    const l = new THREE.Line(geo, new THREE.LineDashedMaterial({ color: "#d4a12a", dashSize: 0.08, gapSize: 0.06, transparent: true, opacity: 0 }));
    l.computeLineDistances();
    return l;
  }, [fact]);
  useEffect(() => () => { line.geometry.dispose(); (line.material as THREE.Material).dispose(); }, [line]);

  useFrame((state) => {
    const show = easeOut(clamp01((build.current - 0.7 - i * 0.035) / 0.25));
    (line.material as THREE.LineDashedMaterial).opacity = show * 0.85;
    if (!g.current) return;
    const t = state.clock.elapsedTime;
    const bob = reduced ? 0 : Math.sin(t * 0.8 + i * 1.7) * 0.06;
    g.current.position.set(fact.pos[0], fact.pos[1] + bob, fact.pos[2]);
    const sc = show * (hot ? 1.12 : 1);
    g.current.scale.lerp(new THREE.Vector3(sc, sc, sc), 0.18);
    g.current.rotation.z = (hash(i + 40) - 0.5) * 0.14 + (reduced ? 0 : Math.sin(t * 0.5 + i) * 0.02);
  });

  return (
    <>
      <primitive object={line} />
      <group ref={g} scale={0}>
        <mesh position={[0.04, -0.05, -0.02]}>
          <planeGeometry args={[TW + 0.1, TH + 0.1]} />
          <meshBasicMaterial color="#000" transparent opacity={0.35} depthWrite={false} />
        </mesh>
        <mesh position={[0, 0, -0.01]}>
          <planeGeometry args={[TW + 0.08, TH + 0.08]} />
          <meshBasicMaterial color={hot ? "#d4a12a" : "#c9a878"} toneMapped={false} />
        </mesh>
        <mesh
          onClick={(e) => { e.stopPropagation(); onOpen(); }}
          onPointerOver={(e) => { e.stopPropagation(); setHot(true); document.body.style.cursor = "pointer"; }}
          onPointerOut={() => { setHot(false); document.body.style.cursor = ""; }}
        >
          <planeGeometry args={[TW, TH]} />
          <meshBasicMaterial map={tex} toneMapped={false} />
        </mesh>
        <Html position={[0, -TH / 2 - 0.08, 0]} center zIndexRange={[20, 0]}>
          <button type="button" className={`${s.tag} ${hot ? s.tagHot : ""}`} data-cursor="ver" onClick={onOpen} onFocus={() => setHot(true)} onBlur={() => setHot(false)} onMouseEnter={() => setHot(true)} onMouseLeave={() => setHot(false)}>
            {fact.label}
          </button>
        </Html>
      </group>
    </>
  );
}
