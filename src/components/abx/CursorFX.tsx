"use client";
import { useEffect, useRef, useState } from "react";
import { Icon, type IconName } from "./Icon";

const MODES: Record<string, { icon?: IconName; label?: string }> = {
  toca: {},
  ver: { icon: "lupa", label: "Ver" },
  abre: { icon: "libro", label: "Abrir" },
  pasa: { icon: "flecha", label: "Pasar página" },
  corta: { icon: "tijeras", label: "Cortar" },
  arrastra: { icon: "mano", label: "Arrastra" },
  lee: { icon: "ojo", label: "Leer" },
  play: { icon: "play", label: "Play" },
  entra: { icon: "mano", label: "Entrar" },
};

/**
 * Cursor propio + estela de agua. Solo con ratón (pointer: fine) y sin "reducir movimiento".
 * Los elementos declaran su modo con data-cursor="ver | abre | corta | ...".
 */
export function CursorFX() {
  const [on, setOn] = useState(false);
  const dot = useRef<HTMLDivElement>(null);
  const ring = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const [mode, setMode] = useState<string | null>(null);

  useEffect(() => {
    const fine = matchMedia("(pointer: fine)").matches;
    const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
    setOn(fine && !reduced);
  }, []);

  useEffect(() => {
    if (!on) return;
    document.documentElement.classList.add("abx-cursor-on");
    const cv = canvas.current!;
    const ctx = cv.getContext("2d")!;
    let w = 0, h = 0;
    const dpr = Math.min(2, devicePixelRatio || 1);
    const resize = () => { w = innerWidth; h = innerHeight; cv.width = w * dpr; cv.height = h * dpr; ctx.setTransform(dpr, 0, 0, dpr, 0, 0); };
    resize();
    addEventListener("resize", resize);

    const pos = { x: w / 2, y: h / 2 }, ringPos = { x: w / 2, y: h / 2 };
    const ripples: { x: number; y: number; t: number; s: number }[] = [];
    let last = 0, raf = 0, lastX = 0, lastY = 0;
    // dentro de la habitación de fotos la exploración es limpia: sin ondas de agua
    let calm = false;

    const onMove = (e: PointerEvent) => {
      pos.x = e.clientX; pos.y = e.clientY;
      calm = !!(e.target as HTMLElement | null)?.closest?.("#habitacion");
      const now = performance.now();
      const dist = Math.hypot(pos.x - lastX, pos.y - lastY);
      if (!calm && now - last > 55 && dist > 14) {
        ripples.push({ x: pos.x, y: pos.y, t: now, s: Math.min(1.6, 0.6 + dist / 60) });
        if (ripples.length > 28) ripples.shift();
        last = now; lastX = pos.x; lastY = pos.y;
      }
      const el = (e.target as HTMLElement | null)?.closest?.("[data-cursor], a, button, [role=button], input, textarea, select") as HTMLElement | null;
      setMode(el ? el.dataset.cursor ?? "toca" : null);
    };
    const onDown = () => { if (!calm) ripples.push({ x: pos.x, y: pos.y, t: performance.now(), s: 2.6 }); ring.current?.classList.add("down"); };
    const onUp = () => ring.current?.classList.remove("down");
    addEventListener("pointermove", onMove, { passive: true });
    addEventListener("pointerdown", onDown);
    addEventListener("pointerup", onUp);

    const loop = (now: number) => {
      ringPos.x += (pos.x - ringPos.x) * 0.18;
      ringPos.y += (pos.y - ringPos.y) * 0.18;
      if (dot.current) dot.current.style.transform = `translate(${pos.x}px, ${pos.y}px)`;
      if (ring.current) ring.current.style.transform = `translate(${ringPos.x}px, ${ringPos.y}px)`;
      ctx.clearRect(0, 0, w, h);
      for (let i = ripples.length - 1; i >= 0; i--) {
        const r = ripples[i];
        const age = (now - r.t) / 1100;
        if (age > 1) { ripples.splice(i, 1); continue; }
        const ease = 1 - Math.pow(1 - age, 3);
        const rad = 6 + ease * 46 * r.s;
        const a = (1 - age) * 0.5;
        // anillo de agua: borde claro + sombra interior desplazada (refracción simulada)
        ctx.lineWidth = 1.6 * (1 - age) + 0.4;
        ctx.strokeStyle = `rgba(246,220,140,${a})`;
        ctx.beginPath(); ctx.arc(r.x, r.y, rad, 0, Math.PI * 2); ctx.stroke();
        ctx.strokeStyle = `rgba(168,230,232,${a * 0.55})`;
        ctx.beginPath(); ctx.arc(r.x + 1.5, r.y + 1.5, rad * 0.82, 0, Math.PI * 2); ctx.stroke();
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => {
      cancelAnimationFrame(raf);
      removeEventListener("resize", resize);
      removeEventListener("pointermove", onMove);
      removeEventListener("pointerdown", onDown);
      removeEventListener("pointerup", onUp);
      document.documentElement.classList.remove("abx-cursor-on");
    };
  }, [on]);

  if (!on) return null;
  const m = mode ? MODES[mode] ?? {} : null;
  return (
    <>
      <canvas ref={canvas} className="abx-water" aria-hidden="true" />
      <div ref={ring} className={`abx-ring ${m ? "is-active" : ""} ${m?.icon ? "has-icon" : ""}`} aria-hidden="true">
        <span className="abx-ring-inner">{m?.icon && <Icon name={m.icon} size={20} />}</span>
        {m?.label && <span className="abx-ring-label">{m.label}</span>}
      </div>
      <div ref={dot} className="abx-dot" aria-hidden="true"><Icon name="x" size={14} /></div>
    </>
  );
}
