import { create } from "zustand";

export type ActId = "habitacion" | "video" | "libros" | "transformaciones" | "collage" | "musica";

export const ACTS: { id: ActId; n: string; title: string }[] = [
  { id: "habitacion", n: "01", title: "La habitación fragmentada" },
  { id: "video", n: "02", title: "La imagen que habla" },
  { id: "libros", n: "03", title: "Los libros de una vida" },
  { id: "transformaciones", n: "04", title: "Las transformaciones de Abraxas" },
  { id: "collage", n: "05", title: "El collage colectivo" },
  { id: "musica", n: "·", title: "Coda: una playlist para Abraxas" },
];

export interface Ficha {
  title: string;
  image?: string;
  body?: string;
  meta?: string[];
}

interface State {
  act: ActId;
  progress: number;
  reducedMotion: boolean;
  lowPower: boolean;
  muted: boolean;
  infoOpen: boolean;
  indexOpen: boolean;
  ficha: Ficha | null;
  musicMode: boolean;
  setAct: (a: ActId) => void;
  setProgress: (p: number) => void;
  setReducedMotion: (v: boolean) => void;
  setLowPower: (v: boolean) => void;
  toggleMuted: () => void;
  setInfo: (v: boolean) => void;
  setIndex: (v: boolean) => void;
  openFicha: (f: Ficha | null) => void;
  setMusicMode: (v: boolean) => void;
}

export const useRoom = create<State>((set) => ({
  act: "habitacion",
  progress: 0,
  reducedMotion: false,
  lowPower: false,
  muted: true,
  infoOpen: false,
  indexOpen: false,
  ficha: null,
  musicMode: false,
  setAct: (act) => set({ act }),
  setProgress: (progress) => set({ progress }),
  setReducedMotion: (reducedMotion) => set({ reducedMotion }),
  setLowPower: (lowPower) => set({ lowPower }),
  toggleMuted: () => set((s) => ({ muted: !s.muted })),
  setInfo: (infoOpen) => set({ infoOpen }),
  setIndex: (indexOpen) => set({ indexOpen }),
  openFicha: (ficha) => set({ ficha }),
  setMusicMode: (musicMode) => set({ musicMode }),
}));
