"use client";
import { useEffect, useRef } from "react";
import { StitchLine } from "@/components/abx/Ornaments";

/**
 * Fragmentos rasgados de las paredes-collage de Abraxas (fotografías de la casa, 23 sep 2026).
 * Cada interludio usa su propio grupo, para que no se repitan.
 */
const F = (id: string) => `/assets/room-04/interludes/${id}.webp`;
const SETS: { src: string; w: number; x: number; y: number; r: number }[][] = [
  [
    { src: F("mirada-para-ti"), w: 15, x: 66, y: 8, r: -6 },
    { src: F("mascara"), w: 11, x: 84, y: 30, r: 8 },
    { src: F("help"), w: 13, x: 70, y: 52, r: 4 },
    { src: F("bajo-llave"), w: 14, x: 58, y: 78, r: -3 },
    { src: F("ojo-azul"), w: 10, x: 88, y: 70, r: -10 },
  ],
  [
    { src: F("querubines"), w: 15, x: 64, y: 10, r: 5 },
    { src: F("rostro-tocado"), w: 12, x: 83, y: 26, r: -7 },
    { src: F("naranjas-mariposas"), w: 13, x: 68, y: 50, r: -4 },
    { src: F("ser-dios"), w: 10, x: 86, y: 62, r: 9 },
    { src: F("pacifista"), w: 14, x: 60, y: 80, r: 2 },
  ],
  [
    { src: F("archivo-politico"), w: 12, x: 64, y: 8, r: -5 },
    { src: F("mujer-manzana"), w: 12, x: 82, y: 18, r: 6 },
    { src: F("conejos"), w: 14, x: 70, y: 48, r: -3 },
    { src: F("dice-callan"), w: 13, x: 84, y: 66, r: 7 },
    { src: F("ojo-azul"), w: 9, x: 60, y: 76, r: -9 },
  ],
];
const TAPES = ["rgba(246,220,140,.78)", "rgba(245,188,217,.8)", "rgba(217,242,74,.7)"];

/** Transición entre experiencias: una cita de Abraxas con su fuente y fragmentos de sus muros que caen y se pegan. */
export function Interlude({ quote, source, tone }: { quote: string; source: string; tone: "negro" | "papel" | "kraft" }) {
  const ref = useRef<HTMLDivElement>(null);
  const set = SETS[tone === "negro" ? 0 : tone === "papel" ? 1 : 2];

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => { if (e.isIntersecting) el.dataset.on = "1"; }, { threshold: 0.3 });
    io.observe(el);
    const fine = window.matchMedia("(pointer: fine)").matches && !window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let raf = 0;
    const move = (ev: PointerEvent) => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const b = el.getBoundingClientRect();
        el.style.setProperty("--mx", String((ev.clientX - b.left) / b.width - 0.5));
        el.style.setProperty("--my", String((ev.clientY - b.top) / b.height - 0.5));
      });
    };
    if (fine) el.addEventListener("pointermove", move);
    return () => { io.disconnect(); el.removeEventListener("pointermove", move); cancelAnimationFrame(raf); };
  }, []);

  const dark = tone === "negro";
  return (
    <div ref={ref} data-on="0" className={`interlude ${tone === "kraft" ? "tx-kraft" : tone === "papel" ? "tx-paper" : "tx-halftone"}`} style={{ background: dark ? "var(--negro)" : undefined, color: dark ? "var(--papel)" : "var(--negro)" }}>
      <div className="interlude-cuts" aria-hidden="true">
        {set.map((c, i) => (
          <figure key={c.src + i} style={{ ["--i" as string]: i, ["--w" as string]: c.w, ["--x" as string]: `${c.x}%`, ["--y" as string]: `${c.y}%`, ["--r" as string]: `${c.r}deg`, ["--d" as string]: (i % 3) + 1 }}>
            <img src={c.src} alt="" loading="lazy" decoding="async" />
            {i % 2 === 0 && <span style={{ background: TAPES[i % 3] }} />}
          </figure>
        ))}
      </div>
      <blockquote className="interlude-q">
        <p>«{quote}»</p>
        <StitchLine className="interlude-stitch" color={dark ? "var(--lima)" : "var(--bermellon)"} />
        <cite>— Abraxas · {source}</cite>
      </blockquote>
      <style>{`
        .interlude{position:relative;padding:clamp(90px,13vw,190px) max(16px,6vw);overflow:hidden;--mx:0;--my:0}
        .interlude-q{position:relative;z-index:1;margin:0;max-width:min(980px,58%)}
        .interlude-q p{font-family:var(--font-caos);font-weight:500;font-size:clamp(34px,5.2vw,82px);line-height:.98;letter-spacing:-.03em;margin:0 0 14px;text-wrap:balance}
        .interlude-stitch{display:block;width:min(320px,60%);height:14px;margin:0 0 12px}
        .interlude-q cite{font-style:normal;font-size:15px;opacity:.75}
        .interlude-cuts{position:absolute;inset:0;pointer-events:none}
        .interlude-cuts figure{position:absolute;margin:0;left:var(--x);top:var(--y);width:calc(var(--w) * 1vw);min-width:84px;
          transform:translate3d(calc(var(--mx) * var(--d) * -14px), calc(-80vh + var(--my) * var(--d) * -10px), 0) rotate(calc(var(--r) * 6));
          opacity:0;transition:transform 1200ms var(--ease-spring), opacity 400ms ease;transition-delay:calc(var(--i) * 120ms)}
        .interlude[data-on="1"] .interlude-cuts figure{opacity:1;transform:translate3d(calc(var(--mx) * var(--d) * -14px), calc(var(--my) * var(--d) * -10px), 0) rotate(var(--r))}
        .interlude-cuts img{display:block;width:100%;height:auto;filter:drop-shadow(4px 7px 6px rgba(0,0,0,.35)) drop-shadow(1px 1px 0 rgba(0,0,0,.15))}
        .interlude-cuts figure span{position:absolute;top:-10px;left:50%;width:46%;height:22px;transform:translateX(-50%) rotate(-4deg);mix-blend-mode:multiply;box-shadow:0 1px 2px rgba(0,0,0,.12)}
        @media (max-width:760px){
          .interlude-q{max-width:100%}
          .interlude-cuts{opacity:.32}
          .interlude-cuts figure{min-width:70px}
        }
        @media (prefers-reduced-motion: reduce){.interlude-cuts figure{transition:none;opacity:1;transform:rotate(var(--r))}}
      `}</style>
    </div>
  );
}
