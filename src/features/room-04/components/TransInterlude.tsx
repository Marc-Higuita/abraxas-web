"use client";
import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { useRoom } from "../store";
import { useInView } from "../hooks/useInView";
import { sound } from "@/lib/audio/sound";
import letters from "../../../../public/assets/room-04/letters/letters.json";
import pieces from "./transPieces.json";
import s from "./transInterlude.module.css";

/**
 * «Todo es trans». Collage de cuerpos trans, no binarios y andróginos: torsos, siluetas y poses recortados de las
 * láminas que aportó el equipo (siempre a la altura del cuello o del mentón: sin rostros reconocibles y sin
 * atribuir identidades a nadie), recombinados con cabezas de maniquí, muñecas, pelucas y rasgos sueltos.
 * Piezas en distintos planos y escalas, algunas translúcidas; las grandes tienen grosor de papel.
 * La sección queda fija (sticky) un buen tramo para que la frase se lea completa antes de que el tablero
 * se superponga. Frase citada en el video del equipo (2:36).
 */
type PieceId = keyof typeof pieces;
interface Placed { id: PieceId; x: number; y: number; h: number; r: number; z: number; thick?: boolean; flip?: boolean; lite?: boolean; alpha?: number; blend?: boolean }

/** Composición en un lienzo virtual de 1600 × 900. x, y = centro de la pieza; h = alto en px virtuales. */
const LAYOUT: Placed[] = [
  // fondo: cuerpos grandes y translúcidos, como capas de memoria detrás del título
  { id: "b-torso-3", x: 800, y: 470, h: 620, r: -2, z: -520, alpha: 0.42, blend: true },
  { id: "b-torso-6", x: 470, y: 430, h: 470, r: 7, z: -430, alpha: 0.55, blend: true, lite: true },
  { id: "b-escultura-1", x: 1130, y: 470, h: 470, r: -5, z: -450, alpha: 0.6, blend: true, lite: true },
  { id: "b-torso-5", x: 640, y: 690, h: 260, r: -9, z: -380, alpha: 0.5, blend: true, lite: true },

  // figura 1 · izquierda: cabeza de maniquí y peluca roja sobre un torso con cicatrices, brazos y piernas en calzón
  { id: "untitled-11", x: 205, y: 735, h: 330, r: 2, z: -110, thick: true },
  { id: "b-torso-1", x: 210, y: 455, h: 225, r: -3, z: -95, thick: true },
  { id: "d9-2", x: 47, y: 470, h: 200, r: 22, z: -100, lite: true },
  { id: "d9-6", x: 373, y: 480, h: 190, r: -18, z: -90, lite: true },
  { id: "d8-2", x: 213, y: 262, h: 170, r: 4, z: -80, thick: true },
  { id: "hair-19", x: 209, y: 200, h: 160, r: -3, z: -88 },
  { id: "d22-7", x: 285, y: 150, h: 64, r: 24, z: -60 },

  // figura 2 · derecha: máscara de muñeca con bob oscuro sobre un torso con short estampado y piernas en blanco y negro
  { id: "piernas-bn-5", x: 1420, y: 780, h: 240, r: -2, z: -60, thick: true },
  { id: "b-torso-2", x: 1415, y: 470, h: 430, r: 1, z: -50, thick: true },
  { id: "d26-1", x: 1412, y: 205, h: 135, r: -4, z: -30, thick: true },
  { id: "hair-18", x: 1414, y: 160, h: 130, r: 3, z: -40 },
  { id: "d9-9", x: 1580, y: 420, h: 230, r: -10, z: -45, lite: true },
  { id: "d23-18", x: 1310, y: 330, h: 50, r: -20, z: -20 },

  // figura 3 · al fondo, en el centro-izquierda: cabeza gris con labios sobre un cuerpo de traje que camina
  { id: "b-traje-1", x: 560, y: 600, h: 430, r: 3, z: -300, lite: true },
  { id: "d25-1", x: 548, y: 352, h: 120, r: -3, z: -290, lite: true },
  { id: "hair-1", x: 548, y: 318, h: 110, r: -2, z: -295, lite: true },

  // figura 4 · al fondo, centro-derecha: torso de maniquí con caderas y piernas, manos que lo sostienen
  { id: "d8-5", x: 1010, y: 690, h: 260, r: 6, z: -340, lite: true },
  { id: "d8-7", x: 1080, y: 690, h: 260, r: -4, z: -345, lite: true },
  { id: "b-torso-4", x: 1045, y: 470, h: 210, r: 0, z: -330, thick: true },
  { id: "b-manos-1", x: 1170, y: 520, h: 260, r: 8, z: -310, alpha: 0.9, lite: true },
  { id: "d15-2", x: 1043, y: 300, h: 150, r: 2, z: -320, thick: true },

  // figura 5 · pequeña, al frente: muñeca de porcelana con piernas sueltas
  { id: "d2-2", x: 760, y: 820, h: 130, r: 8, z: 110, lite: true },
  { id: "d2-3", x: 812, y: 825, h: 122, r: -6, z: 112, lite: true },
  { id: "d2-1", x: 786, y: 718, h: 150, r: -3, z: 120, thick: true },

  // rasgos sueltos, flotando alrededor
  { id: "faces-9", x: 600, y: 110, h: 64, r: -6, z: 60 },
  { id: "d18-3", x: 1080, y: 110, h: 64, r: 8, z: 40 },
  { id: "faces-10", x: 470, y: 840, h: 64, r: 5, z: 80, lite: true },
  { id: "d17-13", x: 640, y: 800, h: 64, r: -8, z: 150 },
  { id: "d17-6", x: 1500, y: 110, h: 64, r: 10, z: 30, lite: true },
  { id: "d6-3", x: 90, y: 230, h: 100, r: -12, z: 40, lite: true },
  { id: "d23-15", x: 430, y: 100, h: 56, r: -30, z: 100, lite: true },
  { id: "d23-6", x: 1230, y: 96, h: 64, r: 18, z: 70, lite: true },
  { id: "d11-6", x: 1560, y: 640, h: 76, r: 6, z: 50, lite: true },
];

