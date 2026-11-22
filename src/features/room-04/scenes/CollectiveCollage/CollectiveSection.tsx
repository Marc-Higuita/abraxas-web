"use client";
import dynamic from "next/dynamic";
import { useCallback, useEffect, useRef, useState } from "react";
import type { EditorHandle } from "./CollageEditor";
import { COLLAGE_SCHEMA_VERSION } from "@/lib/collage-schema";
import { useRoom } from "../../store";
import s from "./collage.module.css";

const CollageEditor = dynamic(() => import("./CollageEditor").then((m) => m.CollageEditor), { ssr: false, loading: () => <p>Cargando el editor…</p> });

interface Piece { id: string; message: string; signature: string | null; createdAt: string; image: string | null }
type MuralState = "loading" | "ready" | "not-configured" | "error";

/** Posición determinista: la misma pieza siempre ocupa el mismo lugar del mural. */
const hash = (id: string) => [...id].reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 7);

export function CollectiveSection() {
  const [pieces, setPieces] = useState<Piece[]>([]);
  const [state, setState] = useState<MuralState>("loading");
  const [page, setPage] = useState(0);
  const [total, setTotal] = useState(0);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [creating, setCreating] = useState(false);
  const openFicha = useRoom((st) => st.openFicha);
  const drag = useRef<{ x: number; y: number; px: number; py: number } | null>(null);

  const load = useCallback(async (p: number) => {
    try {
      const r = await fetch(`/api/collages?page=${p}`);
      if (r.status === 503) { setState("not-configured"); return; }
      if (!r.ok) throw new Error();
      const j = await r.json();
      setPieces((cur) => (p === 0 ? j.items : [...cur, ...j.items]));
      setTotal(j.total);
      setState("ready");
    } catch {
      setState("error");
    }
  }, []);
  useEffect(() => { load(0); }, [load]);

  return (
    <section id="collage" className={s.section} aria-labelledby="act5-title">
      <header className={s.head}>
        <span className="t-label">05 · El collage colectivo</span>
        <h2 id="act5-title" className="t-title">Ahora el collage lo haces tú.</h2>
        <p>Los documentos de su vida se vuelven materiales. Arma una pieza pequeña, deja un mensaje y súmala al mural. Cada aporte se revisa antes de publicarse.</p>
        <button className="btn btn-oro" onClick={() => setCreating(true)}>Aporta tu recorte</button>
      </header>

      <div className={s.muralTools}>
        <button className="icon-btn" aria-label="Acercar" onClick={() => setZoom((z) => Math.min(2.5, z + 0.25))}><svg viewBox="0 0 24 24"><path d="M12 5v14M5 12h14" /></svg></button>
        <button className="icon-btn" aria-label="Alejar" onClick={() => setZoom((z) => Math.max(0.5, z - 0.25))}><svg viewBox="0 0 24 24"><path d="M5 12h14" /></svg></button>
        <button className="btn btn-sm" onClick={() => { setZoom(1); setPan({ x: 0, y: 0 }); }}>Vista general</button>
        <span className="t-meta">{state === "ready" ? `${total} piezas aprobadas` : ""}</span>
      </div>
      <div
        className={s.mural}
        onPointerDown={(e) => { drag.current = { x: e.clientX, y: e.clientY, px: pan.x, py: pan.y }; }}
        onPointerMove={(e) => { if (drag.current) setPan({ x: drag.current.px + e.clientX - drag.current.x, y: drag.current.py + e.clientY - drag.current.y }); }}
        onPointerUp={() => { drag.current = null; }}
        onPointerLeave={() => { drag.current = null; }}
      >
        <div className={s.board} style={{ transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})` }}>
          {state === "ready" && pieces.length === 0 && <p className={s.boardNote}>El mural está vacío. La primera pieza puede ser la tuya.</p>}
          {state === "not-configured" && <p className={s.boardNote}>El mural todavía no está conectado a la base de datos. Ver README: configuración de Supabase.</p>}
          {state === "error" && <p className={s.boardNote}>No se pudo cargar el mural. Revisa tu conexión e inténtalo de nuevo.</p>}
          {pieces.map((p) => {
            const h = hash(p.id);
            return (
              <button
                key={p.id}
                className={s.piece}
                style={{ ["--r" as string]: `${(h % 9) - 4}deg`, ["--dx" as string]: `${(h % 21) - 10}px`, ["--dy" as string]: `${((h >> 3) % 21) - 10}px` }}
                onClick={() => openFicha({ title: p.signature ? `De ${p.signature}` : "Aporte anónimo", image: p.image ?? undefined, body: p.message, meta: [new Date(p.createdAt).toLocaleDateString("es-CO")] })}
              >
                {p.image && <img src={p.image} alt={`Collage: ${p.message}`} loading="lazy" />}
              </button>
            );
          })}
        </div>
      </div>
      {pieces.length < total && <button className="btn btn-sm" onClick={() => { const n = page + 1; setPage(n); load(n); }}>Cargar más piezas</button>}

      {creating && <Creator onClose={() => setCreating(false)} onSent={() => load(0)} />}
    </section>
  );
}

function Creator({ onClose, onSent }: { onClose: () => void; onSent: () => void }) {
  const editor = useRef<EditorHandle | null>(null);
  const [count, setCount] = useState(0);
  const [msg, setMsg] = useState("");
  const [sig, setSig] = useState("");
  const [rules, setRules] = useState(false);
  const [consent, setConsent] = useState(false);
  const [hp, setHp] = useState("");
  const [status, setStatus] = useState<{ kind: "idle" | "sending" | "ok" | "error"; text?: string }>({ kind: "idle" });
  const dialog = useRef<HTMLDivElement>(null);
  const onChange = useCallback((h: EditorHandle) => { editor.current = h; setCount(h.elements.length); }, []);

  useEffect(() => {
    dialog.current?.focus();
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const h = editor.current;
    if (!h || !h.elements.length) { setStatus({ kind: "error", text: "Agrega al menos un recorte." }); return; }
    const image = h.exportImage();
    if (!image) return;
    setStatus({ kind: "sending" });
    try {
      const r = await fetch("/api/collages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ composition: { version: COLLAGE_SCHEMA_VERSION, size: 600, elements: h.elements }, image, message: msg, signature: sig, acceptRules: rules, consent, website: hp }),
      });
      const j = await r.json().catch(() => ({}));
      if (r.status === 201) { setStatus({ kind: "ok" }); onSent(); return; }
      const text = r.status === 503 ? "El mural todavía no está conectado a la base de datos; tu pieza no se guardó." :
        r.status === 429 ? "Enviaste varias piezas seguidas. Espera unos minutos." :
        j.message ?? (j.issues?.join(" · ") || "No se pudo guardar. Inténtalo de nuevo.");
      setStatus({ kind: "error", text });
    } catch {
      setStatus({ kind: "error", text: "Sin conexión. Tu pieza no se guardó." });
    }
  };

  return (
    <div className={s.modal} role="dialog" aria-modal="true" aria-labelledby="creator-title">
      <div ref={dialog} tabIndex={-1} className={s.modalInner}>
        <div className={s.modalHead}>
          <h3 id="creator-title" className="t-title">Tu recorte para el mural</h3>
          <button className="icon-btn" onClick={onClose} aria-label="Cerrar"><svg viewBox="0 0 24 24"><path d="M5 5l14 14M19 5L5 19" /></svg></button>
        </div>
        {status.kind === "ok" ? (
          <div className={s.done}>
            <p className="t-quote">Tu pieza quedó guardada y está pendiente de revisión.</p>
            <p>Aparecerá en el mural cuando el equipo la apruebe. La memoria sigue construyéndose entre muchas manos.</p>
            <button className="btn btn-oro" onClick={onClose}>Volver al mural</button>
          </div>
        ) : (
          <>
            <CollageEditor onChange={onChange} />
            <form className={s.form} onSubmit={submit}>
              <label htmlFor="c-msg">Mensaje <span className="t-meta">({msg.length}/240)</span></label>
              <textarea id="c-msg" required minLength={2} maxLength={240} value={msg} onChange={(e) => setMsg(e.target.value)} rows={3} />
              <label htmlFor="c-sig">Nombre o seudónimo <span className="t-meta">(opcional)</span></label>
              <input id="c-sig" maxLength={40} value={sig} onChange={(e) => setSig(e.target.value)} />
              <div className={s.hp} aria-hidden="true"><label htmlFor="c-web">Sitio web</label><input id="c-web" tabIndex={-1} autoComplete="off" value={hp} onChange={(e) => setHp(e.target.value)} /></div>
              <label className={s.check}><input type="checkbox" checked={rules} onChange={(e) => setRules(e.target.checked)} required /> Acepto las normas: sin datos personales de otras personas, sin odio ni contenido sexual explícito.</label>
              <label className={s.check}><input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} required /> Autorizo publicar mi pieza en el mural del Museo Abraxas.</label>
              {status.kind === "error" && <p className={s.error} role="alert">{status.text}</p>}
              <button className="btn btn-oro" type="submit" disabled={status.kind === "sending" || !count}>{status.kind === "sending" ? "Guardando…" : "Enviar al mural"}</button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
