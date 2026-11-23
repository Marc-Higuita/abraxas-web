"use client";
/**
 * Menú global del Museo Abraxas, compartido por la portada y todas las salas.
 * - Barra fija arriba: se oculta al bajar y reaparece al subir (siempre visible arriba del todo).
 * - Publica su altura visible en la variable CSS --site-bar-h de <html> para que los HUD de cada sala se acomoden.
 * - En pantallas pequeñas abre un panel editorial a pantalla completa.
 */
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ROOMS } from "@/config/rooms";
import s from "./globalMenu.module.css";

// Destino del botón «Aporta»: aún no está definido por el equipo.
// Configúralo con NEXT_PUBLIC_DONATE_URL; mientras tanto apunta al ancla #aporta de la portada.
const DONATE_URL = process.env.NEXT_PUBLIC_DONATE_URL || "/#aporta";
const BAR_H = 56;

export function GlobalMenu() {
  const pathname = usePathname() || "/";
  const [hidden, setHidden] = useState(false);
  const [open, setOpen] = useState(false);
  const [roomsOpen, setRoomsOpen] = useState(true);
  const panelRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const savedY = useRef(0);

  // ocultar al bajar, mostrar al subir
  useEffect(() => {
    let last = window.scrollY;
    let raf = 0;
    const onScroll = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const y = window.scrollY;
        const dy = y - last;
        if (y < BAR_H * 1.5) setHidden(false);
        else if (dy > 6) setHidden(true);
        else if (dy < -6) setHidden(false);
        last = y;
      });
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => { window.removeEventListener("scroll", onScroll); cancelAnimationFrame(raf); };
  }, []);

  // altura visible para que los HUD de las salas se acomoden debajo
  useEffect(() => {
    const root = document.documentElement;
    root.style.setProperty("--site-bar-h", hidden && !open ? "0px" : `${BAR_H}px`);
  }, [hidden, open]);
  useEffect(() => () => { document.documentElement.style.removeProperty("--site-bar-h"); }, []);

  // panel móvil: bloqueo de scroll, Esc y foco atrapado
  useEffect(() => {
    if (!open) return;
    savedY.current = window.scrollY;
    const body = document.body;
    const prev = { position: body.style.position, top: body.style.top, width: body.style.width };
    body.style.position = "fixed"; body.style.top = `-${savedY.current}px`; body.style.width = "100%";
    const panel = panelRef.current;
    const focusables = () => Array.from(panel?.querySelectorAll<HTMLElement>("a[href], button:not([disabled])") ?? []);
    focusables()[0]?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") { e.preventDefault(); setOpen(false); return; }
      if (e.key !== "Tab") return;
      const f = focusables(); if (!f.length) return;
      const first = f[0], lastEl = f[f.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); lastEl.focus(); }
      else if (!e.shiftKey && document.activeElement === lastEl) { e.preventDefault(); first.focus(); }
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      body.style.position = prev.position; body.style.top = prev.top; body.style.width = prev.width;
      window.scrollTo(0, savedY.current);
      triggerRef.current?.focus();
    };
  }, [open]);

  const isCurrent = (route: string) => pathname === route || pathname.startsWith(route + "/");

  return (
    <>
      <header className={`${s.bar} ${hidden && !open ? s.hidden : ""}`} data-site-bar>
        <Link href="/" className={s.brand} aria-label="Museo Abraxas, ir al inicio">
          <img src="/assets/brand/isotipo-papel.png" alt="" width={20} height={26} className={s.mark} />
          <span className={s.brandText}>Museo Abraxas</span>
        </Link>

        <nav className={s.rooms} aria-label="Salas del museo">
          <ol>
            {ROOMS.map((r) => (
              <li key={r.id}>
                <Link href={r.route} className={`${s.room} ${isCurrent(r.route) ? s.current : ""}`} aria-current={isCurrent(r.route) ? "page" : undefined}>
                  <span className={s.num}>{r.id}</span>
                  <span>{r.title}</span>
                  {r.status === "pending" && <span className={s.soon}>Pronto</span>}
                </Link>
              </li>
            ))}
          </ol>
        </nav>

        <div className={s.right}>
          <a href={DONATE_URL} className={s.donate}>Aporta</a>
          <button ref={triggerRef} type="button" className={s.menuBtn} onClick={() => setOpen(true)} aria-expanded={open} aria-controls="site-panel">
            <span className={s.burger} aria-hidden /> Menú
          </button>
        </div>
      </header>

      {open && (
        <div id="site-panel" ref={panelRef} className={s.panel} role="dialog" aria-modal="true" aria-label="Menú del museo">
          <div className={s.panelTop}>
            <button type="button" className={s.close} onClick={() => setOpen(false)}>
              <span aria-hidden>×</span> Cerrar
            </button>
            <img src="/assets/brand/isotipo-negro.png" alt="" width={22} height={28} />
            <a href={DONATE_URL} className={s.donate}>Aporta</a>
          </div>
          <ul className={s.list}>
            <li><Link href="/" className={s.item} onClick={() => setOpen(false)}>Inicio</Link></li>
            <li>
              <button type="button" className={s.item} onClick={() => setRoomsOpen((v) => !v)} aria-expanded={roomsOpen}>
                <span>Salas <sup className={s.count}>(+{ROOMS.length})</sup></span>
                <span className={s.toggle} aria-hidden>{roomsOpen ? "–" : "+"}</span>
              </button>
              {roomsOpen && (
                <ol className={s.sub}>
                  {ROOMS.map((r) => (
                    <li key={r.id}>
                      <Link href={r.route} onClick={() => setOpen(false)} className={isCurrent(r.route) ? s.subCurrent : undefined} aria-current={isCurrent(r.route) ? "page" : undefined}>
                        <span className={s.num}>{r.id}</span> {r.title}
                        {r.status === "pending" && <span className={s.soon}>Pronto</span>}
                      </Link>
                    </li>
                  ))}
                </ol>
              )}
            </li>
            <li><a href={DONATE_URL} className={s.item}>Aporta</a></li>
          </ul>
          <p className={s.foot}>Casa Museo del Collage · Medellín</p>
        </div>
      )}
    </>
  );
}
