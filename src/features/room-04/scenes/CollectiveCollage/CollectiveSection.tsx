"use client";
import dynamic from "next/dynamic";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { COLLAGE_SCHEMA_VERSION, containsPersonalData } from "@/lib/collage-schema";
import { Ticket, Sticker } from "@/components/abx/Ticket";
import { StitchLine } from "@/components/abx/Ornaments";
import { useRoom } from "../../store";
import { useInView } from "../../hooks/useInView";
import { announcePiece, saveLocalPiece, type PublishedPiece } from "../../lib/pieces";
import { CUTOUTS, DRAWERS, SHEET_W, SHEET_H, elementFrom, nid, useBoard, type Drawer, type El } from "./board";
import type { BoardApi } from "./BoardCanvas";
import s from "./collage.module.css";

const BoardCanvas = dynamic(() => import("./BoardCanvas"), { ssr: false, loading: () => <div className={s.loading}>Abriendo la mesa de trabajo…</div> });

type Status = { kind: "idle" | "sending" | "ok" | "local" | "error"; text?: string };

const imgCache = new Map<string, Promise<HTMLImageElement>>();
const loadImg = (src: string) => {
  let p = imgCache.get(src);
  if (!p) {
    p = new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = src; });
    imgCache.set(src, p);
  }
  return p;
};

/** Exporta solo la figura (recortada a su contorno) como PNG con transparencia; baja a WebP/JPEG si pesa demasiado. */
async function exportFigure(els: El[]): Promise<string> {
  const imgs = await Promise.all(els.map((e) => loadImg(e.src)));
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const e of els) {
    const r = (e.rotation * Math.PI) / 180, hw = (e.w * e.scaleX) / 2, hh = (e.h * e.scaleY) / 2;
    for (const [cx, cy] of [[-hw, -hh], [hw, -hh], [hw, hh], [-hw, hh]]) {
      const x = e.x + cx * Math.cos(r) - cy * Math.sin(r), y = e.y + cx * Math.sin(r) + cy * Math.cos(r);
      minX = Math.min(minX, x); minY = Math.min(minY, y); maxX = Math.max(maxX, x); maxY = Math.max(maxY, y);
    }
  }
  const pad = 24, bw = maxX - minX + pad * 2, bh = maxY - minY + pad * 2;
  const k = Math.min(2, 900 / Math.max(bw, bh));
  const c = document.createElement("canvas");
  c.width = Math.round(bw * k); c.height = Math.round(bh * k);
  const g = c.getContext("2d")!;
  g.scale(k, k);
  g.translate(pad - minX, pad - minY);
  g.shadowColor = "rgba(20,12,4,.35)"; g.shadowBlur = 6; g.shadowOffsetX = 2; g.shadowOffsetY = 3;
  els.forEach((e, i) => {
    g.save();
    g.translate(e.x, e.y);
    g.rotate((e.rotation * Math.PI) / 180);
    g.scale(e.scaleX, e.scaleY);
    g.drawImage(imgs[i], -e.w / 2, -e.h / 2, e.w, e.h);
    g.restore();
  });
  const big = (u: string) => u.length * 0.75 > 940_000;
  let url = c.toDataURL("image/png");
  if (big(url)) url = c.toDataURL("image/webp", 0.86); // sin soporte WebP devuelve PNG
  if (big(url)) {
    const j = document.createElement("canvas");
    j.width = c.width; j.height = c.height;
    const jg = j.getContext("2d")!;
    jg.fillStyle = "#f6f1e6"; jg.fillRect(0, 0, j.width, j.height); jg.drawImage(c, 0, 0);
    url = j.toDataURL("image/jpeg", 0.8);
  }
  return url;
}

