"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { Ticket } from "@/components/abx/Ticket";
import type { Portal } from "./layout";
import s from "./messageroom.module.css";

/**
 * Collage detrás del espejo: se explora arrastrando (pan) y con la rueda, el pellizco o los botones (zoom).
 * «Volver a la habitación» (o Esc) cierra y devuelve el foco; la cámara 3D retoma sola su posición.
 */
export function PortalViewer({ portal, onClose }: { portal: Portal; onClose: () => void }) {
  const box = useRef<HTMLDivElement>(null);
  const head = useRef<HTMLElement>(null);
  const [view, setView] = useState({ k: 1, x: 0, y: 0 });
  const [shown, setShown] = useState(false);
  const ptrs = useRef(new Map<number, { x: number; y: number }>());
  const pinch = useRef<{ d: number; k: number } | null>(null);

  // el collage aparece cuando la cámara ya llegó al espejo
  useEffect(() => { const t = window.setTimeout(() => setShown(true), 650); return () => window.clearTimeout(t); }, []);
  useEffect(() => { if (shown) head.current?.querySelector<HTMLButtonElement>("button")?.focus(); }, [shown]);

  const fitK = useCallback(() => {
    const el = box.current;
    if (!el) return 1;
    return Math.min(el.clientWidth / portal.w, el.clientHeight / portal.h);
  }, [portal]);

  useEffect(() => { setView({ k: 1, x: 0, y: 0 }); }, [portal]);

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
    const k = (e: KeyboardEvent) => {
      if (e.key === "Escape") { e.preventDefault(); onClose(); }
      else if (e.key === "+" || e.key === "=") zoom(1.25);
      else if (e.key === "-") zoom(1 / 1.25);
    };
    window.addEventListener("keydown", k);
    return () => window.removeEventListener("keydown", k);
  }, [onClose, zoom]);

  useEffect(() => {
    const el = box.current;
    if (!el) return;
    const wheel = (e: WheelEvent) => { e.preventDefault(); zoom(Math.exp(-e.deltaY * 0.0018)); };
    el.addEventListener("wheel", wheel, { passive: false });
    return () => el.removeEventListener("wheel", wheel);
  }, [zoom]);

  // arrastres colgados: perder el foco o salir de la ventana suelta el gesto
  useEffect(() => {
    const clear = () => { ptrs.current.clear(); pinch.current = null; };
    window.addEventListener("blur", clear);
    return () => window.removeEventListener("blur", clear);
  }, []);

  const down = (e: React.PointerEvent) => {
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    ptrs.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (ptrs.current.size === 2) {
      const [a, b] = [...ptrs.current.values()];
      pinch.current = { d: Math.hypot(b.x - a.x, b.y - a.y), k: view.k };
    }
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
    } else if (ptrs.current.size === 1) {
      setView((v) => clampView({ ...v, x: v.x + cur.x - prev.x, y: v.y + cur.y - prev.y }));
    }
  };
  const up = (e: React.PointerEvent) => { ptrs.current.delete(e.pointerId); if (ptrs.current.size < 2) pinch.current = null; };

  const base = typeof window === "undefined" ? 1 : fitK();
  return (
    <div className={`${s.portalView} ${shown ? s.portalViewOn : ""}`} role="dialog" aria-modal="true" aria-labelledby="portal-title">
      <div
        ref={box}
        className={s.portalCanvas}
        onPointerDown={down}
        onPointerMove={move}
        onPointerUp={up}
        onPointerCancel={up}
        onDoubleClick={() => zoom(view.k > 1.5 ? 1 / view.k : 2)}
      >
        <img
          src={portal.src}
          alt={portal.caption}
          draggable={false}
          width={portal.w}
          height={portal.h}
          style={{ width: portal.w * base, height: portal.h * base, transform: `translate(-50%, -50%) translate(${view.x}px, ${view.y}px) scale(${view.k})` }}
        />
      </div>
      <header ref={head} className={s.portalHead}>
        <div>
          <h3 id="portal-title">{portal.title}</h3>
          <p>{portal.caption}</p>
        </div>
        <Ticket icon="atras" tone="lima" size="md" onClick={onClose}>Volver a la habitación</Ticket>
      </header>
      <div className={s.portalZoom} role="group" aria-label="Acercar o alejar el collage">
        <Ticket size="sm" icon="menos" tone="papel" aria-label="Alejar" onClick={() => zoom(1 / 1.3)} disabled={view.k <= 1.01} />
        <span>{Math.round(view.k * 100)} %</span>
        <Ticket size="sm" icon="mas" tone="papel" aria-label="Acercar" onClick={() => zoom(1.3)} disabled={view.k >= 5.99} />
      </div>
      <p className={s.portalHint}>Arrastra para recorrer el collage · rueda, pellizco o doble clic para acercar · Esc para volver</p>
    </div>
  );
}
