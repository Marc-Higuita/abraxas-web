"use client";
import { PhotoRoomSection } from "./scenes/PhotoRoom/PhotoRoomSection";
import { DocumentarySection } from "./scenes/DocumentaryVideo/DocumentarySection";
import { BooksSection } from "./scenes/Books/BooksSection";
import { TimelineSection } from "./scenes/Timeline/TimelineSection";
import { CollectiveSection } from "./scenes/CollectiveCollage/CollectiveSection";
import { AbraxasSection } from "./scenes/AbraxasPortrait/AbraxasSection";
import { MessageRoomSection } from "./scenes/MessageRoom/MessageRoomSection";
import { Hud, Overlays, RevealObserver } from "./components/Hud";
import { CursorFX } from "@/components/abx/CursorFX";
import { Interlude } from "./components/Interlude";
import { useDeviceCapabilities } from "./hooks/useDevice";

/**
 * Sala 04 · Vida y obra. Módulo independiente: puede montarse en /salas/04 o dentro de una experiencia central.
 * Recorrido: habitación → video → libros → retrato → transformaciones → tu figura → habitación de mensajes (con música).
 */
export function Room04() {
  useDeviceCapabilities();
  return (
    <>
      <Hud />
      <main>
        <PhotoRoomSection />
        <DocumentarySection />
        <Interlude tone="negro" quote="Aquí las fotos no se toman, se hacen." source="a Centrópolis, 2020" />
        <BooksSection />
        <AbraxasSection />
        <Interlude tone="papel" quote="Yo amo lo que hago porque es como el mundo: todo está adherido…" source="a Centrópolis, 2020" />
        <TimelineSection />
        <Interlude tone="kraft" quote="Todo es trans: ¿tu cuerpo qué te dice?" source="frase citada en el video del equipo (2:36)" />
        <CollectiveSection />
        <MessageRoomSection />
        <footer style={{ padding: "48px max(16px, 5vw)", display: "flex", justifyContent: "space-between", gap: 16, flexWrap: "wrap", fontSize: 14, color: "var(--espejo)" }}>
          <span>Museo Abraxas · Sala 04 · Vida y obra · Universidad de Antioquia</span>
          <img src="/assets/brand/isotipo-papel.png" alt="" width={32} height={40} />
        </footer>
      </main>
      <Overlays />
      <RevealObserver />
      <CursorFX />
    </>
  );
}
