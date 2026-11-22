"use client";
import { useEffect, useRef } from "react";
import Link from "next/link";
import { ACTS, useRoom, type ActId } from "../store";
import { refreshScroll } from "../hooks/useScrollProgress";
import { CITAS, TRANSCRIPCIONES_PENDIENTES } from "../data/phrases";
import { Ticket, Sticker } from "@/components/abx/Ticket";
import { Icon } from "@/components/abx/Icon";
import { DottedOval } from "@/components/abx/Ornaments";
import { sound, useSoundState } from "@/lib/audio/useSound";
import s from "./hud.module.css";

export const scrollToAct = (id: ActId) => document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });

export function Hud() {
  const act = useRoom((st) => st.act);
  const setAct = useRoom((st) => st.setAct);
  const progress = useRoom((st) => st.progress);
  const setProgress = useRoom((st) => st.setProgress);
  const audio = useSoundState();
  const reduced = useRoom((st) => st.reducedMotion);
  const setReduced = useRoom((st) => st.setReducedMotion);
  const setInfo = useRoom((st) => st.setInfo);
  const setIndex = useRoom((st) => st.setIndex);

  useEffect(() => {
    const onScroll = () => {
      const max = document.documentElement.scrollHeight - innerHeight;
      setProgress(max > 0 ? scrollY / max : 0);
      let current: ActId = "habitacion";
      for (const a of ACTS) {
        const el = document.getElementById(a.id);
        if (el && el.getBoundingClientRect().top <= innerHeight * 0.45) current = a.id;
      }
      setAct(current);
    };
    onScroll();
    addEventListener("scroll", onScroll, { passive: true });
    return () => removeEventListener("scroll", onScroll);
  }, [setAct, setProgress]);

  const i = ACTS.findIndex((a) => a.id === act);
  const back = () => scrollToAct(ACTS[Math.max(0, i - 1)].id);
  const toggleReduced = () => {
    const v = !reduced;
    setReduced(v);
    try { localStorage.setItem("abx-reduced-motion", v ? "1" : "0"); } catch { /* sin almacenamiento */ }
    setTimeout(refreshScroll, 50);
  };

  return (
    <nav className={s.hud} aria-label="Navegación de la sala">
      <Link href="/" className={s.brand} aria-label="Museo Abraxas, volver al índice de salas" data-cursor="toca">
        <span className={s.mark}><Icon name="x" size={22} accent="var(--oro)" /></span>
        <span className={s.word}>ABRAXAS</span>
        <Sticker tone="bermellon" rotate={-4} className={s.room}>Sala 04</Sticker>
      </Link>
      <div className={s.track} role="progressbar" aria-label="Recorrido de la sala" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(progress * 100)}>
        <span className={s.thread} style={{ transform: `scaleX(${progress})` }} />
        {ACTS.map((a, k) => (
          <button key={a.id} className={`${s.knot} ${k <= i ? s.knotOn : ""}`} style={{ left: `${(k / (ACTS.length - 1)) * 100}%` }} onClick={() => scrollToAct(a.id)} aria-label={`Ir a ${a.title}`} data-cursor="toca">
            <span className={s.knotLabel}>{a.title}</span>
          </button>
        ))}
      </div>
      {!audio.unlocked && (
        <button type="button" className={s.audioPill} onClick={() => sound.unlock()} aria-label="Activar el sonido de la exposición">
          <Icon name="sonido" size={16} /> Toca para activar el sonido
        </button>
      )}
      <div className={s.buttons}>
        <Ticket size="sm" tone="papel" icon="atras" onClick={back} aria-label="Sección anterior" disabled={i === 0} />
        <Ticket size="sm" tone="lima" icon="menu" onClick={() => setIndex(true)} aria-label="Índice">
          <span className={s.hideSm}>Índice</span>
        </Ticket>
        <Ticket size="sm" tone="lila" icon={audio.musicOn ? "disco" : "silencio"} onClick={() => sound.toggleMusic()} aria-label={audio.musicOn ? "Silenciar la música de fondo" : "Activar la música de fondo"} aria-pressed={audio.musicOn} title="Música de fondo">
          <span className={s.hideSm}>Música</span>
        </Ticket>
        <Ticket size="sm" tone="papel" icon={audio.sfxOn ? "sonido" : "silencio"} onClick={() => sound.toggleSfx()} aria-label={audio.sfxOn ? "Desactivar los efectos de sonido" : "Activar los efectos de sonido"} aria-pressed={audio.sfxOn} title="Efectos de sonido" />
        <Ticket size="sm" tone="naranja" icon={reduced ? "quieto" : "movimiento"} onClick={toggleReduced} aria-pressed={reduced} aria-label={reduced ? "Activar movimiento" : "Reducir movimiento"} />
        <Ticket size="sm" tone="papel" icon="info" onClick={() => setInfo(true)} aria-label="Sobre la sala" />
      </div>
    </nav>
  );
}

/** Diálogo accesible: foco al abrir, Escape para cerrar, foco devuelto al cerrar. */
export function Dialog({ open, onClose, title, children, wide, bare }: { open: boolean; onClose: () => void; title: string; children: React.ReactNode; wide?: boolean; bare?: boolean }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const prev = document.activeElement as HTMLElement | null;
    ref.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "Tab" && ref.current) {
        const f = ref.current.querySelectorAll<HTMLElement>("button, a, input, textarea, [tabindex]:not([tabindex='-1'])");
        if (!f.length) return;
        const first = f[0], last = f[f.length - 1];
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
      }
    };
    addEventListener("keydown", onKey);
    return () => { removeEventListener("keydown", onKey); prev?.focus(); };
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div className={s.backdrop} onClick={onClose}>
      <div ref={ref} tabIndex={-1} role="dialog" aria-modal="true" aria-label={title} className={bare ? s.lightbox : `${s.dialog} tx-paper ${wide ? s.wide : ""}`} onClick={(e) => e.stopPropagation()}>
        <span className={s.close}><Ticket size="sm" tone="negro" icon="cerrar" onClick={onClose} aria-label="Cerrar" /></span>
        {children}
      </div>
    </div>
  );
}

