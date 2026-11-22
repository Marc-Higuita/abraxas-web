"use client";
import { useEffect, useRef } from "react";

const CUTS = [
  "/assets/room-04/cutouts/signos/signo-01.png",
  "/assets/room-04/cutouts/caras/boca-ojo-02.png",
  "/assets/room-04/cutouts/signos/signo-08.png",
  "/assets/room-04/cutouts/caras/mirada-03.png",
  "/assets/room-04/cutouts/signos/signo-03.png",
];

/** Transición entre experiencias: una cita de Abraxas con su fuente y recortes que caen y se pegan. */
export function Interlude({ quote, source, tone }: { quote: string; source: string; tone: "negro" | "papel" | "kraft" }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => { el.dataset.on = e.isIntersecting ? "1" : "0"; }, { threshold: 0.35 });
    io.observe(el);
    return () => io.disconnect();
  }, []);
  const dark = tone === "negro";
  return (
    <div ref={ref} data-on="0" className={`interlude ${tone === "kraft" ? "tx-kraft" : tone === "papel" ? "tx-paper" : "tx-halftone"}`} style={{ background: dark ? "var(--negro)" : undefined, color: dark ? "var(--papel)" : "var(--negro)" }}>
      <div className="interlude-cuts" aria-hidden="true">
        {CUTS.map((c, i) => <img key={c} src={c} alt="" style={{ ["--i" as string]: i }} />)}
      </div>
      <blockquote className="interlude-q">
        <p>«{quote}»</p>
        <cite>— Abraxas · {source}</cite>
      </blockquote>
      <style>{`
        .interlude{position:relative;padding:clamp(80px,12vw,180px) max(16px,6vw);overflow:hidden}
        .interlude-q{position:relative;z-index:1;margin:0;max-width:980px}
        .interlude-q p{font-family:var(--font-caos);font-weight:500;font-size:clamp(34px,5.4vw,84px);line-height:.98;letter-spacing:-.03em;margin:0 0 18px;text-wrap:balance}
        .interlude-q cite{font-style:normal;font-size:15px;opacity:.75}
        .interlude-cuts{position:absolute;inset:0;pointer-events:none}
        .interlude-cuts img{position:absolute;width:clamp(70px,9vw,150px);height:auto;right:calc(4% + var(--i)*8%);top:calc(14% + (var(--i) * 13%));filter:drop-shadow(5px 6px 0 rgba(0,0,0,.45));transform:translateY(-70vh) rotate(calc(var(--i)*47deg));transition:transform 1100ms var(--ease-spring);transition-delay:calc(var(--i)*110ms)}
        .interlude[data-on="1"] .interlude-cuts img{transform:translateY(0) rotate(calc((var(--i) - 2)*9deg))}
        @media (max-width:700px){.interlude-cuts{opacity:.4}}
        @media (prefers-reduced-motion: reduce){.interlude-cuts img{transition:none;transform:none}}
      `}</style>
    </div>
  );
}
