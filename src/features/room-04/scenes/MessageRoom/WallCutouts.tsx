"use client";
import { useEffect, useMemo } from "react";
import { useLoader } from "@react-three/fiber";
import * as THREE from "three";
import CUTS from "../../../../../public/assets/room-04/messageroom/cut/index.json";

/**
 * Recortes pegados directamente a las paredes (R4-D · 08.5).
 * Detalles de las fotos de los muros de la casa con borde rasgado (máscara procedural),
 * sin marcos blancos: papeles superpuestos, cinta, sombra suave y separación de la pared.
 * Los huecos se eligieron lejos de espejos portal, paneles de collage y documentos.
 */

type Wall = "L" | "R" | "B";
/** pared, coordenada a lo largo de la pared (z en laterales, x al fondo), altura, alto del recorte */
const SPOTS: [Wall, number, number, number][] = [
  // pared izquierda (x = −7)
  ["L", 3.6, 0.6, 1.3], ["L", 2.3, 1.95, 0.85], ["L", 2.2, -0.7, 1.0], ["L", -1.7, 3.25, 1.0], ["L", -0.35, 3.0, 0.75],
  ["L", -4.3, 3.25, 1.0], ["L", -4.9, -1.55, 0.8], ["L", -3.8, -1.4, 0.7], ["L", -7.1, 3.15, 1.05], ["L", -9.4, 1.2, 1.4],
  ["L", -10.1, -0.7, 1.0], ["L", -9.1, 3.0, 0.9],
  // pared derecha (x = +7)
  ["R", 3.4, 0.8, 1.2], ["R", 2.2, -0.6, 0.9], ["R", 2.7, 2.3, 0.8], ["R", -1.9, 3.15, 1.0], ["R", -4.4, 3.25, 0.9],
  ["R", -6.15, 0.55, 1.0], ["R", -6.05, 2.35, 0.7], ["R", -7.8, 1.65, 1.0], ["R", -9.8, 0.6, 1.3], ["R", -9.6, 2.95, 0.8],
  // fondo (z = −11)
  ["B", -6.1, 1.6, 1.2], ["B", -6.0, -0.45, 0.9], ["B", -3.2, -1.15, 0.8], ["B", 5.4, 1.4, 1.3], ["B", 5.6, -0.55, 0.9],
  ["B", -3.8, 3.2, 1.0], ["B", -0.4, 3.25, 0.9], ["B", 2.0, 3.4, 0.8], ["B", 5.0, 3.2, 0.9],
];

const PAPERS = ["#efe6d2", "#c9a878", "#e9e4f0", "#f2e7c4"];
const TAPES = ["#f5bcd9", "#d9f24a", "#f2b90f", "#e8dcc4"];

/** máscara de papel rasgado: blanco dentro, bordes irregulares con fibras */
function tornMask(seed: number) {
  const S = 256;
  const c = document.createElement("canvas");
  c.width = c.height = S;
  const g = c.getContext("2d")!;
  g.fillStyle = "#000"; g.fillRect(0, 0, S, S);
  let r = seed * 9301 + 49297;
  const rnd = () => ((r = (r * 9301 + 49297) % 233280) / 233280);
  const m = 10, pts: [number, number][] = [];
  const edge = (x0: number, y0: number, x1: number, y1: number, n: number, amp: number) => {
    for (let i = 0; i < n; i++) {
      const t = i / n;
      const j = (rnd() - 0.5) * amp + Math.sin(t * 11 + seed) * amp * 0.25;
      const nx = -(y1 - y0), ny = x1 - x0, l = Math.hypot(nx, ny) || 1;
      pts.push([x0 + (x1 - x0) * t + (nx / l) * j, y0 + (y1 - y0) * t + (ny / l) * j]);
    }
  };
  // cada borde con un carácter distinto: uno muy rasgado, otros casi de tijera
  const torn = Math.floor(rnd() * 4);
  edge(m, m, S - m, m, 46, torn === 0 ? 16 : 5);
  edge(S - m, m, S - m, S - m, 46, torn === 1 ? 16 : 5);
  edge(S - m, S - m, m, S - m, 46, torn === 2 ? 16 : 5);
  edge(m, S - m, m, m, 46, torn === 3 ? 16 : 5);
  g.fillStyle = "#fff";
  g.beginPath(); pts.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y))); g.closePath(); g.fill();
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.NoColorSpace;
  return tex;
}

