import Link from "next/link";
import type { ReactNode } from "react";
import { Sticker } from "@/components/abx/Ticket";
import { StitchLine } from "@/components/abx/Ornaments";
import s from "./legal.module.css";

/** Marco común de las páginas legales: papel y costura. */
export function LegalShell({ kicker, title, updated, children }: { kicker: string; title: string; updated: string; children: ReactNode }) {
  return (
    <main className={s.page}>
      <nav className={s.nav}><Link href="/salas/04">← Volver a la Sala 04</Link></nav>
      <article className={s.paper}>
        <Sticker tone="amarillo" rotate={-3}>{kicker}</Sticker>
        <h1 className={s.title}>{title}</h1>
        <p className={s.updated}>Última actualización: {updated}</p>
        <StitchLine className={s.stitch} color="var(--bermellon, #d9341f)" width={640} />
        <div className={s.body}>{children}</div>
      </article>
    </main>
  );
}

