"use client";
import { useEffect, useRef, useState } from "react";
import { sound } from "@/lib/audio/useSound";
import { CITAS } from "../../data/phrases";
import { BOOKS } from "../../data/books";
import s from "./objects.module.css";

/**
 * Hoja de la máquina de escribir (R4-D · 08.6a).
 * Solo frases auténticas: citas documentadas de data/phrases.ts y citas verificadas de los libros
 * (data/books.ts), siempre con su fuente. Si no hubiera ninguna, la hoja queda en blanco con un aviso.
 */
export interface TypedQuote { text: string; source: string }

export const TYPEWRITER_QUOTES: TypedQuote[] = [
  ...CITAS.filter((c) => c.kind === "cita" && (c.verification === "documentado" || c.verification === "verificado"))
    .map((c) => ({ text: c.text, source: c.source ?? "" })),
  ...BOOKS.flatMap((b) => b.quotes
    .filter((q) => q.verification === "verificado" && q.kind === "literal" && q.text.length <= 140)
    .slice(0, 3)
    .map((q) => ({ text: q.text, source: `${b.title}, pág. PDF ${q.pdfPage}` }))),
].filter((q) => q.text && q.source);

export function TypewriterReader({ index, reduced, onClose, onNext }: { index: number; reduced: boolean; onClose: () => void; onNext: () => void }) {
  const q = TYPEWRITER_QUOTES.length ? TYPEWRITER_QUOTES[index % TYPEWRITER_QUOTES.length] : null;
  const [n, setN] = useState(reduced || !q ? (q?.text.length ?? 0) : 0);
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => { closeRef.current?.focus({ preventScroll: true }); }, []);
  useEffect(() => {
    const key = (e: KeyboardEvent) => { if (e.key === "Escape") { e.stopPropagation(); onClose(); } };
    window.addEventListener("keydown", key, true);
    return () => window.removeEventListener("keydown", key, true);
  }, [onClose]);

  // la frase se escribe letra a letra; un golpe de tecla suave cada dos o tres letras
  useEffect(() => {
    if (!q) return;
    if (reduced) { setN(q.text.length); return; }
    setN(0);
    let i = 0;
    const id = window.setInterval(() => {
      i++;
      setN(i);
      const ch = q.text[i - 1];
      if (ch && ch !== " " && i % 2 === 0) sound.typeKey(0.7 + Math.random() * 0.5);
      if (i >= q.text.length) window.clearInterval(id);
    }, 42);
    return () => window.clearInterval(id);
  }, [q, reduced]);

  const done = !q || n >= q.text.length;
  return (
    <div className={s.reader} role="dialog" aria-modal="true" aria-label="Máquina de escribir: una frase de Abraxas" onClick={onClose}>
      <div className={s.sheet} onClick={(e) => e.stopPropagation()}>
        <div className={s.platen} aria-hidden />
        {q ? (
          <>
            <p className={s.typed} aria-live="polite">
              <span>«{q.text.slice(0, n)}</span>
              {done ? <span>»</span> : <span className={s.caret} aria-hidden>▌</span>}
            </p>
            <p className={s.typedSrc} style={{ opacity: done ? 1 : 0 }}>Abraxas · {q.source}</p>
          </>
        ) : (
          <p className={s.typedSrc}>Esta hoja espera una frase documentada de Abraxas.</p>
        )}
        <div className={s.readerActions}>
          {TYPEWRITER_QUOTES.length > 1 && (
            <button type="button" className={s.ghostBtn} onClick={onNext} disabled={!done}>Otra frase</button>
          )}
          <button ref={closeRef} type="button" className={s.closeBtn} onClick={onClose}>Volver a la habitación</button>
        </div>
      </div>
    </div>
  );
}
