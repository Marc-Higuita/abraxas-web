"use client";
import { useEffect, useRef, useState, type CSSProperties } from "react";
import { StitchLine } from "@/components/abx/Ornaments";
import s from "./interlude.module.css";

/**
 * Interludio «Aquí las fotos no se toman, se hacen.» (entre el video y la biblioteca).
 * Una mesa de revelado construida con recortes de las paredes de la casa: hoja de contacto con lupa,
 * tira de negativos, fotos rasgadas y una cámara de papel cuyo lente mira las paredes.
 * Interacciones: parallax por capas con el cursor; los negativos se revelan al tocarlos;
 * la lupa amplía la hoja de contacto. La frase es lo principal.
 */
const I = (id: string) => `/assets/room-04/interludes/${id}.webp`;
const F = (id: string) => `/assets/room-04/fotos-se-hacen/${id}.webp`;
const P = (id: string) => `/assets/room-04/photos-lo/${id}.jpg`;

/** fotos rasgadas de los muros, alrededor de la frase (x, y en %, w en vw, d = profundidad 1–3) */
const CUTS = [
  { src: I("mirada-para-ti"), x: 6, y: 9, w: 12, r: -7, d: 2 },
  { src: I("mascara"), x: 85, y: 6, w: 9, r: 6, d: 3 },
  { src: I("ojo-azul"), x: 74, y: 70, w: 9, r: -9, d: 1 },
  { src: I("querubines"), x: 88, y: 44, w: 11, r: 4, d: 2 },
  { src: I("bajo-llave"), x: 30, y: 84, w: 13, r: 3, d: 2 },
  { src: I("help"), x: 4, y: 62, w: 10, r: 8, d: 3 },
];
/** negativos que se revelan al tocarlos */
const NEGS = [
  { src: P("1-img_0114"), x: 62, y: 7, r: 5 },
  { src: P("1-img_0122"), x: 72, y: 13, r: -4 },
  { src: P("1-img_0115"), x: 82, y: 20, r: 7 },
];

