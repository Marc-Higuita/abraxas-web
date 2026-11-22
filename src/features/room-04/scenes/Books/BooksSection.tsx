"use client";
import dynamic from "next/dynamic";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { BOOKS } from "../../data/books";
import { useInView } from "../../hooks/useInView";
import { hasWebGL } from "../../hooks/useDevice";
import { useRoom } from "../../store";
import { Ticket, Sticker } from "@/components/abx/Ticket";
import type { FlipState } from "./BooksCanvas";
import type { FloatQuote } from "./QuotePapers";
import s from "./books.module.css";

const BooksCanvas = dynamic(() => import("./BooksCanvas").then((m) => m.BooksCanvas), { ssr: false });


export function BooksSection() {
  const section = useRef<HTMLElement>(null);
  const inView = useInView(section);
  const [webgl] = useState(() => hasWebGL());
  const [narrow, setNarrow] = useState(false);
  const [selected, setSelected] = useState<number | null>(null);
  const [hovered, setHovered] = useState<number | null>(null);
  const [flip, setFlip] = useState<FlipState>({ spread: 0, flip: null });
  const [focus, setFocus] = useState<"left" | "right">("right");
  const [announce, setAnnounce] = useState("");
  const [focusKey, setFocusKey] = useState<string | null>(null);
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

  // Las frases se reparten en dos grupos sin repetir: unas para la biblioteca y otras para el libro abierto.
  const { library, openQuotes } = useMemo(() => {
    const lib: FloatQuote[][] = [], open: FloatQuote[] = [];
    BOOKS.forEach((b, bi) => {
      const list = b.quotes.map((q) => ({ key: q.id, book: bi, text: q.text, page: q.pdfPage, title: b.title }));
      lib.push(list.filter((_, i) => i % 2 === 1));
      open.push(...list.filter((_, i) => i % 2 === 0));
    });
    // biblioteca: se intercalan los libros (las más breves primero en cada libro, para que respiren)
    lib.forEach((l) => l.sort((a, b) => a.text.length - b.text.length));
    const mixed: FloatQuote[] = [];
    for (let i = 0; mixed.length < 12; i++) {
      let added = false;
      lib.forEach((l) => { if (l[i]) { mixed.push(l[i]); added = true; } });
      if (!added) break;
    }
    return { library: mixed, openQuotes: open };
  }, []);
  const bookHasQuotes = book ? openQuotes.some((q) => q.book === selected) : false;
  const bookFrac = book && !narrow && bookHasQuotes ? 0.56 : 1;

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
    setFocusKey(null);
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
      if (e.key === "Escape" && focusKey) { setFocusKey(null); return; }
      if (!book) return;
      if (e.key === "Escape") close();
      if (e.key === "ArrowRight") { e.preventDefault(); step(1); }
      if (e.key === "ArrowLeft") { e.preventDefault(); step(-1); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [book, step, close, focusKey]);

  // clic en una frase: en la biblioteca abre el libro en su página; en el libro abierto la acerca para leerla
  const onPick = useCallback((q: FloatQuote, inBook: boolean) => {
    if (focusKey === q.key || !q.text) { setFocusKey(null); return; }
    if (inBook) { setFocusKey(q.key); setAnnounce(`«${q.text}» — ${q.title}, página ${q.page}.`); return; }
    openBook(q.book, q.page);
  }, [focusKey, openBook]);

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
      <div className={`${s.stage} ${book ? s.isOpen : ""}`} style={{ ["--bookw" as string]: `${bookFrac * 100}%` }}>
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
            library={library}
            openQuotes={openQuotes}
            focusKey={focusKey}
            onPick={onPick}
            bookFrac={bookFrac}
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

        {/* libro abierto: zonas de la página (clic o arrastre) */}
        {book && (
          <>
            {focusKey && <p className={s.focusHint}>Toca de nuevo la frase o fuera de ella para devolverla.</p>}
            <button
              hidden={!!focusKey}
              className={`${s.zone} ${s.zoneL}`}
              aria-label="Página anterior"
              data-cursor="pasa"
              disabled={!canPrev}
              onPointerDown={onDown}
              onPointerUp={(e) => onUp(e, -1)}
              onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); step(-1); } }}
            />
            <button
              hidden={!!focusKey}
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
