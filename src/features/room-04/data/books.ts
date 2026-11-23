import type { Book } from "../types";

/**
 * Libros de la Sala 04. Las citas son transcripciones literales verificadas contra la página del PDF
 * (Prohibido perder es un escaneo: texto obtenido por OCR y revisado a mano frente a la imagen de la página).
 * Para agregar o cambiar citas no hace falta tocar los componentes 3D.
 */
/** Páginas escaneadas: el número del archivo es el número de página del PDF. */
const page = (book: string) => (p: number) => `/assets/room-04/books/pages/${book}/p-${String(p).padStart(3, "0")}.webp`;

export const BOOKS: Book[] = [
  {
    id: "prohibido",
    title: "Prohibido perder",
    author: "Jorge Hernán Betancur A. — Abraxas",
    year: "c. 1987",
    status: "disponible",
    cover: "/assets/room-04/books/prohibido-cover.jpg",
    color: "#1e1a14",
    spine: "#d4a12a",
    thickness: 0.34,
    aspect: 700 / 990,
    pageCount: 137,
    pageImage: page("prohibido"),
    sourceNote:
      "PDF escaneado aportado por el equipo (137 páginas). Año aproximado: la página 3 reproduce un aviso del 48 aniversario del Instituto de Crédito Territorial (1939–1987). Por verificar.",
    quotes: [
      { id: "pp-67", text: "Todo es uno con el universo, aunque sus formas y fines, en lo posible del diario acaecer sean fugaces, diversas y contrarias.", pdfPage: 67, theme: "Contrarios", kind: "literal", verification: "verificado" },
      { id: "pp-46", text: "La piel humana, arte expuesto en la galería interminable de la especie.", pdfPage: 46, theme: "Cuerpo", context: "Título de sección", kind: "literal", verification: "verificado" },
      { id: "pp-129", text: "El futuro es la esencia del perfume que aún no hemos destapado; el pasado es la ceniza acumulada del ayer y su sombra que sentimos pero que no tocamos.", pdfPage: 129, theme: "Tiempo", kind: "literal", verification: "verificado" },
      { id: "pp-88", text: "La vida se casó con la muerte.", pdfPage: 88, theme: "Vida / muerte", kind: "literal", verification: "verificado" },
      { id: "pp-93", text: "Insistir es aprender a comenzar. La naturaleza a diario empieza sin nunca terminar.", pdfPage: 93, theme: "Transformación", kind: "literal", verification: "verificado" },
      { id: "pp-70", text: "El perfume es independiente de la flor que lo dispersa y la verdad camina sola sin la voz de quien la pronuncia.", pdfPage: 70, theme: "Verdad", kind: "literal", verification: "verificado" },
      { id: "pp-75", text: "Somos lo que pensamos.", pdfPage: 75, theme: "Pensamiento", context: "Título de sección", kind: "literal", verification: "verificado" },
      { id: "pp-76", text: "Vibremos con nuestra imaginación en las alas de la creatividad.", pdfPage: 76, theme: "Imaginación", kind: "literal", verification: "verificado" },
      { id: "pp-49", text: "Solo la vida nos permite ser dueños de la tierra.", pdfPage: 49, theme: "Naturaleza", context: "Título de sección", kind: "literal", verification: "verificado" },
      { id: "pp-10", text: "Nada de fines del mundo: contra los apocalipsis catastróficos.", pdfPage: 10, theme: "Futuro", kind: "literal", verification: "verificado" },
      { id: "pp-6", text: "Preparamos con este libro la generación del PROHIBIDO PERDER y usted es uno de ellos.", pdfPage: 6, theme: "Lectores", kind: "literal", verification: "verificado" },
    ],
  },
  {
    id: "tesis",
    title: "Por una ciudadanía global",
    subtitle: "Reflexiones fundamentales para una Constitución Política Mundial",
    author: "Jorge Hernán Betancur Aguilar",
    year: "2001",
    status: "disponible",
    cover: "/assets/room-04/books/tesis-cover.jpg",
    color: "#2340a8",
    spine: "#f3eee3",
    thickness: 0.42,
    aspect: 700 / 955,
    pageCount: 229,
    pageImage: page("tesis"),
    sourceNote:
      "Ensayo para optar al título de Especialista en Cultura Política: Pedagogía de Derechos Humanos. Universidad Autónoma Latinoamericana, Medellín, noviembre de 2001. Director: Héctor Ortiz Caras. Sus ilustraciones son fragmentos de la serie Récords Guinness Collage.",
    quotes: [
      { id: "ts-25", text: "El futuro nos juzga ya, juguémosle a ser Ciudadanos del Mundo habitantes de un planeta año 10.000, y luces de razón en la infinitud del Universo Cósmico.", pdfPage: 25, theme: "Futuro", kind: "literal", verification: "verificado" },
      { id: "ts-33", text: "La implantación de una Constitución Política Mundial ha de convertirse en práctica antropogógica para imaginar y soñar un Mundo y una humanidad mejor.", pdfPage: 33, theme: "Política", kind: "literal", verification: "verificado" },
      { id: "ts-60", text: "Las nuevas dimensiones de la globalización planetaria claman por una imaginación que humanice los poderes económicos y políticos.", pdfPage: 60, theme: "Imaginación", kind: "literal", verification: "verificado" },
      { id: "ts-52", text: "El Mundo ya no es una figura astronómica, es una categoría histórica de la modernidad.", pdfPage: 52, theme: "Mundo", kind: "literal", verification: "verificado", context: "La frase continúa: «…que propende por el desarrollo de un sistema global o world system»." },
      { id: "ts-86", text: "Los tres momentos del tiempo: pasado, presente y futuro, son la base de la memoria humana para impulsar sus ideales de colectividad mundial.", pdfPage: 86, theme: "Memoria", kind: "literal", verification: "verificado" },
      { id: "ts-108", text: "La fuerza sin la razón de todo derecho, es la crueldad, barbarie y atrocidad contra el ser humano.", pdfPage: 108, theme: "Derecho", kind: "literal", verification: "verificado" },
      { id: "ts-218", text: "El Planeta tierra debe ser tratado como patrimonio global y casa común de toda la humanidad.", pdfPage: 218, theme: "Naturaleza", context: "Artículo I de la Constitución Política del Mundo que propone el ensayo", kind: "literal", verification: "verificado" },
      { id: "ts-4", text: "…esta obra que dialoga desde ya con la humanidad que se encontrará con el amanecer del primer día del año 10.000.", pdfPage: 4, theme: "Dedicatoria", kind: "literal", verification: "verificado" },
    ],
  },
  {
    id: "poemario",
    title: "Poemario",
    author: "Abraxas",
    status: "disponible",
    cover: "/assets/room-04/books/poemario-cover.jpg",
    coverNote: "Fotografía del ejemplar físico de portada verde; no es una portada rediseñada.",
    color: "#55562b",
    spine: "#3f4020",
    thickness: 0.26,
    aspect: 560 / 820,
    pageCount: 268,
    pageImage: page("poemario"),
    sourceNote:
      "Poemario de portada verde, digitalizado por el equipo Sala 04 a partir de fotografías del ejemplar físico (22 nov. 2026): cada doble página se separó, enderezó y limpió sobre blanco; se descartaron tomas repetidas y borrosas. Las citas se transcribieron y verificaron contra la imagen de cada página; «pdfPage» es la página del visor y el contexto indica la página impresa.",
    quotes: [
      { id: "po-28", text: "El legendario Abraxas dijo: luego de entender las contradicciones del ser y desde su templo reflejante, saltó con todas las fuerzas de su impulso y rompió el salón de sus espejismos.", pdfPage: 28, theme: "Espejos", context: "Fragmento (pág. impresa 15)", kind: "literal", verification: "verificado" },
      { id: "po-32", text: "Hermana, sangre de mi sangre, carne de mi carne, ¿cómo explicas que tus anhelos son de macho y de hembra a la vez, hoy igual que ayer, mañana igual que hoy?", pdfPage: 32, theme: "Cuerpo", context: "Pág. impresa 19", kind: "literal", verification: "verificado" },
      { id: "po-196", text: "La ley de la tierra es tan absolutamente relativa como Abraxas; como el ayer y el mañana, como el ya que no es ya.", pdfPage: 196, theme: "Contrarios", context: "Fragmento (pág. impresa 205)", kind: "literal", verification: "verificado" },
      { id: "po-85", text: "El hombre solo vive la esencia de un presente, escurridizo suspiro, segundos en permanente transición.", pdfPage: 85, theme: "Tiempo", context: "Fragmento (pág. impresa 78)", kind: "literal", verification: "verificado" },
      { id: "po-196b", text: "Ley de la tierra enseña siempre que lo que la naturaleza engendra, la naturaleza transforma lentamente hasta lograr su punto de partida.", pdfPage: 196, theme: "Transformación", context: "Pág. impresa 205", kind: "literal", verification: "verificado" },
      { id: "po-235", text: "Sólo será libre de tí, aquél que teniéndolo todo, está seguro que nada posee.", pdfPage: 235, theme: "Libertad", context: "Fragmento (pág. impresa 253)", kind: "literal", verification: "verificado" },
      { id: "po-177", text: "El dominio sabio del padre sol, el diálogo con la madre tierra, el imaginar con la abuela luna, el meditar con el hermano mar.", pdfPage: 177, theme: "Naturaleza", context: "Fragmento (pág. impresa 183)", kind: "literal", verification: "verificado" },
      { id: "po-88", text: "¿Serás la proyección existencial del tiempo incandescente de la brasa, consumida en el instante transitorio de la chispa y el carbón, de la vida y de la muerte?", pdfPage: 88, theme: "Vida / muerte", context: "Pág. impresa 81", kind: "literal", verification: "verificado" },
      { id: "po-83", text: "Todo es pujanza al instante. Luego, decaimiento en el continuado devenir.", pdfPage: 83, theme: "Devenir", context: "Fragmento (pág. impresa 76)", kind: "literal", verification: "verificado" },
      { id: "po-53", text: "Toda piel humana, es de zapa, encubridora de un sabio laboratorio.", pdfPage: 53, theme: "Piel", context: "Fragmento (pág. impresa 44)", kind: "literal", verification: "verificado" },
      { id: "po-200", text: "En la ley de la tierra dioses y demonios se enlazan en la síntesis vivencial del sexo.", pdfPage: 200, theme: "Deseo", context: "Fragmento (pág. impresa 209)", kind: "literal", verification: "verificado" },
      { id: "po-23", text: "La novela ha muerto, porque estamos en el siglo inhumano de lo atómico y la electrónica.", pdfPage: 23, theme: "Época", context: "Fragmento (pág. impresa 9)", kind: "literal", verification: "verificado" },
    ],
  },
];
