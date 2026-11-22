"use client";
import { Canvas, useFrame, useThree, type ThreeEvent } from "@react-three/fiber";
import { Suspense, useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { SHEET_W, SHEET_H, type El } from "./board";
import { sound } from "@/lib/audio/useSound";

/** Escala hoja → mundo: la hoja del visitante mide 3 × 4 unidades sobre la mesa. */
const K = 3 / SHEET_W;
const A = "/assets/room-04";

export interface BoardApi {
  els: El[];
  selected: string | null;
  select: (id: string | null) => void;
  begin: () => void;
  patch: (id: string, p: Partial<El>, history?: boolean) => void;
  arrived: Set<string>;
}

const loader = new THREE.TextureLoader();
const cache = new Map<string, THREE.Texture>();
function tex(src: string) {
  let t = cache.get(src);
  if (!t) {
    t = loader.load(src);
    t.colorSpace = THREE.SRGBColorSpace;
    t.anisotropy = 4;
    cache.set(src, t);
  }
  return t;
}

/** Textura procedural: papel kraft con fibras y punteado (sin descargas). */
function makeKraft() {
  const c = document.createElement("canvas");
  c.width = c.height = 512;
  const g = c.getContext("2d")!;
  g.fillStyle = "#b8956a";
  g.fillRect(0, 0, 512, 512);
  for (let i = 0; i < 2600; i++) {
    g.fillStyle = `rgba(${Math.random() < 0.5 ? "60,40,20" : "240,220,190"},${Math.random() * 0.08})`;
    g.fillRect(Math.random() * 512, Math.random() * 512, 1 + Math.random() * 18, 1);
  }
  g.fillStyle = "rgba(60,40,20,.18)";
  for (let y = 8; y < 512; y += 16) for (let x = 8; x < 512; x += 16) { g.beginPath(); g.arc(x, y, 1.1, 0, 7); g.fill(); }
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(5, 5);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

function makePaper() {
  const c = document.createElement("canvas");
  c.width = 300; c.height = 400;
  const g = c.getContext("2d")!;
  g.fillStyle = "#f6f1e6";
  g.fillRect(0, 0, 300, 400);
  for (let i = 0; i < 1400; i++) { g.fillStyle = `rgba(90,70,40,${Math.random() * 0.05})`; g.fillRect(Math.random() * 300, Math.random() * 400, 1, 1); }
  g.strokeStyle = "rgba(35,64,168,.10)";
  g.lineWidth = 1;
  for (let x = 0; x <= 300; x += 15) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, 400); g.stroke(); }
  for (let y = 0; y <= 400; y += 15) { g.beginPath(); g.moveTo(0, y); g.lineTo(300, y); g.stroke(); }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

/** Encuadre: en escritorio se ven las dos hojas; en móvil, casi cenital sobre la hoja propia. */
function Rig({ narrow }: { narrow: boolean }) {
  const { camera, size } = useThree();
  useEffect(() => {
    const cam = camera as THREE.PerspectiveCamera;
    const aspect = size.width / size.height;
    const target = narrow ? new THREE.Vector3(0, 0, 0.1) : new THREE.Vector3(-0.15, 0, 0.15);
    const needW = narrow ? 3.6 : 8.4;
    const needH = narrow ? 4.9 : 4.9;
    cam.fov = 38;
    const t = Math.tan(THREE.MathUtils.degToRad(cam.fov / 2));
    const d = Math.max(needH / (2 * t), needW / (2 * t * aspect)) * 1.04;
    const tilt = narrow ? 0.18 : 0.42; // ángulo respecto a la vertical
    cam.position.set(target.x, Math.cos(tilt) * d, target.z + Math.sin(tilt) * d);
    cam.lookAt(target);
    cam.updateProjectionMatrix();
  }, [camera, size, narrow]);
  return null;
}

type Gesture =
  | { kind: "move"; dx: number; dy: number; moved: number; lx: number; ly: number }
  | { kind: "scale"; d0: number; sx: number; sy: number }
  | { kind: "rotate"; a0: number; r0: number };

const HANDLE = new THREE.CircleGeometry(1, 28);
const RING = new THREE.RingGeometry(0.62, 1, 28);

function Piece({ el, i, api, sheet, reduced }: { el: El; i: number; api: BoardApi; sheet: React.RefObject<THREE.Group | null>; reduced: boolean }) {
  const g = useRef<THREE.Group>(null);
  const t = useMemo(() => tex(el.src), [el.src]);
  const sel = api.selected === el.id;
  const gesture = useRef<Gesture | null>(null);
  const lift = useRef(api.arrived.has(el.id) ? 0 : reduced ? 0 : 1.6);
  const plane = useMemo(() => new THREE.Plane(new THREE.Vector3(0, 1, 0), 0), []);
  const hit = useMemo(() => new THREE.Vector3(), []);
  const elRef = useRef(el);
  elRef.current = el;
  const { gl } = useThree();

  useEffect(() => { api.arrived.add(el.id); }, [api.arrived, el.id]);

  /* Un arrastre nunca queda colgado: si el puntero sale de la ventana, se pierde el foco o la pestaña se oculta, se suelta. */
  useEffect(() => {
    const end = () => {
      if (!gesture.current) return;
      const wasMove = gesture.current.kind === "move" && gesture.current.moved > 4;
      gesture.current = null;
      gl.domElement.style.cursor = "";
      if (wasMove) sound.play("recorte-pegar");
    };
    const vis = () => { if (document.hidden) end(); };
    window.addEventListener("pointerup", end);
    window.addEventListener("pointercancel", end);
    window.addEventListener("blur", end);
    document.addEventListener("visibilitychange", vis);
    return () => {
      window.removeEventListener("pointerup", end);
      window.removeEventListener("pointercancel", end);
      window.removeEventListener("blur", end);
      document.removeEventListener("visibilitychange", vis);
    };
  }, [gl]);

  useFrame((_, dt) => {
    if (!g.current) return;
    const dragging = gesture.current?.kind === "move";
    const target = dragging ? 0.32 : sel ? 0.06 : 0;
    lift.current += (target - lift.current) * Math.min(1, dt * (reduced ? 30 : 9));
    const z = i * 0.004 + lift.current;
    g.current.position.set((el.x - SHEET_W / 2) * K, -(el.y - SHEET_H / 2) * K, z);
    g.current.rotation.set(dragging && !reduced ? 0.08 : 0, dragging && !reduced ? -0.06 : 0, -THREE.MathUtils.degToRad(el.rotation));
    const sh = g.current.children[0] as THREE.Mesh;
    sh.position.set(0.03 + lift.current * 0.25, -0.04 - lift.current * 0.3, -z + 0.001);
    (sh.material as THREE.MeshBasicMaterial).opacity = 0.32 - Math.min(0.2, lift.current * 0.35);
  });

  const toSheet = (e: ThreeEvent<PointerEvent>) => {
    if (!sheet.current) return null;
    plane.constant = -sheet.current.getWorldPosition(hit).y;
    if (!e.ray.intersectPlane(plane, hit)) return null;
    sheet.current.worldToLocal(hit);
    return { x: hit.x / K + SHEET_W / 2, y: -hit.y / K + SHEET_H / 2 };
  };

  const capture = (e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation();
    (e.target as unknown as Element)?.setPointerCapture?.(e.pointerId);
  };

  const startMove = (e: ThreeEvent<PointerEvent>) => {
    if (e.button !== undefined && e.button > 0) return;
    capture(e);
    if (api.selected !== el.id) sound.play("recorte-tomar");
    api.select(el.id);
    const p = toSheet(e);
    if (!p) return;
    api.begin();
    gesture.current = { kind: "move", dx: p.x - el.x, dy: p.y - el.y, moved: 0, lx: p.x, ly: p.y };
    gl.domElement.style.cursor = "grabbing";
  };
  const startScale = (e: ThreeEvent<PointerEvent>) => {
    capture(e);
    const p = toSheet(e);
    if (!p) return;
    api.begin();
    gesture.current = { kind: "scale", d0: Math.max(4, Math.hypot(p.x - el.x, p.y - el.y)), sx: el.scaleX, sy: el.scaleY };
  };
  const startRotate = (e: ThreeEvent<PointerEvent>) => {
    capture(e);
    const p = toSheet(e);
    if (!p) return;
    api.begin();
    gesture.current = { kind: "rotate", a0: Math.atan2(p.y - el.y, p.x - el.x), r0: el.rotation };
  };
  const onMove = (e: ThreeEvent<PointerEvent>) => {
    const gs = gesture.current;
    if (!gs) return;
    e.stopPropagation();
    const p = toSheet(e);
    if (!p) return;
    const cur = elRef.current;
    if (gs.kind === "move") {
      gs.moved += Math.hypot(p.x - gs.lx, p.y - gs.ly);
      if (Math.hypot(p.x - gs.lx, p.y - gs.ly) > 3) sound.play("recorte-arrastrar");
      gs.lx = p.x; gs.ly = p.y;
      api.patch(el.id, {
        x: THREE.MathUtils.clamp(p.x - gs.dx, -80, SHEET_W + 80),
        y: THREE.MathUtils.clamp(p.y - gs.dy, -80, SHEET_H + 80),
      });
    } else if (gs.kind === "scale") {
      const f = Math.hypot(p.x - cur.x, p.y - cur.y) / gs.d0;
      const k = THREE.MathUtils.clamp(gs.sx * f, 0.08, 6) / gs.sx;
      api.patch(el.id, { scaleX: gs.sx * k, scaleY: gs.sy * k });
    } else {
      const a = Math.atan2(p.y - cur.y, p.x - cur.x);
      api.patch(el.id, { rotation: gs.r0 + ((a - gs.a0) * 180) / Math.PI });
    }
  };
  const onUp = (e: ThreeEvent<PointerEvent>) => {
    const gs = gesture.current;
    gesture.current = null;
    (e.target as unknown as Element)?.releasePointerCapture?.(e.pointerId);
    gl.domElement.style.cursor = "";
    if (gs?.kind === "move" && gs.moved > 4) sound.play("recorte-pegar");
  };

  const w = el.w * el.scaleX * K;
  const h = el.h * el.scaleY * K;
  const hr = 0.075; // radio de las manijas en el mundo
  const corners: [number, number, string][] = [[-1, 1, "nwse-resize"], [1, 1, "nesw-resize"], [1, -1, "nwse-resize"], [-1, -1, "nesw-resize"]];
  const handleEvents = (start: (e: ThreeEvent<PointerEvent>) => void, cursor: string) => ({
    onPointerDown: start,
    onPointerMove: onMove,
    onPointerUp: onUp,
    onPointerOver: (e: ThreeEvent<PointerEvent>) => { e.stopPropagation(); if (!gesture.current) gl.domElement.style.cursor = cursor; },
    onPointerOut: () => { if (!gesture.current) gl.domElement.style.cursor = ""; },
  });

  return (
    <group ref={g}>
      <mesh scale={[w * 1.02, h * 1.02, 1]} renderOrder={i * 2}>
        <planeGeometry />
        <meshBasicMaterial color="#1a1208" map={t} transparent opacity={0.3} depthWrite={false} />
      </mesh>
      <mesh scale={[w, h, 1]} renderOrder={i * 2 + 1} {...handleEvents(startMove, "grab")}>
        <planeGeometry />
        <meshBasicMaterial map={t} transparent alphaTest={0.04} toneMapped={false} />
      </mesh>
      {sel && (
        <group>
          <lineSegments renderOrder={999} scale={[w + 0.06, h + 0.06, 1]}>
            <edgesGeometry args={[new THREE.PlaneGeometry()]} />
            <lineDashedMaterial color="#d4a12a" dashSize={0.03} gapSize={0.02} depthTest={false} />
          </lineSegments>
          {/* esquinas: escalar arrastrando, proporción fija */}
          {corners.map(([sx, sy, cur], k) => (
            <group key={k} position={[sx * (w / 2 + 0.03), sy * (h / 2 + 0.03), 0.02]}>
              <mesh geometry={HANDLE} scale={hr * 1.9} renderOrder={1001} {...handleEvents(startScale, cur)}>
                <meshBasicMaterial transparent opacity={0} depthTest={false} />
              </mesh>
              <mesh geometry={HANDLE} scale={hr} renderOrder={1000}>
                <meshBasicMaterial color="#f6f1e6" depthTest={false} toneMapped={false} />
              </mesh>
              <mesh geometry={RING} scale={hr} renderOrder={1001}>
                <meshBasicMaterial color="#d4a12a" depthTest={false} toneMapped={false} />
              </mesh>
            </group>
          ))}
          {/* manija de giro sobre el borde superior */}
          <group position={[0, h / 2 + 0.28, 0.02]}>
            <mesh position={[0, -0.13, 0]} scale={[0.008, 0.24, 1]} renderOrder={1000}>
              <planeGeometry />
              <meshBasicMaterial color="#d4a12a" depthTest={false} toneMapped={false} />
            </mesh>
            <mesh geometry={HANDLE} scale={hr * 2} renderOrder={1001} {...handleEvents(startRotate, "alias")}>
              <meshBasicMaterial transparent opacity={0} depthTest={false} />
            </mesh>
            <mesh geometry={HANDLE} scale={hr * 1.1} renderOrder={1000}>
              <meshBasicMaterial color="#d9f24a" depthTest={false} toneMapped={false} />
            </mesh>
            <mesh geometry={RING} scale={hr * 1.1} renderOrder={1001}>
              <meshBasicMaterial color="#121110" depthTest={false} toneMapped={false} />
            </mesh>
          </group>
        </group>
      )}
    </group>
  );
}

/** La pieza de Abraxas: su cabeza sobre un cuerpo de muñeca, pegada con cinta a una hoja propia. */
function AbraxasSheet({ narrow }: { narrow: boolean }) {
  const fig = useMemo(() => tex(`${A}/abraxas/abraxas-figura.png`), []);
  const tape = useMemo(() => tex(`${A}/cutouts/papeles/cinta-rosa-01.png`), []);
  const paper = useMemo(() => makePaper(), []);
  const ar = 1035 / 1305; // proporción real de abraxas-figura.png
  const fh = 2.85;
  const pos: [number, number, number] = narrow ? [-1.35, 0.01, -2.35] : [-2.35, 0.01, 0.2];
  const s = narrow ? 0.42 : 1;
  return (
    <group position={pos} rotation={[-Math.PI / 2, 0, narrow ? 0.08 : 0.05]} scale={s}>
      <mesh position={[0.05, -0.07, -0.002]}>
        <planeGeometry args={[2.5, 3.3]} />
        <meshBasicMaterial color="#1a1208" transparent opacity={0.28} depthWrite={false} />
      </mesh>
      <mesh>
        <planeGeometry args={[2.5, 3.3]} />
        <meshBasicMaterial map={paper} toneMapped={false} />
      </mesh>
      <mesh position={[0, -0.05, 0.004]}>
        <planeGeometry args={[fh * ar, fh]} />
        <meshBasicMaterial map={fig} transparent alphaTest={0.04} toneMapped={false} />
      </mesh>
      {[[-1.05, 1.5, 0.6], [1.05, -1.5, 0.5]].map(([x, y, r], k) => (
        <mesh key={k} position={[x, y, 0.008]} rotation={[0, 0, r]}>
          <planeGeometry args={[0.7, 0.2]} />
          <meshBasicMaterial map={tape} transparent opacity={0.85} toneMapped={false} />
        </mesh>
      ))}
    </group>
  );
}

function Table({ api, narrow, reduced }: { api: BoardApi; narrow: boolean; reduced: boolean }) {
  const kraft = useMemo(() => makeKraft(), []);
  const paper = useMemo(() => makePaper(), []);
  const sheet = useRef<THREE.Group>(null);
  const sheetPos: [number, number, number] = narrow ? [0, 0.012, 0.2] : [1.25, 0.012, 0.15];
  return (
    <>
      <mesh rotation={[-Math.PI / 2, 0, 0]} onPointerDown={() => api.select(null)}>
        <planeGeometry args={[30, 30]} />
        <meshBasicMaterial map={kraft} toneMapped={false} />
      </mesh>
      <AbraxasSheet narrow={narrow} />
      <group ref={sheet} position={sheetPos} rotation={[-Math.PI / 2, 0, narrow ? 0 : -0.025]}>
        <mesh position={[0.05, -0.07, -0.002]}>
          <planeGeometry args={[SHEET_W * K, SHEET_H * K]} />
          <meshBasicMaterial color="#1a1208" transparent opacity={0.3} depthWrite={false} />
        </mesh>
        <mesh onPointerDown={(e) => { e.stopPropagation(); api.select(null); }}>
          <planeGeometry args={[SHEET_W * K, SHEET_H * K]} />
          <meshBasicMaterial map={paper} toneMapped={false} />
        </mesh>
        {api.els.map((el, i) => <Piece key={el.id} el={el} i={i + 1} api={api} sheet={sheet} reduced={reduced} />)}
      </group>
    </>
  );
}

export default function BoardCanvas({ api, narrow, reduced, lowPower }: { api: BoardApi; narrow: boolean; reduced: boolean; lowPower: boolean }) {
  return (
    <Canvas
      dpr={lowPower ? 1 : [1, 1.75]}
      gl={{ antialias: !lowPower, alpha: false }}
      camera={{ fov: 38, near: 0.1, far: 80 }}
      onCreated={({ gl }) => gl.setClearColor("#2a2119")}
      style={{ touchAction: "none" }}
    >
      <Rig narrow={narrow} />
      <Suspense fallback={null}>
        <Table api={api} narrow={narrow} reduced={reduced} />
      </Suspense>
    </Canvas>
  );
}
