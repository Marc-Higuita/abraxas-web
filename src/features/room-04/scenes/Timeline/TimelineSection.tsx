"use client";
import { useEffect, useRef, useState } from "react";
import { TIMELINE, DIMENSIONS } from "../../data/timeline";
import archiveData from "../../data/archive.json";
import type { ArchivePhoto, Dimension, TimelineEvent } from "../../types";
import { useRoom } from "../../store";
import s from "./timeline.module.css";

const ARCHIVE = new Map((archiveData as ArchivePhoto[]).map((a) => [a.id, a]));
const imgSrc = (id: string, big = false) => {
  const a = ARCHIVE.get(id);
  if (big && a?.full) return `/assets/room-04/misc/${id}.jpg`;
  return `/assets/room-04/archive/${id}.jpg`;
};
const VER_LABEL: Record<TimelineEvent["verification"], string> = {
  verificado: "Verificado con fuente primaria",
  documentado: "Documentado en prensa",
  "por-verificar": "Por verificar",
  pendiente: "Pendiente",
};
const tilt = (k: number) => ((k * 53) % 15) - 7;

export function TimelineSection() {
  const [active, setActive] = useState<Set<Dimension>>(new Set(DIMENSIONS.map((d) => d.id)));
  const openFicha = useRoom((st) => st.openFicha);
  const list = useRef<HTMLOListElement>(null);

  useEffect(() => {
    const items = list.current?.querySelectorAll("[data-ev]");
    if (!items) return;
    const io = new IntersectionObserver(
      (es) => es.forEach((e) => e.target.classList.toggle(s.near, e.isIntersecting)),
      { rootMargin: "-30% 0px -30% 0px" },
    );
    items.forEach((i) => io.observe(i));
    return () => io.disconnect();
  }, []);

  const toggle = (d: Dimension) =>
    setActive((cur) => {
      const n = new Set(cur);
      if (n.has(d) && n.size > 1) n.delete(d);
      else n.add(d);
      return n;
    });
  const sorted = [...TIMELINE].sort((a, b) => (a.sortYear ?? 9999) - (b.sortYear ?? 9999));

  return (
    <section id="transformaciones" className={s.section} aria-labelledby="act4-title">
      <header className={s.head}>
        <span className="t-label">04 · Las transformaciones de Abraxas</span>
        <h2 id="act4-title" className="t-title">Una trayectoria, cinco dimensiones, muchos nombres para una misma vida.</h2>
        <p className={s.lede}>
          Cada hito trae su fuente y su grado de certeza. Lo que no está confirmado se dice. Los documentos con otros nombres
          o pronombres pertenecen a su época; Abraxas se nombraba en femenino.
        </p>
        <div className={s.filters} role="group" aria-label="Filtrar por dimensión">
          {DIMENSIONS.map((d) => (
            <button
              key={d.id}
              className={`${s.chip} ${active.has(d.id) ? s.chipOn : ""}`}
              style={{ ["--c" as string]: d.color }}
              aria-pressed={active.has(d.id)}
              onClick={() => toggle(d.id)}
            >
              {d.label}
            </button>
          ))}
        </div>
      </header>

      <ol ref={list} className={s.list}>
        {sorted.map((ev, k) => {
          const on = ev.dimensions.some((d) => active.has(d));
          const left = k % 2 === 0;
          return (
            <li key={ev.id} data-ev className={`${s.event} ${on ? "" : s.dim} ${left ? s.left : s.right}`} aria-hidden={!on || undefined}>
              <div className={s.year} aria-hidden="true">{ev.sortYear && ev.precision !== "desconocida" ? ev.sortYear : "¿?"}</div>
              <div className={s.collage}>
                {ev.images.map((im, j) => (
                  <button
                    key={im.id}
                    className={s.doc}
                    style={{ ["--r" as string]: `${tilt(k + j * 3)}deg` }}
                    onClick={() => openFicha({ title: im.caption, image: imgSrc(im.id, true), meta: [`Archivo ${im.id}`, ev.title] })}
                    tabIndex={on ? 0 : -1}
                  >
                    <img src={imgSrc(im.id)} alt={im.caption} loading="lazy" />
                  </button>
                ))}
                <article className={s.card}>
                  <p className={s.date}>{ev.dateLabel}</p>
                  <h3>{ev.title}</h3>
                  <div className={s.dims}>
                    {ev.dimensions.map((d) => {
                      const dm = DIMENSIONS.find((x) => x.id === d)!;
                      return <span key={d} className={s.dimTag} style={{ ["--c" as string]: dm.color }}>{dm.label}</span>;
                    })}
                    <span className={`${s.ver} ${s[ev.verification.replace("-", "")]}`}>{VER_LABEL[ev.verification]} · certeza {ev.certainty}</span>
                  </div>
                  <p>{ev.description}</p>
                  {ev.quotes?.map((q) => <p key={q} className={s.q}>{q}</p>)}
                  <details className={s.sources}>
                    <summary>Fuentes ({ev.sources.length})</summary>
                    <ul>
                      {ev.sources.map((src) => (
                        <li key={src.id}>
                          {src.url ? <a href={src.url} target="_blank" rel="noreferrer">{src.label}</a> : src.label}
                          {src.date ? ` · ${src.date}` : ""}
                        </li>
                      ))}
                    </ul>
                  </details>
                </article>
              </div>
            </li>
          );
        })}
      </ol>
      <p className={s.coda}>
        Cronología de trabajo del equipo de la Sala 04. Pendientes: registros del Concejo de los años setenta, año de la
        candidatura a la Alcaldía, fechas de su formación y de su proceso de transformación narrado por ella misma.
      </p>
    </section>
  );
}
