"use client";
import { useEffect, useRef, useState } from "react";
import { useScrollProgress } from "../../hooks/useScrollProgress";
import { DOCUMENTARY } from "../../data/media";
import { CITAS } from "../../data/phrases";
import { useRoom } from "../../store";
import { Ticket, Sticker } from "@/components/abx/Ticket";
import { DottedCorner } from "@/components/abx/Ornaments";
import s from "./documentary.module.css";

const fmt = (t: number) => (Number.isFinite(t) ? `${Math.floor(t / 60)}:${String(Math.floor(t % 60)).padStart(2, "0")}` : "0:00");

export function DocumentarySection() {
  const section = useRef<HTMLElement>(null);
  const frame = useRef<HTMLDivElement>(null);
  const video = useRef<HTMLVideoElement>(null);
  const reduced = useRoom((st) => st.reducedMotion);
  const muted = useRoom((st) => st.muted);
  const toggleMuted = useRoom((st) => st.toggleMuted);
  const [available, setAvailable] = useState<boolean | null>(null);
  const [playing, setPlaying] = useState(false);
  const [time, setTime] = useState({ cur: 0, dur: 0 });
  const quote = CITAS[0];

  useScrollProgress(section, (p) => {
    const el = frame.current;
    if (!el) return;
    // entra como un recorte pequeño y girado, y se pega sobre la cita
    const k = reduced ? 1 : Math.min(1, p / 0.45);
    const e = 1 - Math.pow(1 - k, 3);
    el.style.transform = `translate(${(1 - e) * 22}vw, ${(1 - e) * 18}vh) rotate(${-9 + e * 7}deg) scale(${0.5 + 0.5 * e})`;
  }, { start: "top bottom", end: "bottom bottom" });

  useEffect(() => { if (video.current) video.current.muted = muted; }, [muted]);
  useEffect(() => {
    fetch(DOCUMENTARY.src, { method: "HEAD" })
      .then((r) => setAvailable(r.ok && (r.headers.get("content-type") ?? "").includes("video")))
      .catch(() => setAvailable(false));
  }, []);

  const toggle = () => {
    const v = video.current;
    if (!v) return;
    if (v.paused) { if (muted) toggleMuted(); v.play().catch(() => setPlaying(false)); } else v.pause();
  };
  const fullscreen = () => { frame.current?.requestFullscreen?.().catch(() => undefined); };

  return (
    <section ref={section} id="video" className={`${s.section} tx-kraft`} aria-labelledby="act2-title" style={{ minHeight: reduced ? "100svh" : "170svh" }}>
      <DottedCorner className={s.corner} color="rgba(18,17,16,.55)" />
      <div className={s.sticky}>
        <header className={s.head}>
          <div className={s.tags}>
            <Sticker tone="negro" rotate={-4}>02</Sticker>
            <Sticker tone="papel" shape="pill" rotate={3}>La imagen que habla</Sticker>
          </div>
          <h2 id="act2-title" className={s.quote}>
            «{quote.text}»
          </h2>
          <p className={s.cite}>— Abraxas · {quote.source}</p>
        </header>

        <div ref={frame} className={s.frame} data-cursor="play">
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
                onTimeUpdate={(e) => setTime({ cur: e.currentTarget.currentTime, dur: e.currentTarget.duration })}
                onLoadedMetadata={(e) => setTime({ cur: 0, dur: e.currentTarget.duration })}
                onClick={toggle}
                aria-label={`${DOCUMENTARY.title}, ${DOCUMENTARY.description}`}
              />
              {!playing && (
                <button className={s.bigPlay} onClick={toggle} aria-label="Reproducir el video" data-cursor="play">
                  <span>▶</span>
                </button>
              )}
              <div className={s.controls} role="group" aria-label="Controles del video">
                <Ticket size="sm" tone="lima" icon={playing ? "pausa" : "play"} onClick={toggle} aria-label={playing ? "Pausar" : "Reproducir"} />
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
        <p className={s.credit}>{DOCUMENTARY.description} · {DOCUMENTARY.duration} · {DOCUMENTARY.credits}</p>
      </div>
    </section>
  );
}
