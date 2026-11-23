import type { Metadata } from "next";
import { LegalShell } from "../LegalShell";
import { LEGAL_UPDATED, PrivacidadBody } from "../content";

export const metadata: Metadata = { title: "Política de privacidad", robots: { index: false } };

export default function Privacidad() {
  return (
    <LegalShell kicker="Legal" title="Política de privacidad" updated={LEGAL_UPDATED}>
      <PrivacidadBody />
    </LegalShell>
  );
}
