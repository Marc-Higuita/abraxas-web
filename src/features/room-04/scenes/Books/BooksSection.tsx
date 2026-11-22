"use client";
import dynamic from "next/dynamic";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { BOOKS } from "../../data/books";
import { useInView } from "../../hooks/useInView";
import { hasWebGL } from "../../hooks/useDevice";
import { useRoom } from "../../store";
import { Ticket, Sticker } from "@/components/abx/Ticket";
import type { FlipState } from "./BooksCanvas";
import s from "./books.module.css";

const BooksCanvas = dynamic(() => import("./BooksCanvas").then((m) => m.BooksCanvas), { ssr: false });

/** Papeles reales recortados (cutouts/papeles) donde se escriben las frases. */
const PAPERS = [
  { src: "tira-rasgada-01.png", w: 260, ratio: 588 / 270, pad: "18% 11% 18% 9%" },
  { src: "papel-rayado-01.png", w: 270, ratio: 646 / 263, pad: "14% 9% 12% 12%" },
  { src: "papel-rasgado-01.png", w: 160, ratio: 275 / 520, pad: "22% 13% 18% 14%" },
  { src: "papel-cuadriculado-01.png", w: 300, ratio: 900 / 292, pad: "11% 8% 11% 8%" },
  { src: "nota-cinta-01.png", w: 200, ratio: 419 / 458, pad: "24% 13% 14% 13%" },
  { src: "papel-acuarela-01.png", w: 180, ratio: 416 / 520, pad: "18% 13% 14% 13%" },
] as const;

/** Huecos alrededor de la biblioteca (en % del escenario), lejos del centro donde están los libros. */
const LIB_SLOTS = [
  { x: 50, y: 9 }, { x: 73, y: 13 }, { x: 84, y: 34 }, { x: 82, y: 60 }, { x: 64, y: 80 },
  { x: 38, y: 82 }, { x: 12, y: 78 }, { x: 2, y: 52 }, { x: 4, y: 31 }, { x: 88, y: 82 },
];
const OPEN_SLOTS = [
  { x: 1.5, y: 18 }, { x: 1.5, y: 44 }, { x: 1.5, y: 68 }, { x: 85, y: 16 }, { x: 85, y: 42 }, { x: 85, y: 66 },
];

/** Variaciones deterministas (sin aleatoriedad en el render). */
const rot = (i: number) => (((i * 37) % 13) - 6) * 1.1;
const depth = (i: number) => 0.4 + ((i * 53) % 7) / 10;

interface FloatQuote { key: string; book: number; text: string; page: number; title: string; theme: string }

