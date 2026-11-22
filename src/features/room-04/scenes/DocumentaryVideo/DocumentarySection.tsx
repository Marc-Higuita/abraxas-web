"use client";
import { useEffect, useRef, useState } from "react";
import { useScrollProgress } from "../../hooks/useScrollProgress";
import { DOCUMENTARY } from "../../data/media";
import { useRoom } from "../../store";
import { Ticket, Sticker } from "@/components/abx/Ticket";
import { StitchLine } from "@/components/abx/Ornaments";
import { sound } from "@/lib/audio/useSound";
import s from "./documentary.module.css";

/** Recortes de las paredes de la habitación (bordes rasgados, sin marco) que construyen el fondo. */
const FRAGS: { n: number; x: number; y: number; w: number; r: number; d: number }[] = [
  { n: 0, x: -3, y: 6, w: 15, r: -8, d: 0.5 }, { n: 4, x: 9, y: -4, w: 13, r: 6, d: 0.8 }, { n: 5, x: 74, y: -6, w: 14, r: -5, d: 0.6 },
  { n: 8, x: 87, y: 10, w: 15, r: 9, d: 0.9 }, { n: 9, x: -5, y: 38, w: 14, r: 4, d: 0.7 }, { n: 10, x: 88, y: 40, w: 13, r: -7, d: 0.5 },
  { n: 12, x: 2, y: 66, w: 16, r: -4, d: 1 }, { n: 13, x: 80, y: 68, w: 15, r: 6, d: 0.8 }, { n: 14, x: 20, y: 80, w: 13, r: 10, d: 0.6 },
  { n: 16, x: 62, y: 82, w: 14, r: -9, d: 0.9 }, { n: 17, x: 40, y: 88, w: 12, r: 3, d: 0.5 }, { n: 18, x: 24, y: -8, w: 12, r: -12, d: 0.7 },
  { n: 19, x: 58, y: -10, w: 12, r: 8, d: 0.6 }, { n: 20, x: 93, y: 76, w: 11, r: -3, d: 1.1 }, { n: 21, x: -6, y: 86, w: 12, r: 7, d: 0.9 },
  { n: 22, x: 70, y: 26, w: 10, r: 14, d: 1.2 }, { n: 23, x: 14, y: 24, w: 11, r: -14, d: 1.1 }, { n: 25, x: 46, y: -12, w: 11, r: -6, d: 0.8 },
  // más detalles y texturas de las paredes, siempre detrás del reproductor
  { n: 30, x: -9, y: 18, w: 12, r: 11, d: 1.3 }, { n: 31, x: 96, y: 24, w: 11, r: -10, d: 1.25 }, { n: 32, x: 33, y: -14, w: 10, r: 5, d: 1.15 },
  { n: 33, x: 66, y: -14, w: 9, r: -11, d: 1.3 }, { n: 34, x: -8, y: 54, w: 12, r: -6, d: 1.2 }, { n: 35, x: 97, y: 56, w: 12, r: 8, d: 1.15 },
  { n: 36, x: 30, y: 90, w: 12, r: -8, d: 1.25 }, { n: 37, x: 52, y: 92, w: 11, r: 12, d: 1.3 }, { n: 38, x: 8, y: 94, w: 11, r: 4, d: 1.1 },
  { n: 39, x: 86, y: 92, w: 11, r: -5, d: 1.2 }, { n: 40, x: 4, y: -12, w: 11, r: 9, d: 1.3 }, { n: 41, x: 88, y: -12, w: 10, r: -12, d: 1.25 },
];
const VC = "/assets/room-04/video-collage";

const fmt = (t: number) => (Number.isFinite(t) ? `${Math.floor(t / 60)}:${String(Math.floor(t % 60)).padStart(2, "0")}` : "0:00");

/**
 * 02 · La imagen que habla. El video es el protagonista, al centro.
 * Detrás: un collage de recortes rasgados de las mismas paredes de la habitación y una silueta
 * hecha de fragmentos, en tres capas con parallax. Se llega desde la puerta de vidrio de la habitación.
 */
