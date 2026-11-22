import type { Metadata } from "next";
import { Room04 } from "@/features/room-04/Room04";

export const metadata: Metadata = {
  title: "Sala 04 · Vida y obra",
  description: "Una vida no cabe en una sola imagen. La oficina de Abraxas reconstruida con 640 fotografías, sus libros, su trayectoria y un mural colectivo.",
};

export default function Page() {
  return <Room04 />;
}
