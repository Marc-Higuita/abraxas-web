"use client";
import { useCallback, useEffect, useId, useRef, useState, type ReactNode } from "react";
import Link from "next/link";
import { Icon, type IconName } from "@/components/abx/Icon";
import { Ticket } from "@/components/abx/Ticket";
import { CreditosBody, PrivacidadBody, TerminosBody } from "@/app/legal/content";
import { RIGHTS } from "./rights";
import s from "./footer.module.css";
import legal from "@/app/legal/legal.module.css";

type DocId = "derechos" | "terminos" | "privacidad" | "creditos";

const DOCS: Record<DocId, { title: string; icon: IconName; href: string; label: string }> = {
  derechos: { title: "Derechos de autor por material", icon: "cinta", href: "/creditos", label: "Derechos de autor" },
  terminos: { title: "Términos y condiciones de uso", icon: "balanza", href: "/legal/terminos", label: "Términos y condiciones" },
  privacidad: { title: "Política de privacidad", icon: "ojo", href: "/legal/privacidad", label: "Privacidad" },
  creditos: { title: "Créditos y derechos de autor", icon: "libro", href: "/creditos", label: "Créditos" },
};

function RightsTable() {
  return (
    <>
      <p>No todos los materiales tienen el mismo titular. Las obras, fotografías y documentos de Abraxas pertenecen a sus titulares; se usan con fines académicos y sin ánimo de lucro. Si eres titular de algún material y quieres que lo revisemos, escríbenos a través del curso Creación de Espacios Interactivos de la Universidad de Antioquia.</p>
      <div className={s.tableWrap} tabIndex={0} role="region" aria-label="Tabla de derechos por material">
        <table className={s.table}>
          <thead><tr><th scope="col">Material</th><th scope="col">Dónde aparece</th><th scope="col">Titular</th><th scope="col">Uso en el sitio</th></tr></thead>
          <tbody>
            {RIGHTS.map((r) => (
              <tr key={r.material}>
                <th scope="row">{r.material}</th>
                <td>{r.donde}</td>
                <td>{r.titular}</td>
                <td>{r.uso}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

const BODY: Record<DocId, () => ReactNode> = {
  derechos: () => <RightsTable />,
  terminos: () => <TerminosBody />,
  privacidad: () => <PrivacidadBody />,
  creditos: () => <CreditosBody />,
};

/** Ventana legal: botón cerrar, Esc, clic fuera, scroll interno, foco atrapado y scroll de la página intacto. */
function Dialog({ doc, onClose }: { doc: DocId; onClose: () => void }) {
  const box = useRef<HTMLDivElement>(null);
  const titleId = useId();
  const d = DOCS[doc];

  useEffect(() => {
    // bloquear el scroll de la página sin moverla: se guarda la posición y se devuelve exacta al cerrar
    const html = document.documentElement;
    const y = window.scrollY;
    const prevOverflow = html.style.overflow;
    const prevPad = html.style.paddingRight;
    const gutter = window.innerWidth - html.clientWidth;
    html.style.overflow = "hidden";
    if (gutter > 0) html.style.paddingRight = `${gutter}px`;
    box.current?.querySelector<HTMLElement>("[data-close]")?.focus();
    return () => {
      html.style.overflow = prevOverflow;
      html.style.paddingRight = prevPad;
      if (Math.abs(window.scrollY - y) > 1) window.scrollTo({ top: y, behavior: "instant" as ScrollBehavior });
    };
  }, []);

  const onKey = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") { e.preventDefault(); e.stopPropagation(); onClose(); return; }
    if (e.key !== "Tab" || !box.current) return;
    const f = [...box.current.querySelectorAll<HTMLElement>('a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])')];
    if (!f.length) return;
    const first = f[0], last = f[f.length - 1];
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  };

  return (
    <div className={s.backdrop} onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }} onKeyDown={onKey}>
      <div ref={box} className={s.dialog} role="dialog" aria-modal="true" aria-labelledby={titleId}>
        <header className={s.dialogHead}>
          <h2 id={titleId}><Icon name={d.icon} size={22} /> {d.title}</h2>
          <Ticket size="sm" icon="cerrar" tone="negro" onClick={onClose} aria-label="Cerrar ventana" data-close>Cerrar</Ticket>
        </header>
        <div className={s.dialogBody} tabIndex={0}>
          <div className={legal.body}>{BODY[doc]()}</div>
        </div>
        <footer className={s.dialogFoot}>
          <Link href={d.href} target="_blank" rel="noreferrer">Abrir como página</Link>
        </footer>
      </div>
    </div>
  );
}

/** Enlaces legales discretos del pie: cada uno abre su ventana. */
export function LegalLinks() {
  const [doc, setDoc] = useState<DocId | null>(null);
  const opener = useRef<HTMLButtonElement | null>(null);
  const close = useCallback(() => {
    setDoc(null);
    window.setTimeout(() => opener.current?.focus({ preventScroll: true }), 0);
  }, []);
  return (
    <>
      <nav className={s.legal} aria-label="Información legal">
        {(Object.keys(DOCS) as DocId[]).map((id) => (
          <button key={id} type="button" onClick={(e) => { opener.current = e.currentTarget; setDoc(id); }} aria-haspopup="dialog">
            <Icon name={DOCS[id].icon} size={16} /> {DOCS[id].label}
          </button>
        ))}
      </nav>
      {doc && <Dialog doc={doc} onClose={close} />}
    </>
  );
}