export function CollectiveSection() {
  const section = useRef<HTMLElement>(null);
  const stage = useRef<HTMLDivElement>(null);
  const inView = useInView(section, "400px");
  const reduced = useRoom((st) => st.reducedMotion);
  const lowPower = useRoom((st) => st.lowPower);
  const { els, canUndo, canRedo, act } = useBoard();
  const [selected, setSelected] = useState<string | null>(null);
  const [drawer, setDrawer] = useState<Drawer>("cabezas");
  const [narrow, setNarrow] = useState(false);
  const [message, setMessage] = useState("");
  const [signature, setSignature] = useState("");
  const [agree, setAgree] = useState(false);
  const [hp, setHp] = useState("");
  const [status, setStatus] = useState<Status>({ kind: "idle" });
  const arrived = useRef(new Set<string>()).current;
  const added = useRef(0);

  useEffect(() => {
    const mq = window.matchMedia("(max-width: 760px)");
    const on = () => setNarrow(mq.matches);
    on(); mq.addEventListener("change", on);
    return () => mq.removeEventListener("change", on);
  }, []);

  const sel = els.find((e) => e.id === selected) ?? null;
  const patch = useCallback((id: string, p: Partial<El>, history = false) => act({ type: "patch", id, patch: p, history }), [act]);
  const api: BoardApi = useMemo(() => ({ els, selected, select: setSelected, begin: () => act({ type: "begin" }), patch, arrived }), [els, selected, act, patch, arrived]);

  const add = (id: string) => {
    const c = CUTOUTS.find((x) => x.id === id);
    if (!c) return;
    const el = elementFrom(c, added.current++);
    act({ type: "add", el });
    setSelected(el.id);
  };
  const scaleBy = (f: number) => sel && patch(sel.id, { scaleX: Math.min(6, Math.max(0.08, sel.scaleX * f)), scaleY: Math.min(6, Math.max(0.08, sel.scaleY * f)) }, true);
  const rotateBy = (d: number) => sel && patch(sel.id, { rotation: ((sel.rotation + d) % 360 + 360) % 360 }, true);
  const moveBy = (dx: number, dy: number) => sel && patch(sel.id, { x: sel.x + dx, y: sel.y + dy }, true);

  /* Rueda: escala (Shift: gira). Dos dedos: escala y giro de la pieza seleccionada. */
  useEffect(() => {
    const el = stage.current;
    if (!el) return;
    const wheel = (e: WheelEvent) => {
      if (!sel) return;
      e.preventDefault();
      if (e.shiftKey) patch(sel.id, { rotation: sel.rotation + Math.sign(e.deltaY) * 4 });
      else { const f = Math.exp(-e.deltaY * 0.0015); patch(sel.id, { scaleX: Math.min(6, Math.max(0.08, sel.scaleX * f)), scaleY: Math.min(6, Math.max(0.08, sel.scaleY * f)) }); }
    };
    el.addEventListener("wheel", wheel, { passive: false });
    return () => el.removeEventListener("wheel", wheel);
  }, [sel, patch]);

  const touches = useRef(new Map<number, { x: number; y: number }>());
  const pinch = useRef<{ d: number; a: number; sx: number; sy: number; r: number } | null>(null);
  const geo = () => {
    const [p, q] = [...touches.current.values()];
    return { d: Math.hypot(q.x - p.x, q.y - p.y), a: Math.atan2(q.y - p.y, q.x - p.x) };
  };
  const onDown = (e: React.PointerEvent) => {
    touches.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (touches.current.size === 2 && sel) { const g = geo(); pinch.current = { ...g, sx: sel.scaleX, sy: sel.scaleY, r: sel.rotation }; act({ type: "begin" }); }
  };
  const onMove = (e: React.PointerEvent) => {
    if (!touches.current.has(e.pointerId)) return;
    touches.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pinch.current && sel && touches.current.size === 2) {
      const g = geo(), f = g.d / pinch.current.d;
      patch(sel.id, { scaleX: Math.min(6, Math.max(0.08, pinch.current.sx * f)), scaleY: Math.min(6, Math.max(0.08, pinch.current.sy * f)), rotation: pinch.current.r + ((g.a - pinch.current.a) * 180) / Math.PI });
    }
  };
  const onUp = (e: React.PointerEvent) => { touches.current.delete(e.pointerId); if (touches.current.size < 2) pinch.current = null; };

  const onKey = (e: React.KeyboardEvent) => {
    const mod = e.ctrlKey || e.metaKey;
    if (mod && e.key.toLowerCase() === "z") { e.preventDefault(); act({ type: e.shiftKey ? "redo" : "undo" }); return; }
    if (e.key === "n" || e.key === "N") { e.preventDefault(); if (els.length) { const i = els.findIndex((x) => x.id === selected); setSelected(els[(i + 1) % els.length].id); } return; }
    if (!sel) return;
    const step = e.shiftKey ? 32 : 8;
    const map: Record<string, () => void> = {
      ArrowLeft: () => moveBy(-step, 0), ArrowRight: () => moveBy(step, 0), ArrowUp: () => moveBy(0, -step), ArrowDown: () => moveBy(0, step),
      "+": () => scaleBy(1.1), "=": () => scaleBy(1.1), "-": () => scaleBy(1 / 1.1), "[": () => rotateBy(-10), "]": () => rotateBy(10),
      Delete: () => { act({ type: "remove", id: sel.id }); setSelected(null); }, Backspace: () => { act({ type: "remove", id: sel.id }); setSelected(null); },
      PageUp: () => act({ type: "order", id: sel.id, dir: 1 }), PageDown: () => act({ type: "order", id: sel.id, dir: -1 }), Escape: () => setSelected(null),
    };
    if (map[e.key]) { e.preventDefault(); map[e.key](); }
  };

  const publish = async (e: React.FormEvent) => {
    e.preventDefault();
    const msg = message.trim(), sig = signature.trim();
    if (!els.length) return setStatus({ kind: "error", text: "Primero arma tu figura con al menos un recorte." });
    if (msg.length < 2) return setStatus({ kind: "error", text: "Escribe un mensaje breve." });
    if (containsPersonalData(msg) || containsPersonalData(sig)) return setStatus({ kind: "error", text: "Quita correos, teléfonos o números de documento del mensaje." });
    if (!agree) return setStatus({ kind: "error", text: "Marca la casilla para autorizar la publicación." });
    setStatus({ kind: "sending" });
    try {
      const image = await exportFigure(els);
      const composition = {
        version: COLLAGE_SCHEMA_VERSION, size: SHEET_W, height: SHEET_H, kind: "figura" as const,
        elements: els.map(({ id, kind, x, y, rotation, scaleX, scaleY, src, w, h }) => ({ id, kind, x: Math.round(x), y: Math.round(y), rotation: Math.round(rotation * 10) / 10, scaleX, scaleY, src, w, h })),
      };
      const r = await fetch("/api/collages", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ composition, image, message: msg, signature: sig, acceptRules: true, consent: true, website: hp }) });
      let piece: PublishedPiece;
      if (r.status === 201) {
        const j = await r.json();
        piece = { ...j.piece, image: j.piece?.image ?? image };
        setStatus({ kind: "ok", text: "Tu figura ya está colgada en la habitación de los mensajes." });
      } else if (r.status === 503) {
        piece = { id: `local-${nid()}`, message: msg, signature: sig || null, image, createdAt: new Date().toISOString(), local: true };
        saveLocalPiece(piece);
        setStatus({ kind: "local", text: "Quedó publicada en este navegador; se verá para todos cuando la base de datos del museo esté conectada." });
      } else {
        const j = await r.json().catch(() => ({}));
        const text = r.status === 429 ? "Ya publicaste varias figuras seguidas. Espera unos minutos." : (j.message as string) || (j.issues?.[0] as string) || "No se pudo publicar. Intenta de nuevo.";
        return setStatus({ kind: "error", text });
      }
      announcePiece(piece);
      setTimeout(() => document.getElementById("mensajes")?.scrollIntoView({ behavior: reduced ? "auto" : "smooth" }), 1100);
    } catch {
      setStatus({ kind: "error", text: "No se pudo preparar la imagen de tu figura. Intenta de nuevo." });
    }
  };

  const restart = () => { act({ type: "reset" }); setMessage(""); setSignature(""); setAgree(false); setSelected(null); setStatus({ kind: "idle" }); };
  const open = DRAWERS.find((d) => d.id === drawer)!;
  const items = CUTOUTS.filter((c) => c.cat === drawer);
  const done = status.kind === "ok" || status.kind === "local";

  return (
    <section ref={section} id="collage" className={s.section} aria-labelledby="act6-title">
      <header className={s.head}>
        <div className={s.stickers}><Sticker tone="lima" rotate={-5}>06</Sticker><Sticker tone="papel" shape="flag" rotate={3}>Tu figura, tu mensaje</Sticker></div>
        <h2 id="act6-title" className={s.title}>Toma una cabeza, una espalda, unas piernas. <em>Arma otro cuerpo.</em></h2>
        <p className={s.lead}>
          Abraxas ponía su propia cabeza sobre cuerpos femeninos recortados de revistas: así se inventaba. Su pieza está en la mesa.
          Al lado tienes una hoja en blanco y los sobres con recortes. Arma tu figura, escríbele un mensaje y publícala: queda colgada en la habitación siguiente.
        </p>
        <StitchLine className={s.stitch} color="var(--oro)" width={360} />
      </header>

      <div className={s.workspace}>
        <div
          ref={stage}
          className={s.stage}
          tabIndex={0}
          role="application"
          aria-label="Mesa de trabajo 3D. Selecciona una pieza y muévela con las flechas; + y − cambian el tamaño, [ y ] la giran, Supr la quita, N pasa a la siguiente pieza."
          data-cursor="arrastra"
          onKeyDown={onKey}
          onPointerDown={onDown}
          onPointerMove={onMove}
          onPointerUp={onUp}
          onPointerCancel={onUp}
        >
          {inView && <BoardCanvas api={api} narrow={narrow} reduced={reduced} lowPower={lowPower} />}
          <span className={s.tagAbraxas} aria-hidden>{narrow ? "Abraxas" : "Pieza de Abraxas · su cabeza sobre un cuerpo de muñeca"}</span>
          <span className={s.tagSheet} aria-hidden>Tu hoja</span>
          {!els.length && <p className={s.empty}>Abre un sobre y toca un recorte: cae sobre tu hoja.</p>}

          <div className={s.history}>
            <Ticket size="sm" icon="atras" aria-label="Deshacer" disabled={!canUndo} onClick={() => act({ type: "undo" })} />
            <Ticket size="sm" icon="flecha" aria-label="Rehacer" disabled={!canRedo} onClick={() => act({ type: "redo" })} />
            <Ticket size="sm" icon="x" tone="papel" disabled={!els.length} onClick={() => { act({ type: "reset" }); setSelected(null); }}>Vaciar hoja</Ticket>
          </div>

          {sel && (
            <div className={s.tools} role="toolbar" aria-label="Herramientas de la pieza seleccionada">
              <Ticket size="sm" icon="menos" aria-label="Más pequeña" onClick={() => scaleBy(1 / 1.12)} />
              <Ticket size="sm" icon="mas" aria-label="Más grande" onClick={() => scaleBy(1.12)} />
              <Ticket size="sm" aria-label="Girar a la izquierda" onClick={() => rotateBy(-12)}>Girar −</Ticket>
              <Ticket size="sm" aria-label="Girar a la derecha" onClick={() => rotateBy(12)}>Girar +</Ticket>
              <Ticket size="sm" onClick={() => act({ type: "order", id: sel.id, dir: "front" })}>Al frente</Ticket>
              <Ticket size="sm" onClick={() => act({ type: "order", id: sel.id, dir: "back" })}>Atrás</Ticket>
              <Ticket size="sm" icon="tijeras" onClick={() => { const id = nid(); act({ type: "duplicate", id: sel.id, newId: id }); setSelected(id); }}>Duplicar</Ticket>
              <Ticket size="sm" icon="x" tone="bermellon" onClick={() => { act({ type: "remove", id: sel.id }); setSelected(null); }}>Quitar</Ticket>
            </div>
          )}
        </div>

        <aside className={s.side}>
          <div className={s.tray} aria-label="Sobres de recortes">
            <div className={s.envelopes} role="tablist">
              {DRAWERS.map((d) => {
                const peek = CUTOUTS.filter((c) => c.cat === d.id).slice(0, 3);
                return (
                  <button
                    key={d.id}
                    role="tab"
                    aria-selected={drawer === d.id}
                    aria-controls="collage-papers"
                    className={`${s.envelope} ${drawer === d.id ? s.envOpen : ""}`}
                    style={{ ["--tone" as string]: d.tone }}
                    onClick={() => setDrawer(d.id)}
                    data-cursor="abre"
                  >
                    <span className={s.peek} aria-hidden>{peek.map((c, k) => <img key={c.id} src={c.src} alt="" style={{ ["--k" as string]: k }} loading="lazy" />)}</span>
                    <span className={s.envBody}><b>{d.label}</b><small>{CUTOUTS.filter((c) => c.cat === d.id).length}</small></span>
                  </button>
                );
              })}
            </div>
            <div id="collage-papers" role="tabpanel" className={s.papers} aria-label={`${open.label}: ${open.hint}`}>
              <p className={s.hint}>{open.hint}</p>
              <ul className={s.paperList}>
                {items.map((c, k) => (
                  <li key={c.id} style={{ ["--r" as string]: `${((k * 47) % 9) - 4}deg` }}>
                    <button className={s.paper} onClick={() => add(c.id)} aria-label={`Poner en la hoja: ${c.label}`} data-cursor="corta">
                      <img src={c.src} alt="" loading="lazy" />
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <form className={s.form} onSubmit={publish} noValidate>
            <label className={s.field}>
              <span>Tu mensaje <small>{message.length}/240</small></span>
              <textarea value={message} maxLength={240} rows={3} onChange={(e) => setMessage(e.target.value)} placeholder="¿Qué le dirías a Abraxas? ¿Qué te dice tu cuerpo?" disabled={done} />
            </label>
            <label className={s.field}>
              <span>Firma <small>opcional</small></span>
              <input value={signature} maxLength={40} onChange={(e) => setSignature(e.target.value)} placeholder="Un nombre o un seudónimo" disabled={done} />
            </label>
            <input className={s.trap} tabIndex={-1} autoComplete="off" aria-hidden value={hp} onChange={(e) => setHp(e.target.value)} name="website" />
            <label className={s.check}>
              <input type="checkbox" checked={agree} onChange={(e) => setAgree(e.target.checked)} disabled={done} />
              <span>Acepto las normas de convivencia y autorizo que mi figura y mi mensaje se publiquen de inmediato en la habitación de los mensajes. Sin datos personales.</span>
            </label>
            <div className={s.actions}>
              {done ? (
                <>
                  <Ticket type="button" icon="flecha" tone="lima" onClick={() => document.getElementById("mensajes")?.scrollIntoView({ behavior: "smooth" })}>Ver mi figura</Ticket>
                  <Ticket type="button" icon="tijeras" onClick={restart}>Hacer otra</Ticket>
                </>
              ) : (
                <Ticket type="submit" icon="aguja" tone="lima" size="lg" disabled={status.kind === "sending"}>{status.kind === "sending" ? "Publicando…" : "Publicar"}</Ticket>
              )}
            </div>
            <p className={`${s.status} ${status.kind === "error" ? s.err : ""}`} role="status" aria-live="polite">{status.text ?? ""}</p>
          </form>
        </aside>
      </div>

      <ul className="sr-only" aria-label="Piezas en tu hoja">
        {els.map((e, i) => (
          <li key={e.id}><button onClick={() => { setSelected(e.id); stage.current?.focus(); }}>Pieza {i + 1}{e.id === selected ? " (seleccionada)" : ""}</button></li>
        ))}
      </ul>
    </section>
  );
}
