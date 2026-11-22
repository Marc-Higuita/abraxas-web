/** Recursos multimedia configurables. Cambiar aquí, no en los componentes. */
export const DOCUMENTARY = {
  /** H.264 1080p comprimido (CRF 28, máx. 700 kb/s), +faststart. Fuente: Abraxas_Obra_y_autor.mp4 del equipo. */
  src: "/assets/room-04/videos/abraxas-obra-y-autor.mp4",
  poster: "/assets/room-04/misc/video-poster.jpg",
  /** Subtítulos WebVTT opcionales. */
  title: "Abraxas: obra y autor",
  description: "",
  duration: "2:52",
  credits: "Equipo Sala 04",
  source: "Video del equipo · subtítulos incrustados",
};

export const PLAYLIST = {
  url: process.env.NEXT_PUBLIC_SPOTIFY_PLAYLIST_URL || "https://open.spotify.com/playlist/6iPRIeMYZaxInN2HIaHVZq",
  uri: "spotify:playlist:6iPRIeMYZaxInN2HIaHVZq",
  qr: "/assets/room-04/misc/spotify-qr.svg",
  title: "Playlist inspirada en Abraxas",
};

/** Retrato usado por el campo de partículas del cierre (foto aportada por el equipo). */
export const PARTICLE_PORTRAIT = "/assets/room-04/portrait/abraxas-espejos.jpg";

export const spotifyEmbed = (url: string) => {
  const m = url.match(/playlist\/([A-Za-z0-9]+)/);
  return m ? `https://open.spotify.com/embed/playlist/${m[1]}?utm_source=generator&theme=0` : null;
};
