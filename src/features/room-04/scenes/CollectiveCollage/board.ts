"use client";
import { useCallback, useReducer } from "react";
import type { CollageElement } from "@/lib/collage-schema";
import cutouts from "../../data/cutouts.json";
import letters from "../../data/letters.json";

/** Hoja de trabajo del visitante, en unidades de composición (origen arriba a la izquierda, y hacia abajo). */
export const SHEET_W = 600;
export const SHEET_H = 800;

export type Drawer = "cabezas" | "pelo" | "rostros" | "torsos" | "brazos" | "piernas" | "vestuario" | "anadidos" | "letras";
export interface Cutout { id: string; src: string; cat: Drawer; label: string; w: number; h: number }
interface Letter { id: string; char: string; set: string; src: string; w: number; h: number }
/** Alfabeto recortado (revista y papel) como un sobre más: sirve para escribir sobre la figura. */
const LETTERS: Cutout[] = (letters as Letter[]).map((l) => ({ id: `letras/${l.id}`, src: l.src, cat: "letras", label: `Letra ${l.char}`, w: l.w, h: l.h }));
export const CUTOUTS = [...(cutouts as Cutout[]), ...LETTERS];

export const DRAWERS: { id: Drawer; label: string; hint: string; tone: string }[] = [
  { id: "cabezas", label: "Cabezas", hint: "Muñecas, bustos y la cabeza de Abraxas", tone: "#f2b90f" },
  { id: "pelo", label: "Pelo", hint: "Pelucas y peinados para cambiar de cabeza", tone: "#b07a4a" },
  { id: "rostros", label: "Rostros", hint: "Ojos, bocas, narices y orejas", tone: "#e07bf0" },
  { id: "torsos", label: "Torsos", hint: "Espaldas, pechos y maniquíes", tone: "#ff7a45" },
  { id: "brazos", label: "Brazos", hint: "Brazos y guantes", tone: "#d9f24a" },
  { id: "piernas", label: "Piernas", hint: "Piernas, medias y caderas", tone: "#a8e6e8" },
  { id: "vestuario", label: "Vestuario", hint: "Vestidos de tela estampada", tone: "#f5bcd9" },
  { id: "anadidos", label: "Añadidos", hint: "Pinzas, clips, alfileres, signos, papeles y cintas", tone: "#c9a878" },
  { id: "letras", label: "Letras", hint: "Letras recortadas de revista y papel: escribe una palabra", tone: "#f3eee3" },
];

/** Tamaño de llegada a la hoja según la parte del cuerpo (lado mayor, en unidades de la hoja). */
const TARGET: Record<Drawer, number> = { pelo: 190, letras: 64, cabezas: 170, rostros: 80, torsos: 270, brazos: 250, piernas: 330, vestuario: 430, anadidos: 130 };

export type El = CollageElement & { w: number; h: number; src: string };

let counter = 0;
export const nid = () => `p${Date.now().toString(36)}${(counter++).toString(36)}`;

/** Llega cerca del centro de la hoja, con una pequeña desviación para que no se apilen exactos. */
export function elementFrom(c: Cutout, n: number): El {
  const s = TARGET[c.cat] / Math.max(c.w, c.h);
  const zone: Record<Drawer, number> = { pelo: 0.16, letras: 0.88, cabezas: 0.2, rostros: 0.22, torsos: 0.42, brazos: 0.45, piernas: 0.72, vestuario: 0.55, anadidos: 0.5 };
  const j = ((n * 37) % 11) - 5;
  return {
    id: nid(), kind: "image", src: c.src, w: c.w, h: c.h,
    x: SHEET_W / 2 + j * 9, y: SHEET_H * zone[c.cat] + j * 4,
    rotation: j * 1.6, scaleX: s, scaleY: s,
  };
}

type Action =
  | { type: "add"; el: El }
  | { type: "begin" } // guarda un punto de deshacer antes de un gesto continuo
  | { type: "patch"; id: string; patch: Partial<El>; history?: boolean }
  | { type: "remove"; id: string }
  | { type: "duplicate"; id: string; newId: string }
  | { type: "order"; id: string; dir: 1 | -1 | "front" | "back" }
  | { type: "undo" } | { type: "redo" } | { type: "reset" };

interface S { els: El[]; past: El[][]; future: El[][] }
const LIMIT = 60;

function reduce(s: S, a: Action): S {
  const push = (els: El[]): S => ({ els, past: [...s.past, s.els].slice(-LIMIT), future: [] });
  switch (a.type) {
    case "add": return s.els.length >= 40 ? s : push([...s.els, a.el]);
    case "begin": return { ...s, past: [...s.past, s.els].slice(-LIMIT), future: [] };
    case "patch": {
      const els = s.els.map((e) => (e.id === a.id ? { ...e, ...a.patch } : e));
      return a.history ? push(els) : { ...s, els };
    }
    case "remove": return push(s.els.filter((e) => e.id !== a.id));
    case "duplicate": {
      const e = s.els.find((x) => x.id === a.id);
      if (!e || s.els.length >= 40) return s;
      return push([...s.els, { ...e, id: a.newId, x: e.x + 24, y: e.y + 24 }]);
    }
    case "order": {
      const i = s.els.findIndex((e) => e.id === a.id);
      if (i < 0) return s;
      const els = [...s.els];
      const [e] = els.splice(i, 1);
      const to = a.dir === "front" ? els.length : a.dir === "back" ? 0 : Math.max(0, Math.min(els.length, i + a.dir));
      els.splice(to, 0, e);
      return push(els);
    }
    case "undo": return s.past.length ? { els: s.past[s.past.length - 1], past: s.past.slice(0, -1), future: [s.els, ...s.future] } : s;
    case "redo": return s.future.length ? { els: s.future[0], past: [...s.past, s.els], future: s.future.slice(1) } : s;
    case "reset": return s.els.length ? push([]) : s;
  }
}

export function useBoard() {
  const [s, dispatch] = useReducer(reduce, { els: [], past: [], future: [] });
  const act = useCallback((a: Action) => dispatch(a), []);
  return { els: s.els, canUndo: s.past.length > 0, canRedo: s.future.length > 0, act };
}
