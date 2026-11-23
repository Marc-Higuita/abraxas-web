"use client";
import { useCallback, useEffect, useRef, useState, type CSSProperties } from "react";
import { StitchLine } from "@/components/abx/Ornaments";
import { sound } from "@/lib/audio/useSound";
import s from "./interlude.module.css";

/**
 * Interludio «Aquí las fotos no se toman, se hacen.» (entre el video y la biblioteca).
 * Una impresora fotográfica (objeto 3D en CSS) expulsa, con calma, fotos en NEGATIVO de las paredes
 * de la casa. Salen por la ranura y se deslizan hasta posarse alrededor de la frase (nunca encima).
 * Al tocarlas se revelan: negativo → sepia → color, con un brillo, y se amplían un instante.
 * La frase es la protagonista y queda en una zona protegida.
 */
const F = (n: number) => `/assets/room-04/fotos-se-hacen/f-${String(n).padStart(2, "0")}.webp`;
const TOTAL = 12;

/** posiciones de reposo (% del escenario, centro de la foto) fuera de la zona de la frase */
const SLOTS_DESK = [
  { x: 9, y: 22, r: -8 }, { x: 20, y: 14, r: 5 }, { x: 8, y: 52, r: 6 }, { x: 18, y: 78, r: -5 },
  { x: 33, y: 86, r: 4 }, { x: 52, y: 88, r: -3 }, { x: 70, y: 84, r: 7 }, { x: 88, y: 76, r: -6 },
  { x: 91, y: 52, r: 4 }, { x: 31, y: 16, r: -4 },
];
const SLOTS_MOB = [
  { x: 14, y: 14, r: -7 }, { x: 38, y: 12, r: 5 }, { x: 18, y: 84, r: 6 }, { x: 50, y: 88, r: -4 },
  { x: 82, y: 84, r: 7 }, { x: 58, y: 15, r: -5 },
];

type Phase = "print" | "fly" | "rest" | "fade";
interface Shot { key: number; n: number; slot: number; phase: Phase; revealed: boolean; zoom: boolean; jx: number; jr: number }