export function Overlays() {
  const info = useRoom((st) => st.infoOpen);
  const setInfo = useRoom((st) => st.setInfo);
  const index = useRoom((st) => st.indexOpen);
  const setIndex = useRoom((st) => st.setIndex);
  const ficha = useRoom((st) => st.ficha);
  const openFicha = useRoom((st) => st.openFicha);
  // fotografía de la habitación: se ve casi a pantalla completa, con solo su número de collage
  const isPhoto = !!ficha?.image && (/^Collage\s*#/i.test(ficha.title) || (ficha.image.includes("/room-04/photos/") && !ficha.body));
  const tones = ["lima", "naranja", "lila", "amarillo", "ultramar", "magenta", "papel"] as const;
  const icons = ["espejo", "ojo", "x", "libro", "tarjeton", "tijeras", "disco"] as const;
  return (
    <>
      <Dialog open={index} onClose={() => setIndex(false)} title="Índice">
        <Sticker tone="lima" shape="wave" rotate={-3}>Recorrido</Sticker>
        <ol className={s.index}>
          {ACTS.map((a, k) => (
            <li key={a.id} style={{ ["--d" as string]: `${k * 50}ms` }}>
              <Ticket size="lg" tone={tones[k % tones.length]} icon={icons[k % icons.length]} onClick={() => { setIndex(false); scrollToAct(a.id); }}>
                <span className={s.n}>{a.n}</span> {a.title}
              </Ticket>
            </li>
          ))}
        </ol>
        <Link className="ticket t-negro t-md" href="/salas/04/archivo" data-cursor="ver">
          <span className="ticket-stub"><Icon name="ojo" size={22} /></span><span className="ticket-body">Archivo · 640 fotografías</span>
        </Link>
      </Dialog>
      <Dialog open={info} onClose={() => setInfo(false)} title="Sobre la sala" wide>
        <div className={s.infoGrid}>
          <div className={s.infoOval}><DottedOval /><img src="/assets/room-04/abraxas/abraxas-cabeza.png" alt="Recorte de Abraxas" /></div>
          <div>
            <Sticker tone="bermellon" rotate={-3}>Sala 04 · Vida y obra</Sticker>
            <h2 className={s.infoTitle}>Abraxas Aguilar Betancur</h2>
            <p>Artista del collage, abogada, escritora, dramaturga y política de Medellín. Convirtió su casa en un collage de cerca de 100.000 imágenes.</p>
            <blockquote className={s.quote}>«{CITAS[0].text}»<cite>{CITAS[0].source}</cite></blockquote>
            <h3>Cómo se reconstruyó la habitación</h3>
            <p>640 fotografías del 23 de septiembre de 2026. Cada una vuelve al ángulo de brújula desde el que se tomó; la altura y el giro salen de emparejar puntos entre fotos vecinas. Las zonas sin foto se completan con fragmentos de la misma pared.</p>
            <details>
              <summary>Transcripciones del equipo pendientes de verificar ({TRANSCRIPCIONES_PENDIENTES.length})</summary>
              <ul>{TRANSCRIPCIONES_PENDIENTES.map((p) => <li key={p.text}>«{p.text}»</li>)}</ul>
            </details>
            <p className="t-meta">Equipo Sala 04: Santiago y Marco · Creación de Espacios Interactivos · Universidad de Antioquia.</p>
          </div>
        </div>
      </Dialog>
      <Dialog open={!!ficha} onClose={() => openFicha(null)} title={ficha?.title ?? "Ficha"} wide bare={isPhoto}>
        {ficha && isPhoto && (
          <figure className={s.lbFigure}>
            <img src={ficha.image} alt={ficha.title} className={s.lbImg} />
            <figcaption className={s.lbCap}><Sticker tone="lima" rotate={-4}>{ficha.title}</Sticker></figcaption>
          </figure>
        )}
        {ficha && !isPhoto && (
          <div className={s.ficha}>
            {ficha.image && <div className={s.fichaImg}><img src={ficha.image} alt={ficha.title} /></div>}
            <div>
              <Sticker tone="amarillo" rotate={-3}>Ficha de archivo</Sticker>
              <h2 className={s.fichaTitle}>{ficha.title}</h2>
              {ficha.body && <p>{ficha.body}</p>}
              {ficha.meta?.map((m) => <p key={m} className="t-meta">{m}</p>)}
            </div>
          </div>
        )}
      </Dialog>
    </>
  );
}

/** Activa las entradas escalonadas (.reveal → .is-in) al aparecer en pantalla. */
export function RevealObserver() {
  useEffect(() => {
    const io = new IntersectionObserver((es) => es.forEach((e) => { if (e.isIntersecting) { e.target.classList.add("is-in"); io.unobserve(e.target); } }), { rootMargin: "0px 0px -10% 0px" });
    const scan = () => document.querySelectorAll(".reveal:not(.is-in)").forEach((el) => io.observe(el));
    scan();
    const mo = new MutationObserver(scan);
    mo.observe(document.body, { childList: true, subtree: true });
    return () => { io.disconnect(); mo.disconnect(); };
  }, []);
  return null;
}
