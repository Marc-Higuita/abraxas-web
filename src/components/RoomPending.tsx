import Link from "next/link";
import type { RoomConfig } from "@/config/rooms";

/** Estado de una sala que todavía no tiene contenido. No inventa información de la sala. */
export function RoomPending({ room }: { room: RoomConfig }) {
  return (
    <main style={{ minHeight: "100svh", display: "grid", placeItems: "center", padding: "48px max(16px, 5vw)" }}>
      <div style={{ maxWidth: 640 }}>
        <span className="tag tag-papel">Sala {room.id}</span>
        <h1 className="t-title" style={{ margin: "24px 0 12px" }}>{room.title}</h1>
        <p style={{ color: "var(--espejo)" }}>
          Esta sala está en construcción. Su módulo vive en <code>src/features/room-{room.id}</code> y se activa
          cambiando su estado en <code>src/config/rooms.ts</code>.
        </p>
        <p className="t-meta">Equipo: {room.team.join(" y ")}</p>
        <Link className="btn" href="/" style={{ marginTop: 24 }}>Volver al índice</Link>
      </div>
    </main>
  );
}
