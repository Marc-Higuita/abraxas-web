"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createRoot, type Root } from "react-dom/client";
import { useFrame, useLoader } from "@react-three/fiber";
import { Html } from "@react-three/drei";
import * as THREE from "three";
import { sound } from "@/lib/audio/useSound";
import { ROOM } from "./layout";
import { TypewriterReader, TYPEWRITER_QUOTES } from "./TypewriterReader";
import s from "./objects.module.css";

/**
 * Objetos de la habitación de mensajes (R4-D · 08.6), todos procedurales y ligeros:
 * - máquina de escribir sobre una mesa: al tocarla escribe una frase documentada de Abraxas;
 * - silla de madera como la de su oficina: al acercar el cursor gira y deja ver una foto de archivo;
 * - pila de códigos de derecho (como los de su escritorio): el libro de arriba se entreabre.
 * Están al frente a la izquierda, lejos del tocadiscos (frente derecha) y de los espejos portal.
 */

const F = ROOM.floor;
const WOOD = "#5a3a22";
const WOOD_D = "#3d2716";

function useCursor(on: boolean) {
  useEffect(() => {
    if (!on) return;
    document.body.style.cursor = "pointer";
    return () => { document.body.style.cursor = ""; };
  }, [on]);
}

/** la hoja se dibuja fuera del canvas, en su propia raíz de React sobre el documento */
function useOverlay() {
  const root = useRef<{ el: HTMLDivElement; r: Root } | null>(null);
  useEffect(() => () => {
    const cur = root.current;
    root.current = null;
    if (cur) setTimeout(() => { cur.r.unmount(); cur.el.remove(); }, 0);
  }, []);
  return useCallback((node: React.ReactNode | null) => {
    if (!root.current) {
      if (!node) return;
      const el = document.createElement("div");
      document.body.appendChild(el);
      root.current = { el, r: createRoot(el) };
    }
    root.current.r.render(node);
  }, []);
}

function Typewriter({ reduced }: { reduced: boolean }) {
  const [hover, setHover] = useState(false);
  const [open, setOpen] = useState(false);
  const idx = useRef(0);
  const paper = useRef<THREE.Mesh>(null);
  const render = useOverlay();
  const returnFocus = useRef<Element | null>(null);
  useCursor(hover);

  useEffect(() => {
    if (!open) { render(null); return; }
    const close = () => { setOpen(false); (returnFocus.current as HTMLElement | null)?.focus?.({ preventScroll: true }); };
    const draw = () => render(<TypewriterReader key={idx.current} index={idx.current} reduced={reduced} onClose={close} onNext={() => { idx.current++; draw(); }} />);
    draw();
  }, [open, reduced, render]);

  useFrame((_, dt) => {
    if (!paper.current) return;
    const target = hover || open ? 0.2 : 0;
    paper.current.position.y += (0.42 + target - paper.current.position.y) * Math.min(1, dt * 6);
  });

  const keys = useMemo(() => {
    const out: [number, number][] = [];
    [10, 10, 9, 8].forEach((n, row) => { for (let i = 0; i < n; i++) out.push([(i - (n - 1) / 2) * 0.085 + row * 0.02, row]); });
    return out;
  }, []);

  return (
    <group
      position={[0, 0.82, 0]}
      onPointerOver={(e) => { e.stopPropagation(); setHover(true); }}
      onPointerOut={() => setHover(false)}
      onClick={(e) => { e.stopPropagation(); returnFocus.current = document.activeElement; idx.current = Math.floor(Math.random() * Math.max(1, TYPEWRITER_QUOTES.length)); setOpen(true); }}
    >
      {/* cuerpo */}
      <mesh position={[0, 0.11, 0]} castShadow><boxGeometry args={[0.95, 0.22, 0.62]} /><meshStandardMaterial color="#1f2a24" metalness={0.45} roughness={0.35} /></mesh>
      <mesh position={[0, 0.27, -0.13]} rotation={[-0.35, 0, 0]}><boxGeometry args={[0.9, 0.16, 0.36]} /><meshStandardMaterial color="#26332c" metalness={0.45} roughness={0.35} /></mesh>
      {/* rodillo */}
      <mesh position={[0, 0.4, -0.22]} rotation={[0, 0, Math.PI / 2]}><cylinderGeometry args={[0.06, 0.06, 1.05, 20]} /><meshStandardMaterial color="#0d0d0c" roughness={0.6} /></mesh>
      {[-0.56, 0.56].map((x) => (
        <mesh key={x} position={[x, 0.4, -0.22]} rotation={[0, 0, Math.PI / 2]}><cylinderGeometry args={[0.04, 0.04, 0.08, 12]} /><meshStandardMaterial color="#c9b37a" metalness={0.9} roughness={0.25} /></mesh>
      ))}
      {/* hoja que asoma (sube al acercarse) */}
      <mesh ref={paper} position={[0, 0.42, -0.25]} rotation={[-0.2, 0, 0]}>
        <planeGeometry args={[0.6, 0.55]} />
        <meshStandardMaterial color="#f6f1e4" roughness={0.95} side={THREE.DoubleSide} />
      </mesh>
      {/* teclas */}
      {keys.map(([x, row], i) => (
        <mesh key={i} position={[x, 0.24 + row * 0.03, 0.24 - row * 0.075]}>
          <cylinderGeometry args={[0.027, 0.027, 0.03, 12]} />
          <meshStandardMaterial color={hover ? "#fff6dc" : "#efe6d2"} roughness={0.5} emissive={hover ? "#5a4210" : "#000"} emissiveIntensity={0.25} />
        </mesh>
      ))}
      <mesh position={[0, 0.235, 0.33]}><boxGeometry args={[0.42, 0.025, 0.05]} /><meshStandardMaterial color="#efe6d2" roughness={0.5} /></mesh>
      {!open && (
        <Html position={[0, 0.98, 0]} center zIndexRange={[20, 0]}>
          <span className={`${s.tag} ${hover ? s.tagOn : ""}`}>{hover ? "Toca la máquina: una frase de Abraxas" : "Toca la máquina"}</span>
        </Html>
      )}
    </group>
  );
}

