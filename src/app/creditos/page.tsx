import type { Metadata } from "next";
import { LegalShell } from "../legal/LegalShell";
import { CreditosBody, LEGAL_UPDATED } from "../legal/content";

export const metadata: Metadata = { title: "Créditos y derechos (borrador)", robots: { index: false } };

export default function Creditos() {
  return (
    <LegalShell kicker="Créditos" title="Créditos y derechos de autor" updated={LEGAL_UPDATED}>
      <CreditosBody />
    </LegalShell>
  );
}
