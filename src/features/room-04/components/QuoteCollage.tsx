"use client";
import { useEffect, useMemo, useRef } from "react";
import { useScrollProgress } from "../hooks/useScrollProgress";
import { useRoom } from "../store";
import letters from "../../../../public/assets/room-04/letters/letters.json";
import s from "./quoteCollage.module.css";

/**
 * Corrección 05 · «Yo amo lo que hago…». La foto collage de la oficina (joiner del equipo) es la protagonista;
 * la frase cae palabra por palabra en el espacio hasta armarse, controlada por el scroll.
 * La última palabra, «adherido», se arma con letras recortadas de revista.
 * Cita verificada en data/phrases.ts: a Centrópolis (Vanesa Restrepo), 29 nov. 2020.
 */
const QUOTE = "Yo amo lo que hago porque es como el mundo: todo está";
const CUT_WORD = "adherido";
const SOURCE = "a Centrópolis, 29 nov. 2020";

type Letter = { id: string; char: string; src: string; w: number; h: number };
const REVISTA = (letters.sets.find((x) => x.id === "revista")?.items ?? []) as Letter[];

/** Pseudoaleatorio estable por índice: misma composición en servidor y cliente. */
const rnd = (i: number, k: number) => {
  const x = Math.sin(i * 127.1 + k * 311.7) * 43758.5453;
  return x - Math.floor(x);
};

export function QuoteCollage({ quote = QUOTE, cutWord = CUT_WORD, source = SOURCE }: { quote?: string; cutWord?: string; source?: string }) {
  const section = useRef<HTMLElement>(null);
  const bg = useRef<HTMLDivElement>(null);
  const words = useRef<(HTMLSpanElement | null)[]>([]);
  const attrib = useRef<HTMLParagraphElement>(null);
  const reduced = useRoom((st) => st.reducedMotion);
  const list = useMemo(() => quote.split(" "), [quote]);
  const total = list.length + 1;

  const cut = useMemo(
    () =>
      cutWord.split("").map((ch, i) => {
        const opts = REVISTA.filter((l) => l.char === ch);
        const l = opts[Math.floor(rnd(i, 3) * opts.length)] ?? opts[0];
        return { ch, l, r: (rnd(i, 5) - 0.5) * 12, y: (rnd(i, 7) - 0.5) * 0.12 };
      }),
    [cutWord],
  );

  const apply = (p: number) => {
    const vh = typeof window !== "undefined" ? window.innerHeight : 800;
    if (bg.current) {
      bg.current.style.transform = reduced ? "none" : `translate3d(0, ${(p - 0.5) * -5}%, 0) scale(${1.14 - p * 0.1})`;
    }
    for (let i = 0; i < total; i++) {
      const el = words.current[i];
      if (!el) continue;
      const k = reduced ? 1 : Math.min(1, Math.max(0, (p - 0.1 - i * (0.42 / total)) / 0.22));
      const e = 1 - Math.pow(1 - k, 3);
      const u = 1 - e;
      const dx = (rnd(i, 1) - 0.5) * 520 * u;
      const dy = -(0.35 + rnd(i, 2) * 0.5) * vh * u;
      const dz = (180 + rnd(i, 4) * 420) * u;
      el.style.transform = `translate3d(${dx}px, ${dy}px, ${dz}px) rotateX(${(rnd(i, 6) - 0.5) * 140 * u}deg) rotateZ(${(rnd(i, 8) - 0.5) * 50 * u}deg)`;
      el.style.opacity = String(Math.min(1, k * 2.2));
    }
    if (attrib.current) {
      const a = reduced ? 1 : Math.min(1, Math.max(0, (p - 0.62) / 0.12));
      attrib.current.style.opacity = String(a);
      attrib.current.style.transform = `translateY(${(1 - a) * 14}px)`;
    }
  };
  useScrollProgress(section, apply, { start: "top 85%", end: "bottom bottom" });
  useEffect(() => { apply(reduced ? 1 : 0); }, [reduced]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <section ref={section} className={s.section} aria-label={`«${quote} ${cutWord}…» — Abraxas, ${source}`}>
      <div className={s.sticky}>
        <div ref={bg} className={s.bg} aria-hidden="true">
          <picture>
            <source media="(max-width: 760px)" srcSet="/assets/room-04/interludes/collage-oficina-960.webp" />
            <img src="/assets/room-04/interludes/collage-oficina.webp" alt="" draggable={false} />
          </picture>
        </div>
        <div className={s.veil} aria-hidden="true" />
        <figure className={s.figure}>
          <blockquote className={s.quote} aria-hidden="true">
            <span className={s.mark}>«</span>
            {list.map((w, i) => (
              <span key={i} ref={(el) => { words.current[i] = el; }} className={s.word}>{w}</span>
            ))}
            <span ref={(el) => { words.current[list.length] = el; }} className={`${s.word} ${s.cut}`}>
              {cut.map(({ ch, l, r, y }, i) =>
                l ? (
                  <img key={i} src={l.src} alt="" className={s.letter} style={{ transform: `translateY(${y}em) rotate(${r}deg)`, aspectRatio: `${l.w} / ${l.h}` }} />
                ) : (
                  <span key={i}>{ch}</span>
                ),
              )}
              <span className={s.ellipsis}>…»</span>
            </span>
          </blockquote>
          <figcaption ref={attrib} className={s.attrib}>
            <span className={s.dash}>—</span> Abraxas · {source}
          </figcaption>
        </figure>
      </div>
    </section>
  );
}