export function Interlude({ quote, source, tone }: { quote: string; source: string; tone: "negro" | "papel" | "kraft" }) {
  const wrap = useRef<HTMLDivElement>(null);
  const stage = useRef<HTMLDivElement>(null);
  const [shots, setShots] = useState<Shot[]>([]);
  const [printing, setPrinting] = useState(false);
  const [mobile, setMobile] = useState(false);
  const seq = useRef(0);
  const nextPhoto = useRef(1);
  const timers = useRef<number[]>([]);
  const words = quote.split(" ");
  const slots = mobile ? SLOTS_MOB : SLOTS_DESK;
  const MAX = mobile ? 6 : 10;

  const later = (fn: () => void, ms: number) => { timers.current.push(window.setTimeout(fn, ms)); };

  /** expulsa una foto: sale por la ranura, luego vuela a un hueco libre */
  const eject = useCallback(() => {
    const key = ++seq.current;
    const n = nextPhoto.current;
    nextPhoto.current = (n % TOTAL) + 1;
    setPrinting(true);
    setShots((prev) => {
      let list = prev;
      const alive = list.filter((p) => p.phase !== "fade");
      if (alive.length >= MAX) {
        // retira primero la más vieja sin revelar (o la más vieja si todas están reveladas)
        const victim = alive.find((p) => !p.revealed) ?? alive[0];
        list = list.map((p) => (p.key === victim.key ? { ...p, phase: "fade" as Phase } : p));
        later(() => setShots((l) => l.filter((p) => p.key !== victim.key)), 900);
      }
      const used = new Set(list.filter((p) => p.phase !== "fade").map((p) => p.slot));
      const free = slots.map((_, i) => i).filter((i) => !used.has(i));
      const slot = free.length ? free[Math.floor(Math.random() * free.length)] : key % slots.length;
      return [...list, { key, n, slot, phase: "print", revealed: false, zoom: false, jx: Math.random() * 2 - 1, jr: Math.random() * 6 - 3 }];
    });
    sound.play("fotos-desplazamiento", { volume: 0.4 });
    later(() => setShots((l) => l.map((p) => (p.key === key ? { ...p, phase: "fly" } : p))), 1100);
    later(() => { setShots((l) => l.map((p) => (p.key === key ? { ...p, phase: "rest" } : p))); setPrinting(false); }, 2500);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [MAX, slots]);

  useEffect(() => {
    const mq = window.matchMedia("(max-width: 760px)");
    const on = () => setMobile(mq.matches);
    on();
    mq.addEventListener("change", on);
    return () => mq.removeEventListener("change", on);
  }, []);

  /** ritmo de impresión: solo mientras la sección está visible y la pestaña activa */
  useEffect(() => {
    const el = wrap.current, st = stage.current;
    if (!el || !st) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let visible = false;
    let loop = 0;
    const schedule = () => {
      window.clearTimeout(loop);
      if (!visible || document.hidden || reduced) return;
      loop = window.setTimeout(() => { eject(); schedule(); }, (mobile ? 2200 : 1500) + Math.random() * 1000);
    };
    const io = new IntersectionObserver(([e]) => {
      visible = e.isIntersecting;
      if (visible) {
        el.dataset.on = "1";
        if (reduced) {
          // movimiento reducido: fotos ya expulsadas, quietas; el revelado por clic sigue
          setShots((l) => l.length ? l : slots.slice(0, mobile ? 4 : 6).map((_, i) => ({ key: ++seq.current, n: i + 1, slot: i, phase: "rest" as Phase, revealed: false, zoom: false, jx: 0, jr: 0 })));
        } else schedule();
      } else window.clearTimeout(loop);
    }, { threshold: 0.2 });
    io.observe(st);
    const onVis = () => schedule();
    document.addEventListener("visibilitychange", onVis);

    let raf = 0;
    const onScroll = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const b = el.getBoundingClientRect();
        const p = Math.min(1, Math.max(0, -b.top / Math.max(1, b.height - innerHeight)));
        el.style.setProperty("--p", reduced ? "1" : p.toFixed(3));
      });
    };
    const fine = window.matchMedia("(pointer: fine)").matches && !reduced;
    const onMove = (ev: PointerEvent) => {
      const b = st.getBoundingClientRect();
      st.style.setProperty("--mx", ((ev.clientX - b.left) / b.width - 0.5).toFixed(3));
      st.style.setProperty("--my", ((ev.clientY - b.top) / b.height - 0.5).toFixed(3));
    };
    addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    if (fine) st.addEventListener("pointermove", onMove);
    return () => {
      io.disconnect(); window.clearTimeout(loop); cancelAnimationFrame(raf);
      document.removeEventListener("visibilitychange", onVis);
      removeEventListener("scroll", onScroll); st.removeEventListener("pointermove", onMove);
    };
  }, [eject, mobile, slots]);

  useEffect(() => () => timers.current.forEach((t) => window.clearTimeout(t)), []);

  const reveal = (key: number) => {
    setShots((l) => l.map((p) => {
      if (p.key !== key) return p;
      if (!p.revealed) sound.play("recorte-pegar");
      return { ...p, revealed: true, zoom: true };
    }));
    later(() => setShots((l) => l.map((p) => (p.key === key ? { ...p, zoom: false } : p))), 1500);
  };

  const dark = tone === "negro";
  return (
    <div ref={wrap} data-on="0" className={`${s.wrap} ${dark ? s.dark : s.light}`}>
      <div ref={stage} className={s.stage}>
        {/* impresora fotográfica en 3D (CSS) */}
        <div className={s.printerWrap} aria-hidden="true">
          <div className={`${s.printer} ${printing ? s.printing : ""}`}>
            <div className={`${s.face} ${s.top}`}><span className={s.vent} /></div>
            <div className={`${s.face} ${s.front}`}>
              <span className={s.label}>Revelado · Sala 04</span>
              <span className={s.led} />
              <span className={s.slot}><span className={s.roller} /><span className={s.roller} /></span>
            </div>
            <div className={`${s.face} ${s.side}`} />
            <div className={`${s.face} ${s.sideL}`} />
            <div className={`${s.face} ${s.back}`} />
            <div className={s.tray} />
          </div>
          <span className={s.floorShadow} />
        </div>

        {/* fotos en negativo */}
        <div className={s.photos}>
          {shots.map((p) => {
            const sl = slots[p.slot];
            return (
              <button
                key={p.key}
                type="button"
                className={`${s.shot} ${s[p.phase]} ${p.revealed ? s.revealed : ""} ${p.zoom ? s.zoom : ""}`}
                style={{ "--tx": `${sl.x}%`, "--ty": `${sl.y}%`, "--tr": `${sl.r + p.jr}deg`, "--jx": p.jx } as CSSProperties}
                onClick={() => reveal(p.key)}
                aria-label={p.revealed ? "Fotografía revelada de una pared de la casa" : "Revelar esta fotografía en negativo"}
                aria-pressed={p.revealed}
                tabIndex={p.phase === "rest" ? 0 : -1}
              >
                <span className={s.film}><img src={F(p.n)} alt="" decoding="async" /></span>
              </button>
            );
          })}
        </div>

        {/* la frase, en zona protegida */}
        <blockquote className={s.quote}>
          <p>
            «{words.map((w, i) => (
              <span key={i} className={s.word} style={{ "--i": i } as CSSProperties}>{w}</span>
            ))}»
          </p>
          <StitchLine className={s.stitch} color={dark ? "var(--lima)" : "var(--bermellon)"} />
          <cite>— Abraxas · {source}</cite>
          <span className={s.hint}>Toca una foto en negativo para revelarla</span>
        </blockquote>
      </div>
    </div>
  );
}
