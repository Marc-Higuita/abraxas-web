import type { Phrase } from "../types";

/**
 * Sistema de frases en tres categorías, siempre identificadas en pantalla.
 * A · cita: palabras de Abraxas con fuente. B · curatorial: textos del equipo. C · inspirada: frases nuevas, NO atribuibles a Abraxas.
 */
export const CITAS: Phrase[] = [
  { kind: "cita", text: "El collage no tiene límite como la imagen no tiene límite.", source: "Entrevista citada por Telemedellín, 19 oct. 2026", verification: "documentado" },
  { kind: "cita", text: "Aquí las fotos no se toman, se hacen.", source: "A Centrópolis, 29 nov. 2020", verification: "documentado" },
  { kind: "cita", text: "Yo amo lo que hago porque es como el mundo: todo está adherido…", source: "A Centrópolis, 29 nov. 2020", verification: "documentado" },
  { kind: "cita", text: "Se trata del exceso de información. Precisamente eso pasa en este museo.", source: "A El Colombiano, 4 nov. 2025", verification: "documentado" },
  { kind: "cita", text: "Todo es uno con el universo, aunque sus formas y fines […] sean fugaces, diversas y contrarias.", source: "Prohibido perder, pág. PDF 67", verification: "verificado" },
];

/** Transcripciones preliminares del equipo: se muestran solo como pendientes hasta asociarlas a video y minuto. */
export const TRANSCRIPCIONES_PENDIENTES: Phrase[] = [
  "La imagen es un instante de eternidad coagulado en el papel.",
  "La ternura es una trampa para la razón.",
  "Todos miramos, pero no todos ven igual.",
  "Somos instantes fugaces entre dos eternidades.",
  "Cada uno es trans a su modo.",
  "Yo soy un collage.",
  "El collage no tiene límite como la imagen no tiene límite, porque el universo es imagen.",
].map((text) => ({ kind: "cita" as const, text, source: "Transcripción del equipo · falta video y minuto", verification: "pendiente" as const }));

export const CURATORIALES: Phrase[] = [
  { kind: "curatorial", text: "Una vida no cabe en una sola imagen." },
  { kind: "curatorial", text: "La oficina se vuelve archivo. El archivo se vuelve imagen." },
  { kind: "curatorial", text: "La memoria no termina en una imagen. Sigue desplazándote." },
  { kind: "curatorial", text: "Recortas. Pegas. Ya es otra cosa." },
  { kind: "curatorial", text: "¿Cuántas imágenes hacen falta para contar una vida?" },
];

export const INSPIRADAS: Phrase[] = [
  { kind: "inspirada", text: "Una vida no se recuerda entera: se reconstruye por fragmentos." },
  { kind: "inspirada", text: "No somos una sola imagen, sino todas las que todavía nos transforman." },
  { kind: "inspirada", text: "La memoria también tiene tijeras." },
  { kind: "inspirada", text: "Cada fragmento conserva una forma de eternidad." },
  { kind: "inspirada", text: "Una identidad puede ser muchas cosas sin dejar de ser una vida." },
  { kind: "inspirada", text: "Los contrarios no se anulan: se pegan." },
  { kind: "inspirada", text: "Lo que se recorta no se pierde, cambia de vecino." },
];

export const KIND_LABEL: Record<Phrase["kind"], string> = {
  cita: "Abraxas",
  curatorial: "Texto del proyecto",
  inspirada: "Frase del proyecto inspirada en su universo",
};