export function Interlude({ quote, source, tone }: { quote: string; source: string; tone: "negro" | "papel" | "kraft" }) {
  const wrap = useRef<HTMLDivElement>(null);
  const stage = useRef<HTMLDivElement>(null);
  const sheet = useRef<HTMLDivElement>(null);
  const [revealed, setRevealed] = useState<boolean[]>(() => NEGS.map(() => false));
  const words = quote.split(" ");

  useEffect(() => {
    const el = wrap.current, st = stage.current;
    if (!el || !st) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const io = new IntersectionObserver(([e]) => { if (e.isIntersecting) el.dataset.on = "1"; }, { threshold: 0.15 });
    io.observe(el);
    let raf = 0;
    const onScroll = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const b = el.getBoundingClientRect();
        const span = Math.max(1, b.height - innerHeight);
        const p = Math.min(1, Math.max(0, -b.top / span));
        el.style.setProperty("--p", reduced ? "1" : p.toFixed(3));
      });
    };
    const fine = window.matchMedia("(pointer: fine)").matches && !reduced;
    const onMove = (ev: PointerEvent) => {
      const b = st.getBoundingClientRect();
      st.style.setProperty("--mx", ((ev.clientX - b.left) / b.width - 0.5).toFixed(3));
      st.style.setProperty("--my", ((ev.clientY - b.top) / b.height - 0.5).toFixed(3));
    };
    addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    if (fine) st.addEventListener("pointermove", onMove);
    return () => { io.disconnect(); removeEventListener("scroll", onScroll); st.removeEventListener("pointermove", onMove); cancelAnimationFrame(raf); };
  }, []);

  /** lupa sobre la hoja de contacto */
  const onSheetMove = (ev: React.PointerEvent<HTMLDivElement>) => {
    const el = sheet.current;
    if (!el) return;
    const b = el.getBoundingClientRect();
    el.style.setProperty("--lx", `${ev.clientX - b.left}px`);
    el.style.setProperty("--ly", `${ev.clientY - b.top}px`);
    el.style.setProperty("--bx", `${((ev.clientX - b.left) / b.width) * 100}%`);
    el.style.setProperty("--by", `${((ev.clientY - b.top) / b.height) * 100}%`);
    el.dataset.loupe = "1";
  };

  const dark = tone === "negro";
  return (
    <div ref={wrap} data-on="0" className={`${s.wrap} ${dark ? s.dark : s.light}`}>
      <div ref={stage} className={s.stage}>
        {/* capa trasera: hoja de contacto con lupa y tira de negativo */}
        <div
          ref={sheet}
          className={`${s.layer} ${s.sheet}`}
          style={{ "--d": 3 } as CSSProperties}
          onPointerMove={onSheetMove}
          onPointerLeave={() => { if (sheet.current) sheet.current.dataset.loupe = "0"; }}
          aria-hidden="true"
        >
          <img src={F("hoja-contacto")} alt="" loading="lazy" decoding="async" />
          <span className={s.loupe} style={{ backgroundImage: `url(${F("hoja-contacto")})` }} />
        </div>
        <img className={`${s.layer} ${s.strip}`} style={{ "--d": 2 } as CSSProperties} src={F("tira-negativo")} alt="" aria-hidden="true" loading="lazy" decoding="async" />

        {/* fotos rasgadas de los muros */}
        {CUTS.map((c, i) => (
          <figure key={c.src} className={`${s.layer} ${s.cut}`} aria-hidden="true"
            style={{ "--x": `${c.x}%`, "--y": `${c.y}%`, "--w": c.w, "--r": `${c.r}deg`, "--d": c.d, "--i": i } as CSSProperties}>
            <img src={c.src} alt="" loading="lazy" decoding="async" />
            {i % 2 === 0 && <span className={s.tape} />}
          </figure>
        ))}

        {/* negativos: se revelan al tocarlos */}
        {NEGS.map((n, i) => (
          <button key={n.src} type="button" className={`${s.layer} ${s.neg} ${revealed[i] ? s.revealed : ""}`}
            style={{ "--x": `${n.x}%`, "--y": `${n.y}%`, "--r": `${n.r}deg`, "--d": 1, "--i": i } as CSSProperties}
            aria-pressed={revealed[i]} aria-label={revealed[i] ? "Fotografía revelada de una pared de la casa" : "Revelar este negativo"}
            onClick={() => setRevealed((v) => v.map((x, k) => (k === i ? !x : x)))}>
            <img src={n.src} alt="" loading="lazy" decoding="async" />
          </button>
        ))}

        {/* cámara de papel: el lente mira las paredes y sigue el cursor */}
        <div className={`${s.layer} ${s.camera}`} style={{ "--d": 1 } as CSSProperties} aria-hidden="true">
          <svg viewBox="0 0 220 150" className={s.camBody}>
            <path d="M18 38 L72 38 L84 20 L140 22 L150 38 L204 40 L206 136 L14 134 Z" fill="#2b2420" stroke="#f3eee3" strokeWidth="2" strokeDasharray="5 4" />
            <rect x="160" y="24" width="30" height="12" rx="2" fill="#d4a12a" />
            <rect x="26" y="50" width="34" height="14" rx="2" fill="#c9a878" />
          </svg>
          <span className={s.lens}><span style={{ backgroundImage: `url(${P("1-img_0122")})` }} /></span>
        </div>

        {/* la frase */}
        <blockquote className={s.quote}>
          <p>
            «{words.map((w, i) => (
              <span key={i} className={s.word} style={{ "--i": i } as CSSProperties}>{w}</span>
            ))}»
          </p>
          <StitchLine className={s.stitch} color={dark ? "var(--lima)" : "var(--bermellon)"} />
          <cite>— Abraxas · {source}</cite>
          <span className={s.hint}>Toca los negativos para revelarlos</span>
        </blockquote>
      </div>
    </div>
  );
}
