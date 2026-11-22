"use client";
import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { Canvas, useFrame, useLoader, useThree, type ThreeEvent } from "@react-three/fiber";
import { Html, MeshTransmissionMaterial, useFBO } from "@react-three/drei";
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
 * El cursor separa las capas y deja ver las interiores; dos lupas de vidrio real (transmisión y
 * refracción) cuelgan de hilos y se mueven al interactuar. Las miniaturas del archivo siguen cosidas.
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
  const sfx = useRef({ built: false, open: false });
  // las lupas y el espejo viven en la capa 2: la cámara principal los ve, la del espejo no (sin realimentación)
  useEffect(() => { camera.layers.enable(2); }, [camera]);
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
    if (!touch && p.hover > 0.6 && !sfx.current.open && build.current > 0.95) { sfx.current.open = true; sound.play("fotos-fragmentan"); }
    if (p.hover < 0.2) sfx.current.open = false;
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
          <Fragment key={f.id} f={f} i={i} n={frags.length} ptr={ptr} build={build} reduced={reduced} shadows={!low} />
        ))}
        <Strips ptr={ptr} build={build} low={low} />
        <Lenses ptr={ptr} build={build} count={low || narrow ? 1 : 2} reduced={reduced} low={low} />
        {!narrow && <InfiniteMirror build={build} group={group} low={low} reduced={reduced} />}
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

