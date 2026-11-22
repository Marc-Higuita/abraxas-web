"use client";
import { useEffect, useRef, useState } from "react";
import { useScrollProgress } from "../../hooks/useScrollProgress";
import { DOCUMENTARY } from "../../data/media";
import { useRoom } from "../../store";
import { Ticket, Sticker } from "@/components/abx/Ticket";
import { DottedOval, StitchLine } from "@/components/abx/Ornaments";
import s from "./documentary.module.css";

const fmt = (t: number) => (Number.isFinite(t) ? `${Math.floor(t / 60)}:${String(Math.floor(t % 60)).padStart(2, "0")}` : "0:00");

/**
 * 02 · La imagen que habla. El video del equipo es el protagonista, al centro.
 * Sin frases: solo capas de material de la casa (fotos rasgadas, papel, cinta, costura)
 * unas detrás y otras delante del video. Entra como una puerta que se abre desde el túnel.
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
    // la puerta: dos hojas que se abren desde el centro (0 → 0.4), luego las capas se asientan
    const k = reduced ? 1 : Math.min(1, p / 0.4);
    const e = 1 - Math.pow(1 - k, 3);
    el.style.setProperty("--open", String(e));
    el.style.setProperty("--settle", String(reduced ? 1 : Math.min(1, Math.max(0, (p - 0.15) / 0.45))));
  }, { start: "top bottom", end: "bottom bottom" });

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

  return (
    <section ref={section} id="video" className={`${s.section} tx-kraft`} aria-labelledby="act2-title" style={{ minHeight: reduced ? "100svh" : "130svh" }}>
      <h2 id="act2-title" className="sr-only">02 · La imagen que habla: video documental</h2>
      <div className={s.sticky}>
        <div ref={stage} className={s.stage}>
          {/* capas DETRÁS del video */}
          <div className={s.back} aria-hidden="true">
            <span className={`${s.paper} ${s.paperLima}`} />
            <span className={`${s.paper} ${s.paperPapel}`} />
            <img className={`${s.shard} ${s.shardA}`} src="/assets/room-04/archive/parte2-img_1414.jpg" alt="" loading="lazy" />
            <img className={`${s.shard} ${s.shardB}`} src="/assets/room-04/archive/parte2-img_09801.jpg" alt="" loading="lazy" />
            <DottedOval className={s.oval} color="rgba(18,17,16,.55)" />
            <StitchLine className={s.stitchBack} color="var(--negro)" width={900} />
          </div>

          <div className={s.labels}>
            <Sticker tone="negro" rotate={-5}>02</Sticker>
            <Sticker tone="papel" shape="pill" rotate={3}>La imagen que habla</Sticker>
          </div>

          <div ref={frame} className={s.frame} data-cursor="play">
            <span className={`${s.leaf} ${s.leafL}`} aria-hidden="true" />
            <span className={`${s.leaf} ${s.leafR}`} aria-hidden="true" />
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

          {/* capas DELANTE del video */}
          <div className={s.front} aria-hidden="true">
            <span className={`${s.tape} ${s.tapeA}`} />
            <span className={`${s.tape} ${s.tapeB}`} />
            <span className={`${s.tape} ${s.tapeC}`} />
            <img className={s.eye} src="/assets/room-04/interludes/ojo-azul.webp" alt="" loading="lazy" />
            <img className={s.mask} src="/assets/room-04/interludes/mascara.webp" alt="" loading="lazy" />
          </div>
        </div>
      </div>
    </section>
  );
}