export function DocumentarySection() {
  const section = useRef<HTMLElement>(null);
  const stage = useRef<HTMLDivElement>(null);
  const frame = useRef<HTMLDivElement>(null);
  const video = useRef<HTMLVideoElement>(null);
  const reduced = useRoom((st) => st.reducedMotion);
  const muted = useRoom((st) => st.muted);
  const toggleMuted = useRoom((st) => st.toggleMuted);
  const [available, setAvailable] = useState<boolean | null>(null);
  const [playing, setPlaying] = useState(false);
  const [time, setTime] = useState({ cur: 0, dur: 0 });

  useScrollProgress(section, (p) => {
    const el = stage.current;
    if (!el) return;
    // las capas llegan y se asientan mientras la sección entra
    const k = reduced ? 1 : Math.min(1, p / 0.45);
    el.style.setProperty("--open", String(1 - Math.pow(1 - k, 3)));
    el.style.setProperty("--settle", String(reduced ? 1 : Math.min(1, Math.max(0, (p - 0.1) / 0.45))));
  }, { start: "top bottom", end: "bottom bottom" });
  const onMove = (e: React.PointerEvent) => {
    if (reduced || e.pointerType !== "mouse") return;
    // en el contenedor fijo: lo heredan el muro de fondo y todas las capas
    const el = e.currentTarget as HTMLElement;
    el.style.setProperty("--mx", ((e.clientX / innerWidth) * 2 - 1).toFixed(3));
    el.style.setProperty("--my", ((e.clientY / innerHeight) * 2 - 1).toFixed(3));
  };

  useEffect(() => { if (video.current) video.current.muted = muted; }, [muted]);
  useEffect(() => {
    fetch(DOCUMENTARY.src, { method: "HEAD" })
      .then((r) => setAvailable(r.ok && (r.headers.get("content-type") ?? "").includes("video")))
      .catch(() => setAvailable(false));
  }, []);
  // si el video sale de pantalla, se pausa
  useEffect(() => {
    const v = video.current;
    if (!v) return;
    const io = new IntersectionObserver(([e]) => { if (!e.isIntersecting && !v.paused) v.pause(); }, { threshold: 0.15 });
    io.observe(v);
    return () => io.disconnect();
  }, [available]);

  const toggle = () => {
    const v = video.current;
    if (!v) return;
    if (v.paused) { if (muted) toggleMuted(); v.play().catch(() => setPlaying(false)); } else v.pause();
  };
  const fullscreen = () => { frame.current?.requestFullscreen?.().catch(() => undefined); };
  const onKey = (e: React.KeyboardEvent) => {
    const v = video.current;
    if (!v) return;
    if (e.key === "ArrowRight") { v.currentTime = Math.min(v.duration || 0, v.currentTime + 5); e.preventDefault(); }
    if (e.key === "ArrowLeft") { v.currentTime = Math.max(0, v.currentTime - 5); e.preventDefault(); }
  };
  // canal de audio del video: mientras suena con sonido, la música de fondo baja
  useEffect(() => { sound.setVideoActive(playing && !muted); }, [playing, muted]);
  useEffect(() => () => sound.setVideoActive(false), []);

  return (
    <section ref={section} id="video" className={`${s.section} tx-kraft`} aria-labelledby="act2-title" style={{ minHeight: reduced ? "100svh" : "130svh" }}>
      <h2 id="act2-title" className="sr-only">02 · La imagen que habla: video documental</h2>
      <div className={s.sticky} onPointerMove={onMove}>
        {/* muro de collage a sangre con los recortes de las paredes de la habitación */}
        <div className={s.wall} aria-hidden="true" />
        <div className={s.wallVeil} aria-hidden="true" />
        <div ref={stage} className={s.stage}>
          {/* capas DETRÁS del video: recortes de las paredes y una silueta hecha de fragmentos */}
          <div className={s.back} aria-hidden="true">
            <span className={`${s.paper} ${s.paperLima}`} />
            <span className={`${s.paper} ${s.paperPapel}`} />
            {FRAGS.map((f, i) => (
              <img
                key={f.n}
                className={s.frag}
                src={`${VC}/frag-${String(f.n).padStart(2, "0")}.webp`}
                alt=""
                loading="lazy"
                style={{ left: `${f.x}%`, top: `${f.y}%`, width: `${f.w}%`, ["--r" as string]: `${f.r}deg`, ["--d" as string]: f.d, ["--i" as string]: i }}
              />
            ))}
            <div className={s.figure}>
              <img className={`${s.fig} ${s.figA}`} src={`${VC}/silueta-atras.webp`} alt="" loading="lazy" />
              <img className={`${s.fig} ${s.figB}`} src={`${VC}/silueta-cuerpo.webp`} alt="" loading="lazy" />
              <img className={`${s.fig} ${s.figC}`} src={`${VC}/silueta-delante.webp`} alt="" loading="lazy" />
            </div>
            <img className={s.eye} src="/assets/room-04/interludes/ojo-azul.webp" alt="" loading="lazy" />
            <img className={s.mask} src="/assets/room-04/interludes/mascara.webp" alt="" loading="lazy" />
            <StitchLine className={s.stitchBack} color="var(--negro)" width={900} />
          </div>

          <div className={s.labels}>
            <Sticker tone="negro" rotate={-5}>02</Sticker>
            <Sticker tone="papel" shape="pill" rotate={3}>La imagen que habla</Sticker>
          </div>

          <div ref={frame} className={s.frame} data-cursor="play">
            {/* cinta solo sobre el filo de papel: nunca sobre la imagen ni los controles */}
            <span className={`${s.tape} ${s.tapeA}`} aria-hidden="true" />
            <span className={`${s.tape} ${s.tapeB}`} aria-hidden="true" />
            {available === false ? (
              <div className={s.pending}><img src={DOCUMENTARY.poster} alt="" /><p>El video no está disponible.</p></div>
            ) : (
              <>
                <video
                  ref={video}
                  className={s.video}
                  src={available ? DOCUMENTARY.src : undefined}
                  poster={DOCUMENTARY.poster}
                  playsInline
                  preload="metadata"
                  muted={muted}
                  onPlay={() => setPlaying(true)}
                  onPause={() => setPlaying(false)}
                  onEnded={() => setPlaying(false)}
                  onTimeUpdate={(e) => setTime({ cur: e.currentTarget.currentTime, dur: e.currentTarget.duration })}
                  onLoadedMetadata={(e) => setTime({ cur: 0, dur: e.currentTarget.duration })}
                  onClick={toggle}
                  aria-label={`${DOCUMENTARY.title}, ${DOCUMENTARY.duration}`}
                />
                {!playing && (
                  <button className={s.bigPlay} onClick={toggle} aria-label="Reproducir el video" data-cursor="play">
                    <svg viewBox="0 0 24 24" width="40" height="40" aria-hidden="true"><path d="M8 5l12 7-12 7z" fill="currentColor" /></svg>
                  </button>
                )}
                <div className={s.controls} role="group" aria-label="Controles del video" onKeyDown={onKey}>
                  <Ticket size="sm" tone="lima" icon={playing ? "pausa" : "play"} onClick={toggle} aria-label={playing ? "Pausar" : "Reproducir"} cursor="play" />
                  <Ticket size="sm" tone="papel" icon={muted ? "silencio" : "sonido"} onClick={toggleMuted} aria-label={muted ? "Activar sonido" : "Silenciar"} aria-pressed={!muted} />
                  <input
                    className={s.range}
                    type="range"
                    min={0}
                    max={time.dur || 0}
                    step={0.1}
                    value={time.cur}
                    onChange={(e) => { if (video.current) video.current.currentTime = Number(e.target.value); }}
                    aria-label="Progreso del video"
                    aria-valuetext={`${fmt(time.cur)} de ${fmt(time.dur)}`}
                    style={{ ["--p" as string]: `${time.dur ? (time.cur / time.dur) * 100 : 0}%` }}
                  />
                  <span className={s.time}>{fmt(time.cur)} / {fmt(time.dur)}</span>
                  <Ticket size="sm" tone="papel" icon="pantalla" onClick={fullscreen} aria-label="Pantalla completa" />
                </div>
              </>
            )}
          </div>

        </div>
      </div>
    </section>
  );
}
