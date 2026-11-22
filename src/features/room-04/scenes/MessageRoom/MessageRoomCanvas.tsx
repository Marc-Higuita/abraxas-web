"use client";
import { Suspense, useEffect, useMemo, useRef, useState, type MutableRefObject } from "react";
import { Canvas, useFrame, useThree, type ThreeEvent } from "@react-three/fiber";
import { Html, MeshReflectorMaterial } from "@react-three/drei";
import * as THREE from "three";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import type { PublishedPiece } from "../../lib/pieces";
import { CARD_H, THREADS, slots } from "./layout";
import { CubeProvider, Installation, Mirrors, onMirror } from "./Decor";
import s from "./messageroom.module.css";

interface Props {
  pieces: PublishedPiece[];
  freshIds: Set<string>;
  selected: string | null;
  onSelect: (id: string | null) => void;
  active: boolean;
  low: boolean;
  reduced: boolean;
  progress: MutableRefObject<number>;
  playing: boolean;
  onPlayer: () => void;
}

const BG = "#1c1714";

export function MessageRoomCanvas(props: Props) {
  return (
    <Canvas
      dpr={props.low ? 1 : [1, 1.6]}
      frameloop={props.active ? "always" : "never"}
      camera={{ fov: 50, position: [0, 0.15, 4.4], near: 0.1, far: 40 }}
      gl={{ antialias: !props.low }}
      onCreated={({ gl, scene }) => { gl.setClearColor(BG); scene.fog = new THREE.Fog(BG, 8, 17); }}
      onPointerMissed={() => props.onSelect(null)}
    >
      <CubeProvider low={props.low}>
      <Env />
      <ambientLight intensity={0.55} color="#ffe2c0" />
      <spotLight position={[0, 4.5, 2.5]} angle={0.75} penumbra={0.8} intensity={38} color="#ffd9a8" decay={2} />
      <pointLight position={[-4, 1, -2]} intensity={6} color="#e07bf0" decay={2} />
      <pointLight position={[4, 0.5, 0]} intensity={5} color="#a8e6e8" decay={2} />
      <Architecture low={props.low} />
      <Mirrors />
      <Suspense fallback={null}><Installation reduced={props.reduced} low={props.low} /></Suspense>
      <Threads />
      {slots().map((s, i) => {
        const p = props.pieces[i];
        return p ? <HangingPiece key={p.id} piece={p} slot={s} fresh={props.freshIds.has(p.id)} reduced={props.reduced} onSelect={props.onSelect} index={i} /> : null;
      })}
      <Player playing={props.playing} onClick={props.onPlayer} reduced={props.reduced} />
      {!props.reduced && <Dust count={props.low ? 120 : 320} />}
      <Rig {...props} />
      </CubeProvider>
    </Canvas>
  );
}

/** Entorno generado en el navegador (sin HDR externo): da reflejos al vidrio y a los marcos. */
function Env() {
  const { gl, scene } = useThree();
  useEffect(() => {
    const pm = new THREE.PMREMGenerator(gl);
    const room = new RoomEnvironment();
    const tex = pm.fromScene(room, 0.04).texture;
    scene.environment = tex;
    scene.environmentIntensity = 0.45;
    return () => { tex.dispose(); pm.dispose(); scene.environment = null; };
  }, [gl, scene]);
  return null;
}

