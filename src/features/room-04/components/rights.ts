/**
 * Derechos por tipo de material (BORRADOR PARA REVISIÓN).
 * Cada material puede tener un titular distinto: no se asume uno solo para todo el sitio.
 * "Por completar" marca lo que el equipo debe confirmar antes de publicar como definitivo.
 */
export interface RightsRow { material: string; donde: string; titular: string; uso: string; pendiente?: string }

export const RIGHTS: RightsRow[] = [
  {
    material: "Obras de collage, muros y objetos de la Casa Museo",
    donde: "Habitación de fotos, video, interludios, retrato, línea de tiempo",
    titular: "Abraxas Aguilar (Jorge Hernán Betancur Aguilar) y sus herederos o representantes",
    uso: "Reproducción fotográfica con fines culturales y académicos, sin uso comercial",
    pendiente: "Autorización escrita de los herederos o de quien administre el legado de la Casa Museo",
  },
  {
    material: "Fotografías de la Casa Museo tomadas por el equipo",
    donde: "Habitación (1.176 fotos analizadas), túnel, retrato, habitación de mensajes",
    titular: "Equipo Sala 04 · Universidad de Antioquia (autoría de la toma); la obra fotografiada es de Abraxas",
    uso: "Licencia de uso dentro del proyecto",
    pendiente: "Nombres de quienes tomaron cada lote de fotos",
  },
  {
    material: "Fotografías de prensa de Abraxas",
    donde: "Retrato y línea de tiempo",
    titular: "Medios y fotógrafos de origen (Telemedellín, El Colombiano y otros)",
    uso: "El equipo confirma que tiene permiso de uso",
    pendiente: "Medio, autor y fecha de cada foto, y copia del permiso",
  },
  {
    material: "Libros y textos de Abraxas",
    donde: "Biblioteca: «Prohibido perder», «Por una ciudadanía global» (UNAULA, 2001) y Poemario",
    titular: "Abraxas Aguilar (Jorge Hernán Betancur Aguilar); la tesis también pertenece al repositorio de UNAULA",
    uso: "Citas breves con su página y escaneos para consulta",
    pendiente: "Autorización para mostrar los escaneos completos; datos editoriales del Poemario",
  },
  {
    material: "Citas de Abraxas en entrevistas",
    donde: "Interludios y retrato",
    titular: "Abraxas Aguilar; la entrevista pertenece a cada medio (p. ej. Centrópolis, 2020)",
    uso: "Cita breve con su fuente",
  },
  {
    material: "Video documental en collage",
    donde: "Sección 02 · La imagen que habla",
    titular: "Equipo Sala 04",
    uso: "Producción propia del curso",
    pendiente: "Créditos completos: guion, animación, voz y música del video",
  },
  {
    material: "Recortes del tablero (cuerpos, rostros, pelo, pinzas) y alfabetos recortados",
    donde: "Tablero «Tu figura, tu mensaje»",
    titular: "Autores de las láminas originales, en su mayoría sin identificar",
    uso: "Fragmentos recortados como material de collage; no se reproducen obras completas ni fotos de personas identificables",
    pendiente: "Origen y autoría de cada lámina, en especial los alfabetos",
  },
  {
    material: "Figuras y mensajes de los visitantes",
    donde: "Habitación de los mensajes",
    titular: "Cada visitante conserva la autoría de su mensaje",
    uso: "Licencia no exclusiva para mostrarlo en el sitio mientras esté publicado (ver Términos)",
  },
  {
    material: "Playlist «Playlist para Abraxas»",
    donde: "Tocadiscos de la habitación de los mensajes",
    titular: "Las canciones pertenecen a sus artistas y sellos; la reproducción ocurre dentro del reproductor oficial de Spotify",
    uso: "Enlace e integración oficial de Spotify",
  },
  {
    material: "Diseño, código e identidad visual del sitio",
    donde: "Todo el sitio",
    titular: "Equipo del proyecto Museo Abraxas · Universidad de Antioquia",
    uso: "Proyecto académico",
    pendiente: "Licencia que se quiera dar al código (por ejemplo, abierta o reservada)",
  },
];
