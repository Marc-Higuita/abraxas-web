"use client";
import { useEffect, useRef } from "react";
import Link from "next/link";
import { ACTS, useRoom, type ActId } from "../store";
import { refreshScroll } from "../hooks/useScrollProgress";
import { CITAS, CURATORIALES, INSPIRADAS, TRANSCRIPCIONES_PENDIENTES, KIND_LABEL } from "../data/phrases";
import s from "./hud.module.css";

export const scrollToAct = (id: ActId) => document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });

export function Hud() {
  const act = useRoom((st) => st.act);
  const setAct = useRoom((st) => st.setAct);
  const progress = useRoom((st) => st.progress);
  const setProgress = useRoom((st) => st.setProgress);
  const muted = useRoom((st) => st.muted);
  const toggleMuted = useRoom((st) => st.toggleMuted);
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
      <Link href="/" className={s.brand} aria-label="Museo Abraxas, volver al índice de salas">
        <img src="/assets/brand/isotipo-papel.png" alt="" width={26} height={32} />
        <span className={s.word}>ABRAXAS</span>
        <span className={s.room}>04</span>
      </Link>
      <div className={s.progress} role="progressbar" aria-label="Recorrido de la sala" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(progress * 100)}>
        <span style={{ transform: `scaleX(${progress})` }} />
      </div>
      <span className={s.act}>{ACTS[i]?.n} · {ACTS[i]?.title}</span>
      <div className={s.buttons}>
        <button className="icon-btn" onClick={back} aria-label="Volver a la sección anterior" disabled={i === 0}>
          <svg viewBox="0 0 24 24"><path d="M15 5l-7 7 7 7" /></svg>
        </button>
        <button className="icon-btn" onClick={() => setIndex(true)} aria-label="Índice de las experiencias">
          <svg viewBox="0 0 24 24"><path d="M4 6h16M4 12h16M4 18h10" /></svg>
        </button>
        <button className="icon-btn" onClick={toggleMuted} aria-label={muted ? "Activar sonido" : "Silenciar"} aria-pressed={!muted}>
          <svg viewBox="0 0 24 24"><path d="M4 9h4l5-4v14l-5-4H4z" />{muted ? <path d="M17 9l4 6M21 9l-4 6" /> : <path d="M17 8a5 5 0 010 8" />}</svg>
        </button>
        <button className="icon-btn" onClick={toggleReduced} aria-pressed={reduced} aria-label={reduced ? "Activar movimiento" : "Reducir movimiento"}>
          <svg viewBox="0 0 24 24">{reduced ? <path d="M6 12h12" /> : <path d="M3 12c3-6 6 6 9 0s6 6 9 0" />}</svg>
        </button>
        <button className="icon-btn" onClick={() => setInfo(true)} aria-label="Información sobre la sala">
          <svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9" /><path d="M12 11v6M12 7v1" /></svg>
        </button>
      </div>
    </nav>
  );
}

/** Diálogo accesible: foco al abrir, Escape para cerrar, foco devuelto al cerrar. */
export function Dialog({ open, onClose, title, children, wide }: { open: boolean; onClose: () => void; title: string; children: React.ReactNode; wide?: boolean }) {
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
      <div ref={ref} tabIndex={-1} role="dialog" aria-modal="true" aria-label={title} className={`${s.dialog} ${wide ? s.wide : ""}`} onClick={(e) => e.stopPropagation()}>
        <button className={`icon-btn ${s.close}`} onClick={onClose} aria-label="Cerrar"><svg viewBox="0 0 24 24"><path d="M5 5l14 14M19 5L5 19" /></svg></button>
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
  return (
    <>
      <Dialog open={index} onClose={() => setIndex(false)} title="Índice">
        <h2 className="t-title">Índice</h2>
        <ol className={s.index}>
          {ACTS.map((a) => (
            <li key={a.id}><button className="btn" onClick={() => { setIndex(false); scrollToAct(a.id); }}><span className={s.n}>{a.n}</span>{a.title}</button></li>
          ))}
        </ol>
        <Link className="btn btn-sm" href="/salas/04/archivo">Archivo: las 640 fotografías</Link>
      </Dialog>
      <Dialog open={info} onClose={() => setInfo(false)} title="Sobre la sala" wide>
        <h2 className="t-title">04 — Vida y obra</h2>
        <p>
          Una constelación de imágenes, documentos, libros y palabras sobre Abraxas Aguilar Betancur (Medellín), artista del
          collage, abogada, escritora y política. La oficina se vuelve archivo; el archivo, imagen; la imagen, movimiento;
          el movimiento conduce a su pensamiento y a su vida política. Al final, construyes con nosotros una memoria colectiva.
        </p>
        <h3>Cómo se reconstruyó la habitación</h3>
        <p>
          640 fotografías tomadas el 23 de septiembre de 2026. Cada foto conserva el rumbo de la brújula del teléfono: con ese
          dato vuelve al ángulo desde el que se tomó. Su altura y su giro se calcularon emparejando puntos entre fotos
          consecutivas de la misma pared. Los huecos son zonas que nadie fotografió; no se rellenaron.
        </p>
        <h3>Tres tipos de frase</h3>
        <ul className={s.legend}>
          <li><strong>{KIND_LABEL.cita}:</strong> palabras suyas, con fuente. Ejemplo: «{CITAS[0].text}» ({CITAS[0].source}).</li>
          <li><strong>{KIND_LABEL.curatorial}:</strong> «{CURATORIALES[0].text}»</li>
          <li><strong>{KIND_LABEL.inspirada}:</strong> «{INSPIRADAS[0].text}». No son citas de Abraxas.</li>
        </ul>
        <details>
          <summary>Transcripciones del equipo pendientes de verificar ({TRANSCRIPCIONES_PENDIENTES.length})</summary>
          <ul>{TRANSCRIPCIONES_PENDIENTES.map((p) => <li key={p.text}>«{p.text}» · falta video y minuto</li>)}</ul>
        </details>
        <p className="t-meta">Equipo Sala 04: Santiago y Marco · Creación de Espacios Interactivos · Universidad de Antioquia.</p>
      </Dialog>
      <Dialog open={!!ficha} onClose={() => openFicha(null)} title={ficha?.title ?? "Ficha"} wide>
        {ficha && (
          <div className={s.ficha}>
            {ficha.image && <img src={ficha.image} alt={ficha.title} />}
            <div>
              <span className="tag tag-papel">Ficha de archivo</span>
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