/** Cámara: el scroll acerca, el puntero gira un poco (arrastre limitado), y al elegir una pieza la trae al frente. */
function Rig({ pieces, selected, progress, reduced }: Props) {
  const { camera, gl } = useThree();
  const drag = useRef({ on: false, x: 0, y: 0, yaw: 0, pitch: 0 });
  const tgt = useMemo(() => new THREE.Vector3(), []);
  const look = useMemo(() => new THREE.Vector3(0, 0.3, -2.5), []);
  const lookT = useMemo(() => new THREE.Vector3(), []);
  const all = useMemo(() => slots(), []);

  useEffect(() => {
    const el = gl.domElement;
    const d = drag.current;
    const down = (e: PointerEvent) => { d.on = true; d.x = e.clientX; d.y = e.clientY; };
    const move = (e: PointerEvent) => {
      if (!d.on) return;
      d.yaw = THREE.MathUtils.clamp(d.yaw + (e.clientX - d.x) * 0.0022, -0.45, 0.45);
      d.pitch = THREE.MathUtils.clamp(d.pitch + (e.clientY - d.y) * 0.0015, -0.14, 0.14);
      d.x = e.clientX; d.y = e.clientY;
    };
    const up = () => { d.on = false; };
    el.addEventListener("pointerdown", down);
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
    return () => { el.removeEventListener("pointerdown", down); window.removeEventListener("pointermove", move); window.removeEventListener("pointerup", up); };
  }, [gl]);

  useFrame((st, dt) => {
    const k = 1 - Math.pow(0.002, dt);
    const i = selected ? pieces.findIndex((p) => p.id === selected) : -1;
    if (i >= 0) {
      const s = all[i];
      tgt.set(s.x * 0.85, s.y - 0.95, s.z + 2.1);
      lookT.set(s.x, s.y - 0.8, s.z);
    } else {
      const p = reduced ? 1 : progress.current;
      const z = 5.6 - p * 1.3;
      const { yaw, pitch } = drag.current;
      const mx = reduced ? 0 : st.pointer.x * 0.12;
      const my = reduced ? 0 : st.pointer.y * 0.06;
      tgt.set(Math.sin(yaw + mx) * z * 0.5, 0.15 + pitch * 3 + my, z);
      lookT.set(0, 0.25, -2.5);
    }
    camera.position.lerp(tgt, k);
    look.lerp(lookT, k);
    camera.lookAt(look);
  });
  return null;
}

function Architecture({ low }: { low: boolean }) {
  const wall = useMemo(() => new THREE.MeshStandardMaterial({ color: "#3a2c22", roughness: 0.92 }), []);
  const frame = useMemo(() => new THREE.MeshStandardMaterial({ color: "#d4a12a", metalness: 0.85, roughness: 0.3 }), []);
  return (
    <group>
      {/* paredes */}
      <mesh position={[0, 1, -6.2]} material={wall}><planeGeometry args={[16, 8]} /></mesh>
      <mesh position={[-6.5, 1, -1]} rotation={[0, Math.PI / 2, 0]} material={wall}><planeGeometry args={[14, 8]} /></mesh>
      <mesh position={[6.5, 1, -1]} rotation={[0, -Math.PI / 2, 0]} material={wall}><planeGeometry args={[14, 8]} /></mesh>
      <mesh position={[0, 4.4, -1]} rotation={[Math.PI / 2, 0, 0]}><planeGeometry args={[16, 14]} /><meshStandardMaterial color="#241b15" /></mesh>

      {/* piso espejado: reflejo real de toda la instalación */}
      <mesh position={[0, -2.2, -1]} rotation={[-Math.PI / 2, 0, 0]} onUpdate={onMirror}>
        <planeGeometry args={[16, 14]} />
        <MeshReflectorMaterial resolution={low ? 256 : 768} blur={low ? [200, 60] : [320, 90]} mixBlur={0.9} mixStrength={low ? 1.4 : 2.2} roughness={0.75} depthScale={1} minDepthThreshold={0.4} maxDepthThreshold={1.3} color="#2a211b" metalness={0.5} mirror={0.55} />
      </mesh>

      {/* espejo ovalado en la pared izquierda, marco punteado dorado */}
      <group position={[-6.45, 0.6, -2.4]} rotation={[0, Math.PI / 2, 0]}>
        <mesh scale={[1, 1.35, 1]} onUpdate={onMirror}>
          <circleGeometry args={[1.25, 64]} />
          {low ? <meshStandardMaterial color="#c9cdd3" metalness={1} roughness={0.08} /> : <MeshReflectorMaterial resolution={512} mirror={1} blur={[0, 0]} mixBlur={0} mixStrength={1} color="#d8dce2" metalness={0} roughness={0} />}
        </mesh>
        <DottedRing r={1.32} sy={1.35} material={frame} n={64} />
      </group>

      {/* espejo alto en el fondo: duplica los hilos y alarga la habitación */}
      <group position={[3.4, 0.7, -6.15]}>
        <mesh onUpdate={onMirror}>
          <planeGeometry args={[1.9, 3.6]} />
          {low ? <meshStandardMaterial color="#c9cdd3" metalness={1} roughness={0.1} /> : <MeshReflectorMaterial resolution={512} mirror={1} blur={[0, 0]} mixBlur={0} mixStrength={1} color="#d8dce2" metalness={0} roughness={0} />}
        </mesh>
        {[[0, 1.86, 2.06, 0.1], [0, -1.86, 2.06, 0.1], [-1.0, 0, 0.1, 3.82], [1.0, 0, 0.1, 3.82]].map(([x, y, w, h], i) => (
          <mesh key={i} position={[x, y, 0.03]} material={frame}><boxGeometry args={[w, h, 0.06]} /></mesh>
        ))}
      </group>

      {/* paneles de vidrio de pie: refractan las piezas que cuelgan detrás */}
      {(low ? [[-3.3, -0.5, -1.9, 0.5]] : [[-3.3, -0.5, -1.9, 0.5], [2.7, -0.6, -3.5, -0.4]]).map(([x, y, z, ry], i) => (
        <group key={i} position={[x, y, z]} rotation={[0, ry, 0]}>
          <mesh>
            <boxGeometry args={[1.5, 3.2, 0.06]} />
            <meshPhysicalMaterial transmission={1} roughness={0.12} thickness={0.4} ior={1.45} color="#e9f4f4" metalness={0} transparent opacity={low ? 0.35 : 1} envMapIntensity={1.2} />
          </mesh>
          <mesh position={[0, -1.66, 0]} material={frame}><boxGeometry args={[1.6, 0.12, 0.2]} /></mesh>
        </group>
      ))}
    </group>
  );
}

