"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Ticket } from "@/components/abx/Ticket";
import { useRoom } from "../../store";
import type { Portal } from "./layout";
import s from "./messageroom.module.css";

/**
 * Collage detrás del espejo, en una experiencia propia a pantalla completa.
 * - Se monta en <body> (createPortal): la sección usa transformaciones que romperían un position: fixed.
 * - Abre en modo caleidoscopio (segmentos espejados del collage que giran despacio) y se puede pasar a
 *   «Ver collage completo» (ajustado a la pantalla, con arrastre y zoom).
 * - Cierra con el botón, Esc o la tecla de regreso; el scroll de la página queda bloqueado mientras está
 *   abierto y vuelve exactamente a su posición; la cámara 3D retoma sola su punto.
 */
export function PortalViewer({ portal, onClose }: { portal: Portal; onClose: () => void }) {
  const reduced = useRoom((st) => st.reducedMotion);
  const [mode, setMode] = useState<"kaleido" | "full">("kaleido");
  const [shown, setShown] = useState(false);
  const [mounted, setMounted] = useState(false);
  const head = useRef<HTMLElement>(null);

  useEffect(() => { setMounted(true); }, []);
  // el collage aparece cuando la cámara ya llegó al espejo
  useEffect(() => { const t = window.setTimeout(() => setShown(true), 550); return () => window.clearTimeout(t); }, []);
  useEffect(() => { if (shown) head.current?.querySelector<HTMLButtonElement>("button")?.focus({ preventScroll: true }); }, [shown]);

  // bloqueo del scroll de la página sin moverla, y restauración exacta al cerrar
  useEffect(() => {
    const y = window.scrollY;
    const html = document.documentElement;
    const prev = { o: html.style.overflow, sb: html.style.scrollBehavior };
    html.style.overflow = "hidden";
    return () => {
      html.style.scrollBehavior = "auto";
      html.style.overflow = prev.o;
      window.scrollTo(0, y);
      html.style.scrollBehavior = prev.sb;
    };
  }, []);

  useEffect(() => {
    const k = (e: KeyboardEvent) => { if (e.key === "Escape") { e.preventDefault(); e.stopPropagation(); onClose(); } };
    window.addEventListener("keydown", k, true);
    return () => window.removeEventListener("keydown", k, true);
  }, [onClose]);

  if (!mounted) return null;
  return createPortal(
    <div className={`${s.portalView} ${shown ? s.portalViewOn : ""}`} role="dialog" aria-modal="true" aria-labelledby="portal-title">
      {mode === "kaleido" ? <Kaleido portal={portal} reduced={reduced} /> : <FullCollage portal={portal} />}
      <header ref={head} className={s.portalHead}>
        <div>
          <h3 id="portal-title">{portal.title}</h3>
          <p>{portal.caption}</p>
        </div>
        <div className={s.portalActions}>
          <Ticket icon={mode === "kaleido" ? "lupa" : "destello"} tone="papel" size="sm" onClick={() => setMode((m) => (m === "kaleido" ? "full" : "kaleido"))} aria-pressed={mode === "full"}>
            {mode === "kaleido" ? "Ver collage completo" : "Caleidoscopio"}
          </Ticket>
          <Ticket icon="cerrar" tone="lima" size="md" onClick={onClose}>Volver a la habitación</Ticket>
        </div>
      </header>
      <p className={s.portalHint}>
        {mode === "kaleido" ? "Mueve el cursor o el dedo para girar el caleidoscopio · Esc para volver" : "Arrastra para recorrer el collage · rueda, pellizco o doble clic para acercar · Esc para volver"}
      </p>
    </div>,
    document.body,
  );
}

