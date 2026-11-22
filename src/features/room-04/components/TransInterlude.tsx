"use client";
import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { useRoom } from "../store";
import { useInView } from "../hooks/useInView";
import letters from "../../../../public/assets/room-04/letters/letters.json";
import pieces from "./transPieces.json";
import s from "./transInterlude.module.css";

/**
 * Corrección 07 · «Todo es trans». Figuras andróginas armadas con recortes (cabeza de una pieza, torso de otra,
 * piernas de otra), en distintas escalas y profundidades. Las piezas grandes tienen grosor de papel (capas
 * apiladas) y toda la instalación gira con el cursor. El título se arma con letras recortadas que se fragmentan.
 * Piezas: hojas de recortes aportadas por el equipo (sin retratos de personas reales ni obras completas firmadas).
 * Frase citada en el video del equipo (2:36).
 */
type PieceId = keyof typeof pieces;
interface Placed { id: PieceId; x: number; y: number; h: number; r: number; z: number; thick?: boolean; flip?: boolean; lite?: boolean }

/** Composición en un lienzo virtual de 1600 × 900. x, y = centro de la pieza; h = alto en px virtuales. */
const LAYOUT: Placed[] = [
  // figura 1 · izquierda: cabeza de maniquí, peluca roja, busto, brazos, piernas en calzón
  { id: "untitled-11", x: 255, y: 690, h: 380, r: 2, z: -110, thick: true },
  { id: "d8-8", x: 262, y: 420, h: 250, r: -2, z: -95, thick: true },
  { id: "d9-2", x: 150, y: 440, h: 220, r: 18, z: -100, lite: true },
  { id: "d9-6", x: 372, y: 450, h: 210, r: -14, z: -90, lite: true },
  { id: "d8-2", x: 262, y: 225, h: 190, r: 4, z: -80, thick: true },
  { id: "hair-19", x: 258, y: 158, h: 175, r: -3, z: -88 },
  { id: "d22-7", x: 330, y: 120, h: 70, r: 24, z: -60 },
  // figura 2 · derecha: máscara de muñeca con bob oscuro, torso de maniquí, brazo, piernas en blanco y negro
  { id: "piernas-bn-5", x: 1330, y: 735, h: 310, r: -2, z: -60, thick: true },
  { id: "d8-1", x: 1330, y: 445, h: 380, r: 1, z: -50, thick: true },
  { id: "d9-9", x: 1450, y: 400, h: 250, r: -8, z: -45, lite: true },
  { id: "hair-18", x: 1330, y: 160, h: 150, r: 3, z: -40 },
  { id: "d26-1", x: 1328, y: 195, h: 140, r: -4, z: -30, thick: true },
  { id: "d23-18", x: 1250, y: 330, h: 50, r: -20, z: -20 },
  // figura 3 · al fondo, en el centro: cabeza gris con labios, caderas, piernas de maniquí
  { id: "d8-5", x: 770, y: 650, h: 290, r: 6, z: -340, lite: true },
  { id: "d8-7", x: 845, y: 650, h: 290, r: -4, z: -345, lite: true },
  { id: "d8-4", x: 805, y: 420, h: 210, r: 0, z: -330, thick: true },
  { id: "d9-4", x: 700, y: 360, h: 200, r: 20, z: -335, lite: true },
  { id: "hair-1", x: 806, y: 195, h: 150, r: -2, z: -320 },
  { id: "d25-1", x: 806, y: 245, h: 160, r: 2, z: -310, thick: true },
  // figura 4 · pequeña, al frente: muñeca de porcelana con piernas sueltas
  { id: "d2-2", x: 1080, y: 790, h: 150, r: 8, z: 110, lite: true },
  { id: "d2-3", x: 1135, y: 795, h: 140, r: -6, z: 112, lite: true },
  { id: "d2-1", x: 1105, y: 670, h: 170, r: -3, z: 120, thick: true },
  { id: "d23-21", x: 1150, y: 600, h: 60, r: 40, z: 130, lite: true },
  // rasgos sueltos, flotando alrededor
  { id: "faces-9", x: 560, y: 120, h: 70, r: -6, z: 60 },
  { id: "d18-3", x: 1080, y: 120, h: 70, r: 8, z: 40 },
  { id: "d21-1", x: 1530, y: 640, h: 150, r: 6, z: 20, lite: true },
  { id: "faces-10", x: 470, y: 820, h: 70, r: 5, z: 80, lite: true },
  { id: "d17-13", x: 640, y: 790, h: 70, r: -8, z: 150 },
  { id: "d17-6", x: 1490, y: 120, h: 70, r: 10, z: 30, lite: true },
  { id: "faces-12", x: 990, y: 300, h: 44, r: -4, z: -150, lite: true },
  { id: "d6-3", x: 95, y: 230, h: 110, r: -12, z: 40, lite: true },
  { id: "d4-1", x: 980, y: 520, h: 200, r: -6, z: -220, lite: true },
  { id: "d13-7", x: 540, y: 520, h: 140, r: 14, z: -180, lite: true },
  { id: "d7-12", x: 900, y: 860, h: 90, r: -6, z: -60, lite: true },
  { id: "d23-15", x: 440, y: 110, h: 60, r: -30, z: 100, lite: true },
  { id: "d23-6", x: 1240, y: 100, h: 70, r: 18, z: 70, lite: true },
  { id: "d11-6", x: 1560, y: 330, h: 80, r: 6, z: 50, lite: true },
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
  useEffect(() => { if (near) setSeen(true); }, [near]);
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
      <div className={s.stage} aria-hidden="true">
        <div ref={world} className={s.world} style={{ ["--s" as string]: scale } as CSSProperties}>
          {placed.map((p, i) => {
            const meta = pieces[p.id];
            const w = (p.h * meta.w) / meta.h;
            const style = {
              left: p.x, top: p.y, width: w, height: p.h,
              ["--z" as string]: `${p.z}px`, ["--r" as string]: `${p.r}deg`, ["--i" as string]: i,
              ["--fx" as string]: `${(rnd(i, 1) - 0.5) * 1400}px`, ["--fy" as string]: `${(rnd(i, 3) - 0.5) * 900 - 300}px`, ["--fr" as string]: `${(rnd(i, 5) - 0.5) * 160}deg`,
            } as CSSProperties;
            return (
              <div key={p.id} className={`${s.piece} ${p.thick && !lite ? s.thick : ""}`} style={style}>
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
    </section>
  );
}