function DottedRing({ r, sy, n, material }: { r: number; sy: number; n: number; material: THREE.Material }) {
  const pts = useMemo(() => Array.from({ length: n }, (_, i) => { const a = (i / n) * Math.PI * 2; return [Math.cos(a) * r, Math.sin(a) * r * sy] as const; }), [r, sy, n]);
  return <>{pts.map(([x, y], i) => <mesh key={i} position={[x, y, 0.02]} material={material}><sphereGeometry args={[0.045, 10, 8]} /></mesh>)}</>;
}

function Threads() {
  return (
    <group>
      {THREADS.map((t, i) => (
        <mesh key={i} position={[0, t.y + 0.06, t.z]} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.006, 0.006, 13, 5]} />
          <meshBasicMaterial color="#e8dcc4" />
        </mesh>
      ))}
    </group>
  );
}

/** Tarjeta de mensaje dibujada en canvas (no depende de fuentes externas). */
function useMessageTexture(piece: PublishedPiece) {
  return useMemo(() => {
    const W = 640, H = 300;
    const c = document.createElement("canvas");
    c.width = W; c.height = H;
    const g = c.getContext("2d")!;
    g.fillStyle = "#f3eee3"; g.fillRect(0, 0, W, H);
    g.strokeStyle = "rgba(35,64,168,0.18)"; g.lineWidth = 2;
    for (let y = 70; y < H; y += 38) { g.beginPath(); g.moveTo(24, y); g.lineTo(W - 24, y); g.stroke(); }
    g.strokeStyle = "rgba(200,30,110,0.35)"; g.beginPath(); g.moveTo(54, 0); g.lineTo(54, H); g.stroke();
    g.fillStyle = "#121110"; g.font = "500 30px Arial, sans-serif"; g.textBaseline = "alphabetic";
    const words = piece.message.split(/\s+/);
    let line = "", y = 62; const lines: string[] = [];
    for (const w of words) { const t = line ? line + " " + w : w; if (g.measureText(t).width > W - 100) { lines.push(line); line = w; } else line = t; }
    if (line) lines.push(line);
    const shown = lines.slice(0, 5);
    if (lines.length > 5) shown[4] = shown[4].replace(/\s*\S*$/, "") + "…";
    for (const l of shown) { g.fillText(l, 70, y); y += 38; }
    if (piece.signature) { g.fillStyle = "#7d5a10"; g.font = "italic 24px Arial, sans-serif"; g.fillText("— " + piece.signature, 70, H - 18); }
    const tx = new THREE.CanvasTexture(c);
    tx.colorSpace = THREE.SRGBColorSpace; tx.anisotropy = 4;
    return tx;
  }, [piece.message, piece.signature]);
}

