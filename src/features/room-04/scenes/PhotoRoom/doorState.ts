"use client";
/**
 * Estado de la puerta de vidrio (corrección 01): acceso obligatorio al video.
 * Mientras esté cerrada, el scroll no pasa del punto de la puerta. Una vez abierta en esta visita,
 * queda abierta (no se vuelve a bloquear a quien ya entró).
 * Otras partes pueden consultarla con isDoorOpen() o escuchar window "abx:door" ({ open: boolean }).
 */
export const DOOR_EVENT = "abx:door";
/** progreso de la sección de la habitación donde la cámara queda frente a la puerta */
export const DOOR_GATE_P = 0.82;

let open = false;
export const isDoorOpen = () => open;
export function setDoorOpen(v: boolean) {
  if (open === v) return;
  open = v;
  if (typeof window !== "undefined") window.dispatchEvent(new CustomEvent(DOOR_EVENT, { detail: { open: v } }));
}
