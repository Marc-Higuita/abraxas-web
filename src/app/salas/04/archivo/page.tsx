import type { Metadata } from "next";
import { ArchiveBrowser } from "@/features/room-04/components/ArchiveBrowser";

export const metadata: Metadata = { title: "Sala 04 · Archivo fotográfico" };

export default function Page() {
  return <ArchiveBrowser />;
}
