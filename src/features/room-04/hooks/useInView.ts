"use client";
import { useEffect, useState, type RefObject } from "react";

/** Monta escenas WebGL solo cerca de la pantalla y las suspende fuera de ella. */
export function useInView(ref: RefObject<HTMLElement | null>, margin = "200px") {
  const [inView, setInView] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => setInView(e.isIntersecting), { rootMargin: margin });
    io.observe(el);
    return () => io.disconnect();
  }, [ref, margin]);
  return inView;
}
