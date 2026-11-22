"use client";
import { useRef, type CSSProperties, type ReactNode } from "react";
import { useScrollProgress } from "../hooks/useScrollProgress";
import { useRoom } from "../store";
import s from "./overlay.module.css";

/**
 * Escena que entra SUPERPUESTA a la anterior (corrección 11).
 * - La sección sube por encima del final de la sección previa (margin-top negativo + z-index).
 * - Mientras entra, se recorta desde los lados y escala de 0.94 a 1, con sombra de papel.
 * - `--enter` (0–1) queda disponible para que el contenido anime su propia llegada.
 * No bloquea el scroll: siempre se puede seguir o volver.
 */
export function OverlayScene({
  id,
  labelledBy,
  className,
  tone = "#121110",
  overlap = "35vh",
  children,
}: {
  id: string;
  labelledBy?: string;
  className?: string;
  tone?: string;
  overlap?: string;
  children: ReactNode;
}) {
  const ref = useRef<HTMLElement>(null);
  const reduced = useRoom((st) => st.reducedMotion);
  useScrollProgress(
    ref,
    (p) => {
      const el = ref.current;
      if (!el) return;
      const e = reduced ? 1 : Math.min(1, Math.max(0, p));
      el.style.setProperty("--enter", e.toFixed(3));
    },
    { start: "top bottom", end: "top top" },
  );
  return (
    <section
      ref={ref}
      id={id}
      aria-labelledby={labelledBy}
      className={`${s.scene} ${className ?? ""}`}
      style={{ ["--tone" as string]: tone, ["--overlap" as string]: overlap } as CSSProperties}
    >
      <div className={s.edge} aria-hidden />
      {children}
    </section>
  );
}