type Letter = { id: string; char: string; src: string; w: number; h: number };
const SETS = Object.fromEntries(letters.sets.map((x) => [x.id, x.items as Letter[]])) as Record<string, Letter[]>;
const rnd = (i: number, k: number) => { const x = Math.sin(i * 91.7 + k * 47.3) * 43758.5453; return x - Math.floor(x); };

export function TransInterlude({ source = "frase citada en el video del equipo (2:36)" }: { source?: string }) {
  const ref = useRef<HTMLElement>(null);
  const world = useRef<HTMLDivElement>(null);
  const reduced = useRoom((st) => st.reducedMotion);
  const lowPower = useRoom((st) => st.lowPower);
  const near = useInView(ref, "0px");
  const [seen, setSeen] = useState(false);
  const [narrow, setNarrow] = useState(false);
  useEffect(() => {
    if (!near || seen) return;
    setSeen(true);
    if (!reduced) sound.play("collage-ensambla");
  }, [near, seen, reduced]);
  useEffect(() => {
    const mq = window.matchMedia("(max-width: 760px)");
    const f = () => setNarrow(mq.matches); f(); mq.addEventListener("change", f);
    return () => mq.removeEventListener("change", f);
  }, []);
  const lite = narrow || lowPower;

  // título con letras recortadas: alterna papel y revista
  const title = useMemo(() => {
    let k = 0;
    return ["todo", "es", "trans"].map((word) =>
      word.split("").map((ch) => {
        const i = k++;
        const set = i % 3 === 1 ? SETS.revista : SETS.papel;
        const opts = set.filter((l) => l.char === ch);
        const l = opts.length ? opts[Math.floor(rnd(i, 2) * opts.length)] : SETS.revista.find((x) => x.char === ch)!;
        return { l, i, r: (rnd(i, 4) - 0.5) * 14, y: (rnd(i, 6) - 0.5) * 0.14, z: 30 + rnd(i, 8) * 70 };
      }),
    );
  }, []);

  // giro de la instalación con el cursor (solo escritorio)
  useEffect(() => {
    const el = ref.current, w = world.current;
    if (!el || !w || reduced || narrow) return;
    let raf = 0, tx = 0, ty = 0, cx = 0, cy = 0;
    const onMove = (e: PointerEvent) => {
      const r = el.getBoundingClientRect();
      tx = ((e.clientX - r.left) / r.width - 0.5) * 2;
      ty = ((e.clientY - r.top) / r.height - 0.5) * 2;
    };
    const tick = () => {
      cx += (tx - cx) * 0.06; cy += (ty - cy) * 0.06;
      w.style.setProperty("--mx", cx.toFixed(3));
      w.style.setProperty("--my", cy.toFixed(3));
      raf = requestAnimationFrame(tick);
    };
    el.addEventListener("pointermove", onMove);
    raf = requestAnimationFrame(tick);
    return () => { el.removeEventListener("pointermove", onMove); cancelAnimationFrame(raf); };
  }, [reduced, narrow]);

  // escala del lienzo virtual al viewport
  const [scale, setScale] = useState(1);
  useEffect(() => {
    const f = () => setScale(Math.min(window.innerWidth / 1600, window.innerHeight / 900) * (window.innerWidth < 760 ? 1.55 : 1));
    f(); window.addEventListener("resize", f);
    return () => window.removeEventListener("resize", f);
  }, []);

  const placed = LAYOUT.filter((p) => !(lite && p.lite));

  return (
    <section ref={ref} className={`${s.section} ${seen ? s.in : ""} ${reduced ? s.still : ""}`} aria-labelledby="trans-title">
      <h2 id="trans-title" className="sr-only">Todo es trans: ¿tu cuerpo qué te dice?</h2>
      <div className={s.sticky}>
      <div className={s.stage} aria-hidden="true">
        <div ref={world} className={s.world} style={{ ["--s" as string]: scale } as CSSProperties}>
          {placed.map((p, i) => {
            const meta = pieces[p.id];
            const w = (p.h * meta.w) / meta.h;
            const px = narrow ? 800 + (p.x - 800) * 0.66 : p.x;
            const style = {
              left: px, top: p.y, width: w, height: p.h,
              ["--z" as string]: `${p.z}px`, ["--r" as string]: `${p.r}deg`, ["--i" as string]: i,
              ["--a" as string]: p.alpha ?? 1,
              ["--fx" as string]: `${(rnd(i, 1) - 0.5) * 1400}px`, ["--fy" as string]: `${(rnd(i, 3) - 0.5) * 900 - 300}px`, ["--fr" as string]: `${(rnd(i, 5) - 0.5) * 160}deg`,
            } as CSSProperties;
            return (
              <div key={p.id} className={`${s.piece} ${p.thick && !lite ? s.thick : ""} ${p.blend ? s.blend : ""}`} style={style}>
                {p.thick && !lite && (
                  <>
                    <img src={meta.src} alt="" className={`${s.img} ${s.layer}`} style={{ ["--d" as string]: "-3px" } as CSSProperties} draggable={false} />
                    <img src={meta.src} alt="" className={`${s.img} ${s.layer}`} style={{ ["--d" as string]: "-1.5px" } as CSSProperties} draggable={false} />
                  </>
                )}
                <img src={meta.src} alt="" className={s.img} draggable={false} />
              </div>
            );
          })}

          <div className={s.title}>
            <div className={s.cutLine}>
              {title.map((word, wi) => (
                <span key={wi} className={s.cutWord}>
                  {word.map(({ l, i, r, y, z }) => (
                    <span key={i} className={s.letter} style={{ ["--lr" as string]: `${r}deg`, ["--ly" as string]: `${y}em`, ["--lz" as string]: `${z}px`, ["--li" as string]: i } as CSSProperties}>
                      {/* dos fragmentos de la misma letra que se separan apenas con el cursor */}
                      <img src={l.src} alt="" className={`${s.frag} ${s.fragA}`} style={{ aspectRatio: `${l.w} / ${l.h}` }} draggable={false} />
                      <img src={l.src} alt="" className={`${s.frag} ${s.fragB}`} style={{ aspectRatio: `${l.w} / ${l.h}` }} draggable={false} />
                    </span>
                  ))}
                </span>
              ))}
            </div>
            <p className={s.question}><span>¿tu cuerpo qué te dice?</span></p>
          </div>
        </div>
      </div>
      <p className={s.attrib}>{source}</p>
      </div>
    </section>
  );
}