function place(w: Wall, a: number, y: number, d: number): { pos: [number, number, number]; rotY: number } {
  if (w === "L") return { pos: [-6.97 + d, y, a], rotY: Math.PI / 2 };
  if (w === "R") return { pos: [6.97 - d, y, a], rotY: -Math.PI / 2 };
  return { pos: [a, y, -10.97 + d], rotY: 0 };
}

export function WallCutouts({ low }: { low: boolean }) {
  const list = CUTS as { src: string; w: number; h: number }[];
  const texs = useLoader(THREE.TextureLoader, list.map((c) => c.src));
  useMemo(() => texs.forEach((t) => { t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; }), [texs]);
  const masks = useMemo(() => [1, 2, 3, 4, 5].map(tornMask), []);
  useEffect(() => () => masks.forEach((m) => m.dispose()), [masks]);

  const items = useMemo(() => {
    const spots = low ? SPOTS.filter((_, i) => i % 2 === 0) : SPOTS;
    return spots.map(([w, a, y, h], i) => {
      const k = (i * 7) % list.length;
      const ar = list[k].w / list[k].h;
      const d = 0.03 + ((i * 13) % 5) * 0.012; // separación de la pared: capas que sobresalen
      const { pos, rotY } = place(w, a, y, d);
      return {
        k, pos, rotY, h, w: h * ar, mask: i % masks.length,
        rot: (((i * 37) % 11) - 5) * 0.022,
        paper: i % 3 === 0 ? PAPERS[i % PAPERS.length] : null,
        tape: i % 2 === 0 ? TAPES[i % TAPES.length] : null,
        flip: i >= list.length && i % 2 === 1, // repeticiones: espejadas para que no se lean iguales
      };
    });
  }, [low, list, masks.length]);

  return (
    <group>
      {items.map((it, i) => (
        <group key={i} position={it.pos} rotation={[0, it.rotY, 0]}>
          <group rotation={[0, 0, it.rot]}>
            {/* sombra suave sobre la pared */}
            <mesh position={[0.03, -0.04, -0.012]} scale={[1.02, 1.02, 1]}>
              <planeGeometry args={[it.w, it.h]} />
              <meshBasicMaterial color="#000" alphaMap={masks[it.mask]} transparent opacity={0.42} depthWrite={false} />
            </mesh>
            {/* papel superpuesto debajo, corrido y girado (no es un marco: asoma por un lado) */}
            {it.paper && (
              <mesh position={[-it.w * 0.12, it.h * 0.08, -0.006]} rotation={[0, 0, -it.rot * 2.2 - 0.06]}>
                <planeGeometry args={[it.w * 0.9, it.h * 0.95]} />
                <meshStandardMaterial color={it.paper} alphaMap={masks[(it.mask + 2) % masks.length]} transparent roughness={0.95} />
              </mesh>
            )}
            <mesh scale={[it.flip ? -1 : 1, 1, 1]}>
              <planeGeometry args={[it.w, it.h]} />
              <meshStandardMaterial map={texs[it.k]} alphaMap={masks[it.mask]} transparent alphaTest={0.5} roughness={0.85} side={THREE.DoubleSide} />
            </mesh>
            {it.tape && (
              <mesh position={[it.w * 0.3, it.h * 0.47, 0.008]} rotation={[0, 0, 0.5]}>
                <planeGeometry args={[Math.min(0.42, it.w * 0.45), 0.11]} />
                <meshStandardMaterial color={it.tape} transparent opacity={0.78} roughness={0.9} />
              </mesh>
            )}
          </group>
        </group>
      ))}
    </group>
  );
}
