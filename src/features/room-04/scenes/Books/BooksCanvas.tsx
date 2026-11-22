"use client";
import { useEffect, useMemo, useRef } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import type { Book } from "../../types";
import { useRoom } from "../../store";

const W = 1.3;
const H = 1.85;
const BOARD = 0.035;
const SLOTS = [-1.95, 0, 1.95];

interface Props {
  /** Página real del PDF que se ve dentro del libro abierto (la de la cita activa). */
  pageUrl: string | null;
  books: Book[];
  selected: number | null;
  onSelect: (i: number) => void;
  active: boolean;
}

export function BooksCanvas(props: Props) {
  const low = useRoom((s) => s.lowPower);
  return (
    <Canvas
      shadows={low ? false : { type: THREE.PCFShadowMap }}
      dpr={low ? 1 : [1, 1.75]}
      frameloop={props.active ? "always" : "never"}
      camera={{ fov: 38, position: [0, 0.25, 6.6] }}
      gl={{ antialias: true }}
      onCreated={({ gl }) => { gl.setClearColor("#121110"); gl.toneMapping = THREE.ACESFilmicToneMapping; }}
    >
      <ambientLight intensity={0.55} />
      <directionalLight position={[3, 5, 4]} intensity={2.2} castShadow shadow-mapSize={[1024, 1024]} />
      <directionalLight position={[-4, 2, -2]} intensity={0.6} color="#f6dc8c" />
      <mesh rotation-x={-Math.PI / 2} position={[0, -1.25, 0]} receiveShadow>
        <planeGeometry args={[30, 30]} />
        <shadowMaterial opacity={0.45} />
      </mesh>
      {props.books.map((b, i) => (
        <Book3D key={b.id} book={b} index={i} selected={props.selected} onSelect={props.onSelect} pageUrl={props.selected === i ? props.pageUrl : null} />
      ))}
      <CameraRig selected={props.selected} />
    </Canvas>
  );
}

function CameraRig({ selected }: { selected: number | null }) {
  const { camera, pointer } = useThree();
  const reduced = useRoom((s) => s.reducedMotion);
  useFrame((_, dt) => {
    const z = selected === null ? 6.6 : 5.7;
    const k = reduced ? 1 : 1 - Math.exp(-dt * 3);
    camera.position.z += (z - camera.position.z) * k;
    camera.position.x += (pointer.x * 0.35 - camera.position.x) * k;
    camera.lookAt(0, 0, 0);
  });
  return null;
}

function useTexture(url: string | null) {
  const tex = useMemo(() => (url ? new THREE.TextureLoader().load(url, (t) => { t.colorSpace = THREE.SRGBColorSpace; }) : null), [url]);
  useEffect(() => () => tex?.dispose(), [tex]);
  return tex;
}

