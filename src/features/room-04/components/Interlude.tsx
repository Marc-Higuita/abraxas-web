"use client";
import { useEffect, useRef } from "react";

/** Transición editorial entre experiencias: recortes de papel que caen y se ordenan alrededor de una frase curatorial. */
export function Interlude({ text, tone }: { text: string; tone: "negro" | "papel" }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => el.dataset.on = e.isIntersecting ? "1" : "0", { threshold: 0.4 });
    io.observe(el);
    return () => io.disconnect();
  }, []);
  const bg = tone === "negro" ? "var(--negro)" : "var(--papel)";
  const fg = tone === "negro" ? "var(--papel)" : "var(--negro)";
  const slips = ["var(--bermellon)", "var(--amarillo)", "var(--ultramar)", "var(--magenta)", "var(--verde)"];
  return (
    <div ref={ref} data-on="0" className="interlude" style={{ background: bg, color: fg }}>
      <div className="interlude-slips" aria-hidden="true">
        {slips.map((c, i) => <span key={c} style={{ background: c, ["--i" as string]: i }} />)}
      </div>
      <p className="t-quote">{text}</p>
      <p className="t-meta" style={{ color: tone === "negro" ? "var(--espejo)" : "var(--gris)" }}>Texto del proyecto</p>
      <style>{`
        .interlude{position:relative;padding:clamp(64px,10vw,140px) max(16px,5vw);overflow:hidden}
        .interlude .t-quote{max-width:820px;margin:0 0 8px;position:relative}
        .interlude-slips{position:absolute;inset:0;pointer-events:none}
        .interlude-slips span{position:absolute;width:clamp(60px,9vw,140px);height:clamp(28px,3.5vw,52px);right:calc(6% + var(--i)*7%);top:20%;box-shadow:6px 6px 0 rgba(0,0,0,.6);transform:translateY(-60vh) rotate(calc(var(--i)*23deg));transition:transform 900ms cubic-bezier(.2,.8,.2,1);transition-delay:calc(var(--i)*90ms)}
        .interlude[data-on="1"] .interlude-slips span{transform:translateY(calc(var(--i)*22px)) rotate(calc((var(--i) - 2)*4deg))}
        @media (max-width:700px){.interlude-slips{opacity:.35}}
      `}</style>
    </div>
  );
}
