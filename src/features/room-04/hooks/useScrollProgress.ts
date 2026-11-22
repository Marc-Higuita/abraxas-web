"use client";
import { useEffect, useRef, type RefObject } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

if (typeof window !== "undefined") gsap.registerPlugin(ScrollTrigger);

/**
 * Un único progreso 0–1 por sección (GSAP ScrollTrigger). Se guarda en un ref para que
 * Three.js lo lea en cada frame sin re-renderizar React. onUpdate permite efectos DOM directos.
 */
export function useScrollProgress(
  target: RefObject<HTMLElement | null>,
  onUpdate?: (p: number) => void,
  opts: { start?: string; end?: string } = {},
) {
  const progress = useRef(0);
  const cb = useRef(onUpdate);
  cb.current = onUpdate;
  useEffect(() => {
    const el = target.current;
    if (!el) return;
    const st = ScrollTrigger.create({
      trigger: el,
      start: opts.start ?? "top top",
      end: opts.end ?? "bottom bottom",
      onUpdate: (self) => {
        progress.current = self.progress;
        cb.current?.(self.progress);
      },
    });
    progress.current = st.progress;
    cb.current?.(st.progress);
    return () => st.kill();
  }, [target, opts.start, opts.end]);
  return progress;
}

export function refreshScroll() {
  if (typeof window !== "undefined") ScrollTrigger.refresh();
}
