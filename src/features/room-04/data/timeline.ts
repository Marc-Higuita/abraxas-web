import type { Source, TimelineEvent } from "../types";
import { SOURCES as S } from "./sources";

/** Animación documental del equipo (subtítulos transcritos por OCR). Fuente secundaria: investigación del equipo. */
const VIDEO = (t: string): Source => ({ id: `video-${t}`, kind: "documento", label: `Video del equipo Sala 04, ${t}` });
/** Fotografías y documentos guardados en public/assets/room-04/timeline (material del equipo y de prensa con permiso). */
const TL = (file: string, caption: string) => ({ id: `/assets/room-04/timeline/${file}`, caption });

/**
 * La vida en 10 momentos (corrección 06, tanda 1). Selección de los 25 hitos de trabajo:
 * se fusionaron hitos cercanos sin inventar datos; cada momento conserva sus fuentes y su estado de verificación.
 * Las fechas aproximadas se muestran como aproximadas. Imágenes: ids del archivo fotográfico
 * (data/archive.json) o rutas absolutas a public/assets. Ya no se usan fotogramas del video como imagen.
 * Los ids formacion, concejo, collage-inicio, guinness, presidencia, transformacion y patrimonio
 * los usa también el retrato (AbraxasPortrait/facts.ts): no cambiarlos.
 */
