"use client";
import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { useScrollProgress } from "../hooks/useScrollProgress";
import { useRoom } from "../store";
import letters from "../../../../public/assets/room-04/letters/letters.json";
import s from "./quoteCollage.module.css";

/**
 * «Yo amo lo que hago…» como instalación colgante. La foto collage de la oficina (joiner del equipo)
 * queda de fondo; la frase, centrada, está hecha de piezas de papel recortado (cada palabra en un papel
 * distinto) que cuelgan de hilos finos atados a cuerdas horizontales, como un móvil hecho a mano.
 * Al llegar, las piezas bajan desde arriba hasta su sitio y quedan meciéndose apenas.
 * «adherido» se arma con letras recortadas de revista, cada una con su propio hilo.
 * El texto es real (no imagen), para que sea nítido y legible. Cita verificada en data/phrases.ts:
 * a Centrópolis (Vanesa Restrepo), 29 nov. 2020.
 */
const SOURCE = "a Centrópolis, 29 nov. 2020";
const CUT_WORD = "adherido";
const ROWS_WIDE = [["Yo", "amo", "lo", "que", "hago"], ["porque", "es", "como", "el", "mundo:"], ["todo", "está", "*"]];
const ROWS_NARROW = [["Yo", "amo", "lo", "que", "hago"], ["porque", "es", "como"], ["el", "mundo:"], ["todo", "está"], ["*"]];

type Letter = { id: string; char: string; src: string; w: number; h: number };
const REVISTA = (letters.sets.find((x) => x.id === "revista")?.items ?? []) as Letter[];
const PAPERS = ["crema", "kraft", "prensa", "rayado", "cuadro", "rosa", "blanco"] as const;

/** Pseudoaleatorio estable por índice: misma composición en servidor y cliente. */
const rnd = (i: number, k: number) => {
  const x = Math.sin(i * 127.1 + k * 311.7) * 43758.5453;
  return x - Math.floor(x);
};