export function BooksSection() {
  const section = useRef<HTMLElement>(null);
  const layer = useRef<HTMLDivElement>(null);
  const inView = useInView(section);
  const [webgl] = useState(() => hasWebGL());
  const [narrow, setNarrow] = useState(false);
  const [selected, setSelected] = useState<number | null>(null);
  const [hovered, setHovered] = useState<number | null>(null);
  const [flip, setFlip] = useState<FlipState>({ spread: 0, flip: null });
  const [focus, setFocus] = useState<"left" | "right">("right");
  const [announce, setAnnounce] = useState("");
  const [activeQuote, setActiveQuote] = useState<string | null>(null);
  const openFicha = useRoom((st) => st.openFicha);
  const reduced = useRoom((st) => st.reducedMotion);
  const book = selected !== null ? BOOKS[selected] : null;

  useEffect(() => {
    const mq = window.matchMedia("(max-width: 860px)");
    const on = () => setNarrow(mq.matches);
    on();
    mq.addEventListener("change", on);
    return () => mq.removeEventListener("change", on);
  }, []);

  const quotes = useMemo<FloatQuote[]>(() => {
    const per = BOOKS.map((b, bi) => b.quotes.map((q) => ({ key: q.id, book: bi, text: q.text, page: q.pdfPage, title: b.title, theme: q.theme })));
    // se intercalan los libros para que la composición mezcle voces
    const out: FloatQuote[] = [];
    for (let i = 0; out.length < 40; i++) {
      let added = false;
      per.forEach((list) => { if (list[i]) { out.push(list[i]); added = true; } });
      if (!added) break;
    }
    return out;
  }, []);

  const visibleQuotes = useMemo(() => {
    if (book) return narrow ? [] : quotes.filter((q) => q.book === selected).slice(0, OPEN_SLOTS.length);
    return quotes.slice(0, narrow ? 4 : LIB_SLOTS.length);
  }, [book, selected, narrow, quotes]);

  const openBook = useCallback((i: number, page?: number) => {
    const b = BOOKS[i];
    const p = page && b.pageCount ? Math.min(page, b.pageCount) : 1;
    setSelected(i);
    setHovered(null);
    setFlip({ spread: Math.floor(p / 2), flip: null });
    setFocus(p % 2 === 0 ? "left" : "right");
    setAnnounce(`${b.title} abierto${page ? ` en la página ${p}` : ""}.`);
  }, []);

  const close = useCallback(() => {
    setSelected(null);
    setActiveQuote(null);
    setAnnounce("Libro cerrado. De vuelta a la biblioteca.");
  }, []);

  const animate = webgl && !reduced;
  const N = book?.pageCount ?? 0;
  const canNext = !!book && N > 0 && (narrow ? (focus === "left" ? 2 * flip.spread + 1 <= N : 2 * flip.spread + 2 <= N) : 2 * flip.spread + 1 < N);
  const canPrev = !!book && (narrow ? !(focus === "left" && flip.spread === 0) : flip.spread > 0);

  const step = useCallback((dir: 1 | -1) => {
    if (!book || flip.flip) return;
    if (dir === 1 && !canNext) return;
    if (dir === -1 && !canPrev) return;
    // en pantallas estrechas se lee página a página: primero cambia el foco, luego se pasa la hoja
    if (narrow) {
      if (dir === 1 && focus === "left") { setFocus("right"); return; }
      if (dir === -1 && focus === "right") { setFocus("left"); return; }
      setFocus(dir === 1 ? "left" : "right");
    }
    if (animate) setFlip((f) => ({ ...f, flip: { dir, from: performance.now() / 1000 } }));
    else setFlip((f) => ({ spread: f.spread + dir, flip: null }));
  }, [book, flip.flip, canNext, canPrev, narrow, focus, animate]);

  const onFlipDone = useCallback(() => {
    setFlip((f) => (f.flip ? { spread: f.spread + f.flip.dir, flip: null } : f));
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!book) return;
      if (e.key === "Escape") close();
      if (e.key === "ArrowRight") { e.preventDefault(); step(1); }
      if (e.key === "ArrowLeft") { e.preventDefault(); step(-1); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [book, step, close]);

  // parallax de los papeles con el puntero (variables CSS, sin re-render)
  const onMove = (e: React.PointerEvent) => {
    if (reduced || !layer.current) return;
    const r = e.currentTarget.getBoundingClientRect();
    layer.current.style.setProperty("--mx", (((e.clientX - r.left) / r.width) * 2 - 1).toFixed(3));
    layer.current.style.setProperty("--my", (((e.clientY - r.top) / r.height) * 2 - 1).toFixed(3));
  };

  // arrastre horizontal sobre el libro abierto
  const drag = useRef<{ x: number; y: number } | null>(null);
  const onDown = (e: React.PointerEvent) => { drag.current = { x: e.clientX, y: e.clientY }; };
  const onUp = (e: React.PointerEvent, fallback: 1 | -1) => {
    const d = drag.current;
    drag.current = null;
    if (!d) return;
    const dx = e.clientX - d.x;
    if (Math.abs(dx) > 40 && Math.abs(dx) > Math.abs(e.clientY - d.y)) step(dx < 0 ? 1 : -1);
    else step(fallback);
  };

  const L = 2 * flip.spread, R = L + 1;
  const pageLabel = (p: number) => (p === 0 ? "guarda" : p > (book?.pageCount ?? 0) ? "contraguarda" : String(p));
  const indicator = book && book.pageCount
    ? narrow ? `${pageLabel(focus === "left" ? L : R)} / ${book.pageCount}` : `${pageLabel(L)}–${pageLabel(R)} / ${book.pageCount}`
    : null;
  const flatPage = book && book.pageCount ? (() => { const p = focus === "left" ? L : R; return p >= 1 && p <= book.pageCount ? book.pageImage(p) : null; })() : null;

  return (
    <section ref={section} id="libros" className={s.section} aria-labelledby="act3-title">
      <div className={`${s.stage} ${book ? s.isOpen : ""}`} onPointerMove={onMove}>
        {webgl && (
          <BooksCanvas
            books={BOOKS}
            selected={selected}
            hovered={hovered}
            onSelect={(i) => openBook(i)}
            onHover={setHovered}
            flip={flip}
            onFlipDone={onFlipDone}
            active={inView}
            narrow={narrow}
            focus={focus}
          />
        )}

        {/* sin WebGL: la misma lectura con la imagen plana de la página */}
        {!webgl && book && (
          <div className={s.flat}>
            {flatPage ? <img src={flatPage} alt={`${book.title}, página ${focus === "left" ? L : R}`} /> : <div className={s.flatBlank} />}
          </div>
        )}

        <header className={`${s.head} ${book ? s.headHide : ""}`}>
          <Sticker tone="oro" rotate={-4}>03 · Los libros de una vida</Sticker>
          <h2 id="act3-title" className={s.title}>Tres libros escritos por Abraxas. Toca uno para abrirlo.</h2>
        </header>

        {/* frases en papeles flotantes */}
        <div ref={layer} className={`${s.papers} ${inView ? s.papersIn : ""}`} aria-label="Frases de los libros">
          {visibleQuotes.map((q, i) => {
            const slot = (book ? OPEN_SLOTS : LIB_SLOTS)[i];
            const pp = PAPERS[(i + q.book) % PAPERS.length];
            const wide = narrow ? Math.min(pp.w, 210) : pp.w;
            return (
              <button
                key={q.key}
                className={`${s.paper} ${activeQuote === q.key ? s.paperOn : ""}`}
                data-cursor="lee"
                style={{
                  left: narrow ? undefined : `${slot.x}%`,
                  top: narrow ? undefined : `${slot.y}%`,
                  width: wide,
                  aspectRatio: String(pp.ratio),
                  backgroundImage: `url(/assets/room-04/cutouts/papeles/${pp.src})`,
                  padding: pp.pad.split(" ").map((v) => `${Math.round((parseFloat(v) / 100) * wide)}px`).join(" "),
                  overflow: "hidden",
                  ["--r" as string]: `${rot(i)}deg`,
                  ["--d" as string]: depth(i),
                  ["--i" as string]: i,
                }}
                onClick={() => { setActiveQuote(q.key); openBook(q.book, q.page); }}
                aria-label={`«${q.text}» — ${q.title}, página ${q.page}. Abrir el libro en esa página.`}
              >
                <span className={s.paperText}>«{q.text}»</span>
                <span className={s.paperSrc}>{q.title} · p. {q.page}</span>
              </button>
            );
          })}
        </div>

        {/* libro abierto: zonas de la página (clic o arrastre) */}
        {book && (
          <>
            <button
              className={`${s.zone} ${s.zoneL}`}
              aria-label="Página anterior"
              data-cursor="pasa"
              disabled={!canPrev}
              onPointerDown={onDown}
              onPointerUp={(e) => onUp(e, -1)}
              onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); step(-1); } }}
            />
            <button
              className={`${s.zone} ${s.zoneR}`}
              aria-label="Página siguiente"
              data-cursor="pasa"
              disabled={!canNext}
              onPointerDown={onDown}
              onPointerUp={(e) => onUp(e, 1)}
              onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); step(1); } }}
            />
            <div className={s.openMeta}>
              <p className={s.bookTitle}>
                <strong>{book.title}</strong>{book.year ? ` · ${book.year}` : ""}
                <span>{book.author}</span>
              </p>
              <button className={s.about} onClick={() => openFicha({ title: book.title, image: book.cover ?? undefined, body: book.sourceNote, meta: book.coverNote ? [book.coverNote] : undefined })}>
                Sobre este libro
              </button>
            </div>
            {book.pageCount === 0 && (
              <p className={s.pending} role="status">Páginas en digitalización. El equipo está escaneando el ejemplar.</p>
            )}
            <div className={s.bar}>
              <Ticket icon="cerrar" tone="papel" size="sm" onClick={close} cursor="toca">Cerrar libro</Ticket>
              {indicator && <span className={s.indicator} aria-hidden="true">{indicator}</span>}
            </div>
          </>
        )}

        {/* selector accesible (teclado, táctil y sin WebGL) */}
        {!book && (
          <div className={s.picker} role="group" aria-label="Elegir libro">
            {BOOKS.map((b, i) => (
              <button
                key={b.id}
                className={s.pick}
                data-cursor="abre"
                onClick={() => openBook(i)}
                onFocus={() => setHovered(i)}
                onBlur={() => setHovered(null)}
              >
                {b.title}{b.year ? <em>{b.year}</em> : null}
              </button>
            ))}
          </div>
        )}
        <p className="sr-only" aria-live="polite">{announce}{indicator ? ` Página ${indicator}.` : ""}</p>
      </div>

      <details className={s.text}>
        <summary>Leer todas las frases como texto</summary>
        {BOOKS.map((b) => (
          <div key={b.id}>
            <h3>{b.title}{b.year ? ` (${b.year})` : ""}</h3>
            <p className={s.note}>{b.sourceNote}</p>
            {b.quotes.length ? (
              <ul>{b.quotes.map((q) => <li key={q.id}>«{q.text}» — página {q.pdfPage} del PDF</li>)}</ul>
            ) : (
              <p>Sin frases hasta incorporar el documento.</p>
            )}
          </div>
        ))}
      </details>
    </section>
  );
}
