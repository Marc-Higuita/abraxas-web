"use client";
import { useCallback, useEffect, useRef, useState, type RefObject } from "react";
import { useRoom } from "../../store";

/** Tipos mínimos del Spotify iFrame API (https://developer.spotify.com/documentation/embeds/references/iframe-api). */
interface SpotifyController {
  togglePlay: () => void;
  pause: () => void;
  destroy: () => void;
  addListener: (ev: "ready" | "playback_update", cb: (e: { data: { isPaused: boolean; position: number; duration: number } }) => void) => void;
}
interface SpotifyIFrameAPI {
  createController: (el: HTMLElement, opts: { uri: string; width?: string | number; height?: number; theme?: "dark" | "light" }, cb: (c: SpotifyController) => void) => void;
}
declare global {
  interface Window { onSpotifyIframeApiReady?: (api: SpotifyIFrameAPI) => void; __abxSpotifyApi?: SpotifyIFrameAPI }
}

const SRC = "https://open.spotify.com/embed/iframe-api/v1";
let apiPromise: Promise<SpotifyIFrameAPI> | null = null;

function loadApi(): Promise<SpotifyIFrameAPI> {
  if (window.__abxSpotifyApi) return Promise.resolve(window.__abxSpotifyApi);
  if (apiPromise) return apiPromise;
  apiPromise = new Promise((resolve, reject) => {
    const timer = window.setTimeout(() => { apiPromise = null; reject(new Error("timeout")); }, 12000);
    window.onSpotifyIframeApiReady = (api) => { window.clearTimeout(timer); window.__abxSpotifyApi = api; resolve(api); };
    const s = document.createElement("script");
    s.src = SRC;
    s.async = true;
    s.onerror = () => { window.clearTimeout(timer); apiPromise = null; reject(new Error("load")); };
    document.body.appendChild(s);
  });
  return apiPromise;
}

export type SpotifyStatus = "idle" | "loading" | "ready" | "error";

/**
 * Controlador real del reproductor oficial de Spotify. Nunca reproduce solo:
 * solo carga el embed cuando `enabled` es true y suena cuando la persona pulsa.
 */
export function useSpotify(host: RefObject<HTMLDivElement | null>, uri: string, enabled: boolean) {
  const ctrl = useRef<SpotifyController | null>(null);
  const [status, setStatus] = useState<SpotifyStatus>("idle");
  const [playing, setPlaying] = useState(false);
  const setMusic = useRoom((s) => s.setMusicMode);

  useEffect(() => {
    if (!enabled || ctrl.current || !host.current) return;
    let alive = true;
    setStatus("loading");
    const mount = document.createElement("div");
    host.current.appendChild(mount);
    loadApi()
      .then((api) => {
        if (!alive) return;
        api.createController(mount, { uri, width: "100%", height: 152, theme: "dark" }, (c) => {
          if (!alive) { c.destroy(); return; }
          ctrl.current = c;
          c.addListener("ready", () => setStatus("ready"));
          c.addListener("playback_update", (e) => {
            const p = !e.data.isPaused;
            setPlaying(p);
            setMusic(p);
          });
        });
      })
      .catch(() => alive && setStatus("error"));
    return () => { alive = false; };
  }, [enabled, host, uri, setMusic]);

  useEffect(() => () => { ctrl.current?.destroy(); ctrl.current = null; setMusic(false); }, [setMusic]);

  const toggle = useCallback(() => { ctrl.current?.togglePlay(); }, []);
  const pause = useCallback(() => { ctrl.current?.pause(); }, []);
  return { status, playing, toggle, pause, ready: status === "ready" };
}