export const TIMELINE: TimelineEvent[] = [
  {
    id: "formacion",
    title: "Seminario, teología y derecho",
    dateLabel: "años sesenta · fechas por verificar",
    sortYear: 1964,
    precision: "desconocida",
    description:
      "Quiso ser misionero y entró al seminario, donde estudió filosofía y teología hasta que discutió con el cura por su tesis: «¿Puedo dudar filosóficamente del pecado original?». Después estudió Derecho en la Universidad Autónoma Latinoamericana: en su oficina cuelga el diploma de Abogado, reexpedido a nombre de Abraxas Aguilar Betancur.",
    dimensions: ["pensamiento", "vida"],
    images: [
      { id: "parte4-img_09331", caption: "Diploma de Abogado, Universidad Autónoma Latinoamericana (foto #50)" },
      TL("abraxas-escritorio-libros.jpg", "Abraxas en su escritorio, con sus libros (fotografía de prensa aportada por el equipo)"),
    ],
    sources: [VIDEO("0:20–0:44"), S.centropolis2020, S.diploma],
    verification: "por-verificar",
    certainty: "media",
  },
  {
    id: "teatro",
    title: "Teatro y la toma de la universidad",
    dateLabel: "sin fecha verificada",
    sortYear: 1968,
    precision: "desconocida",
    description:
      "En la UNAULA dirigió teatro y fundó el Teatro Experimental Universitario. En pleno paro lideró la toma que abrió la universidad, según el video del equipo. La escena y la palabra la acompañaron toda la vida.",
    dimensions: ["arte", "politica"],
    images: [TL("abraxas-relato.jpg", "Abraxas narrando en la casa museo (fotografía de prensa aportada por el equipo)")],
    sources: [VIDEO("0:44–0:52")],
    verification: "por-verificar",
    certainty: "baja",
  },
  {
    id: "concejo",
    title: "Concejal de Medellín",
    dateLabel: "1970–1972 · según el video del equipo",
    sortYear: 1970,
    precision: "decada",
    description:
      "El video del equipo la sitúa como concejal de Medellín por la ANAPO, junto a Carlos Ardila Lülle, de 1970 a 1972. Telemedellín y Voz de América la ubican en el Concejo en los años setenta; Centrópolis habla de varios periodos. Faltan actas del Concejo para fijar los años.",
    dimensions: ["politica"],
    images: [{ id: "parte5-img_10471", caption: "Pared política de la oficina: «¡Pacifista!», «Con criterio», «Lo que otros callan» (foto #106)" }],
    sources: [VIDEO("0:54"), S.voa2024, S.telemedellin2026, S.centropolis2020],
    verification: "documentado",
    certainty: "media",
  },
  {
    id: "collage-inicio",
    title: "Empieza el collage",
    dateLabel: "1982",
    sortYear: 1982,
    precision: "año",
    description:
      "Según contó a Voz de América, su pasión por el collage comenzó en 1982 en su casa anterior, en Villa Hermosa. Empezó llenando agendas de imágenes; con los años las paredes, los pisos y los techos.",
    dimensions: ["arte"],
    images: [
      TL("abraxas-recortando.jpg", "Abraxas en su mesa de trabajo (fotografía de prensa aportada por el equipo)"),
      { id: "parte5-img_10161", caption: "Pared de la oficina con piezas de la época (foto #88)" },
    ],
    quotes: ["«Yo llenaba las agendas de estas imágenes» — a Voz de América, 2024"],
    sources: [S.voa2024, VIDEO("1:24")],
    verification: "documentado",
    certainty: "media",
  },
  {
    id: "prohibido-perder",
    title: "Publica «Prohibido perder»",
    dateLabel: "c. 1987 · por verificar",
    sortYear: 1987,
    precision: "aproximada",
    description:
      "Libro de mensajes y reflexiones firmado por Jorge Hernán Betancur A. — Abraxas. La fecha se infiere de un aviso del 48 aniversario del Instituto de Crédito Territorial (1939–1987) incluido en sus primeras páginas. Con los años escribiría también «Por una ciudadanía global» (2001).",
    dimensions: ["pensamiento", "arte"],
    images: [
      { id: "/assets/room-04/books/prohibido-cover.jpg", caption: "Portada de «Prohibido perder» (ejemplar del archivo)" },
      TL("abraxas-lectores.jpg", "Abraxas con lectores y sus libros en la casa museo (fotografía aportada por el equipo)"),
    ],
    sources: [S.prohibido, S.tesis2001],
    verification: "por-verificar",
    certainty: "media",
    related: ["guinness"],
  },
  {
    id: "guinness",
    title: "Dos récords Guinness",
    dateLabel: "8 de mayo de 1997",
    sortYear: 1997,
    precision: "dia",
    description:
      "Récords por el libro de collage más grande del mundo y por un collage de 20.000 imágenes, contadas una por una por el jurado. El certificado del archivo describe el libro como de 1 × 2 metros, media tonelada y más de 800 páginas; la prensa habla de 200 páginas. La diferencia queda señalada. En su biblioteca guardaba ediciones del Guinness World Records (2006, 2014, 2016).",
    dimensions: ["arte", "patrimonio"],
    images: [
      { id: "parte4-img_1634", caption: "Certificado Récords Guinness, 8 de mayo de 1997 (foto #638)" },
      TL("abraxas-guinness-2014-2006.jpg", "Abraxas con los Guinness World Records 2014 y 2006 (fotografía de prensa aportada por el equipo)"),
    ],
    sources: [S.guinnessCert, S.centropolis2020, S.voa2024, S.telemedellin2026],
    verification: "verificado",
    certainty: "alta",
  },
  {
    id: "presidencia",
    title: "Candidatura presidencial",
    dateLabel: "31 de mayo de 1998",
    sortYear: 1998,
    precision: "dia",
    description:
      "Aparece como Jorge Hernán Betancur en la primera vuelta presidencial, por el Movimiento Unitario Metapolítico: 14.605 votos (0,14 %) según la base de datos de Georgetown; otras fuentes registran 13.892. También aspiró a la Gobernación de Antioquia (2000, según Centrópolis) y a la Alcaldía de Medellín: en la pared política hay un tarjetón con la casilla 74 a su nombre.",
    dimensions: ["politica"],
    images: [
      { id: "parte5-img_10041", caption: "Tarjetón presidencial pegado en la pared política (foto #82)" },
      { id: "parte3-img_1300", caption: "Tarjetón «Alcalde de Medellín», casilla 74 (foto #351)" },
    ],
    sources: [S.pdba1998, S.wiki1998, S.centropolis2020, S.tarjetonAlcaldia, VIDEO("1:38")],
    verification: "verificado",
    certainty: "alta",
  },
  {
    id: "transformacion",
    title: "Trans-formarse",
    dateLabel: "fecha por verificar",
    sortYear: 2005,
    precision: "desconocida",
    description:
      "Centrópolis recoge que ella se «trans-formó» en mujer. Toma el nombre Abraxas, el de una divinidad antigua en la que se reconcilian los contrarios. El proceso se cuenta aquí en sus palabras y con la fecha pendiente de su propio relato.",
    dimensions: ["vida", "pensamiento"],
    images: [
      TL("abraxas-espejos-pose.jpg", "Abraxas entre los espejos de la casa (fotografía de prensa aportada por el equipo)"),
      TL("abraxas-hojas-risa.jpg", "Abraxas entre las hojas del patio (fotografía aportada por el equipo)"),
    ],
    quotes: ["«Todo es trans: ¿Tu cuerpo qué te dice?» — citada en el video del equipo, 2:36"],
    sources: [S.centropolis2020, S.elcolombiano2025, VIDEO("2:02–2:08")],
    verification: "por-verificar",
    certainty: "baja",
  },
  {
    id: "patrimonio",
    title: "Patrimonio cultural de Medellín",
    dateLabel: "c. 2016",
    sortYear: 2016,
    precision: "aproximada",
    description:
      "La casa museo, en la calle La Paz cerca de Balboa, es declarada patrimonio cultural del municipio. Centrópolis (2020) lo sitúa «unos cuatro años» antes. Casa arrendada de dos patios y seis cuartos, con todas sus paredes cubiertas de collage. En 2024 buscaba un tercer récord: un collage de más de 100.000 imágenes, sobre unos 450 m².",
    dimensions: ["patrimonio"],
    images: [
      TL("collage-oficina.jpg", "La oficina de Abraxas, joiner fotográfico del equipo Sala 04"),
      TL("casa-patio.jpg", "El patio de la casa museo (fotografía aportada por el equipo)"),
    ],
    quotes: ["«Aquí las fotos no se toman, se hacen.» — a Centrópolis, 2020"],
    sources: [S.centropolis2020, S.voa2024],
    verification: "documentado",
    certainty: "media",
  },
  {
    id: "legado",
    title: "«Está a punto de perderse» · su partida",
    dateLabel: "noviembre de 2025 – 18 de octubre de 2026",
    sortYear: 2025,
    precision: "dia",
    description:
      "En noviembre de 2025 El Colombiano publica que el museo está a punto de cerrar; el recorte se conserva en su escritorio. Abraxas muere en la madrugada del domingo 18 de octubre de 2026, según Telemedellín. Deja la casa museo con cerca de 100.000 imágenes en paredes, pisos y techos.",
    dimensions: ["patrimonio", "vida"],
    images: [
      { id: "pate1-img_1174", caption: "El recorte de El Colombiano sobre el escritorio (foto #460)" },
      TL("abraxas-plantas.jpg", "Abraxas entre las plantas de la casa (fotografía de prensa aportada por el equipo)"),
    ],
    quotes: ["«Se trata del exceso de información. Precisamente eso pasa en este museo.» — a El Colombiano, 2025"],
    sources: [S.elcolombiano2025, S.recorte2025, S.telemedellin2026],
    verification: "documentado",
    certainty: "alta",
  },
];

export const DIMENSIONS: { id: TimelineEvent["dimensions"][number]; label: string; color: string }[] = [
  { id: "vida", label: "Vida", color: "var(--magenta)" },
  { id: "politica", label: "Política", color: "var(--bermellon)" },
  { id: "arte", label: "Arte", color: "var(--amarillo)" },
  { id: "pensamiento", label: "Pensamiento", color: "var(--ultramar)" },
  { id: "patrimonio", label: "Patrimonio", color: "var(--verde)" },
];
