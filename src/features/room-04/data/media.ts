/** Recursos multimedia configurables. Cambiar aquí, no en los componentes. */
export const DOCUMENTARY = {
  /** Sube el MP4 a public/assets/room-04/videos/ con este nombre (H.264, ~1080p, 6–8 Mbps). */
  src: "/assets/room-04/videos/abraxas.mp4",
  poster: "/assets/room-04/portrait/abraxas-entrevista.jpg",
  /** Subtítulos WebVTT opcionales. */
  captions: "/assets/room-04/videos/abraxas.es.vtt",
  title: "La imagen que habla",
  description: "Video documental de Abraxas. Título, fecha, créditos y fuente se completan cuando el equipo incorpore el archivo final.",
  date: "Por definir",
  credits: "Por definir",
  source: "Archivo del equipo Sala 04",
};

export const PLAYLIST = {
  url: process.env.NEXT_PUBLIC_SPOTIFY_PLAYLIST_URL ?? "",
  title: "Playlist inspirada en Abraxas",
};

/** Retrato usado por el campo de partículas del cierre (foto aportada por el equipo). */
export const PARTICLE_PORTRAIT = "/assets/room-04/portrait/abraxas-espejos.jpg";

export const spotifyEmbed = (url: string) => {
  const m = url.match(/playlist\/([A-Za-z0-9]+)/);
  return m ? `https://open.spotify.com/embed/playlist/${m[1]}?utm_source=generator&theme=0` : null;
};
