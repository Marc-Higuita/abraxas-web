"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { Stage, Layer, Rect, Image as KImage, Text, Circle, RegularPolygon, Transformer, Label, Tag, Group } from "react-konva";
import type Konva from "konva";
import type { CollageElement } from "@/lib/collage-schema";
import { COLLAGE_SCHEMA_VERSION } from "@/lib/collage-schema";
import s from "./collage.module.css";

const SIZE = 600;
const COLORS = ["#d9341f", "#f2b90f", "#2340a8", "#c81e6e", "#1e7a4c", "#121110", "#d4a12a", "#f3eee3"];
/** Recortes autorizados: fotografías de la casa museo tomadas por el equipo (archivo Sala 04). */
const PHOTO_CUTS = [
  "parte2-img_09001", "parte5-img_10441", "parte3-img_11301", "parte6-img_09741", "parte5-img_10161", "parte2-img_0974",
  "parte7-img_0963", "pate1-img_0957", "parte5-img_1393", "parte3-img_1471", "parte6-img_1586", "parte5-img_0126",
  "parte4-img_12421", "parte7-img_1022", "pate1-img_1049", "parte2-img_1058",
];
const STICKERS = ["ORDEN / CAOS", "REAL / VIRTUAL", "SAGRADO / PROFANO", "RECORTAS. PEGAS.", "MEMORIA", "ARCHIVO", "TOCA", "REFLEJA", "VOLTEA"];

type El = CollageElement;
let counter = 0;
const nid = () => `e${Date.now().toString(36)}${(counter++).toString(36)}`;

function useImg(src?: string) {
  const [img, setImg] = useState<HTMLImageElement | null>(null);
  useEffect(() => {
    if (!src) return;
    const i = new window.Image();
    i.src = src;
    i.onload = () => setImg(i);
  }, [src]);
  return img;
}

function PhotoNode({ el, common }: { el: El; common: Record<string, unknown> }) {
  const img = useImg(el.src);
  return img ? <KImage image={img} width={el.w} height={el.h} offsetX={(el.w ?? 0) / 2} offsetY={(el.h ?? 0) / 2} stroke="#ffffff" strokeWidth={6} {...common} /> : null;
}

export interface EditorHandle { exportImage: () => string | null; elements: El[] }

