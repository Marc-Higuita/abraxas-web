"use client";
import dynamic from "next/dynamic";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { DIMENSIONS } from "../../data/timeline";
import type { Dimension, TimelineEvent } from "../../types";
import { useRoom } from "../../store";
import { useInView } from "../../hooks/useInView";
import { Ticket, Sticker } from "@/components/abx/Ticket";
import { sound } from "@/lib/audio/sound";
import { bigDate, DIM_HEX, DIM_LABEL, imgUrl, SORTED, VER_LABEL } from "./shared";
import s from "./timeline.module.css";

const TimelineCanvas = dynamic(() => import("./TimelineCanvas").then((m) => m.TimelineCanvas), { ssr: false });

/** Altura de scroll por hito (vh). El scroll vertical mueve la cámara por el pasillo. */
const VH_PER_EVENT = 44;

export function TimelineSection() {
  const section = useRef<HTMLElement>(null);
  const stage = useRef<HTMLDivElement>(null);
  const target = useRef(0);
  const [active, setActive] = useState<Set<Dimension>>(new Set(DIMENSIONS.map((d) => d.id)));
  const [idx, setIdx] = useState(0);
  const openFicha = useRoom((st) => st.openFicha);
  const reduced = useRoom((st) => st.reducedMotion);
  const lowPower = useRoom((st) => st.lowPower);
  const [narrow, setNarrow] = useState(false);
  const near = useInView(section, "300px");
  /** en celular la tarjeta arranca plegada (fecha + título) para no tapar la línea de fotografías */
  const [cardOpen, setCardOpen] = useState(true);
  const lastIdx = useRef(0);

  const events = useMemo(() => SORTED.filter((e) => e.dimensions.some((d) => active.has(d))), [active]);
  const n = events.length;

  useEffect(() => {
    const mq = window.matchMedia("(max-width: 760px)");
    const f = () => setNarrow(mq.matches);
    f(); mq.addEventListener("change", f);
    return () => mq.removeEventListener("change", f);
  }, []);

  // al cambiar de momento: en celular la tarjeta se vuelve a plegar; un salto grande suena discreto
  useEffect(() => {
    setCardOpen(!narrow);
    if (idx !== lastIdx.current) {
      // cada momento "se pega" en su sitio; un salto grande suena a fotos desplazándose; Guinness, a collage que se arma
      const id = events[idx]?.id;
      if (Math.abs(idx - lastIdx.current) >= 3) sound.play("fotos-desplazamiento", { volume: 0.55 });
      else sound.play("recorte-pegar", { volume: 0.6 });
      if (id === "guinness") sound.play("collage-ensambla", { volume: 0.7 });
    }
    lastIdx.current = idx;
  }, [idx, narrow, events]);

  /* scroll vertical → posición en el pasillo */
  useEffect(() => {
    const onScroll = () => {
      const el = section.current;
      if (!el) return;
      const r = el.getBoundingClientRect();
      const run = r.height - window.innerHeight;
      const p = run > 0 ? Math.min(1, Math.max(0, -r.top / run)) : 0;
      target.current = p * Math.max(0, n - 1);
      setIdx(Math.round(target.current));
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => { window.removeEventListener("scroll", onScroll); window.removeEventListener("resize", onScroll); };
  }, [n]);

  const scrollFor = useCallback((i: number) => {
    const el = section.current;
    if (!el) return 0;
    const run = el.offsetHeight - window.innerHeight;
    const top = el.getBoundingClientRect().top + window.scrollY;
    return top + (n > 1 ? (i / (n - 1)) * run : 0);
  }, [n]);

  const goTo = useCallback((i: number) => {
    const c = Math.min(Math.max(i, 0), n - 1);
    window.scrollTo({ top: scrollFor(c), behavior: reduced ? "auto" : "smooth" });
  }, [n, reduced, scrollFor]);

  /* arrastre horizontal → se traduce a scroll, una sola fuente de verdad */
  useEffect(() => {
    const el = stage.current;
    if (!el) return;
    let x0 = 0, y0 = 0, down = false, horiz: boolean | null = null;
    const per = () => (section.current ? (section.current.offsetHeight - window.innerHeight) / Math.max(1, n - 1) : 0);
    const pxPerEvent = () => Math.min(520, window.innerWidth * 0.55);
    const onDown = (e: PointerEvent) => { down = true; horiz = null; x0 = e.clientX; y0 = e.clientY; };
    const onMove = (e: PointerEvent) => {
      if (!down) return;
      const dx = e.clientX - x0, dy = e.clientY - y0;
      if (horiz === null && Math.hypot(dx, dy) > 8) horiz = Math.abs(dx) > Math.abs(dy);
      if (!horiz) return;
      window.scrollBy(0, (-dx / pxPerEvent()) * per());
      x0 = e.clientX; y0 = e.clientY;
    };
    const onUp = () => {
      if (down && horiz) goTo(Math.round(target.current));
      down = false;
    };
    el.addEventListener("pointerdown", onDown);
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onUp);
    return () => {
      el.removeEventListener("pointerdown", onDown);
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onUp);
    };
  }, [n, goTo]);

  const onKey = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowRight") { e.preventDefault(); goTo(idx + 1); }
    else if (e.key === "ArrowLeft") { e.preventDefault(); goTo(idx - 1); }
    else if (e.key === "Home") { e.preventDefault(); goTo(0); }
    else if (e.key === "End") { e.preventDefault(); goTo(n - 1); }
  };

  const toggle = (d: Dimension) =>
    setActive((cur) => {
      const nx = new Set(cur);
      if (nx.has(d) && nx.size > 1) nx.delete(d); else nx.add(d);
      return nx;
    });

  const ficha = (ev: TimelineEvent) =>
    openFicha({
      title: ev.title,
      image: ev.images[0] ? imgUrl(ev.images[0].id) : undefined,
      body: [ev.description, ...(ev.quotes ?? [])].join("\n\n"),
      meta: [
        ev.dateLabel,
        `${VER_LABEL[ev.verification]} · certeza ${ev.certainty}`,
        ...ev.sources.map((src) => `Fuente: ${src.label}${src.date ? ` · ${src.date}` : ""}`),
        ...ev.images.map((im) => im.caption),
      ],
    });

  const ev = events[Math.min(idx, n - 1)];
  const lite = narrow || lowPower;

  return (
    <section
      ref={section}
      id="transformaciones"
      className={s.section}
      style={{ height: `calc(100vh + ${Math.max(1, n - 1) * VH_PER_EVENT}vh)` }}
      aria-labelledby="tl-title"
    >
      <div className={s.sticky} onKeyDown={onKey}>
        <div ref={stage} className={s.stage} data-cursor="arrastra" aria-hidden="true">
          {near && <TimelineCanvas events={events} target={target} onPick={(i) => { if (i === idx) ficha(events[i]); else goTo(i); }} reduced={reduced} lite={lite} active={near} />}
        </div>

        <header className={s.head}>
          <div className={s.stickers}>
            <Sticker tone="bermellon" rotate={-5}>05</Sticker>
            <Sticker tone="papel" shape="flag" rotate={3}>Las transformaciones</Sticker>
          </div>
          <h2 id="tl-title" className={s.title}>La vida en {SORTED.length} momentos</h2>
          <div className={s.filters} role="group" aria-label="Filtrar por dimensión">
            {DIMENSIONS.map((d) => (
              <button
                key={d.id}
                className={`${s.chip} ${active.has(d.id) ? s.chipOn : ""}`}
                style={{ ["--c" as string]: DIM_HEX[d.id] }}
                aria-pressed={active.has(d.id)}
                onClick={() => toggle(d.id)}
                data-cursor="toca"
              >
                {d.label}
              </button>
            ))}
          </div>
        </header>

        {ev && (
          <article key={ev.id} className={`${s.card} ${cardOpen ? s.cardOpen : s.cardShut}`} aria-live="polite">
            <p className={s.date}>
              <span className={s.big}>{bigDate(ev)}</span>
              <span className={s.dateLabel}>{ev.dateLabel}</span>
            </p>
            <h3>{ev.title}</h3>
            {narrow && (
              <button className={s.more} onClick={() => setCardOpen((v) => !v)} aria-expanded={cardOpen} aria-controls={`tl-more-${ev.id}`}>
                {cardOpen ? "Ver menos" : "Leer más"}
              </button>
            )}
            <div id={`tl-more-${ev.id}`} className={s.moreBody} hidden={narrow && !cardOpen}>
            <div className={s.tags}>
              {ev.dimensions.map((d) => <span key={d} className={s.tag} style={{ ["--c" as string]: DIM_HEX[d] }}>{DIM_LABEL[d]}</span>)}
              <span className={`${s.ver} ${s[ev.verification.replace("-", "")]}`}>{VER_LABEL[ev.verification]}</span>
            </div>
            <p className={s.desc}>{ev.description}</p>
            <p className={s.src}>Fuente: {ev.sources.map((x) => x.label).join(" · ")}</p>
            <Ticket icon="lupa" tone="papel" size="sm" onClick={() => ficha(ev)} cursor="ver">Ver ficha</Ticket>
            </div>
          </article>
        )}

        <nav className={s.nav} aria-label="Recorrer la línea de tiempo">
          <Ticket icon="atras" tone="negro" size="sm" aria-label="Momento anterior" onClick={() => goTo(idx - 1)} disabled={idx <= 0} />
          <span className={s.count} aria-live="off">{String(idx + 1).padStart(2, "0")} / {String(n).padStart(2, "0")}</span>
          <Ticket icon="flecha" tone="lima" size="sm" aria-label="Momento siguiente" onClick={() => goTo(idx + 1)} disabled={idx >= n - 1} />
        </nav>
        <p className={s.hint} aria-hidden="true">{narrow ? "Desliza hacia los lados" : "Baja, arrastra o usa las flechas"}</p>

        <div className={s.rail} aria-hidden="true">
          {events.map((e, i) => (
            <button key={e.id} tabIndex={-1} className={`${s.knot} ${i === idx ? s.knotOn : ""}`} style={{ ["--c" as string]: DIM_HEX[e.dimensions[0]] }} onClick={() => goTo(i)} title={`${bigDate(e)} · ${e.title}`} />
          ))}
        </div>
      </div>

      {/* versión en lista para lectores de pantalla y teclado */}
      <ol className="sr-only" aria-label="Cronología completa">
        {events.map((e, i) => (
          <li key={e.id}>
            <button onClick={() => { goTo(i); ficha(e); }}>{e.dateLabel}: {e.title}</button>
          </li>
        ))}
      </ol>
    </section>
  );
}
