import { TIMELINE, DIMENSIONS } from "../../data/timeline";
import type { Dimension, TimelineEvent } from "../../types";

/** Fotos del archivo con versión grande en /misc. */
const MISC = new Set([
  "parte2-img_09031", "parte3-img_1300", "parte4-img_09331", "parte4-img_1634", "parte5-img_10041", "parte5-img_10321",
  "parte5-img_10471", "parte5-img_1431", "parte6-img_1586", "parte7-img_1211", "pate1-img_1174", "pate1-img_1223",
]);

export const imgUrl = (id: string) => {
  if (id.startsWith("timeline/")) return `/assets/room-04/${id}.jpg`;
  if (MISC.has(id)) return `/assets/room-04/misc/${id}.jpg`;
  return `/assets/room-04/archive/${id}.jpg`;
};

export const DIM_HEX: Record<Dimension, string> = {
  vida: "#C81E6E",
  politica: "#D9341F",
  arte: "#F2B90F",
  pensamiento: "#2340A8",
  patrimonio: "#1E7A4C",
};
export const DIM_LABEL = Object.fromEntries(DIMENSIONS.map((d) => [d.id, d.label])) as Record<Dimension, string>;

export const VER_LABEL: Record<TimelineEvent["verification"], string> = {
  verificado: "Verificado con fuente primaria",
  documentado: "Documentado en prensa",
  "por-verificar": "Por verificar",
  pendiente: "Pendiente",
};

/** Objeto recortado que acompaña cada hito (dibujado en canvas, sin modelos pesados). */
export type PropKind =
  | "corazon" | "casa" | "cruz" | "mascara" | "birrete" | "columnas" | "poste" | "moto" | "maleta"
  | "tijeras" | "casas" | "libro" | "trofeo" | "tarjeton" | "globo" | "espejo" | "periodico";

const PROPS: Record<string, PropKind> = {
  nacimiento: "corazon", infancia: "casa", seminario: "cruz", teatro: "mascara", formacion: "birrete",
  concejo: "columnas", telefonia: "poste", asoma: "moto", "otero-soto": "maleta", "collage-inicio": "tijeras",
  viviendas: "casas", "prohibido-perder": "libro", "control-fiscal": "libro", guinness: "trofeo", presidencia: "tarjeton",
  gobernacion: "tarjeton", tesis: "globo", alcaldia: "tarjeton", transformacion: "espejo", "concejo-2011": "tarjeton",
  patrimonio: "casa", pandemia: "tijeras", "tercer-record": "trofeo", riesgo: "periodico", legado: "corazon",
};
export const propOf = (id: string): PropKind => PROPS[id] ?? "tijeras";

/** Fecha grande que se puede afirmar: año, rango, aproximada o «s/f». */
export function bigDate(e: TimelineEvent) {
  const range = e.dateLabel.match(/\d{4}(?:\s*[–-]\s*\d{4})?/);
  if (e.precision === "desconocida") return range ? `¿${range[0]}?` : "s/f";
  if (!range) return "s/f";
  return e.precision === "aproximada" && !range[0].includes("–") ? `c. ${range[0]}` : range[0].replace(/\s/g, "");
}

export const SORTED: TimelineEvent[] = [...TIMELINE].sort((a, b) => (a.sortYear ?? 9999) - (b.sortYear ?? 9999));
