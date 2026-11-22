"use client";
import dynamic from "next/dynamic";
import { useEffect, useRef, useState } from "react";
import { Sticker } from "@/components/abx/Ticket";
import { Icon } from "@/components/abx/Icon";
import { Stitch } from "@/components/abx/Ornaments";
import { useInView } from "../../hooks/useInView";
import { useScrollProgress } from "../../hooks/useScrollProgress";
import { OverlayScene } from "../../components/OverlayScene";
import { hasWebGL } from "../../hooks/useDevice";
import { useRoom } from "../../store";
import { PORTRAIT_FACTS, factFicha } from "./facts";
import s from "./abraxas.module.css";

const PortraitCanvas = dynamic(() => import("./PortraitCanvas").then((m) => m.PortraitCanvas), { ssr: false });

/**
 * 04 · Abraxas, por capas. Escultura fotográfica: fragmentos recortados de fotos de Abraxas de distintos
 * momentos, ensamblados en planos de profundidad. Entra SUPERPUESTA a la sección anterior y se arma con
 * el scroll; el cursor separa las capas y dos lupas de vidrio real cuelgan de hilos.
 * Alrededor flotan miniaturas del archivo cosidas a la figura: cada una abre su ficha con fuente.
 */
export function AbraxasSection() {
  const section = useRef<HTMLDivElement>(null);
  const inView = useInView(section, "120px");
  // progreso de entrada (0 cuando asoma por abajo, 1 cuando ocupa la pantalla): arma la escultura
  const enter = useRef(0);
  useScrollProgress(section, (p) => { enter.current = p; }, { start: "top bottom", end: "top 15%" });
  const [webgl] = useState(() => hasWebGL());
  const [narrow, setNarrow] = useState(false);
  const [touch, setTouch] = useState(false);
  const openFicha = useRoom((st) => st.openFicha);

  useEffect(() => {
    const mq = window.matchMedia("(max-width: 860px)");
    const mt = window.matchMedia("(pointer: coarse)");
    const on = () => { setNarrow(mq.matches); setTouch(mt.matches); };
    on();
    mq.addEventListener("change", on);
    mt.addEventListener("change", on);
    return () => { mq.removeEventListener("change", on); mt.removeEventListener("change", on); };
  }, []);

  return (
    <OverlayScene id="abraxas" labelledBy="act4-title" className={s.section} tone="#121110" overlap="30vh">
      <div ref={section} className={s.stage} data-cursor="ver">
        {webgl ? (
          <PortraitCanvas active={inView} narrow={narrow} touch={touch} enter={enter} />
        ) : (
          <img className={s.fallback} src="/assets/room-04/abraxas/retrato-base.jpg" alt="Abraxas sentada en la casa museo, con blusa amarilla bordada" />
        )}
        <header className={s.head}>
          <div className={s.stickers}>
            <Sticker tone="lila" rotate={-5}>04</Sticker>
            <Sticker tone="papel" shape="flag" rotate={3}>Abraxas, por capas</Sticker>
          </div>
          <h2 id="act4-title" className={s.title}>Abraxas</h2>
          <Stitch className={s.stitch} color="var(--oro)" width={260} height={14} />
        </header>
        <p className={s.hint} aria-hidden="true">
          <Icon name="lupa" size={18} />
          {touch ? "Toca la figura" : "Mueve el cursor: las capas se abren"}
        </p>
      </div>

      {/* En pantallas angostas los datos van en lista; en escritorio esta lista queda solo para lectores de pantalla. */}
      <ol className={narrow ? s.list : "sr-only"} aria-label="Momentos de su vida">
        {PORTRAIT_FACTS.map((f, i) => (
          <li key={f.id} style={{ ["--r" as string]: `${((i * 37) % 7) - 3}deg` }}>
            <button type="button" className={s.item} onClick={() => openFicha(factFicha(f))} data-cursor="ver">
              <img src={f.thumb} alt="" loading="lazy" width={72} height={56} />
              <span>
                <strong>{f.label}</strong>
                <small>{f.event.dateLabel}</small>
              </span>
            </button>
          </li>
        ))}
      </ol>
    </OverlayScene>
  );
}