function Table() {
  return (
    <group>
      <mesh position={[0, 0.79, 0]} castShadow receiveShadow><boxGeometry args={[1.7, 0.07, 0.95]} /><meshStandardMaterial color={WOOD} roughness={0.7} /></mesh>
      {[[-0.78, -0.4], [0.78, -0.4], [-0.78, 0.4], [0.78, 0.4]].map(([x, z], i) => (
        <mesh key={i} position={[x, 0.38, z]}><boxGeometry args={[0.07, 0.76, 0.07]} /><meshStandardMaterial color={WOOD_D} roughness={0.8} /></mesh>
      ))}
      {/* papeles sueltos sobre la mesa */}
      <mesh position={[0.6, 0.83, 0.18]} rotation={[-Math.PI / 2, 0, 0.3]}><planeGeometry args={[0.32, 0.42]} /><meshStandardMaterial color="#efe6d2" roughness={0.95} /></mesh>
      <mesh position={[0.66, 0.832, 0.12]} rotation={[-Math.PI / 2, 0, -0.2]}><planeGeometry args={[0.3, 0.4]} /><meshStandardMaterial color="#e9dfcb" roughness={0.95} /></mesh>
    </group>
  );
}

function Chair({ reduced }: { reduced: boolean }) {
  const [near, setNear] = useState(false);
  const g = useRef<THREE.Group>(null);
  const photo = useRef<THREE.Mesh>(null);
  const tex = useLoader(THREE.TextureLoader, "/assets/room-04/messageroom/diploma.jpg");
  useMemo(() => { tex.colorSpace = THREE.SRGBColorSpace; }, [tex]);
  useFrame((_, dt) => {
    const k = Math.min(1, dt * (reduced ? 30 : 4));
    if (g.current) g.current.rotation.y += ((near ? -0.55 : -0.2) - g.current.rotation.y) * k;
    if (photo.current) {
      const t = near ? 1 : 0;
      photo.current.scale.setScalar(photo.current.scale.x + (0.001 + t - photo.current.scale.x) * k);
      photo.current.position.y += ((near ? 0.62 : 0.5) - photo.current.position.y) * k;
    }
  });
  const leg = (x: number, z: number, h: number, y: number) => (
    <mesh position={[x, y, z]}><boxGeometry args={[0.05, h, 0.05]} /><meshStandardMaterial color={WOOD_D} roughness={0.75} /></mesh>
  );
  return (
    <group ref={g} rotation={[0, -0.2, 0]} onPointerOver={(e) => { e.stopPropagation(); setNear(true); }} onPointerOut={() => setNear(false)}>
      <mesh position={[0, 0.47, 0]}><boxGeometry args={[0.5, 0.05, 0.48]} /><meshStandardMaterial color={WOOD} roughness={0.7} /></mesh>
      {leg(-0.22, -0.21, 0.46, 0.23)}{leg(0.22, -0.21, 0.46, 0.23)}{leg(-0.22, 0.21, 0.46, 0.23)}{leg(0.22, 0.21, 0.46, 0.23)}
      {leg(-0.22, -0.22, 0.6, 0.79)}{leg(0.22, -0.22, 0.6, 0.79)}
      <mesh position={[0, 0.98, -0.22]}><boxGeometry args={[0.48, 0.16, 0.04]} /><meshStandardMaterial color={WOOD} roughness={0.7} /></mesh>
      <mesh position={[0, 0.72, -0.22]}><boxGeometry args={[0.48, 0.05, 0.03]} /><meshStandardMaterial color={WOOD_D} roughness={0.7} /></mesh>
      {/* cojín azul, como el de la silla del escritorio */}
      <mesh position={[0, 0.51, 0.01]}><boxGeometry args={[0.44, 0.04, 0.42]} /><meshStandardMaterial color="#1c2a4a" roughness={0.9} /></mesh>
      {/* foto de archivo que aparece apoyada en el asiento */}
      <mesh ref={photo} position={[0, 0.5, -0.12]} rotation={[-0.25, 0, 0.06]} scale={0.001}>
        <planeGeometry args={[0.34, 0.44]} />
        <meshStandardMaterial map={tex} roughness={0.8} side={THREE.DoubleSide} />
      </mesh>
      {near && (
        <Html position={[0, 1.25, 0]} center zIndexRange={[20, 0]}>
          <span className={s.tag}>Diploma de abogada · UNAULA</span>
        </Html>
      )}
    </group>
  );
}

