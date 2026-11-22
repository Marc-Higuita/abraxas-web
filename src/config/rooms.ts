/**
 * Registro de salas. Cada sala es un módulo independiente bajo /salas/<id>.
 * Para activar una sala nueva: crea su carpeta en src/features/room-XX y cambia status a "active".
 */
export type RoomStatus = "active" | "pending";

export interface RoomConfig {
  id: "01" | "02" | "03" | "04";
  route: string;
  title: string;
  /** Equipo responsable (del documento del proyecto). */
  team: string[];
  status: RoomStatus;
  /** Texto corto que aparece en el índice. Solo se escribe cuando la sala está definida. */
  summary?: string;
}

export const ROOMS: RoomConfig[] = [
  { id: "01", route: "/salas/01", title: "Caos", team: ["Manuela", "María José"], status: "pending" },
  { id: "02", route: "/salas/02", title: "Transidentidad", team: ["Salomé", "Isabella"], status: "pending" },
  { id: "03", route: "/salas/03", title: "Collage", team: ["Juan José", "Valeria"], status: "pending" },
  {
    id: "04",
    route: "/salas/04",
    title: "Vida y obra",
    team: ["Santiago", "Marco"],
    status: "active",
    summary: "Una vida no cabe en una sola imagen.",
  },
];

export const getRoom = (id: RoomConfig["id"]) => ROOMS.find((r) => r.id === id)!;
