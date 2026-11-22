"use client";
import dynamic from "next/dynamic";
import { useCallback, useRef, useState } from "react";
import Link from "next/link";
import { useScrollProgress } from "../../hooks/useScrollProgress";
import { useInView } from "../../hooks/useInView";
import { hasWebGL } from "../../hooks/useDevice";
import { useRoom } from "../../store";
import type { RoomPhase } from "./PhotoRoomAssembly";
import photosData from "../../data/room-photos.json";
import type { RoomPhoto } from "../../types";
import s from "./photoroom.module.css";

const PhotoRoomCanvas = dynamic(() => import("./PhotoRoomAssembly").then((m) => m.PhotoRoomCanvas), { ssr: false });
const PHOTOS = photosData as RoomPhoto[];

const CAPTION: Record<RoomPhase, string> = {
  loading: "Reuniendo fragmentos",
  scattered: "Fragmentos de una oficina",
  assembling: "Cada foto vuelve al ángulo desde el que fue tomada",
  assembled: `La oficina de Abraxas, reconstruida con ${PHOTOS.length} fotografías`,
};

export function PhotoRoomSection() {
  const section = useRef<HTMLElement>(null);
  const fade = useRef<HTMLDivElement>(null);
  const hint = useRef<HTMLDivElement>(null);
  const head = useRef<HTMLElement>(null);
  const [phase, setPhase] = useState<RoomPhase>("loading");
  const [load, setLoad] = useState({ n: 0, of: 1 });
  const reduced = useRoom((st) => st.reducedMotion);
  const openFicha = useRoom((st) => st.openFicha);
  const inView = useInView(section);
  const [webgl] = useState(() => hasWebGL());

  const progress = useScrollProgress(section, (p) => {
    if (fade.current) fade.current.style.opacity = String(Math.max(0, (p - 0.86) / 0.14));
    if (head.current) head.current.style.opacity = String(Math.max(0, 1 - Math.max(0, p - 0.12) * 6));
    if (hint.current) hint.current.style.opacity = String(p < 0.25 ? 1 : Math.max(0, 1 - (p - 0.25) * 6));
  });
  const onLoad = useCallback((n: number, of: number) => setLoad({ n, of }), []);

  return (
    <section ref={section} id="habitacion" className={s.section} aria-labelledby="act1-title" style={{ height: reduced ? "220vh" : "420vh" }}>
      <div className={s.sticky}>
        {webgl ? (
          <PhotoRoomCanvas progress={progress} onPhase={setPhase} onLoad={onLoad} active={inView} />
        ) : (
          <img className={s.fallback} src="/assets/room-04/portrait/oficina-collage-equipo.jpg" alt="Collage fotográfico de la oficina de Abraxas hecho por el equipo" />
        )}
        <div className={s.overlay}>
          <header ref={head} className={s.head}>
            <span className="tag tag-bermellon">04 · Vida y obra</span>
            <h1 id="act1-title" className="t-display">Una vida no cabe en una sola imagen.</h1>
            <p className={s.question}>¿Cuántas imágenes hacen falta para contar una vida?</p>
          </header>
          <div ref={hint} className={s.foot}>
            <p className={s.caption} aria-live="polite">
              <span className="t-label">01 · La habitación fragmentada</span>
              <span>{phase === "loading" ? `${CAPTION.loading} · ${load.n}/${load.of}` : CAPTION[phase]}</span>
            </p>
            {phase === "assembled" && (
              <p className={s.hint}>Mueve el cursor para mirar · toca una foto para abrir su ficha · desplázate para entrar</p>
            )}
          </div>
        </div>
        <div ref={fade} className={s.fade} aria-hidden="true" />
      </div>
      {/* Alternativa HTML: los puntos clave de la habitación, accesibles sin WebGL */}
      <div className="sr-only">
        <h2>Puntos clave de la habitación</h2>
        <ul>
          {PHOTOS.filter((p) => p.note).map((p) => (
            <li key={p.id}>
              <button onClick={() => openFicha({ title: p.note ?? p.description, image: `/assets/room-04/photos/${p.id}.jpg`, meta: [p.description] })}>
                {p.note}
              </button>
            </li>
          ))}
        </ul>
        <Link href="/salas/04/archivo">Ver el archivo completo de 640 fotografías</Link>
      </div>
    </section>
  );
}
