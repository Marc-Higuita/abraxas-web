"use client";
import { useEffect } from "react";
import { useRoom } from "../store";

/** Detecta movimiento reducido, WebGL y dispositivos de bajo rendimiento. */
export function useDeviceCapabilities() {
  const setReduced = useRoom((s) => s.setReducedMotion);
  const setLow = useRoom((s) => s.setLowPower);
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    let stored: string | null = null;
    try { stored = localStorage.getItem("abx-reduced-motion"); } catch { /* sin almacenamiento */ }
    setReduced(stored ? stored === "1" : mq.matches);
    const onChange = () => setReduced(mq.matches);
    mq.addEventListener("change", onChange);

    let webgl = false;
    try {
      const c = document.createElement("canvas");
      webgl = !!(c.getContext("webgl2") || c.getContext("webgl"));
    } catch { webgl = false; }
    const nav = navigator as Navigator & { deviceMemory?: number };
    const small = window.innerWidth < 700;
    const weak = (nav.hardwareConcurrency ?? 8) <= 4 || (nav.deviceMemory ?? 8) <= 4;
    setLow(!webgl || (small && weak));
    return () => mq.removeEventListener("change", onChange);
  }, [setReduced, setLow]);
}

export function hasWebGL() {
  if (typeof document === "undefined") return true;
  try {
    const c = document.createElement("canvas");
    return !!(c.getContext("webgl2") || c.getContext("webgl"));
  } catch {
    return false;
  }
}