/* ---------- caleidoscopio: 8 segmentos espejados del collage, dibujados en 2D ---------- */
function Kaleido({ portal, reduced }: { portal: Portal; reduced: boolean }) {
  const cv = useRef<HTMLCanvasElement>(null);
  const ptr = useRef({ x: 0, y: 0, tx: 0, ty: 0, drag: false, lx: 0, ly: 0, spin: 0 });

  useEffect(() => {
    const canvas = cv.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const img = new Image();
    img.src = portal.src;
    let raf = 0, t0 = performance.now(), ang = 0, alive = true;
    const SEG = 8, wedge = (Math.PI * 2) / SEG;

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 1.6);
      canvas.width = Math.round(canvas.clientWidth * dpr);
      canvas.height = Math.round(canvas.clientHeight * dpr);
    };
    resize();
    window.addEventListener("resize", resize);

    const draw = (now: number) => {
      if (!alive) return;
      const dt = Math.min(0.05, (now - t0) / 1000); t0 = now;
      const p = ptr.current;
      p.x += (p.tx - p.x) * 0.06; p.y += (p.ty - p.y) * 0.06;
      if (!reduced) ang += dt * 0.05 + p.spin; // rotación lenta: hipnótica, no mareante
      p.spin *= 0.92;
      const W = canvas.width, H = canvas.height, R = Math.hypot(W, H) / 2 + 2;
      ctx.fillStyle = "#0c0a08"; ctx.fillRect(0, 0, W, H);
      if (img.complete && img.naturalWidth) {
        const breathe = reduced ? 1 : 1 + Math.sin(now / 5200) * 0.06;
        // la muestra cubre el radio con margen: las fotos se reconocen dentro de cada segmento
        const k = (R / (Math.min(img.naturalWidth, img.naturalHeight) * 0.5)) * 0.62 * breathe;
        const iw = img.naturalWidth * k, ih = img.naturalHeight * k;
        const ox = p.x * iw * 0.18, oy = p.y * ih * 0.18;
        ctx.save();
        ctx.translate(W / 2, H / 2);
        for (let i = 0; i < SEG; i++) {
          ctx.save();
          ctx.rotate(i * wedge);
          if (i % 2) ctx.scale(1, -1);
          ctx.beginPath();
          ctx.moveTo(0, 0);
          ctx.arc(0, 0, R, -0.002, wedge + 0.002);
          ctx.closePath();
          ctx.clip();
          ctx.rotate(ang);
          ctx.drawImage(img, -iw / 2 + ox, -ih / 2 + oy, iw, ih);
          ctx.restore();
        }
        ctx.restore();
        // costuras doradas entre segmentos y viñeta suave
        ctx.save();
        ctx.translate(W / 2, H / 2);
        ctx.strokeStyle = "rgba(212,161,42,0.28)"; ctx.lineWidth = 1.2 * (W / canvas.clientWidth || 1);
        for (let i = 0; i < SEG; i++) { ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(Math.cos(i * wedge) * R, Math.sin(i * wedge) * R); ctx.stroke(); }
        ctx.restore();
        const g = ctx.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.3, W / 2, H / 2, R);
        g.addColorStop(0, "rgba(12,10,8,0)"); g.addColorStop(1, "rgba(12,10,8,0.75)");
        ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
      }
      raf = requestAnimationFrame(draw);
    };
    raf = requestAnimationFrame(draw);
    return () => { alive = false; cancelAnimationFrame(raf); window.removeEventListener("resize", resize); };
  }, [portal, reduced]);

  const move = (e: React.PointerEvent) => {
    const r = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const p = ptr.current;
    p.tx = ((e.clientX - r.left) / r.width - 0.5) * 2;
    p.ty = ((e.clientY - r.top) / r.height - 0.5) * 2;
    if (p.drag) { p.spin += (e.clientX - p.lx) * 0.0006; p.lx = e.clientX; p.ly = e.clientY; }
  };
  const down = (e: React.PointerEvent) => { const p = ptr.current; p.drag = true; p.lx = e.clientX; p.ly = e.clientY; (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId); };
  const up = () => { ptr.current.drag = false; };

  return (
    <canvas
      ref={cv}
      className={s.kaleido}
      onPointerMove={move}
      onPointerDown={down}
      onPointerUp={up}
      onPointerCancel={up}
      role="img"
      aria-label={`Caleidoscopio hecho con el collage: ${portal.caption}`}
    />
  );
}