function Fragment({ f, i, n, ptr, build, reduced, shadows }: { f: Frag; i: number; n: number; ptr: React.RefObject<PointerState>; build: React.RefObject<number>; reduced: boolean; shadows: boolean }) {
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

/* --------------------------- Lupas de vidrio real colgadas de hilos -------------------------- */

/** Lente biconvexa: esfera aplanada (el vidrio refracta y amplía lo que hay detrás). */
function Lenses({ ptr, build, count, reduced, low }: { ptr: React.RefObject<PointerState>; build: React.RefObject<number>; count: number; reduced: boolean; low: boolean }) {
  const R = 0.5;
  const TOP = H / 2 + 2.2;
  const defs = useMemo(
    () => [
      { rest: new THREE.Vector2(-0.75, 1.3), off: -0.3 },
      { rest: new THREE.Vector2(0.95, -0.55), off: 0.4 },
    ].slice(0, count),
    [count],
  );
  const state = useRef(defs.map((d) => ({ x: d.rest.x, y: d.rest.y, vx: 0, vy: 0 })));
  const lensRefs = useRef<(THREE.Group | null)[]>([]);
  const threadRefs = useRef<(THREE.Mesh | null)[]>([]);
  // lente biconvexa real: perfil torneado con canto plano (no una esfera aplastada)
  const lensGeo = useMemo(() => {
    const pts: THREE.Vector2[] = [];
    const T = 0.11, EDGE = 0.018;
    for (let i = 0; i <= 24; i++) {
      const r = (i / 24) * R;
      pts.push(new THREE.Vector2(r, EDGE + T * (1 - (r / R) ** 2)));
    }
    pts.push(new THREE.Vector2(R, -EDGE));
    for (let i = 24; i >= 0; i--) {
      const r = (i / 24) * R;
      pts.push(new THREE.Vector2(r, -EDGE - T * (1 - (r / R) ** 2)));
    }
    const g = new THREE.LatheGeometry(pts, 72);
    g.rotateX(Math.PI / 2);
    g.computeVertexNormals();
    return g;
  }, []);
  useEffect(() => () => lensGeo.dispose(), [lensGeo]);

  useFrame((_, dt) => {
    const p = ptr.current;
    if (!p) return;
    const d = Math.min(dt, 0.04);
    const show = clamp01((build.current - 0.85) / 0.15);
    defs.forEach((def, i) => {
      const s = state.current[i];
      // con el cursor encima, cada lupa se acerca a él (con su desfase); sin él, vuelve a su sitio
      const tx = THREE.MathUtils.lerp(def.rest.x, p.p.x + def.off, p.hover);
      const ty = THREE.MathUtils.lerp(def.rest.y, p.p.y + (i ? -0.35 : 0.3), p.hover * 0.75);
      if (reduced) { s.x = tx; s.y = ty; s.vx = 0; }
      else {
        s.vx += ((tx - s.x) * 16 - s.vx * 5) * d;
        s.vy += ((ty - s.y) * 16 - s.vy * 5) * d;
        s.x += s.vx * d;
        s.y += s.vy * d;
      }
      const g = lensRefs.current[i];
      const th = threadRefs.current[i];
      const y = s.y + (1 - show) * 4.5;
      if (g) {
        g.position.set(s.x, y, 1.15);
        // la lupa se mece como un péndulo y gira apenas hacia el espectador
        g.rotation.z = THREE.MathUtils.clamp(-s.vx * 0.06, -0.35, 0.35);
        g.rotation.y = THREE.MathUtils.clamp(s.vx * 0.12, -0.5, 0.5);
        g.rotation.x = THREE.MathUtils.clamp(-s.vy * 0.08, -0.4, 0.4);
      }
      if (th) {
        const topX = s.x * 0.6;
        const len = Math.max(0.1, Math.hypot(s.x - topX, TOP - (y + R + 0.05)));
        th.position.set((s.x + topX) / 2, (TOP + y + R + 0.05) / 2, 1.15);
        th.scale.set(1, len, 1);
        th.rotation.z = Math.atan2(s.x - topX, TOP - (y + R));
      }
    });
  });

  return (
    <group>
      {defs.map((_, i) => (
        <group key={i}>
          <mesh ref={(el) => { threadRefs.current[i] = el; }} layers={2}>
            <cylinderGeometry args={[0.006, 0.006, 1, 6]} />
            <meshStandardMaterial color="#efe6d2" roughness={0.9} />
          </mesh>
          <group ref={(el) => { lensRefs.current[i] = el; }}>
            {/* vidrio */}
            <mesh geometry={lensGeo} renderOrder={5} layers={2}>
              {low ? (
                <meshPhysicalMaterial transmission={1} thickness={0.6} ior={1.52} roughness={0.02} clearcoat={1} clearcoatRoughness={0.05} envMapIntensity={1.2} color="#ffffff" attenuationColor="#fff7e0" attenuationDistance={2} />
              ) : (
                <MeshTransmissionMaterial
                  transmission={1}
                  thickness={1.1}
                  ior={1.52}
                  roughness={0.012}
                  chromaticAberration={0.06}
                  anisotropicBlur={0.06}
                  distortion={0.08}
                  distortionScale={0.4}
                  temporalDistortion={0.02}
                  clearcoat={1}
                  clearcoatRoughness={0.04}
                  envMapIntensity={1.4}
                  samples={6}
                  resolution={512}
                  backside
                  backsideThickness={0.4}
                  attenuationColor="#fff6dc"
                  attenuationDistance={2.5}
                />
              )}
            </mesh>
            {/* aro de latón */}
            <mesh layers={2}>
              <torusGeometry args={[R, 0.045, 18, 72]} />
              <meshStandardMaterial color="#c99a2e" metalness={1} roughness={0.22} envMapIntensity={1.6} />
            </mesh>
            {/* argolla donde se ata el hilo */}
            <mesh position={[0, R + 0.06, 0]} layers={2}>
              <torusGeometry args={[0.05, 0.014, 10, 24]} />
              <meshStandardMaterial color="#c99a2e" metalness={1} roughness={0.25} />
            </mesh>
            {/* brillo de espejo en el borde del vidrio */}
            <mesh position={[-R * 0.32, R * 0.36, 0.14]} rotation={[0, 0, 0.7]} layers={2}>
              <planeGeometry args={[0.32, 0.06]} />
              <meshBasicMaterial color="#ffffff" transparent opacity={0.35} depthWrite={false} toneMapped={false} />
            </mesh>
          </group>
        </group>
      ))}
    </group>
  );
}


/* ------------------ Espejo de mano con reflejos que se repiten hacia el infinito -------------- */

const TUNNEL_VS = /* glsl */ `
varying vec2 vUv;
void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }
`;
// Túnel de espejos optimizado: se captura el retrato una vez (render target pequeño) y se repite
// en óvalos anidados que se encogen hacia un punto de fuga que se mueve con la cámara y el cursor.
const TUNNEL_FS = /* glsl */ `
uniform sampler2D map;
uniform vec2 vanish;
uniform float time;
uniform float show;
varying vec2 vUv;
const int LEVELS = 9;
const float SHRINK = 0.74;
void main() {
  vec2 p = vUv * 2.0 - 1.0;
  if (dot(p, p) > 1.0) discard;
  int level = 0;
  float sc = 1.0;
  vec2 c = vec2(0.0);
  for (int i = 1; i < LEVELS; i++) {
    float s = pow(SHRINK, float(i));
    vec2 ci = vanish * (1.0 - s);
    if (length(p - ci) < s) { level = i; sc = s; c = ci; }
  }
  vec2 q = (p - c) / sc;            // coordenadas dentro del óvalo de ese nivel
  float r = length(q);
  float lv = float(level);
  vec3 col;
  if (r > 0.9 && level > 0) {
    // marco reflejado: canto dorado con sombra hacia adentro
    float t = (r - 0.9) / 0.1;
    col = mix(vec3(0.83, 0.63, 0.16), vec3(0.32, 0.22, 0.06), t) * (0.9 - 0.25 * t);
  } else {
    // cada reflejo invierte la imagen: los niveles impares se ven al derecho
    float flip = mod(lv, 2.0) < 0.5 ? 1.0 : -1.0;
    vec2 uv = vec2(0.5 - 0.5 * q.x * flip, 0.5 + 0.5 * q.y);
    col = pow(max(texture2D(map, uv).rgb, vec3(0.0)), vec3(1.0 / 2.2)) * 1.3; // la captura es lineal
  }
  // los espejos reales se oscurecen y verdean en cada rebote
  col *= pow(0.86, lv);
  col = mix(col, col * vec3(0.86, 1.0, 0.93), clamp(lv / 6.0, 0.0, 1.0));
  // brillo diagonal del vidrio
  float streak = smoothstep(0.08, 0.0, abs(p.x * 0.7 + p.y * 0.7 - 0.35 + sin(time * 0.3) * 0.05));
  col += streak * 0.12;
  // fresnel suave en el borde
  col += pow(clamp(length(p), 0.0, 1.0), 6.0) * 0.18;
  // la aparición se hace con la escala del espejo; aquí el vidrio es opaco (evita el orden de transparencias)
  gl_FragColor = vec4(col * (0.6 + 0.4 * show), 1.0);
}
`;

function InfiniteMirror({ build, group, low, reduced }: { build: React.RefObject<number>; group: React.RefObject<THREE.Group | null>; low: boolean; reduced: boolean }) {
  const res = low ? 160 : 320;
  const fbo = useFBO(res, res, { samples: 0 });
  const capCam = useMemo(() => {
    const c = new THREE.PerspectiveCamera(44, 1, 0.1, 40);
    c.layers.set(0);
    return c;
  }, []);
  const frame = useRef<THREE.Group>(null);
  const POS = new THREE.Vector3(-1.85, -2.45, 1.25);
  const uniforms = useMemo(
    () => ({ map: { value: fbo.texture }, vanish: { value: new THREE.Vector2(0.15, 0.1) }, time: { value: 0 }, show: { value: 0 } }),
    [fbo],
  );
  const tick = useRef(0);
  const tmp = useMemo(() => ({ a: new THREE.Vector3(), b: new THREE.Vector3() }), []);

  useFrame((state, dt) => {
    const show = clamp01((build.current - 0.85) / 0.15);
    uniforms.show.value = show;
    uniforms.time.value = state.clock.elapsedTime;
    const g = group.current;
    if (frame.current && show <= 0) frame.current.scale.setScalar(0.0001);
    if (!g || show <= 0) return;
    // el punto de fuga sigue (con suavidad) el giro de la escultura y el cursor
    const vx = reduced ? 0.15 : THREE.MathUtils.clamp(-g.rotation.y * 1.6 + state.pointer.x * 0.18 + 0.12, -0.55, 0.55);
    const vy = reduced ? 0.1 : THREE.MathUtils.clamp(g.rotation.x * 1.6 + state.pointer.y * 0.12 + 0.08, -0.5, 0.5);
    uniforms.vanish.value.lerp(new THREE.Vector2(vx, vy), 1 - Math.exp(-Math.min(dt, 0.05) * 5));
    if (frame.current) {
      frame.current.scale.setScalar(easeOut(show));
      if (!reduced) frame.current.rotation.z = Math.sin(state.clock.elapsedTime * 0.5) * 0.04 - 0.18;
    }
    // captura del retrato desde el espejo (cada pocos fotogramas, a baja resolución)
    tick.current++;
    if (tick.current % (low ? 6 : 3) !== 0) return;
    // el espejo "ve" la escultura de frente y algo de lado, como quien se mira de reojo
    g.localToWorld(tmp.a.set(POS.x * 0.7, POS.y * 0.25 + 0.4, 6.6));
    g.localToWorld(tmp.b.set(0, 0.2, 0));
    capCam.position.copy(tmp.a);
    capCam.lookAt(tmp.b);
    const gl = state.gl;
    const prev = gl.getRenderTarget();
    gl.setRenderTarget(fbo);
    gl.setClearColor(0x0a0806, 1);
    gl.clear();
    gl.render(state.scene, capCam);
    gl.setRenderTarget(prev);
    gl.setClearColor(0x000000, 0);
  });

  return (
    <group ref={frame} position={POS.toArray()} rotation={[0, 0.32, -0.18]} scale={0.0001}>
      {/* vidrio con el túnel de reflejos */}
      <mesh scale={[0.62, 0.78, 1]} layers={2} renderOrder={6}>
        <circleGeometry args={[1, 64]} />
        <shaderMaterial vertexShader={TUNNEL_VS} fragmentShader={TUNNEL_FS} uniforms={uniforms} toneMapped={false} />
      </mesh>
      {/* marco de latón y mango */}
      <mesh scale={[0.62, 0.78, 1]} layers={2}>
        <torusGeometry args={[1, 0.055, 16, 80]} />
        <meshStandardMaterial color="#c99a2e" metalness={1} roughness={0.25} envMapIntensity={1.5} />
      </mesh>
      <mesh position={[0, -1.08, -0.02]} layers={2}>
        <cylinderGeometry args={[0.05, 0.07, 0.62, 16]} />
        <meshStandardMaterial color="#7d5a10" metalness={0.9} roughness={0.35} />
      </mesh>
      <mesh position={[0, 0, -0.03]} scale={[0.66, 0.82, 1]} layers={2}>
        <circleGeometry args={[1, 48]} />
        <meshStandardMaterial color="#3a2a12" metalness={0.6} roughness={0.5} />
      </mesh>
    </group>
  );
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
