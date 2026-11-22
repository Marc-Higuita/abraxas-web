import type { Metadata } from "next";
import { LegalShell } from "../LegalShell";
import { LEGAL_UPDATED, TerminosBody } from "../content";

export const metadata: Metadata = { title: "Términos y condiciones (borrador)", robots: { index: false } };

export default function Terminos() {
  return (
    <LegalShell kicker="Legal" title="Términos y condiciones de uso" updated={LEGAL_UPDATED}>
      <TerminosBody />
    </LegalShell>
  );
}