/* ---------- collage completo: ajustado a la pantalla, con arrastre y zoom ---------- */
function FullCollage({ portal }: { portal: Portal }) {
  const box = useRef<HTMLDivElement>(null);
  const [view, setView] = useState({ k: 1, x: 0, y: 0 });
  const [, force] = useState(0);
  const ptrs = useRef(new Map<number, { x: number; y: number }>());
  const pinch = useRef<{ d: number; k: number } | null>(null);

  const fitK = useCallback(() => {
    const el = box.current;
    if (!el) return 1;
    return Math.min((el.clientWidth * 0.92) / portal.w, (el.clientHeight * 0.8) / portal.h);
  }, [portal]);

  useEffect(() => { force((n) => n + 1); const r = () => force((n) => n + 1); window.addEventListener("resize", r); return () => window.removeEventListener("resize", r); }, []);

  const clampView = useCallback((v: { k: number; x: number; y: number }) => {
    const el = box.current;
    const k = Math.min(6, Math.max(1, v.k));
    if (!el) return { ...v, k };
    const base = fitK();
    const w = portal.w * base * k, h = portal.h * base * k;
    const mx = Math.max(0, (w - el.clientWidth) / 2), my = Math.max(0, (h - el.clientHeight) / 2);
    return { k, x: Math.min(mx, Math.max(-mx, v.x)), y: Math.min(my, Math.max(-my, v.y)) };
  }, [fitK, portal]);
  const zoom = useCallback((f: number) => setView((v) => clampView({ ...v, k: v.k * f })), [clampView]);

  useEffect(() => {
    const el = box.current;
    if (!el) return;
    const wheel = (e: WheelEvent) => { e.preventDefault(); zoom(Math.exp(-e.deltaY * 0.0018)); };
    const key = (e: KeyboardEvent) => { if (e.key === "+" || e.key === "=") zoom(1.25); else if (e.key === "-") zoom(1 / 1.25); };
    const clear = () => { ptrs.current.clear(); pinch.current = null; };
    el.addEventListener("wheel", wheel, { passive: false });
    window.addEventListener("keydown", key);
    window.addEventListener("blur", clear);
    return () => { el.removeEventListener("wheel", wheel); window.removeEventListener("keydown", key); window.removeEventListener("blur", clear); };
  }, [zoom]);

  const down = (e: React.PointerEvent) => {
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    ptrs.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (ptrs.current.size === 2) { const [a, b] = [...ptrs.current.values()]; pinch.current = { d: Math.hypot(b.x - a.x, b.y - a.y), k: view.k }; }
  };
  const move = (e: React.PointerEvent) => {
    const prev = ptrs.current.get(e.pointerId);
    if (!prev) return;
    const cur = { x: e.clientX, y: e.clientY };
    ptrs.current.set(e.pointerId, cur);
    if (pinch.current && ptrs.current.size === 2) {
      const [a, b] = [...ptrs.current.values()];
      const f = Math.hypot(b.x - a.x, b.y - a.y) / pinch.current.d;
      setView((v) => clampView({ ...v, k: pinch.current!.k * f }));
    } else if (ptrs.current.size === 1) setView((v) => clampView({ ...v, x: v.x + cur.x - prev.x, y: v.y + cur.y - prev.y }));
  };
  const up = (e: React.PointerEvent) => { ptrs.current.delete(e.pointerId); if (ptrs.current.size < 2) pinch.current = null; };

  const base = fitK();
  return (
    <>
      <div ref={box} className={s.portalCanvas} onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={up} onDoubleClick={() => zoom(view.k > 1.5 ? 1 / view.k : 2)}>
        <img
          src={portal.src}
          alt={portal.caption}
          draggable={false}
          width={portal.w}
          height={portal.h}
          style={{ width: portal.w * base, height: portal.h * base, transform: `translate(-50%, -50%) translate(${view.x}px, ${view.y}px) scale(${view.k})` }}
        />
      </div>
      <div className={s.portalZoom} role="group" aria-label="Acercar o alejar el collage">
        <Ticket size="sm" icon="menos" tone="papel" aria-label="Alejar" onClick={() => zoom(1 / 1.3)} disabled={view.k <= 1.01} />
        <span>{Math.round(view.k * 100)} %</span>
        <Ticket size="sm" icon="mas" tone="papel" aria-label="Acercar" onClick={() => zoom(1.3)} disabled={view.k >= 5.99} />
      </div>
    </>
  );
}
