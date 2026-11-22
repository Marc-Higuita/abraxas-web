"use client";
import { PhotoRoomSection } from "./scenes/PhotoRoom/PhotoRoomSection";
import { DocumentarySection } from "./scenes/DocumentaryVideo/DocumentarySection";
import { BooksSection } from "./scenes/Books/BooksSection";
import { TimelineSection } from "./scenes/Timeline/TimelineSection";
import { CollectiveSection } from "./scenes/CollectiveCollage/CollectiveSection";
import { MusicSection } from "./scenes/Particles/MusicSection";
import { Hud, Overlays } from "./components/Hud";
import { Interlude } from "./components/Interlude";
import { useDeviceCapabilities } from "./hooks/useDevice";

/**
 * Sala 04 · Vida y obra. Módulo independiente: puede montarse en /salas/04 o dentro de una experiencia central.
 * Recorrido: habitación → video → libros → transformaciones → collage colectivo → coda musical.
 */
export function Room04() {
  useDeviceCapabilities();
  return (
    <>
      <Hud />
      <main>
        <PhotoRoomSection />
        <DocumentarySection />
        <Interlude tone="negro" text="La imagen en movimiento se vuelve superficie editorial. Detrás, sus libros." />
        <BooksSection />
        <Interlude tone="papel" text="Los recortes que salieron de los libros se ordenan como documentos de una vida." />
        <TimelineSection />
        <Interlude tone="negro" text="Los documentos se vuelven materiales. Dejas de mirar el collage para construir uno." />
        <CollectiveSection />
        <MusicSection />
        <footer style={{ padding: "48px max(16px, 5vw)", display: "flex", justifyContent: "space-between", gap: 16, flexWrap: "wrap", fontSize: 14, color: "var(--espejo)" }}>
          <span>Museo Abraxas · Sala 04 · Vida y obra · Contenidos provisionales identificados en cada sección.</span>
          <img src="/assets/brand/isotipo-papel.png" alt="" width={32} height={40} />
        </footer>
      </main>
      <Overlays />
    </>
  );
}
