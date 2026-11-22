"use client";
import dynamic from "next/dynamic";
import { useEffect, useRef, useState } from "react";
import { BOOKS } from "../../data/books";
import { useInView } from "../../hooks/useInView";
import { hasWebGL } from "../../hooks/useDevice";
import { useRoom } from "../../store";
import s from "./books.module.css";

const BooksCanvas = dynamic(() => import("./BooksCanvas").then((m) => m.BooksCanvas), { ssr: false });

/** Rotaciones deterministas de los recortes (caos medido: ±8°). */
const tilt = (i: number) => ((i * 37) % 17) - 8;

export function BooksSection() {
  const section = useRef<HTMLElement>(null);
  const inView = useInView(section);
  const [webgl] = useState(() => hasWebGL());
  const [selected, setSelected] = useState<number | null>(null);
  const [frag, setFrag] = useState(0);
  const openFicha = useRoom((st) => st.openFicha);
  const book = selected !== null ? BOOKS[selected] : null;
  const quote = book?.quotes[frag];

  useEffect(() => setFrag(0), [selected]);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!book) return;
      if (e.key === "Escape") setSelected(null);
      if (e.key === "ArrowRight") setFrag((f) => Math.min(f + 1, Math.max(0, book.quotes.length - 1)));
      if (e.key === "ArrowLeft") setFrag((f) => Math.max(0, f - 1));
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [book]);

  return (
    <section ref={section} id="libros" className={s.section} aria-labelledby="act3-title">
      <div className={s.stage}>
        {webgl && <BooksCanvas pageUrl={book && quote ? book.pageImage(quote.pdfPage) : null} books={BOOKS} selected={selected} onSelect={(i) => setSelected((cur) => (cur === i ? cur : i))} active={inView} />}
        <header className={`${s.head} ${book ? s.headOpen : ""}`}>
          <span className="t-label">03 · Los libros de una vida</span>
          <h2 id="act3-title" className="t-title">Tres libros. Toca uno y deja que suelte sus recortes.</h2>
        </header>

        {/* selector accesible (también para pantallas táctiles y sin WebGL) */}
        <div className={s.picker} role="tablist" aria-label="Libros">
          {BOOKS.map((b, i) => (
            <button key={b.id} role="tab" aria-selected={selected === i} className={`btn btn-sm ${selected === i ? "btn-oro" : ""}`} onClick={() => setSelected(i)}>
              {b.title}
            </button>
          ))}
          {book && <button className="btn btn-sm" onClick={() => setSelected(null)}>Cerrar libro</button>}
        </div>

        {book && (
          <div className={s.reader} aria-live="polite">
            <p className={s.bookMeta}>
              <strong>{book.title}</strong>{book.subtitle ? ` · ${book.subtitle}` : ""} — {book.author}{book.year ? `, ${book.year}` : ""}
            </p>
            {book.status === "pendiente" ? (
              <div className={s.pending}>
                <span className="tag tag-amarillo">Archivo pendiente</span>
                <p>{book.sourceNote}</p>
                {book.coverNote && <p className="t-meta">{book.coverNote}</p>}
              </div>
            ) : quote ? (
              <>
                {/* recortes que salen del libro; zona de lectura limpia y sin rotar */}
                <div className={s.slips} aria-hidden="true">
                  {book.quotes.map((q, i) => (
                    <button
                      key={q.id}
                      tabIndex={-1}
                      className={`${s.slip} ${i === frag ? s.slipOn : ""}`}
                      style={{ ["--r" as string]: `${tilt(i)}deg`, ["--d" as string]: `${i * 60}ms` }}
                      onClick={() => setFrag(i)}
                    >
                      {q.theme}
                    </button>
                  ))}
                </div>
                <figure className={s.quote} key={quote.id}>
                  <blockquote className="t-quote">«{quote.text}»</blockquote>
                  <figcaption className="t-meta">
                    {book.title} · página {quote.pdfPage} del PDF{quote.context ? ` · ${quote.context}` : ""} · cita literal verificada
                  </figcaption>
                </figure>
                <div className={s.nav}>
                  <button className="btn btn-sm" onClick={() => setFrag((f) => Math.max(0, f - 1))} disabled={frag === 0}>Anterior</button>
                  <span className="t-meta">{frag + 1} / {book.quotes.length}</span>
                  <button className="btn btn-sm" onClick={() => setFrag((f) => Math.min(book.quotes.length - 1, f + 1))} disabled={frag === book.quotes.length - 1}>Siguiente</button>
                  <button className="btn btn-sm btn-papel" onClick={() => openFicha({ title: `${book.title} · página ${quote.pdfPage}`, image: book.pageImage(quote.pdfPage), meta: [book.sourceNote] })}>
                    Ver página original
                  </button>
                </div>
              </>
            ) : null}
          </div>
        )}
      </div>

      <details className={s.text}>
        <summary className="btn btn-sm">Leer todas las citas como texto</summary>
        {BOOKS.map((b) => (
          <div key={b.id}>
            <h3>{b.title}{b.year ? ` (${b.year})` : ""}</h3>
            <p className="t-meta">{b.sourceNote}</p>
            {b.quotes.length ? (
              <ul>{b.quotes.map((q) => <li key={q.id}>«{q.text}» — pág. PDF {q.pdfPage}</li>)}</ul>
            ) : (
              <p>Sin citas hasta incorporar el documento.</p>
            )}
          </div>
        ))}
      </details>
    </section>
  );
}
