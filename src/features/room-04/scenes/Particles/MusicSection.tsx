"use client";
import dynamic from "next/dynamic";
import { useRef, useState } from "react";
import { useScrollProgress } from "../../hooks/useScrollProgress";
import { useInView } from "../../hooks/useInView";
import { hasWebGL } from "../../hooks/useDevice";
import { PARTICLE_PORTRAIT, PLAYLIST, spotifyEmbed } from "../../data/media";
import { INSPIRADAS, KIND_LABEL } from "../../data/phrases";
import { useRoom } from "../../store";
import s from "./music.module.css";

const ParticlesCanvas = dynamic(() => import("./ParticlesCanvas").then((m) => m.ParticlesCanvas), { ssr: false });

export function MusicSection() {
  const section = useRef<HTMLElement>(null);
  const inView = useInView(section);
  const progress = useScrollProgress(section, undefined, { start: "top bottom", end: "center center" });
  const [webgl] = useState(() => hasWebGL());
  const music = useRoom((st) => st.musicMode);
  const setMusic = useRoom((st) => st.setMusicMode);
  const embed = spotifyEmbed(PLAYLIST.url);
  const phrase = INSPIRADAS[1];

  return (
    <section ref={section} id="musica" className={s.section} aria-labelledby="coda-title">
      <div className={s.canvas}>
        {webgl ? <ParticlesCanvas src={PARTICLE_PORTRAIT} progress={progress} active={inView} /> : <img src={PARTICLE_PORTRAIT} alt="Abraxas en el patio de los espejos" />}
      </div>
      <div className={s.panel}>
        <span className="t-label">Coda · Una playlist para Abraxas</span>
        <h2 id="coda-title" className="t-title">Miles de puntos de color vuelven a formar su imagen.</h2>
        <figure className={s.phrase}>
          <blockquote className="t-quote">«{phrase.text}»</blockquote>
          <figcaption className="t-meta">{KIND_LABEL[phrase.kind]}</figcaption>
        </figure>
        <button className={`btn ${music ? "btn-oro" : "btn-papel"}`} aria-pressed={music} onClick={() => setMusic(!music)}>
          {music ? "Calmar las partículas" : "Modo música: que bailen"}
        </button>
        {embed ? (
          <iframe className={s.spotify} title={PLAYLIST.title} src={embed} width="100%" height="352" allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture" loading="lazy" />
        ) : (
          <p className={s.pending}>
            <span className="tag tag-amarillo">Playlist pendiente</span> Crea la playlist en Spotify y agrega su enlace en la variable
            <code> NEXT_PUBLIC_SPOTIFY_PLAYLIST_URL</code>. Aparecerá aquí con su reproductor.
          </p>
        )}
        <p className="t-meta">La reproducción ocurre dentro del reproductor de Spotify; el modo música lo activas tú con el botón.</p>
      </div>
    </section>
  );
}
