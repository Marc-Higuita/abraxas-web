import type { PublishedPiece } from "../../lib/pieces";

/**
 * Arquitectura: una habitación larga (de z = +6 a z = −11) con paredes en x = ±7.
 * El fondo queda lejos para que la profundidad se lea en la perspectiva y en la niebla.
 */
export const ROOM = { halfW: 7, front: 6, back: -11, floor: -2.2, ceil: 4.6 };

/** Hilos colgados a tres profundidades. Cada hilo sostiene piezas separadas para que nunca se tapen. */
export const THREADS = [
  { z: -1.0, y: 1.35, count: 4, gap: 1.75, offset: 0 },
  { z: -3.3, y: 1.8, count: 5, gap: 1.7, offset: 0.85 },
  { z: -5.6, y: 2.2, count: 6, gap: 1.65, offset: 0.4 },
];

/**
 * Espejos portal: al tocarlos, la cámara se acerca y se abre un collage para explorar.
 * Los dos laterales están enfrentados: sus reflejos se repiten hacia el infinito.
 */
export interface Portal { id: string; title: string; caption: string; src: string; w: number; h: number; pos: [number, number, number]; rotY: number; size: [number, number]; infinite: boolean }
export const PORTALS: Portal[] = [
  { id: "oficina", title: "La oficina de Abraxas", caption: "Joiner fotográfico del equipo Sala 04: el escritorio, el récord Guinness y el busto «Una meta cumplida».", src: "/assets/room-04/mirrors/collage-oficina.webp", w: 1920, h: 1080, pos: [-6.93, 0.75, -4.4], rotY: Math.PI / 2, size: [2.1, 2.8], infinite: true },
  { id: "pacifista", title: "Muro «¡Pacifista!»", caption: "Pared de la casa museo: prensa, fotos de Abraxas y consignas pegadas a mano. Fotografía del equipo Sala 04.", src: "/assets/room-04/mirrors/muro-pacifista.webp", w: 1650, h: 2200, pos: [6.93, 0.75, -4.4], rotY: -Math.PI / 2, size: [2.1, 2.8], infinite: true },
  { id: "retratos", title: "Muro de retratos", caption: "Retratos recortados alrededor del diploma de abogada. Fotografía del equipo Sala 04.", src: "/assets/room-04/mirrors/muro-retratos.webp", w: 1237, h: 2200, pos: [3.1, 0.75, -10.93], rotY: 0, size: [1.9, 3.6], infinite: false },
];
export const PAGE = THREADS.reduce((n, t) => n + t.count, 0); // 15
export const CARD_H = 1.05;

export interface Slot { x: number; y: number; z: number; thread: number }

export function slots(): Slot[] {
  const out: Slot[] = [];
  THREADS.forEach((t, ti) => {
    const w = (t.count - 1) * t.gap;
    for (let i = 0; i < t.count; i++) out.push({ x: -w / 2 + i * t.gap + (ti === 1 ? (i % 2 ? 0.1 : -0.1) : 0) + t.offset * 0.2, y: t.y, z: t.z + (i % 2 ? -0.18 : 0.12), thread: ti });
  });
  return out;
}

/** Más recientes primero: la página 0 cuelga lo último en el hilo delantero. */
export function pageOf(items: PublishedPiece[], page: number) {
  const sorted = [...items].sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
  return sorted.slice(page * PAGE, page * PAGE + PAGE);
}

export const pageCount = (n: number) => Math.max(1, Math.ceil(n / PAGE));

/** Piezas de ejemplo del equipo: visibles solo mientras no haya publicaciones reales. */
export const SEED: PublishedPiece[] = [
  { id: "seed-1", message: "Ejemplo del equipo: así queda colgada una figura con su mensaje. La tuya aparece aquí al publicarla.", signature: "Equipo Sala 04 · ejemplo", image: "/assets/room-04/abraxas/abraxas-figura.png", createdAt: "2026-11-22T00:00:03Z" },
  { id: "seed-2", message: "Ejemplo del equipo: elige una cabeza, un torso y unas piernas en el tablero y escribe lo que quieras decir.", signature: "Equipo Sala 04 · ejemplo", image: "/assets/room-04/abraxas/abraxas-cabeza.png", createdAt: "2026-11-22T00:00:02Z" },
  { id: "seed-3", message: "Ejemplo del equipo: cada mensaje se publica al instante y se queda en esta habitación.", signature: "Equipo Sala 04 · ejemplo", image: "/assets/room-04/abraxas/abraxas-figura.png", createdAt: "2026-11-22T00:00:01Z" },
];