function Book3D({ book, index, selected, onSelect, pageUrl }: { book: Book; index: number; selected: number | null; onSelect: (i: number) => void; pageUrl: string | null }) {
  const root = useRef<THREE.Group>(null);
  const hinge = useRef<THREE.Group>(null);
  const reduced = useRoom((s) => s.reducedMotion);
  const cover = useTexture(book.cover);
  const pageTex = useTexture(pageUrl);
  const T = book.thickness;
  const pending = book.status === "pendiente";

  const boardMat = useMemo(() => new THREE.MeshStandardMaterial({ color: book.color, roughness: 0.7 }), [book.color]);
  const spineMat = useMemo(() => new THREE.MeshStandardMaterial({ color: book.spine, roughness: 0.5, metalness: 0.15 }), [book.spine]);
  const coverFace = useMemo(
    () => new THREE.MeshStandardMaterial({ map: cover, color: cover ? "#ffffff" : book.color, roughness: 0.62, transparent: pending, opacity: pending ? 0.9 : 1 }),
    [cover, book.color, pending],
  );
  const insideMat = useMemo(() => new THREE.MeshStandardMaterial({ color: "#efe7d6", roughness: 0.9 }), []);
  // orden de caras de BoxGeometry: +x, -x, +y, -y, +z, -z
  const frontMats = useMemo(() => [boardMat, boardMat, boardMat, boardMat, coverFace, insideMat], [boardMat, coverFace, insideMat]);
  const pageMat = useMemo(() => {
    // bloque de páginas con líneas finas
    const c = document.createElement("canvas");
    c.width = 64; c.height = 256;
    const g = c.getContext("2d")!;
    g.fillStyle = "#f3eee3"; g.fillRect(0, 0, 64, 256);
    g.fillStyle = "rgba(110,104,95,0.25)";
    for (let x = 0; x < 64; x += 3) g.fillRect(x, 0, 1, 256);
    const t = new THREE.CanvasTexture(c);
    return new THREE.MeshStandardMaterial({ map: t, roughness: 0.95 });
  }, []);
  const pageFace = useMemo(() => new THREE.MeshStandardMaterial({ map: pageTex, color: pageTex ? "#ffffff" : "#f3eee3", roughness: 0.92 }), [pageTex]);
  const blockMats = useMemo(() => [pageMat, pageMat, pageMat, pageMat, pageFace, pageMat], [pageMat, pageFace]);
  useEffect(() => () => pageFace.dispose(), [pageFace]);
  useEffect(() => () => { [boardMat, spineMat, coverFace, insideMat, pageMat].forEach((m) => { m.map?.dispose(); m.dispose(); }); }, [boardMat, spineMat, coverFace, insideMat, pageMat]);

  const state = useRef({ open: 0 });
  useFrame((st, dt) => {
    const g = root.current;
    const h = hinge.current;
    if (!g || !h) return;
    const isSel = selected === index;
    const others = selected !== null && !isSel;
    const wide = st.size.width > 860;
    const tx = isSel ? (wide ? -0.95 : 0) : others ? (index < (selected ?? 0) ? -3.7 : 3.7) : SLOTS[index];
    const tz = isSel ? 0.35 : others ? -1.6 : 0;
    const ty = isSel ? (wide ? -0.05 : 0.95) : 0;
    const tryaw = isSel ? 0.12 : others ? (index < (selected ?? 0) ? 0.6 : -0.6) : (index - 1) * -0.32;
    const k = reduced ? 1 : 1 - Math.exp(-dt * 3.2);
    g.position.x += (tx - g.position.x) * k;
    g.position.z += (tz - g.position.z) * k;
    g.position.y += (ty + (reduced || isSel ? 0 : Math.sin(st.clock.elapsedTime * 0.8 + index * 2) * 0.05) - g.position.y) * k;
    g.rotation.y += (tryaw - g.rotation.y) * k;
    const sc = others ? 0.7 : isSel ? (wide ? 0.86 : 0.55) : 1;
    g.scale.setScalar(g.scale.x + (sc - g.scale.x) * k);
    const target = isSel && !pending ? 1 : isSel && pending ? 0.18 : 0;
    state.current.open += (target - state.current.open) * (reduced ? 1 : 1 - Math.exp(-dt * 2.4));
    h.rotation.y = -state.current.open * 2.55;
  });

  return (
    <group
      ref={root}
      position={[SLOTS[index], 0, 0]}
      onClick={(e) => { e.stopPropagation(); onSelect(index); }}
      onPointerOver={() => { document.body.style.cursor = "pointer"; }}
      onPointerOut={() => { document.body.style.cursor = ""; }}
    >
      {/* contracubierta */}
      <mesh position={[0, 0, -T / 2 + BOARD / 2]} castShadow material={boardMat}>
        <boxGeometry args={[W, H, BOARD]} />
      </mesh>
      {/* lomo */}
      <mesh position={[-W / 2 + BOARD / 2, 0, 0]} castShadow material={spineMat}>
        <boxGeometry args={[BOARD * 1.4, H, T]} />
      </mesh>
      {/* bloque de páginas */}
      <mesh position={[0.01, 0, 0]} castShadow material={blockMats}>
        <boxGeometry args={[W - 0.06, H - 0.06, T - BOARD * 2]} />
      </mesh>
      {/* cubierta frontal con bisagra en el lomo */}
      <group ref={hinge} position={[-W / 2, 0, T / 2 - BOARD / 2]}>
        <mesh position={[W / 2, 0, 0]} castShadow material={frontMats}>
          <boxGeometry args={[W, H, BOARD]} />
        </mesh>
      </group>
    </group>
  );
}
