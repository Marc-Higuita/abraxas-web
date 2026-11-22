"use client";
/**
 * Contrato compartido entre el tablero (06) y la habitación de mensajes (07).
 * Las piezas se publican al instante. Si Supabase no está configurado (API 503),
 * la pieza se guarda en este navegador y se marca como local.
 */
export interface PublishedPiece {
  id: string;
  message: string;
  signature?: string | null;
  image: string | null; // URL firmada o dataURL (local)
  createdAt: string;
  local?: boolean;
}

export const PIECE_EVENT = "abx:piece-published";
const LS_KEY = "abx-pieces-v1";

export function readLocalPieces(): PublishedPiece[] {
  try { return JSON.parse(localStorage.getItem(LS_KEY) || "[]"); } catch { return []; }
}

export function saveLocalPiece(p: PublishedPiece) {
  try { localStorage.setItem(LS_KEY, JSON.stringify([...readLocalPieces(), p].slice(-12))); } catch { /* almacenamiento lleno o bloqueado */ }
}

/** Piezas publicadas: las de la base de datos más las locales de este navegador. */
export async function fetchPieces(): Promise<{ items: PublishedPiece[]; connected: boolean }> {
  const local = readLocalPieces();
  try {
    const r = await fetch("/api/collages", { cache: "no-store" });
    if (!r.ok) return { items: local, connected: false };
    const j = await r.json();
    return { items: [...(j.items as PublishedPiece[]), ...local], connected: true };
  } catch {
    return { items: local, connected: false };
  }
}

export function announcePiece(p: PublishedPiece) {
  window.dispatchEvent(new CustomEvent<PublishedPiece>(PIECE_EVENT, { detail: p }));
}