export function QuoteCollage({ source = SOURCE }: { source?: string }) {
  const section = useRef<HTMLElement>(null);
  const bg = useRef<HTMLDivElement>(null);
  const pieces = useRef<(HTMLElement | null)[]>([]);
  const wires = useRef<(HTMLElement | null)[]>([]);
  const attrib = useRef<HTMLParagraphElement>(null);
  const reduced = useRoom((st) => st.reducedMotion);
  const [narrow, setNarrow] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(max-width: 760px)");
    const on = () => setNarrow(mq.matches);
    on();
    mq.addEventListener("change", on);
    return () => mq.removeEventListener("change", on);
  }, []);
  const rows = narrow ? ROWS_NARROW : ROWS_WIDE;

  const cut = useMemo(
    () =>
      CUT_WORD.split("").map((ch, i) => {
        const opts = REVISTA.filter((l) => l.char === ch);
        return { ch, l: opts[Math.floor(rnd(i, 3) * opts.length)] ?? opts[0] };
      }),
    [],
  );

  // índice global de cada pieza (palabra o letra), para el escalonado de la bajada
  type Piece = { kind: "letter"; idx: number; c: (typeof cut)[number]; k: number } | { kind: "word"; idx: number; w: string };
  const layout = useMemo(() => {
    let n = 0;
    return rows.map((row) =>
      row.flatMap((w): Piece[] => (w === "*" ? cut.map((c, k) => ({ kind: "letter", idx: n++, c, k })) : [{ kind: "word", idx: n++, w }])),
    );
  }, [rows, cut]);
  const total = layout.reduce((a, r) => a + r.length, 0);

  const apply = (p: number) => {
    const vh = typeof window !== "undefined" ? window.innerHeight : 800;
    if (bg.current) bg.current.style.transform = reduced ? "none" : `translate3d(0, ${(p - 0.5) * -4}%, 0) scale(${1.1 - p * 0.06})`;
    wires.current.forEach((el, r) => {
      if (!el) return;
      const k = reduced ? 1 : Math.min(1, Math.max(0, (p - 0.06 - r * 0.05) / 0.16));
      el.style.opacity = String(k);
      el.style.transform = `scaleX(${0.6 + 0.4 * k})`;
    });
    for (let i = 0; i < total; i++) {
      const el = pieces.current[i];
      if (!el) continue;
      const k = reduced ? 1 : Math.min(1, Math.max(0, (p - 0.1 - i * (0.36 / total)) / 0.2));
      // bajada con un pequeño rebote al llegar (como algo que cuelga y se asienta)
      const e = k >= 1 ? 1 : 1 - Math.pow(1 - k, 3) + Math.sin(k * Math.PI) * 0.06;
      el.style.translate = `0 ${(-(0.55 + rnd(i, 2) * 0.25) * vh * (1 - e)).toFixed(1)}px`;
      el.style.opacity = String(Math.min(1, k * 3));
    }
    if (attrib.current) {
      const a = reduced ? 1 : Math.min(1, Math.max(0, (p - 0.56) / 0.12));
      attrib.current.style.opacity = String(a);
      attrib.current.style.transform = `translateY(${(1 - a) * 12}px)`;
    }
  };
  useScrollProgress(section, apply, { start: "top 85%", end: "bottom bottom" });
  useEffect(() => { apply(reduced ? 1 : 0); }, [reduced, narrow]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <section ref={section} className={s.section} aria-label={`«Yo amo lo que hago porque es como el mundo: todo está adherido…» — Abraxas, ${source}`}>
      <div className={s.sticky}>
        <div ref={bg} className={s.bg} aria-hidden="true">
          <picture>
            <source media="(max-width: 760px)" srcSet="/assets/room-04/interludes/collage-oficina-960.webp" />
            <img src="/assets/room-04/interludes/collage-oficina.webp" alt="" draggable={false} />
          </picture>
        </div>
        <div className={s.veil} aria-hidden="true" />

        <figure className={s.figure}>
          {/* cuerdas que bajan del techo y sostienen la primera línea */}
          <span className={s.anchor} style={{ left: "6%" }} aria-hidden="true" />
          <span className={s.anchor} style={{ right: "6%" }} aria-hidden="true" />
          <blockquote className={s.quote} aria-hidden="true">
            {layout.map((row, r) => (
              <div key={r} className={s.row}>
                <span ref={(el) => { wires.current[r] = el; }} className={s.wire} />
                {row.map((it, j) => {
                  const i = it.idx;
                  const swing: CSSProperties = {
                    animationDelay: `${(-rnd(i, 9) * 6).toFixed(2)}s`,
                    animationDuration: `${(5.2 + rnd(i, 10) * 2.6).toFixed(2)}s`,
                    ["--tilt" as string]: `${((rnd(i, 11) - 0.5) * 3.2).toFixed(2)}deg`,
                    ["--thread" as string]: `${Math.round(10 + rnd(i, 12) * 14)}px`,
                  };
                  if (it.kind === "letter") {
                    const { c, k } = it;
                    const last = k === cut.length - 1;
                    return (
                      <span key={j} ref={(el) => { pieces.current[i] = el; }} className={`${s.hang} ${s.hangLetter}`} style={swing}>
                        <span className={s.thread} />
                        {c.l ? (
                          <img src={c.l.src} alt="" className={s.letter} style={{ aspectRatio: `${c.l.w} / ${c.l.h}` }} draggable={false} />
                        ) : (
                          <span className={`${s.tag} ${s.crema}`}>{c.ch}</span>
                        )}
                        {last && <span className={s.ellipsis}>…»</span>}
                      </span>
                    );
                  }
                  const paper = PAPERS[Math.floor(rnd(i, 4) * PAPERS.length)];
                  const first = r === 0 && j === 0;
                  return (
                    <span key={j} ref={(el) => { pieces.current[i] = el; }} className={s.hang} style={swing}>
                      <span className={s.thread} />
                      <span className={`${s.tag} ${s[paper]}`}>
                        {first && <span className={s.mark}>«</span>}
                        {it.w}
                      </span>
                    </span>
                  );
                })}
              </div>
            ))}
          </blockquote>
          <figcaption ref={attrib} className={s.attrib}>
            <span className={s.dash}>—</span> Abraxas · {source}
          </figcaption>
        </figure>
      </div>
    </section>
  );
}
