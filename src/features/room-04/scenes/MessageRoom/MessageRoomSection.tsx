"use client";
import dynamic from "next/dynamic";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useInView } from "../../hooks/useInView";
import { useScrollProgress } from "../../hooks/useScrollProgress";
import { hasWebGL } from "../../hooks/useDevice";
import { useRoom } from "../../store";
import { PLAYLIST } from "../../data/media";
import { fetchPieces, PIECE_EVENT, type PublishedPiece } from "../../lib/pieces";
import { SEED, pageCount, pageOf } from "./layout";
import { useSpotify } from "./useSpotify";
import { Sticker, Ticket } from "@/components/abx/Ticket";
import { Icon } from "@/components/abx/Icon";
import { OverlayScene } from "../../components/OverlayScene";
import s from "./messageroom.module.css";

const MessageRoomCanvas = dynamic(() => import("./MessageRoomCanvas").then((m) => m.MessageRoomCanvas), { ssr: false });

const fmt = (iso: string) => { try { return new Date(iso).toLocaleDateString("es-CO", { day: "numeric", month: "long", year: "numeric" }); } catch { return ""; } };

/** 07 · Habitación de los mensajes: cada figura publicada en el tablero queda colgada aquí, entre espejos y vidrio. */
export function MessageRoomSection() {
  const section = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const inView = useInView(section, "300px");
  const progress = useScrollProgress(stageRef, undefined, { start: "top bottom", end: "center center" });
  const [webgl, setWebgl] = useState(false);
  useEffect(() => setWebgl(hasWebGL()), []);
  const low = useRoom((st) => st.lowPower);
  const reduced = useRoom((st) => st.reducedMotion);

  const [items, setItems] = useState<PublishedPiece[]>([]);
  const [connected, setConnected] = useState<boolean | null>(null);
  const [fresh, setFresh] = useState<Set<string>>(new Set());
  const [page, setPage] = useState(0);
  const [selected, setSelected] = useState<string | null>(null);
  const [listMode, setListMode] = useState(false);
  const loaded = useRef(false);

  useEffect(() => {
    if (!inView || loaded.current) return;
    loaded.current = true;
    fetchPieces().then(({ items, connected }) => { setItems(items); setConnected(connected); });
  }, [inView]);

  useEffect(() => {
    const on = (e: Event) => {
      const p = (e as CustomEvent<PublishedPiece>).detail;
      if (!p) return;
      setItems((cur) => (cur.some((x) => x.id === p.id) ? cur : [...cur, p]));
      setFresh((f) => new Set(f).add(p.id));
      setPage(0);
    };
    window.addEventListener(PIECE_EVENT, on);
    return () => window.removeEventListener(PIECE_EVENT, on);
  }, []);

  const real = items.length > 0;
  const source = real ? items : SEED;
  const pages = pageCount(source.length);
  const shown = useMemo(() => pageOf(source, Math.min(page, pages - 1)), [source, page, pages]);
  const current = source.find((p) => p.id === selected) ?? null;

  useEffect(() => {
    if (!selected) return;
    const k = (e: KeyboardEvent) => e.key === "Escape" && setSelected(null);
    window.addEventListener("keydown", k);
    return () => window.removeEventListener("keydown", k);
  }, [selected]);

  // Música: el embed oficial se carga al acercarse; suena solo cuando la persona lo pide.
  const host = useRef<HTMLDivElement>(null);
  const spot = useSpotify(host, PLAYLIST.uri, inView);
  const playerAction = useCallback(() => {
    if (spot.ready) spot.toggle();
    else host.current?.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [spot]);

  return (
    <OverlayScene id="mensajes" labelledBy="mensajes-title" tone="#1c1714" className={s.section}>
      <div ref={section}>
      {/* introducción en su propio bloque: la habitación queda libre debajo */}
        <header className={s.intro}>
          <div className={s.stickers}>
            <Sticker tone="lila" rotate={-5}>07</Sticker>
            <Sticker tone="papel" shape="flag" rotate={3}>{real ? `${items.length} ${items.length === 1 ? "mensaje" : "mensajes"}` : "Aún sin mensajes"}</Sticker>
          </div>
          <h2 id="mensajes-title" className={s.title}>La habitación de los mensajes</h2>
          <p className={s.lede}>Cada figura publicada en el tablero queda colgada aquí, entre espejos y vidrio. Toca el tocadiscos para escuchar la playlist.</p>
          {!real && <p className={s.note}>Las piezas que ves son ejemplos del equipo. La primera figura real será la tuya.</p>}
          {connected === false && real && <p className={s.note}>Las piezas marcadas con un punto verde están guardadas solo en este navegador mientras el mural se conecta a la base de datos.</p>}
          <div className={s.actions}>
            <a href="#collage" className="ticket t-lima t-md" data-cursor="toca"><span className="ticket-stub"><Icon name="tijeras" size={22} /></span><span className="ticket-body">Crear mi figura</span></a>
            <Ticket icon="menu" tone="papel" size="sm" aria-pressed={listMode} onClick={() => setListMode((v) => !v)}>{listMode ? "Ver la habitación" : "Ver como lista"}</Ticket>
          </div>
        </header>

      <div ref={stageRef} className={s.stage} data-cursor="arrastra">
        {webgl && !listMode ? (
          <MessageRoomCanvas pieces={shown} freshIds={fresh} selected={selected} onSelect={setSelected} active={inView} low={low} reduced={reduced} progress={progress} playing={spot.playing} onPlayer={playerAction} />
        ) : (
          <div className={s.flat} aria-hidden={!listMode}>
            {shown.map((p) => (
              <button key={p.id} className={s.flatCard} onClick={() => setSelected(p.id)}>
                {p.image && <img src={p.image} alt="" loading="lazy" />}
                <span>{p.message}</span>
              </button>
            ))}
          </div>
        )}


        <div className={s.controls}>
          <span className={s.hintPill}>Arrastra para mirar · toca una pieza para leerla</span>
          {spot.playing && (
            <Ticket icon="pausa" tone="lima" size="sm" onClick={spot.toggle} aria-label="Pausar la música">Pausar música</Ticket>
          )}
        </div>
        {pages > 1 && (
          <nav className={s.pager} aria-label="Páginas de mensajes">
            <Ticket icon="atras" tone="papel" size="sm" disabled={page === 0} onClick={() => setPage((p) => Math.max(0, p - 1))} aria-label="Mensajes más recientes" />
            <span>{page + 1} / {pages}</span>
            <Ticket icon="flecha" tone="papel" size="sm" disabled={page >= pages - 1} onClick={() => setPage((p) => Math.min(pages - 1, p + 1))} aria-label="Mensajes anteriores" />
          </nav>
        )}
      </div>

      {/* lista alternativa, siempre disponible para lectores de pantalla y teclado */}
      <ul className={listMode ? s.list : "sr-only"} aria-label="Mensajes publicados">
        {source.map((p) => (
          <li key={p.id}>
            <button onClick={() => setSelected(p.id)}>
              <strong>{p.message}</strong>
              <span>{p.signature ? `${p.signature} · ` : ""}{fmt(p.createdAt)}</span>
            </button>
          </li>
        ))}
      </ul>

      <div className={s.below}>
        <article className={s.player} aria-labelledby="player-title">
          <div className={s.playerHead}>
            <span className={s.disc} data-on={spot.playing} aria-hidden><Icon name="disco" size={28} /></span>
            <div>
              <h3 id="player-title">{PLAYLIST.title}</h3>
              <p>El tocadiscos de la habitación controla este reproductor. Nada suena hasta que lo pidas.</p>
            </div>
            <Ticket icon={spot.playing ? "pausa" : "play"} tone={spot.playing ? "lima" : "papel"} size="md" cursor="play" disabled={!spot.ready} onClick={spot.toggle} aria-label={spot.playing ? "Pausar la música" : "Reproducir la música"}>
              {spot.playing ? "Pausar" : "Reproducir"}
            </Ticket>
          </div>
          <div ref={host} className={s.embed} />
          {spot.status === "loading" && <p className={s.small}>Cargando el reproductor de Spotify…</p>}
          {spot.status === "error" && (
            <p className={s.small}>El reproductor de Spotify no cargó. <a href={PLAYLIST.url} target="_blank" rel="noreferrer">Abrir la playlist en Spotify</a> o escanea el código.</p>
          )}
          <p className={s.small}>Sin sesión de Spotify abierta en este navegador suenan adelantos de 30 s; con sesión, las canciones completas.</p>
        </article>

        <figure className={s.qr}>
          <span className={s.tape} aria-hidden />
          <div className={s.qrPaper}>
            <a href={PLAYLIST.url} target="_blank" rel="noreferrer" aria-label="Abrir la playlist en Spotify">
              <img src={PLAYLIST.qr} alt="Código QR de la playlist en Spotify" width={220} height={220} />
            </a>
          </div>
          <figcaption>
            <Sticker tone="magenta" shape="pill" rotate={-4}>Playlist para Abraxas</Sticker>
            <span>escanéalo</span>
          </figcaption>
          <svg className={s.stitch} viewBox="0 0 300 12" aria-hidden><path d="M2 6 H298" stroke="currentColor" strokeWidth="2" strokeDasharray="8 6" fill="none" /></svg>
        </figure>
      </div>

      {current && (
        <div className={s.reader} role="dialog" aria-modal="true" aria-labelledby="reader-msg" onClick={() => setSelected(null)}>
          <div className={s.readerCard} onClick={(e) => e.stopPropagation()}>
            {current.image && <img src={current.image} alt="Figura de collage publicada" />}
            <div className={s.readerText}>
              {current.id.startsWith("seed-") && <Sticker tone="amarillo" rotate={-3}>Ejemplo del equipo</Sticker>}
              <p id="reader-msg" className={s.readerMsg}>{current.message}</p>
              <p className={s.small}>{current.signature ? `${current.signature} · ` : ""}{fmt(current.createdAt)}{current.local ? " · guardado en este navegador" : ""}</p>
            </div>
            <Ticket icon="cerrar" tone="negro" size="sm" className={s.readerClose} onClick={() => setSelected(null)} aria-label="Cerrar mensaje" autoFocus />
          </div>
        </div>
      )}
      <p className="sr-only" aria-live="polite">{fresh.size ? "Tu figura ya está colgada en la habitación." : ""}</p>
      </div>
    </OverlayScene>
  );
}