const SPINES = [
  { t: "CÓDIGO CIVIL", c: "#1f4a33" }, { t: "CÓDIGO PENAL", c: "#24402f" }, { t: "PROCEDIMIENTO PENAL", c: "#1b3a2a" },
  { t: "CÓDIGO DE COMERCIO", c: "#2c4f3a" }, { t: "LEGISLACIÓN LABORAL", c: "#203d2e" },
];

function spineTex(text: string, color: string) {
  const c = document.createElement("canvas"); c.width = 512; c.height = 64;
  const g = c.getContext("2d")!;
  g.fillStyle = color; g.fillRect(0, 0, 512, 64);
  g.fillStyle = "rgba(255,255,255,.08)"; g.fillRect(0, 6, 512, 3); g.fillRect(0, 55, 512, 3);
  g.fillStyle = "#d9c27a"; g.font = "bold 30px Georgia, serif"; g.textAlign = "center"; g.textBaseline = "middle";
  g.fillText(text, 256, 34);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}

function LawBooks({ reduced }: { reduced: boolean }) {
  const [hover, setHover] = useState(false);
  const top = useRef<THREE.Group>(null);
  const texs = useMemo(() => SPINES.map((b) => spineTex(b.t, b.c)), []);
  useEffect(() => () => texs.forEach((t) => t.dispose()), [texs]);
  useFrame((_, dt) => {
    if (!top.current) return;
    const k = Math.min(1, dt * (reduced ? 30 : 5));
    top.current.rotation.z += ((hover ? 0.5 : 0) - top.current.rotation.z) * k;
  });
  return (
    <group onPointerOver={(e) => { e.stopPropagation(); setHover(true); }} onPointerOut={() => setHover(false)}>
      {SPINES.map((b, i) => {
        const y = 0.06 + i * 0.12;
        const isTop = i === SPINES.length - 1;
        const body = (
          <group key={b.t} position={[0, isTop ? 0 : y, 0]} rotation={[0, (i % 2 ? 0.08 : -0.06) + i * 0.03, 0]}>
            <mesh>
              <boxGeometry args={[0.72, 0.11, 0.5]} />
              {/* lomo con título al frente, tapas en cuero verde, cantos de papel */}
              <meshStandardMaterial attach="material-0" color="#efe6d2" roughness={0.9} />
              <meshStandardMaterial attach="material-1" color="#efe6d2" roughness={0.9} />
              <meshStandardMaterial attach="material-2" color={b.c} roughness={0.6} />
              <meshStandardMaterial attach="material-3" color={b.c} roughness={0.6} />
              <meshStandardMaterial attach="material-4" map={texs[i]} roughness={0.6} />
              <meshStandardMaterial attach="material-5" color="#efe6d2" roughness={0.9} />
            </mesh>
          </group>
        );
        return isTop ? (
          <group key={b.t} position={[-0.36, y, 0]}>
            <group ref={top}><group position={[0.36, 0, 0]}>{body}</group></group>
          </group>
        ) : body;
      })}
      {hover && (
        <Html position={[0, 0.95, 0]} center zIndexRange={[20, 0]}>
          <span className={s.tag}>Sus códigos de abogada</span>
        </Html>
      )}
    </group>
  );
}

export function RoomObjects({ reduced }: { reduced: boolean; low?: boolean }) {
  return (
    <group>
      {/* rincón de escritura en primer plano a la izquierda (el tocadiscos queda a la derecha, sin moverse):
          mesa con la máquina, la pila de códigos sobre la mesa y la silla delante, girados hacia la cámara */}
      <group position={[-1.95, F, 0.55]} rotation={[0, 0.48, 0]} scale={1.28}>
        <Table />
        <Typewriter reduced={reduced} />
        <group position={[-0.58, 0.825, -0.12]} rotation={[0, 0.35, 0]} scale={0.62}><LawBooks reduced={reduced} /></group>
        <group position={[-0.95, 0, 0.7]} rotation={[0, Math.PI * 0.82, 0]}><Chair reduced={reduced} /></group>
        {/* luz propia del rincón: cálida, desde arriba y delante, más un relleno suave */}
        <pointLight position={[0.4, 2.2, 1.3]} intensity={14} distance={5.5} decay={1.6} color="#ffd9a0" />
        <pointLight position={[-0.9, 1.4, 1.1]} intensity={3.2} distance={3.5} decay={1.8} color="#f3e3c4" />
      </group>
    </group>
  );
}