function usePieceImage(src: string | null) {
  const [state, setState] = useState<{ tex: THREE.Texture; aspect: number } | null>(null);
  useEffect(() => {
    if (!src) return;
    let alive = true;
    const l = new THREE.TextureLoader();
    l.setCrossOrigin("anonymous");
    l.load(src, (tex) => {
      if (!alive) { tex.dispose(); return; }
      tex.colorSpace = THREE.SRGBColorSpace;
      const im = tex.image as HTMLImageElement;
      setState({ tex, aspect: im.width / im.height || 0.7 });
    }, undefined, () => alive && setState(null));
    return () => { alive = false; };
  }, [src]);
  useEffect(() => () => state?.tex.dispose(), [state]);
  return state;
}

function HangingPiece({ piece, slot, fresh, reduced, onSelect, index }: { piece: PublishedPiece; slot: ReturnType<typeof slots>[number]; fresh: boolean; reduced: boolean; onSelect: (id: string) => void; index: number }) {
  const g = useRef<THREE.Group>(null);
  const img = usePieceImage(piece.image);
  const msg = useMessageTexture(piece);
  const [hover, setHover] = useState(false);
  const anim = useRef({ y: fresh && !reduced ? 4 : 0, v: 0, sway: fresh && !reduced ? 0.35 : 0.05, phase: index * 1.37 });
  useEffect(() => () => msg.dispose(), [msg]);

  const aspect = img?.aspect ?? 0.72;
  const h = CARD_H, w = Math.min(h * aspect, 1.35);
  const hh = w / aspect;

  useFrame((st, dt) => {
    const a = anim.current;
    if (!g.current) return;
    // caída con resorte: la pieza llega por el hilo y rebota hasta quedar colgada
    a.v += (-a.y * 60 - a.v * 7) * Math.min(dt, 0.05);
    a.y += a.v * Math.min(dt, 0.05);
    a.sway += (0.045 - a.sway) * Math.min(dt * 0.6, 1);
    const t = st.clock.elapsedTime;
    g.current.position.set(slot.x, slot.y + a.y, slot.z);
    g.current.rotation.z = reduced ? 0 : Math.sin(t * 1.1 + a.phase) * a.sway;
    g.current.rotation.y = reduced ? 0 : Math.sin(t * 0.6 + a.phase) * 0.08 + (hover ? 0.12 : 0);
    const s = THREE.MathUtils.lerp(g.current.scale.x, hover ? 1.06 : 1, 0.15);
    g.current.scale.setScalar(s);
  });

  const over = (e: ThreeEvent<PointerEvent>) => { e.stopPropagation(); setHover(true); document.body.style.cursor = "pointer"; };
  const out = () => { setHover(false); document.body.style.cursor = ""; };

  return (
    <group ref={g} onClick={(e) => { e.stopPropagation(); onSelect(piece.id); }} onPointerOver={over} onPointerOut={out}>
      {/* pinza */}
      <mesh position={[0, 0.02, 0.02]}><boxGeometry args={[0.07, 0.2, 0.05]} /><meshStandardMaterial color="#c9a878" roughness={0.8} /></mesh>
      {/* cartón de respaldo con borde de recorte */}
      <mesh position={[0, -0.06 - hh / 2, -0.005]}><planeGeometry args={[w + 0.08, hh + 0.08]} /><meshStandardMaterial color={hover ? "#f6dc8c" : "#e9dfcb"} roughness={0.95} /></mesh>
      <mesh position={[0, -0.06 - hh / 2, 0]}>
        <planeGeometry args={[w, hh]} />
        {img ? <meshBasicMaterial map={img.tex} transparent alphaTest={0.05} toneMapped={false} side={THREE.DoubleSide} /> : <meshBasicMaterial color="#c9a878" />}
      </mesh>
      {/* hilo corto y tarjeta del mensaje debajo */}
      <mesh position={[0, -0.12 - hh - 0.08, 0]}><cylinderGeometry args={[0.004, 0.004, 0.16, 4]} /><meshBasicMaterial color="#e8dcc4" /></mesh>
      <mesh position={[0, -0.2 - hh - 0.2, 0.01]} rotation={[0, 0, 0.02]}>
        <planeGeometry args={[1.0, 0.47]} />
        <meshStandardMaterial map={msg} roughness={0.95} />
      </mesh>
      {piece.local && <mesh position={[w / 2 - 0.08, -0.1, 0.01]}><circleGeometry args={[0.06, 20]} /><meshBasicMaterial color="#d9f24a" /></mesh>}
    </group>
  );
}

