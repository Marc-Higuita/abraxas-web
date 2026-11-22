import { TIMELINE } from "../../data/timeline";
import type { TimelineEvent } from "../../types";

/**
 * Datos de la vida de Abraxas que flotan alrededor del retrato.
 * El texto, la fecha y las fuentes salen de la cronología verificada (data/timeline.ts):
 * aquí solo se elige la miniatura (foto real del archivo) y la etiqueta corta.
 */
export interface PortraitFact {
  id: string;
  label: string;
  thumb: string; // miniatura pequeña para el plano 3D
  image: string; // imagen para la ficha
  caption: string;
  event: TimelineEvent;
  /** posición alrededor del retrato (unidades de escena) */
  pos: [number, number, number];
  /** punto del retrato al que se cose el hilo (uv 0..1) */
  anchor: [number, number];
}

const A = "/assets/room-04";
const pick = (id: string) => {
  const e = TIMELINE.find((t) => t.id === id);
  if (!e) throw new Error(`Hito ${id} no existe en la cronología`);
  return e;
};

const RAW: Omit<PortraitFact, "event">[] = [
  { id: "formacion", label: "Abogada · UNAULA", thumb: `${A}/archive/parte4-img_09331.jpg`, image: `${A}/misc/parte4-img_09331.jpg`, caption: "Diploma de Abogado, Universidad Autónoma Latinoamericana (foto #50)", pos: [-3.35, 1.55, 0.6], anchor: [0.3, 0.72] },
  { id: "concejo", label: "Concejal · años setenta", thumb: `${A}/archive/parte5-img_10471.jpg`, image: `${A}/misc/parte5-img_10471.jpg`, caption: "Pared política de la oficina (foto #106)", pos: [3.3, 1.75, 0.3], anchor: [0.62, 0.8] },
  { id: "collage-inicio", label: "1982 · empieza el collage", thumb: `${A}/archive/parte5-img_10161.jpg`, image: `${A}/archive/parte5-img_10161.jpg`, caption: "Pared de la oficina con piezas de la época (foto #88)", pos: [-3.55, -0.05, 1.0], anchor: [0.18, 0.45] },
  { id: "guinness", label: "1997 · dos récords Guinness", thumb: `${A}/archive/parte4-img_1634.jpg`, image: `${A}/misc/parte4-img_1634.jpg`, caption: "Certificado Récords Guinness, 8 de mayo de 1997 (foto #638)", pos: [3.5, 0.05, 0.9], anchor: [0.8, 0.5] },
  { id: "presidencia", label: "1998 · candidata presidencial", thumb: `${A}/archive/parte5-img_10041.jpg`, image: `${A}/misc/parte5-img_10041.jpg`, caption: "Tarjetón presidencial pegado en la pared política (foto #82)", pos: [-3.1, -1.75, 0.4], anchor: [0.35, 0.25] },
  { id: "transformacion", label: "Trans-formarse", thumb: `${A}/abraxas/retrato-base.jpg`, image: `${A}/portrait/abraxas-hojas.jpg`, caption: "Abraxas entre hojas, retrato del equipo de la Sala 04", pos: [3.2, -1.7, 0.5], anchor: [0.55, 0.62] },
  { id: "patrimonio", label: "Casa museo · patrimonio", thumb: `${A}/archive/parte5-img_11991.jpg`, image: `${A}/archive/parte5-img_11991.jpg`, caption: "Vista general de la oficina (foto #179)", pos: [0.05, -2.95, 0.7], anchor: [0.5, 0.12] },
];

export const PORTRAIT_FACTS: PortraitFact[] = RAW.map((f) => ({ ...f, event: pick(f.id) }));

export const factFicha = (f: PortraitFact) => ({
  title: `${f.event.title} · ${f.event.dateLabel}`,
  image: f.image,
  body: f.event.description,
  meta: [f.caption, ...f.event.sources.map((s) => `Fuente: ${s.label}${s.date ? ` (${s.date})` : ""}`)],
});
