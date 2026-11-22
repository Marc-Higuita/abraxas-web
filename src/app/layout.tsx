import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import "./globals.css";

// Jost (OFL), sustituto libre de Futura según el manual de identidad. Alojada en el proyecto.
const jost = localFont({ src: "./fonts/jost-latin-wght.woff2", weight: "100 900", variable: "--font-jost", display: "swap" });

export const metadata: Metadata = {
  title: { default: "Museo Abraxas", template: "%s · Museo Abraxas" },
  description:
    "Museo digital experimental de la Casa Museo del Collage de Abraxas Aguilar Betancur, Medellín. Recortar, reflejar, ordenar.",
  icons: { icon: "/assets/brand/isotipo-negro.png" },
};

export const viewport: Viewport = { width: "device-width", initialScale: 1, themeColor: "#121110" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" className={jost.variable}>
      <body>{children}</body>
    </html>
  );
}
