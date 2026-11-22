"use client";
import { useSyncExternalStore } from "react";
import { sound } from "./sound";

const SERVER = { musicOn: true, sfxOn: true, unlocked: false };

/** estado reactivo del gestor de audio (música / efectos) */
export function useSoundState() {
  return useSyncExternalStore(
    (fn) => sound.subscribe(fn),
    () => sound.state,
    () => SERVER,
  );
}

export { sound };
export type { SfxName } from "./sound";