/**
 * Tocadiscos: objeto protagonista al frente a la derecha, con su propia luz cálida.
 * Tocarlo inicia la playlist (controlador oficial de Spotify) y tocarlo de nuevo la pausa.
 * El vinilo gira solo mientras suena.
 */
function Player({ playing, onClick, reduced }: { playing: boolean; onClick: () => void; reduced: boolean }) {
  const disc = useRef<THREE.Mesh>(null);
  const arm = useRef<THREE.Group>(null);
  const spot = useRef<THREE.SpotLight>(null);
  const root = useRef<THREE.Group>(null);
  const halo = useRef<THREE.Mesh>(null);
  const speed = useRef(0);
  const [hover, setHover] = useState(false);
  const label = useMemo(() => {
    const c = document.createElement("canvas"); c.width = c.height = 512;
    const g = c.getContext("2d")!;
    g.fillStyle = "#c81e6e"; g.beginPath(); g.arc(256, 256, 256, 0, Math.PI * 2); g.fill();
    g.fillStyle = "#f2b90f"; g.beginPath(); g.arc(256, 256, 170, 0, Math.PI * 2); g.fill();
    g.strokeStyle = "rgba(18,17,16,.5)"; g.setLineDash([6, 8]); g.lineWidth = 4; g.beginPath(); g.arc(256, 256, 150, 0, Math.PI * 2); g.stroke();
    g.fillStyle = "#121110"; g.font = "bold 62px Arial"; g.textAlign = "center"; g.fillText("ABRAXAS", 256, 238); g.font = "34px Arial"; g.fillText("playlist · sala 04", 256, 296);
    g.beginPath(); g.arc(256, 256, 14, 0, Math.PI * 2); g.fill();
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; return t;
  }, []);
  const grooves = useMemo(() => {
    const c = document.createElement("canvas"); c.width = c.height = 512;
    const g = c.getContext("2d")!;
    g.fillStyle = "#0c0b0a"; g.fillRect(0, 0, 512, 512);
    for (let r = 120; r < 256; r += 3) { g.strokeStyle = `rgba(255,255,255,${0.03 + (r % 9 === 0 ? 0.05 : 0)})`; g.beginPath(); g.arc(256, 256, r, 0, Math.PI * 2); g.stroke(); }
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
  }, []);
  useEffect(() => () => { label.dispose(); grooves.dispose(); }, [label, grooves]);
  useEffect(() => { if (spot.current && root.current) spot.current.target = root.current; }, []);

  useFrame((st, dt) => {
    speed.current = THREE.MathUtils.lerp(speed.current, playing ? 3.5 : 0, Math.min(dt * 2, 1));
    if (disc.current && !reduced) disc.current.rotation.y -= speed.current * dt;
    if (arm.current) arm.current.rotation.y = THREE.MathUtils.lerp(arm.current.rotation.y, playing ? -0.42 : 0, Math.min(dt * 3, 1));
    if (halo.current) {
      const m = halo.current.material as THREE.MeshBasicMaterial;
      const pulse = reduced ? 0.5 : 0.45 + Math.sin(st.clock.elapsedTime * 2.2) * 0.15;
      m.opacity = THREE.MathUtils.lerp(m.opacity, hover ? 0.9 : playing ? 0.55 : pulse, 0.1);
    }
  });

  const over = (e: ThreeEvent<PointerEvent>) => { e.stopPropagation(); setHover(true); document.body.style.cursor = "pointer"; };
  const out = () => { setHover(false); document.body.style.cursor = ""; };
  const tap = (e: ThreeEvent<MouseEvent>) => { e.stopPropagation(); onClick(); };

  return (
    <group position={[1.95, -1.12, 0.95]} rotation={[0.12, -0.5, 0]}>
      <spotLight ref={spot} position={[0.6, 3.2, 1.6]} angle={0.42} penumbra={0.7} intensity={26} color="#ffcf8a" decay={1.6} distance={9} />
      <pointLight position={[0, 0.9, 0.6]} intensity={2.2} color="#ffd9a8" decay={2} distance={3} />
      <group ref={root} scale={1.45} onClick={tap} onPointerOver={over} onPointerOut={out}>
        {/* mueble de nogal con pata dorada */}
        <mesh position={[0, -0.62, 0]}><boxGeometry args={[1.3, 1.0, 1.02]} /><meshStandardMaterial color="#4a2f1c" roughness={0.55} metalness={0.05} /></mesh>
        <mesh position={[0, -0.62, 0.515]}><planeGeometry args={[1.1, 0.8]} /><meshStandardMaterial color="#c9a878" roughness={0.9} /></mesh>
        <mesh position={[0, -0.1, 0]}><boxGeometry args={[1.38, 0.14, 1.08]} /><meshStandardMaterial color="#6b4428" roughness={0.4} metalness={0.1} /></mesh>
        <mesh position={[0, -0.025, 0]}><boxGeometry args={[1.4, 0.012, 1.1]} /><meshStandardMaterial color="#d4a12a" metalness={0.9} roughness={0.25} /></mesh>
        {/* halo de invitación bajo el plato */}
        <mesh ref={halo} position={[-0.12, -0.012, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[0.47, 0.58, 64]} />
          <meshBasicMaterial color="#f2b90f" transparent opacity={0.5} toneMapped={false} />
        </mesh>
        {/* plato metálico y vinilo con surcos */}
        <mesh position={[-0.12, 0.0, 0]}><cylinderGeometry args={[0.46, 0.46, 0.045, 64]} /><meshStandardMaterial color="#c9cdd3" metalness={0.95} roughness={0.18} /></mesh>
        <mesh ref={disc} position={[-0.12, 0.035, 0]}>
          <cylinderGeometry args={[0.43, 0.43, 0.012, 96]} />
          <meshStandardMaterial attach="material-0" color="#121110" />
          <meshStandardMaterial attach="material-1" map={label} roughness={0.35} />
          <meshStandardMaterial attach="material-2" map={grooves} roughness={0.25} metalness={0.3} />
        </mesh>
        {/* brazo */}
        <group ref={arm} position={[0.46, 0.06, -0.34]}>
          <mesh position={[0, 0.03, 0]}><cylinderGeometry args={[0.06, 0.07, 0.1, 24]} /><meshStandardMaterial color="#d4a12a" metalness={0.85} roughness={0.25} /></mesh>
          <mesh position={[-0.08, 0.08, 0.26]} rotation={[0, 0.3, 0]}><boxGeometry args={[0.03, 0.022, 0.6]} /><meshStandardMaterial color="#e3e7ec" metalness={0.95} roughness={0.15} /></mesh>
          <mesh position={[-0.17, 0.07, 0.55]} rotation={[0, 0.3, 0]}><boxGeometry args={[0.07, 0.03, 0.1]} /><meshStandardMaterial color="#121110" /></mesh>
        </group>
        {/* botón */}
        <mesh position={[0.5, 0.0, 0.36]}><cylinderGeometry args={[0.07, 0.07, 0.05, 24]} /><meshStandardMaterial color={playing ? "#d9f24a" : "#d9341f"} emissive={playing ? "#556b00" : "#5a1208"} emissiveIntensity={1.2} /></mesh>
        <Html position={[0, 0.62, 0]} center zIndexRange={[20, 0]} style={{ pointerEvents: "none" }}>
          <span className={`${s.playTag} ${playing ? s.playTagOn : ""}`}>{playing ? "Sonando · toca para pausar" : "Toca para escuchar"}</span>
        </Html>
      </group>
    </group>
  );
}

function Dust({ count }: { count: number }) {
  const ref = useRef<THREE.Points>(null);
  const geo = useMemo(() => {
    const g = new THREE.BufferGeometry();
    const p = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) { p[i * 3] = (Math.random() - 0.5) * 12; p[i * 3 + 1] = Math.random() * 6 - 2; p[i * 3 + 2] = -Math.random() * 7 + 1.5; }
    g.setAttribute("position", new THREE.BufferAttribute(p, 3));
    return g;
  }, [count]);
  useFrame((st) => { if (ref.current) { ref.current.rotation.y = st.clock.elapsedTime * 0.015; ref.current.position.y = Math.sin(st.clock.elapsedTime * 0.2) * 0.15; } });
  return (
    <points ref={ref} geometry={geo}>
      <pointsMaterial size={0.03} color="#f6dc8c" transparent opacity={0.55} depthWrite={false} blending={THREE.AdditiveBlending} />
    </points>
  );
}
