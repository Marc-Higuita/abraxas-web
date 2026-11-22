import type { PublishedPiece } from "../../lib/pieces";

/** Hilos colgados a tres profundidades. Cada hilo sostiene piezas separadas para que nunca se tapen. */
export const THREADS = [
  { z: -0.9, y: 1.35, count: 4, gap: 1.75, offset: 0 },
  { z: -2.6, y: 1.75, count: 5, gap: 1.7, offset: 0.85 },
  { z: -4.3, y: 2.1, count: 6, gap: 1.65, offset: 0.4 },
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
