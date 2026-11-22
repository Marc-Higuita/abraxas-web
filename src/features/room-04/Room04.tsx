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
import { QuoteCollage } from "./components/QuoteCollage";
import { TransInterlude } from "./components/TransInterlude";
import { Footer } from "./components/Footer";
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
        <QuoteCollage />
        <TimelineSection />
        <TransInterlude />
        <CollectiveSection />
        <MessageRoomSection />
        <Footer />
      </main>
      <Overlays />
      <RevealObserver />
      <CursorFX />
    </>
  );
}
