"use client";
import dynamic from "next/dynamic";
import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useScrollProgress } from "../../hooks/useScrollProgress";
import { useInView } from "../../hooks/useInView";
import { hasWebGL } from "../../hooks/useDevice";
import { useRoom } from "../../store";
import type { RoomPhase } from "./PhotoRoomAssembly";
import photosData from "../../data/room-photos.json";
import type { RoomPhoto } from "../../types";
import { DOOR_GATE_P, isDoorOpen, setDoorOpen } from "./doorState";
import s from "./photoroom.module.css";
import { Sticker, Ticket } from "@/components/abx/Ticket";
import { Icon } from "@/components/abx/Icon";

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
  // el lienzo se libera lejos de la habitación y se recrea al volver (evita contextos WebGL perdidos)
  const near = useInView(section, "120% 0px");
  const [webgl] = useState(() => hasWebGL());
  const sticky = useRef<HTMLDivElement>(null);
  const doorHint = useRef<HTMLDivElement>(null);
  const door = useRef<{ openAt: number | null }>({ openAt: null });
  const [opening, setOpening] = useState(false);
  const openingRef = useRef(false);

  const progress = useScrollProgress(section, (p) => {
    // corte limpio a kraft solo si se sigue bajando sin tocar la puerta
    if (fade.current) fade.current.style.opacity = String(openingRef.current ? 0 : Math.max(0, (p - 0.94) / 0.06));
    if (head.current) head.current.style.opacity = String(Math.max(0, 1 - Math.max(0, p - 0.12) * 6));
    if (hint.current) hint.current.style.opacity = String(p < 0.2 ? 1 : Math.max(0, 1 - (p - 0.2) * 6));
    const show = !reduced && webgl && !openingRef.current && p > 0.74;
    if (doorHint.current) { doorHint.current.dataset.on = show ? "1" : "0"; doorHint.current.inert = !show; }
  });
  const onLoad = useCallback((n: number, of: number) => setLoad({ n, of }), []);

  /** Tocar la puerta: se abre, la cámara la cruza y el recorrido sigue en el video. */
  const openDoor = useCallback(() => {
    if (door.current.openAt !== null) return;
    door.current.openAt = performance.now() / 1000;
    openingRef.current = true;
    setDoorOpen(true);
    setOpening(true);
    if (doorHint.current) doorHint.current.dataset.on = "0";
    window.setTimeout(() => {
      document.getElementById("video")?.scrollIntoView({ behavior: reduced ? "auto" : "smooth", block: "start" });
    }, reduced ? 0 : 1450);
  }, [reduced]);

  const onCursor = useCallback((mode: string | null) => {
    const el = sticky.current;
    if (!el) return;
    if (mode) el.dataset.cursor = mode; else delete el.dataset.cursor;
  }, []);

  // PUERTA OBLIGATORIA: mientras esté cerrada, el scroll no pasa del punto de la puerta.
  // Tope suave por scroll (cubre rueda, teclado, barra, anclas e índice) + bloqueo de gestos hacia
  // abajo solo cuando ya se está en el tope. Hacia arriba la navegación queda siempre libre.
  useEffect(() => {
    if (reduced || !webgl) return;
    const limit = () => {
      const el = section.current;
      if (!el) return Infinity;
      return el.offsetTop + (el.offsetHeight - innerHeight) * DOOR_GATE_P;
    };
    let raf = 0, pulseT = 0;
    const pulse = () => {
      const h = doorHint.current;
      if (!h) return;
      h.dataset.on = "1"; h.inert = false; h.dataset.pulse = "1";
      window.clearTimeout(pulseT);
      pulseT = window.setTimeout(() => { if (doorHint.current) delete doorHint.current.dataset.pulse; }, 900);
    };
    const locked = () => !isDoorOpen() && !openingRef.current;
    const atGate = () => scrollY >= limit() - 2;
    const onScroll = () => {
      if (!locked()) return;
      const L = limit();
      if (scrollY > L + 1) {
        cancelAnimationFrame(raf);
        raf = requestAnimationFrame(() => {
          if (!locked()) return;
          window.scrollTo({ top: L, behavior: "instant" as ScrollBehavior });
          pulse();
        });
      }
    };
    const onWheel = (e: WheelEvent) => {
      if (locked() && e.deltaY > 0 && atGate()) { e.preventDefault(); pulse(); }
    };
    let touchY = 0;
    const onTouchStart = (e: TouchEvent) => { touchY = e.touches[0]?.clientY ?? 0; };
    const onTouchMove = (e: TouchEvent) => {
      const y = e.touches[0]?.clientY ?? touchY;
      // dedo hacia arriba = la página baja
      if (locked() && y < touchY - 2 && atGate() && e.cancelable) { e.preventDefault(); pulse(); }
    };
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      if (t && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName))) return;
      const down = ["ArrowDown", "PageDown", "End", " ", "Spacebar"].includes(e.key) && !(e.key === " " && e.shiftKey);
      if (locked() && down && atGate()) { e.preventDefault(); pulse(); }
    };
    addEventListener("scroll", onScroll, { passive: true });
    addEventListener("wheel", onWheel, { passive: false });
    addEventListener("touchstart", onTouchStart, { passive: true });
    addEventListener("touchmove", onTouchMove, { passive: false });
    addEventListener("keydown", onKey);
    return () => {
      removeEventListener("scroll", onScroll);
      removeEventListener("wheel", onWheel);
      removeEventListener("touchstart", onTouchStart);
      removeEventListener("touchmove", onTouchMove);
      removeEventListener("keydown", onKey);
      cancelAnimationFrame(raf); window.clearTimeout(pulseT);
    };
  }, [reduced, webgl]);

  // si la puerta ya se abrió en esta visita (p. ej. al volver a montar), queda abierta
  useEffect(() => {
    if (isDoorOpen() && door.current.openAt === null) { door.current.openAt = -100; openingRef.current = true; setOpening(true); }
  }, []);

  // parada controlada: si el visitante deja de hacer scroll cerca de la puerta (bajando), se acomoda frente a ella
  useEffect(() => {
    if (reduced || !webgl) return;
    let lastY = scrollY, dir = 0, timer = 0, snapped = false;
    const onScroll = () => {
      dir = scrollY > lastY ? 1 : scrollY < lastY ? -1 : dir;
      lastY = scrollY;
      window.clearTimeout(timer);
      timer = window.setTimeout(() => {
        const el = section.current;
        if (!el || openingRef.current) return;
        const span = el.offsetHeight - innerHeight;
        const p = (scrollY - el.offsetTop) / span;
        if (p < 0.6) snapped = false;
        if (!snapped && dir > 0 && p > 0.7 && p < 0.9) {
          snapped = true;
          const top = el.offsetTop + span * 0.82;
          if (Math.abs(top - scrollY) > 4) window.scrollTo({ top, behavior: "smooth" });
        }
      }, 180);
    };
    addEventListener("scroll", onScroll, { passive: true });
    return () => { removeEventListener("scroll", onScroll); window.clearTimeout(timer); };
  }, [reduced, webgl]);

  return (
    <section ref={section} id="habitacion" className={s.section} aria-labelledby="act1-title" style={{ height: reduced ? "200vh" : "300vh" }}>
      <div ref={sticky} className={`${s.sticky} ${opening ? s.isOpening : ""}`}>
        {webgl ? (
          near ? <PhotoRoomCanvas progress={progress} onPhase={setPhase} onLoad={onLoad} active={inView} door={door} onDoor={openDoor} onCursor={onCursor} /> : null
        ) : (
          <img className={s.fallback} src="/assets/room-04/portrait/oficina-collage-equipo.jpg" alt="Collage fotográfico de la oficina de Abraxas hecho por el equipo" />
        )}
        <div className={s.overlay}>
          <header ref={head} className={s.head}>
            <div className={s.stickers}>
              <Sticker tone="bermellon" rotate={-5}>Sala 04</Sticker>
              <Sticker tone="lima" shape="pill" rotate={4}>Vida y obra</Sticker>
              <Sticker tone="lila" shape="pill" rotate={-2}>1.176 fotografías</Sticker>
            </div>
            <h1 id="act1-title" className={s.title}>Una vida no cabe en una sola imagen<span className={s.dot}>.</span></h1>
            <p className={s.question}>¿Cuántas imágenes hacen falta para contar una vida?</p>
          </header>
          <div ref={hint} className={s.foot}>
            <p className={s.caption} aria-live="polite">
              <span className={s.capIcon}><Icon name="espejo" size={20} accent="var(--oro)" /></span>
              <span className="t-label">01 · La habitación fragmentada</span>
              <span>{phase === "loading" ? `${CAPTION.loading} · ${load.n}/${load.of}` : CAPTION[phase]}</span>
            </p>
            {phase === "assembled" && (
              <p className={s.hint}><Icon name="lupa" size={18} /> Mira alrededor · toca una foto para verla · baja para avanzar</p>
            )}
          </div>
        </div>
        <div ref={doorHint} className={s.doorHint} data-on="0">
          <Ticket icon="mano" tone="papel" cursor="entra" onClick={openDoor} disabled={opening} aria-label="Toca la puerta para entrar a la sección del video">
            Toca la puerta para entrar
          </Ticket>
        </div>
        <div ref={fade} className={s.fade} aria-hidden="true" />
      </div>
      {/* Alternativa HTML: los puntos clave de la habitación, accesibles sin WebGL */}
      <div className="sr-only">
        <h2>Puntos clave de la habitación</h2>
        <ul>
          {PHOTOS.filter((p) => p.note).map((p) => (
            <li key={p.id}>
              <button onClick={() => openFicha({ title: `Collage #${p.collage ?? p.seq}`, image: `/assets/room-04/photos/${p.id}.jpg`, body: p.note ?? undefined })}>
                {p.note}
              </button>
            </li>
          ))}
        </ul>
        <Link href="/salas/04/archivo">Ver el archivo de fotografías</Link>
      </div>
    </section>
  );
}
