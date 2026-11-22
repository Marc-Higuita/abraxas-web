"use client";
import { useEffect, useRef, useState } from "react";
import { useScrollProgress } from "../../hooks/useScrollProgress";
import { DOCUMENTARY } from "../../data/media";
import { useRoom } from "../../store";
import s from "./documentary.module.css";

const fmt = (t: number) => (Number.isFinite(t) ? `${Math.floor(t / 60)}:${String(Math.floor(t % 60)).padStart(2, "0")}` : "0:00");

export function DocumentarySection() {
  const section = useRef<HTMLElement>(null);
  const frame = useRef<HTMLDivElement>(null);
  const exitNote = useRef<HTMLParagraphElement>(null);
  const video = useRef<HTMLVideoElement>(null);
  const reduced = useRoom((st) => st.reducedMotion);
  const muted = useRoom((st) => st.muted);
  const toggleMuted = useRoom((st) => st.toggleMuted);
  const [available, setAvailable] = useState<boolean | null>(null);
  const [playing, setPlaying] = useState(false);
  const [time, setTime] = useState({ cur: 0, dur: 0 });
  const [captions, setCaptions] = useState(true);
  const [interacted, setInteracted] = useState(false);

  useScrollProgress(section, (p) => {
    const el = frame.current;
    if (!el) return;
    // entra como un fragmento del collage y se expande hasta ocupar la escena
    const k = reduced ? 1 : Math.min(1, p / 0.42);
    const e = k * k * (3 - 2 * k);
    const scale = 0.34 + 0.66 * e;
    const rot = (1 - e) * -6;
    const x = (1 - e) * 18;
    el.style.transform = `translate(${x}vw, 0) rotate(${rot}deg) scale(${scale})`;
    el.style.boxShadow = e < 0.98 ? "var(--shadow-recorte)" : "none";
    // salida: se reduce y deja paso a los libros
    const out = Math.max(0, (p - 0.78) / 0.22);
    if (out > 0) el.style.transform = `scale(${1 - out * 0.55}) rotate(${out * 4}deg)`;
    el.style.opacity = String(1 - out * 0.85);
    if (exitNote.current) exitNote.current.style.opacity = String(interacted || p > 0.6 ? Math.min(1, (p - 0.5) * 5) : 0);
  });

  useEffect(() => {
    if (video.current) video.current.muted = muted;
  }, [muted]);

  useEffect(() => {
    // comprueba si el archivo existe sin descargarlo completo
    fetch(DOCUMENTARY.src, { method: "HEAD" })
      .then((r) => setAvailable(r.ok && (r.headers.get("content-type") ?? "").includes("video")))
      .catch(() => setAvailable(false));
  }, []);

  const toggle = () => {
    const v = video.current;
    if (!v) return;
    setInteracted(true);
    if (v.paused) {
      if (muted) toggleMuted(); // reproducir con sonido solo tras el clic del visitante
      v.play().catch(() => setPlaying(false));
    } else v.pause();
  };
  const seek = (val: number) => { if (video.current) video.current.currentTime = val; };
  const fullscreen = () => { frame.current?.requestFullscreen?.().catch(() => undefined); };

  return (
    <section ref={section} id="video" className={s.section} aria-labelledby="act2-title" style={{ height: reduced ? "180vh" : "300vh" }}>
      <div className={s.sticky}>
        <div className={s.head}>
          <span className="t-label">02 · La imagen que habla</span>
          <h2 id="act2-title" className="t-title">Las fotografías nos trajeron hasta su voz.</h2>
        </div>
        <div ref={frame} className={s.frame}>
          {available === null ? (
            <img className={s.video} src={DOCUMENTARY.poster} alt="" />
          ) : available === false ? (
            <div className={s.pending}>
              <img src={DOCUMENTARY.poster} alt="Abraxas durante una entrevista en la casa museo" />
              <div className={s.pendingNote}>
                <span className="tag tag-amarillo">Video pendiente</span>
                <p>El MP4 del equipo todavía no está en el proyecto. Súbelo como <code>public{DOCUMENTARY.src}</code> y este reproductor lo carga sin cambiar código.</p>
              </div>
            </div>
          ) : (
            <>
              <video
                ref={video}
                className={s.video}
                src={DOCUMENTARY.src}
                poster={DOCUMENTARY.poster}
                playsInline
                preload="metadata"
                muted={muted}
                onPlay={() => setPlaying(true)}
                onPause={() => setPlaying(false)}
                onTimeUpdate={(e) => setTime({ cur: e.currentTarget.currentTime, dur: e.currentTarget.duration })}
                onLoadedMetadata={(e) => setTime({ cur: 0, dur: e.currentTarget.duration })}
                onClick={toggle}
              >
                <track kind="captions" srcLang="es" label="Español" src={DOCUMENTARY.captions} default={captions} />
              </video>
              <div className={s.controls} role="group" aria-label="Controles del video">
                <button className="icon-btn" onClick={toggle} aria-label={playing ? "Pausar" : "Reproducir"}>
                  {playing ? (
                    <svg viewBox="0 0 24 24"><path d="M8 5v14M16 5v14" /></svg>
                  ) : (
                    <svg viewBox="0 0 24 24"><path d="M7 4l13 8-13 8z" /></svg>
                  )}
                </button>
                <button className="icon-btn" onClick={toggleMuted} aria-label={muted ? "Activar sonido" : "Silenciar"} aria-pressed={!muted}>
                  <svg viewBox="0 0 24 24"><path d="M4 9h4l5-4v14l-5-4H4z" />{muted ? <path d="M17 9l4 6M21 9l-4 6" /> : <path d="M17 8a5 5 0 010 8" />}</svg>
                </button>
                <input
                  className={s.range}
                  type="range"
                  min={0}
                  max={time.dur || 0}
                  step={0.1}
                  value={time.cur}
                  onChange={(e) => seek(Number(e.target.value))}
                  aria-label="Progreso del video"
                  aria-valuetext={`${fmt(time.cur)} de ${fmt(time.dur)}`}
                />
                <span className={s.time}>{fmt(time.cur)} / {fmt(time.dur)}</span>
                <button className="icon-btn" onClick={() => {
                  setCaptions((c) => !c);
                  const tr = video.current?.textTracks[0];
                  if (tr) tr.mode = captions ? "hidden" : "showing";
                }} aria-pressed={captions} aria-label="Subtítulos">
                  <svg viewBox="0 0 24 24"><rect x="3" y="6" width="18" height="12" /><path d="M7 13h4M13 13h4" /></svg>
                </button>
                <button className="icon-btn" onClick={fullscreen} aria-label="Pantalla completa">
                  <svg viewBox="0 0 24 24"><path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5" /></svg>
                </button>
              </div>
            </>
          )}
        </div>
        <aside className={s.meta}>
          <p><strong>{DOCUMENTARY.title}</strong></p>
          <p>{DOCUMENTARY.description}</p>
          <p className="t-meta">Fecha: {DOCUMENTARY.date} · Créditos: {DOCUMENTARY.credits} · Fuente: {DOCUMENTARY.source}</p>
        </aside>
        <p ref={exitNote} className={s.exit}>La memoria no termina en una imagen. Sigue desplazándote.</p>
      </div>
    </section>
  );
}
