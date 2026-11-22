"use client";
import { useMemo, useState } from "react";
import Link from "next/link";
import archiveData from "../data/archive.json";
import type { ArchivePhoto } from "../types";
import s from "./archive.module.css";

const ALL = archiveData as ArchivePhoto[];
const GROUPS: { id: string; label: string; test: (p: ArchivePhoto) => boolean; sort: (a: ArchivePhoto, b: ArchivePhoto) => number }[] = [
  ...(["A", "B", "C", "D"] as const).map((w) => ({
    id: w,
    label: { A: "Pared norte (≈30°)", B: "Pared oriente (≈120°)", C: "Pared sur (≈210°)", D: "Pared occidente (≈300°)" }[w],
    test: (p: ArchivePhoto) => p.wall === w && ["pared", "friso", "biblioteca"].includes(p.type),
    sort: (a: ArchivePhoto, b: ArchivePhoto) => (a.heading ?? 0) - (b.heading ?? 0),
  })),
  ...[["techo", "Techo de vigas"], ["piso", "Piso"], ["mobiliario", "Escritorio y mobiliario"], ["documento", "Documentos y archivo"], ["objeto", "Objetos"]].map(([t, label]) => ({
    id: t, label, test: (p: ArchivePhoto) => p.type === t, sort: (a: ArchivePhoto, b: ArchivePhoto) => a.seq - b.seq,
  })),
];

export function ArchiveBrowser() {
  const [filter, setFilter] = useState<string>("todos");
  const [onlyKey, setOnlyKey] = useState(false);
  const [q, setQ] = useState("");
  const [open, setOpen] = useState<ArchivePhoto | null>(null);
  const groups = useMemo(
    () =>
      GROUPS.filter((g) => filter === "todos" || g.id === filter).map((g) => ({
        ...g,
        items: ALL.filter(g.test)
          .filter((p) => !onlyKey || p.note || p.room)
          .filter((p) => !q || `${p.id} ${p.seq} ${p.note ?? ""}`.toLowerCase().includes(q.toLowerCase()))
          .sort(g.sort),
      })),
    [filter, onlyKey, q],
  );

  return (
    <main className={s.main}>
      <header className={s.head}>
        <Link href="/salas/04" className="btn btn-sm">Volver a la sala</Link>
        <h1 className="t-title">Archivo · {ALL.length} fotografías de la oficina</h1>
        <p>
          Agrupadas por pared según el rumbo de brújula de cada foto, y por techo, piso, mobiliario, documentos y objetos.
          ★ = usada en la reconstrucción 3D · ◆ = documento clave · ⟂ = encadenada con la foto anterior por emparejamiento de puntos.
        </p>
        <div className={s.filters}>
          <label htmlFor="g">Grupo</label>
          <select id="g" value={filter} onChange={(e) => setFilter(e.target.value)}>
            <option value="todos">Todos</option>
            {GROUPS.map((g) => <option key={g.id} value={g.id}>{g.label}</option>)}
          </select>
          <label htmlFor="q">Buscar</label>
          <input id="q" value={q} onChange={(e) => setQ(e.target.value)} placeholder="nombre, número o nota" />
          <label className={s.check}><input type="checkbox" checked={onlyKey} onChange={(e) => setOnlyKey(e.target.checked)} /> Solo ★ y ◆</label>
        </div>
      </header>
      {groups.map((g) => (
        <section key={g.id} className={s.group} aria-labelledby={`g-${g.id}`}>
          <h2 id={`g-${g.id}`}>{g.label} <span className="t-meta">{g.items.length}</span></h2>
          <ul className={s.grid}>
            {g.items.map((p) => (
              <li key={p.id}>
                <button className={`${s.cell} ${p.note ? s.key : ""}`} onClick={() => setOpen(p)}>
                  <img src={`/assets/room-04/archive/${p.id}.jpg`} alt={p.note ?? `Foto ${p.seq}`} loading="lazy" width={p.w} height={p.h} />
                  <span className={s.cap}>#{p.seq} {p.room ? "★" : ""}{p.note ? "◆" : ""}{p.matched ? "⟂" : ""}</span>
                  <span className={s.cap2}>{p.id}</span>
                  <span className={s.cap2}>{p.time} · {p.heading === null ? "–" : `${Math.round(p.heading)}°`}</span>
                </button>
              </li>
            ))}
          </ul>
        </section>
      ))}
      {open && (
        <div className={s.lightbox} role="dialog" aria-modal="true" aria-label={`Foto ${open.seq}`} onClick={() => setOpen(null)}>
          <figure onClick={(e) => e.stopPropagation()}>
            <img src={open.full ? `/assets/room-04/misc/${open.id}.jpg` : `/assets/room-04/archive/${open.id}.jpg`} alt={open.note ?? `Foto ${open.seq}`} />
            <figcaption>
              <strong>#{open.seq} · {open.id}</strong>
              {open.note && <span>{open.note}</span>}
              <span className="t-meta">{open.file} · {open.part} · {open.time} · rumbo {open.heading === null ? "–" : `${Math.round(open.heading)}°`} · cadena {open.chain ?? "–"}</span>
              <button className="btn btn-sm" onClick={() => setOpen(null)} autoFocus>Cerrar</button>
            </figcaption>
          </figure>
        </div>
      )}
    </main>
  );
}
