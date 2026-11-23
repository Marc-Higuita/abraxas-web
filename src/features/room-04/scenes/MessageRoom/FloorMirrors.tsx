"use client";
import { useMemo } from "react";
import * as THREE from "three";
import { MeshReflectorMaterial } from "@react-three/drei";
import { MirrorMat, onMirror } from "./Decor";
import { ROOM } from "./layout";

/**
 * Fragmentos de espejo en el piso (R4-D · 08.8).
 * Vidrio reflectante irregular que devuelve techo, paredes y objetos con el mapa de entorno
 * compartido (una sola CubeCamera de baja frecuencia: sin costo extra por fragmento).
 * No tienen hover ni cursor: no se confunden con botones. Viven en la capa de espejos,
 * así la CubeCamera no se ve a sí misma.
 */
const SHARDS: { x: number; z: number; r: number; s: number; seed: number }[] = [
  { x: -1.5, z: -1.7, r: 0.4, s: 0.85, seed: 1 },
  { x: 1.9, z: -3.7, r: -0.7, s: 1.1, seed: 2 },
  { x: -2.7, z: -4.9, r: 1.2, s: 0.7, seed: 3 },
  { x: -0.4, z: -6.6, r: 0.1, s: 1.25, seed: 4 },
  { x: 2.4, z: -8.7, r: -1.4, s: 0.9, seed: 5 },
];

function shardShape(seed: number) {
  let r = seed * 7919 + 13;
  const rnd = () => ((r = (r * 9301 + 49297) % 233280) / 233280);
  const n = 5 + Math.floor(rnd() * 3);
  const s = new THREE.Shape();
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2 + (rnd() - 0.5) * 0.6;
    const d = 0.35 + rnd() * 0.45;
    const x = Math.cos(a) * d, y = Math.sin(a) * d * (0.6 + rnd() * 0.5);
    if (i === 0) s.moveTo(x, y); else s.lineTo(x, y);
  }
  s.closePath();
  return new THREE.ShapeGeometry(s);
}

export function FloorMirrors({ low }: { low: boolean }) {
  const list = low ? SHARDS.filter((_, i) => i % 2 === 0) : SHARDS;
  const geos = useMemo(() => list.map((sh) => shardShape(sh.seed)), [list]);
  const edge = useMemo(() => new THREE.MeshStandardMaterial({ color: "#a8b0b4", metalness: 0.9, roughness: 0.35 }), []);
  return (
    <group position={[0, ROOM.floor + 0.012, 0]}>
      {list.map((sh, i) => (
        <group key={sh.seed} position={[sh.x, 0, sh.z]} rotation={[-Math.PI / 2, 0, sh.r]} scale={sh.s}>
          {/* canto de vidrio apenas visible */}
          <mesh geometry={geos[i]} position={[0, 0, -0.004]} scale={1.04} material={edge} raycast={() => null} />
          <mesh geometry={geos[i]} onUpdate={onMirror} raycast={() => null}>
            <MirrorMat tint="#dfe6ea" rough={0.02} />
          </mesh>
        </group>
      ))}
    </group>
  );
}

/**
 * Piso reflectante (R4-D · 08.7): reflejos más visibles sin volverlo espejo.
 * Un mapa de rugosidad con baldosas y vetas hace que unas zonas reflejen más que otras
 * y conserva la textura del material.
 */
function floorRoughness() {
  const S = 512;
  const c = document.createElement("canvas"); c.width = c.height = S;
  const g = c.getContext("2d")!;
  g.fillStyle = "#8a8a8a"; g.fillRect(0, 0, S, S);
  const n = 8, cell = S / n;
  let r = 7;
  const rnd = () => ((r = (r * 9301 + 49297) % 233280) / 233280);
  for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) {
    const v = 70 + Math.floor(rnd() * 120); // baldosas más pulidas y más gastadas
    g.fillStyle = `rgb(${v},${v},${v})`;
    g.fillRect(i * cell + 2, j * cell + 2, cell - 4, cell - 4);
  }
  g.strokeStyle = "#e0e0e0"; g.lineWidth = 3; // juntas: mates
  for (let i = 0; i <= n; i++) { g.beginPath(); g.moveTo(i * cell, 0); g.lineTo(i * cell, S); g.stroke(); g.beginPath(); g.moveTo(0, i * cell); g.lineTo(S, i * cell); g.stroke(); }
  for (let k = 0; k < 900; k++) { const v = Math.floor(rnd() * 255); g.fillStyle = `rgba(${v},${v},${v},.18)`; g.fillRect(rnd() * S, rnd() * S, 2 + rnd() * 6, 1 + rnd() * 2); }
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(3, 4);
  t.colorSpace = THREE.NoColorSpace;
  return t;
}

export function ReflectiveFloorMat({ low }: { low: boolean }) {
  const rough = useMemo(floorRoughness, []);
  return (
    <MeshReflectorMaterial
      resolution={low ? 256 : 1024}
      blur={low ? [160, 50] : [260, 70]}
      mixBlur={0.75}
      mixStrength={low ? 2.2 : 3.4}
      mixContrast={1.15}
      roughness={0.6}
      roughnessMap={rough}
      depthScale={1.1}
      minDepthThreshold={0.35}
      maxDepthThreshold={1.4}
      color="#2a211b"
      metalness={0.55}
      mirror={0.7}
    />
  );
}
