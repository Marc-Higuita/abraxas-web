/** Recursos multimedia configurables. Cambiar aquí, no en los componentes. */
export const DOCUMENTARY = {
  /** Versión corregida del equipo (22 nov 2026). H.264 1080p (CRF 28, máx. 800 kb/s), AAC 128k, +faststart. */
  src: "/assets/room-04/videos/abraxas-obra-y-autor-v2.mp4",
  poster: "/assets/room-04/misc/video-poster-v2.jpg",
  /** Subtítulos WebVTT opcionales. */
  title: "Abraxas: obra y autor",
  description: "",
  duration: "2:48",
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
