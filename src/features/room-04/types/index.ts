export type Verification = "verificado" | "documentado" | "por-verificar" | "pendiente";

export interface Source {
  id: string;
  label: string;
  url?: string;
  kind: "prensa" | "documento" | "archivo-foto" | "libro" | "base-de-datos" | "testimonio";
  date?: string;
}

export interface RoomPhoto {
  id: string;
  seq: number;
  /** Número visible del fragmento en la ficha ("Collage #n"). */
  collage?: number;
  type: "pared" | "friso" | "techo" | "piso" | "mobiliario" | "documento" | "biblioteca" | "objeto";
  wall: "A" | "B" | "C" | "D" | null;
  /** Rumbo de brújula de la cámara (EXIF GPSImgDirection). */
  heading: number;
  aspect: number;
  /** Altura estimada en la pared (0–4.6) a partir del emparejamiento de fotos consecutivas. */
  ly: number;
  /** Giro estimado por emparejamiento (grados). */
  roll: number;
  px: number | null;
  pz: number | null;
  sharp: number;
  matched: boolean;
  chain: string | null;
  note: string | null;
  description: string;
}

export interface ArchivePhoto {
  id: string;
  seq: number;
  file: string;
  part: string;
  time: string;
  heading: number | null;
  type: RoomPhoto["type"];
  wall: RoomPhoto["wall"];
  chain: string | null;
  matched: boolean;
  room: boolean;
  note: string | null;
  full?: boolean;
  w: number;
  h: number;
}

export interface Quote {
  id: string;
  text: string;
  /** Página del PDF (no la página impresa). */
  pdfPage: number;
  theme: string;
  context?: string;
  /** "literal": transcrita del documento; OCR revisado cuando aplica. */
  kind: "literal";
  verification: Verification;
}

export interface Book {
  id: "prohibido" | "tesis" | "poemario";
  title: string;
  subtitle?: string;
  author: string;
  year?: string;
  status: "disponible" | "pendiente";
  cover: string | null;
  coverNote?: string;
  color: string;
  spine: string;
  thickness: number;
  pdfPath?: string;
  pageImage: (p: number) => string;
  /** Páginas escaneadas disponibles (1..pageCount). 0 = documento todavía sin digitalizar. */
  pageCount: number;
  /** Proporción ancho/alto de la cubierta. */
  aspect: number;
  quotes: Quote[];
  sourceNote: string;
}

export type Dimension = "vida" | "politica" | "arte" | "pensamiento" | "patrimonio";

export interface TimelineEvent {
  id: string;
  title: string;
  /** Texto de fecha tal como se puede afirmar: "1997", "década de 1970", "por verificar". */
  dateLabel: string;
  /** Año para ordenar; null si es desconocido. */
  sortYear: number | null;
  precision: "dia" | "año" | "decada" | "aproximada" | "desconocida";
  description: string;
  dimensions: Dimension[];
  images: { id: string; caption: string }[];
  quotes?: string[];
  sources: Source[];
  verification: Verification;
  certainty: "alta" | "media" | "baja";
  related?: string[];
}

export interface Phrase {
  text: string;
  kind: "cita" | "curatorial" | "inspirada";
  /** Para citas: fuente exacta. */
  source?: string;
  verification?: Verification;
}