export function CollageEditor({ onChange }: { onChange: (h: EditorHandle) => void }) {
  const wrap = useRef<HTMLDivElement>(null);
  const stage = useRef<Konva.Stage>(null);
  const tr = useRef<Konva.Transformer>(null);
  const nodes = useRef(new Map<string, Konva.Node>());
  const [scale, setScale] = useState(1);
  const [els, setEls] = useState<El[]>([]);
  const [past, setPast] = useState<El[][]>([]);
  const [future, setFuture] = useState<El[][]>([]);
  const [sel, setSel] = useState<string | null>(null);
  const [tab, setTab] = useState<"fotos" | "formas" | "papel" | "texto" | "stickers">("fotos");
  const [text, setText] = useState("");
  const [color, setColor] = useState(COLORS[0]);

  useEffect(() => {
    const el = wrap.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setScale(Math.min(1, el.clientWidth / SIZE)));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const commit = useCallback((next: El[]) => {
    setPast((p) => [...p.slice(-40), els]);
    setFuture([]);
    setEls(next);
  }, [els]);

  useEffect(() => {
    const t = tr.current;
    if (!t) return;
    const n = sel ? nodes.current.get(sel) : undefined;
    t.nodes(n ? [n] : []);
    t.getLayer()?.batchDraw();
  }, [sel, els]);

  const exportImage = useCallback(() => {
    const st = stage.current;
    if (!st) return null;
    tr.current?.nodes([]);
    const url = st.toDataURL({ mimeType: "image/jpeg", quality: 0.82, pixelRatio: 1 / scale });
    return url;
  }, [scale]);

  useEffect(() => { onChange({ exportImage, elements: els }); }, [els, exportImage, onChange]);

  const base = (): Pick<El, "id" | "x" | "y" | "rotation" | "scaleX" | "scaleY"> => ({
    id: nid(), x: SIZE / 2 + (Math.random() - 0.5) * 160, y: SIZE / 2 + (Math.random() - 0.5) * 160,
    rotation: Math.round((Math.random() - 0.5) * 16), scaleX: 1, scaleY: 1,
  });
  const add = (e: El) => { commit([...els, e]); setSel(e.id); };
  const addPhoto = (id: string) => add({ ...base(), kind: "image", src: `/assets/room-04/archive/${id}.jpg`, w: 150, h: 200 });
  const addShape = (shape: "rect" | "circle" | "triangle") => add({ ...base(), kind: "shape", shape, fill: color, w: 140, h: 140 });
  const addPaper = () => add({ ...base(), kind: "paper", fill: color, w: 260, h: 46 });
  const addText = () => { if (text.trim()) { add({ ...base(), kind: "text", text: text.trim().slice(0, 80), fill: color }); setText(""); } };
  const addSticker = (t: string) => add({ ...base(), kind: "sticker", text: t, fill: color });

  const update = (id: string, patch: Partial<El>) => commit(els.map((e) => (e.id === id ? { ...e, ...patch } : e)));
  const move = (dir: 1 | -1) => {
    if (!sel) return;
    const i = els.findIndex((e) => e.id === sel);
    const j = i + dir;
    if (j < 0 || j >= els.length) return;
    const next = [...els];
    [next[i], next[j]] = [next[j], next[i]];
    commit(next);
  };
  const remove = () => { if (sel) { commit(els.filter((e) => e.id !== sel)); setSel(null); } };
  const undo = () => { if (!past.length) return; setFuture((f) => [els, ...f]); setEls(past[past.length - 1]); setPast((p) => p.slice(0, -1)); setSel(null); };
  const redo = () => { if (!future.length) return; setPast((p) => [...p, els]); setEls(future[0]); setFuture((f) => f.slice(1)); setSel(null); };
  const reset = () => { commit([]); setSel(null); };

  const onTransformEnd = (id: string) => {
    const n = nodes.current.get(id);
    if (!n) return;
    update(id, { x: n.x(), y: n.y(), rotation: n.rotation(), scaleX: n.scaleX(), scaleY: n.scaleY() });
  };

  return (
    <div className={s.editor}>
      <div className={s.tools} role="toolbar" aria-label="Herramientas del collage">
        <div className={s.tabs} role="tablist">
          {(["fotos", "formas", "papel", "texto", "stickers"] as const).map((t) => (
            <button key={t} role="tab" aria-selected={tab === t} className={`btn btn-sm ${tab === t ? "btn-oro" : ""}`} onClick={() => setTab(t)}>{t}</button>
          ))}
        </div>
        <div className={s.colors} role="radiogroup" aria-label="Color">
          {COLORS.map((c) => (
            <button key={c} role="radio" aria-checked={color === c} aria-label={`Color ${c}`} className={s.swatch} style={{ background: c, outline: color === c ? "2px solid var(--oro-hondo)" : undefined }} onClick={() => { setColor(c); if (sel) update(sel, { fill: c }); }} />
          ))}
        </div>
        <div className={s.library}>
          {tab === "fotos" && PHOTO_CUTS.map((id) => (
            <button key={id} className={s.cut} onClick={() => addPhoto(id)} aria-label={`Agregar recorte ${id}`}>
              <img src={`/assets/room-04/archive/${id}.jpg`} alt="" loading="lazy" />
            </button>
          ))}
          {tab === "formas" && (["rect", "circle", "triangle"] as const).map((sh) => (
            <button key={sh} className="btn btn-sm" onClick={() => addShape(sh)}>{sh === "rect" ? "Rectángulo" : sh === "circle" ? "Óvalo" : "Triángulo"}</button>
          ))}
          {tab === "papel" && <button className="btn btn-sm" onClick={addPaper}>Tira de papel</button>}
          {tab === "texto" && (
            <form className={s.textForm} onSubmit={(e) => { e.preventDefault(); addText(); }}>
              <label htmlFor="collage-text" className="sr-only">Texto</label>
              <input id="collage-text" value={text} maxLength={80} onChange={(e) => setText(e.target.value)} placeholder="Escribe una palabra o frase" />
              <button className="btn btn-sm" type="submit">Agregar</button>
            </form>
          )}
          {tab === "stickers" && STICKERS.map((t) => <button key={t} className="btn btn-sm" onClick={() => addSticker(t)}>{t}</button>)}
        </div>
        <div className={s.actions}>
          <button className="btn btn-sm" onClick={undo} disabled={!past.length}>Deshacer</button>
          <button className="btn btn-sm" onClick={redo} disabled={!future.length}>Rehacer</button>
          <button className="btn btn-sm" onClick={() => move(1)} disabled={!sel}>Subir capa</button>
          <button className="btn btn-sm" onClick={() => move(-1)} disabled={!sel}>Bajar capa</button>
          <button className="btn btn-sm" onClick={() => sel && update(sel, { rotation: ((els.find((e) => e.id === sel)?.rotation ?? 0) + 15) % 360 })} disabled={!sel}>Rotar 15°</button>
          <button className="btn btn-sm" onClick={remove} disabled={!sel}>Eliminar</button>
          <button className="btn btn-sm" onClick={reset} disabled={!els.length}>Reiniciar</button>
        </div>
      </div>
      <div ref={wrap} className={s.canvasWrap}>
        <Stage
          ref={stage}
          width={SIZE * scale}
          height={SIZE * scale}
          scaleX={scale}
          scaleY={scale}
          onMouseDown={(e) => { if (e.target === e.target.getStage() || e.target.name() === "bg") setSel(null); }}
          onTouchStart={(e) => { if (e.target === e.target.getStage() || e.target.name() === "bg") setSel(null); }}
          aria-label="Lienzo del collage"
        >
          <Layer>
            <Rect name="bg" width={SIZE} height={SIZE} fill="#f3eee3" />
            {els.map((el) => {
              const common = {
                x: el.x, y: el.y, rotation: el.rotation, scaleX: el.scaleX, scaleY: el.scaleY, draggable: true,
                ref: (n: Konva.Node | null) => { if (n) nodes.current.set(el.id, n); else nodes.current.delete(el.id); },
                onClick: () => setSel(el.id), onTap: () => setSel(el.id),
                onDragEnd: (e: Konva.KonvaEventObject<DragEvent>) => update(el.id, { x: e.target.x(), y: e.target.y() }),
                onTransformEnd: () => onTransformEnd(el.id),
                shadowColor: "#121110", shadowOffsetX: 6, shadowOffsetY: 6, shadowOpacity: 0.8, shadowBlur: 0,
              };
              if (el.kind === "image") return <PhotoNode key={el.id} el={el} common={common} />;
              if (el.kind === "shape") {
                if (el.shape === "circle") return <Circle key={el.id} radius={(el.w ?? 140) / 2} fill={el.fill} {...common} />;
                if (el.shape === "triangle") return <RegularPolygon key={el.id} sides={3} radius={(el.w ?? 140) / 1.6} fill={el.fill} {...common} />;
                return <Rect key={el.id} width={el.w} height={el.h} offsetX={(el.w ?? 0) / 2} offsetY={(el.h ?? 0) / 2} fill={el.fill} {...common} />;
              }
              if (el.kind === "paper")
                return (
                  <Group key={el.id} {...common}>
                    <Rect width={el.w} height={el.h} offsetX={(el.w ?? 0) / 2} offsetY={(el.h ?? 0) / 2} fill={el.fill} />
                    <Rect width={(el.w ?? 0) * 0.3} height={18} offsetX={(el.w ?? 0) * 0.15} offsetY={(el.h ?? 0) / 2 + 9} fill="rgba(246,220,140,0.6)" />
                  </Group>
                );
              if (el.kind === "sticker")
                return (
                  <Label key={el.id} {...common}>
                    <Tag fill={el.fill} />
                    <Text text={el.text} fontFamily="Jost, Futura, sans-serif" fontStyle="500" fontSize={26} padding={10} fill={el.fill === "#f3eee3" || el.fill === "#f2b90f" || el.fill === "#d4a12a" ? "#121110" : "#f3eee3"} />
                  </Label>
                );
              return <Text key={el.id} text={el.text} fontFamily="Jost, Futura, sans-serif" fontSize={40} fill={el.fill} {...common} />;
            })}
            <Transformer ref={tr} rotationSnaps={[0, 90, 180, 270]} borderStroke="#7d5a10" anchorStroke="#7d5a10" anchorFill="#f6dc8c" anchorSize={14} />
          </Layer>
        </Stage>
        {!els.length && <p className={s.empty}>Elige recortes de la biblioteca. Arrástralos, gíralos y apílalos.</p>}
      </div>
    </div>
  );
}

export { COLLAGE_SCHEMA_VERSION, SIZE as COLLAGE_SIZE };
