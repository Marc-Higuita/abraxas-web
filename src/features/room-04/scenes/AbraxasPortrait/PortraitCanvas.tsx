"use client";
import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { Canvas, useFrame, useLoader, useThree, type ThreeEvent } from "@react-three/fiber";
import { Html } from "@react-three/drei";
import * as THREE from "three";
import { useRoom } from "../../store";
import { PORTRAIT_FACTS, factFicha, type PortraitFact } from "./facts";
import s from "./abraxas.module.css";

const A = "/assets/room-04";
const BASE = `${A}/abraxas/retrato-base.jpg`;
const BACK = `${A}/abraxas/retrato-fondo.jpg`;
const STRIP = `${A}/cutouts/papeles/tira-rasgada-01.png`;
const TAPE = `${A}/cutouts/papeles/cinta-rosa-01.png`;

/** Medidas del retrato en unidades de escena (proporción 3:4 de la foto, sin deformar). */
const W = 3.3;
const H = 4.4;

interface Props {
  active: boolean;
  narrow: boolean;
  touch: boolean;
}

export function PortraitCanvas({ active, narrow, touch }: Props) {
  const low = useRoom((st) => st.lowPower);
  return (
    <Canvas
      dpr={low ? 1 : [1, 1.75]}
      frameloop={active ? "always" : "never"}
      camera={{ fov: 35, position: [0, 0, 12] }}
      gl={{ antialias: !low, alpha: true }}
      onCreated={({ gl }) => gl.setClearColor(0x000000, 0)}
    >
      <Suspense fallback={null}>
        <Scene narrow={narrow} touch={touch} active={active} />
      </Suspense>
    </Canvas>
  );
}

/* --------------------------------------------------------------------------------------------- */

const hash = (n: number) => {
  const x = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
};
const clamp01 = (x: number) => Math.min(1, Math.max(0, x));
const easeOut = (x: number) => 1 - Math.pow(1 - x, 3);

function useSrgb(url: string) {
  const tex = useLoader(THREE.TextureLoader, url);
  useEffect(() => {
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.anisotropy = 4;
    tex.needsUpdate = true;
  }, [tex]);
  return tex;
}

/** Puntero compartido por el retrato, las lentes y las tiras (uv sobre el retrato). */
interface PointerState {
  uv: THREE.Vector2; // suavizado
  target: THREE.Vector2;
  hover: number; // suavizado
  hoverTarget: number;
  lastInput: number;
}

function Scene({ narrow, touch, active }: { narrow: boolean; touch: boolean; active: boolean }) {
  const low = useRoom((st) => st.lowPower);
  const reduced = useRoom((st) => st.reducedMotion);
  const openFicha = useRoom((st) => st.openFicha);
  const base = useSrgb(BASE);
  const back = useSrgb(BACK);
  const group = useRef<THREE.Group>(null);
  const ptr = useRef<PointerState>({ uv: new THREE.Vector2(0.5, 0.6), target: new THREE.Vector2(0.5, 0.6), hover: 0, hoverTarget: 0, lastInput: -10 });
  /** Progreso de armado del retrato (0 disperso → 1 armado). Arranca la primera vez que la sección está activa. */
  const build = useRef(reduced ? 1 : 0);
  const started = useRef(false);
  const { camera, size } = useThree();

  useEffect(() => {
    if (active) started.current = true;
  }, [active]);

  // Encuadre: en pantallas anchas cabe el retrato con las miniaturas; en angostas, solo el retrato.
  useEffect(() => {
    const cam = camera as THREE.PerspectiveCamera;
    const aspect = size.width / Math.max(1, size.height);
    const t = Math.tan(THREE.MathUtils.degToRad(cam.fov / 2));
    const needW = narrow ? W + 0.9 : 9.4;
    const needH = narrow ? H + 1.1 : 7.0;
    cam.position.z = Math.max(needH / 2 / t, needW / 2 / (t * aspect));
    cam.updateProjectionMatrix();
  }, [camera, size, narrow]);

  useFrame((state, dt) => {
    const d = Math.min(dt, 0.05);
    const p = ptr.current;
    if (started.current && build.current < 1) build.current = reduced ? 1 : Math.min(1, build.current + d / 2.6);
    // En táctil, o sin interacción reciente en táctil, el puntero vaga solo en un bucle lento.
    const t = state.clock.elapsedTime;
    if (touch && !reduced && t - p.lastInput > 3.5 && build.current >= 1) {
      p.target.set(0.5 + Math.sin(t * 0.31) * 0.28, 0.58 + Math.sin(t * 0.23 + 1.2) * 0.26);
      p.hoverTarget = 0.85;
    }
    const k = 1 - Math.exp(-d * 7);
    p.uv.lerp(p.target, k);
    p.hover += (p.hoverTarget - p.hover) * (1 - Math.exp(-d * 5));
    // Parallax: el conjunto gira apenas hacia el cursor; las capas a distinta profundidad se separan.
    if (group.current) {
      const g = group.current;
      const tx = reduced ? 0 : touch ? Math.sin(t * 0.2) * 0.08 : state.pointer.x * 0.22;
      const ty = reduced ? 0 : touch ? Math.sin(t * 0.17) * 0.05 : -state.pointer.y * 0.12;
      g.rotation.y += (tx - g.rotation.y) * k * 0.6;
      g.rotation.x += (ty - g.rotation.x) * k * 0.6;
    }
  });

  const onMove = (e: ThreeEvent<PointerEvent>) => {
    if (!e.uv) return;
    ptr.current.target.copy(e.uv);
    ptr.current.lastInput = e.nativeEvent.timeStamp / 1000 || performance.now() / 1000;
  };

  return (
    <group ref={group}>
      {/* Capa del fondo: la casa, que se ve a través de las perforaciones */}
      <mesh position={[0, 0, -0.28]}>
        <planeGeometry args={[W * 1.04, H * 1.04]} />
        <meshBasicMaterial map={back} color="#cfc4b2" toneMapped={false} />
      </mesh>
      <Tiles base={base} ptr={ptr} build={build} cols={low ? 4 : narrow ? 5 : 6} rows={low ? 5 : narrow ? 7 : 8} shadows={!low} />
      <Strips ptr={ptr} build={build} low={low} />
      <Lenses base={base} ptr={ptr} build={build} count={low || narrow ? 1 : 2} reduced={reduced} />
      {!narrow && PORTRAIT_FACTS.map((f, i) => <Fact key={f.id} fact={f} i={i} build={build} reduced={reduced} onOpen={() => openFicha(factFicha(f))} />)}
      {/* Superficie invisible que recibe el puntero sobre el retrato */}
      <mesh
        position={[0, 0, 1.3]}
        onPointerMove={onMove}
        onPointerOver={() => (ptr.current.hoverTarget = 1)}
        onPointerOut={() => (ptr.current.hoverTarget = 0)}
        onPointerDown={(e) => {
          onMove(e);
          ptr.current.hoverTarget = 1;
        }}
      >
        <planeGeometry args={[W, H]} />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} />
      </mesh>
    </group>
  );
}

/* ---------------------------------- Teselas del retrato -------------------------------------- */

const tileVert = /* glsl */ `
  attribute vec2 aLocal;
  attribute float aSeed;
  varying vec2 vUv;
  varying vec2 vLocal;
  varying float vSeed;
  void main() {
    vUv = uv; vLocal = aLocal; vSeed = aSeed;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const tileFrag = /* glsl */ `
  uniform sampler2D uMap;
  uniform vec2 uPointer;
  uniform float uHover;
  uniform float uAspect;
  uniform float uTime;
  varying vec2 vUv;
  varying vec2 vLocal;
  varying float vSeed;
  float h21(vec2 p) { return fract(sin(dot(p, vec2(41.3, 289.1))) * 43758.5453); }
  float vnoise(vec2 p) {
    vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
    return mix(mix(h21(i), h21(i + vec2(1, 0)), f.x), mix(h21(i + vec2(0, 1)), h21(i + 1.0), f.x), f.y);
  }
  void main() {
    // Borde rasgado: cada tesela tiene un contorno irregular propio, como papel cortado a mano.
    float e = min(min(vLocal.x, 1.0 - vLocal.x), min(vLocal.y, 1.0 - vLocal.y));
    float n = vnoise(vLocal * 26.0 + vSeed * 17.0);
    if (e < 0.006 + n * 0.022) discard;
    vec4 c = texture2D(uMap, vUv);
    float rim = 1.0 - smoothstep(0.0, 0.03, e - n * 0.022);
    c.rgb = mix(c.rgb, vec3(0.96, 0.94, 0.88), rim * 0.7);

    // Perforación: huecos circulares en retícula alrededor del cursor; dejan ver la casa detrás.
    vec2 p = vec2(vUv.x * uAspect, vUv.y);
    vec2 q = vec2(uPointer.x * uAspect, uPointer.y);
    float d = distance(p, q);
    float R = 0.2;
    float infl = (1.0 - smoothstep(0.05, R, d)) * uHover;
    float sp = 0.034;
    vec2 cell = (fract(p / sp) - 0.5) * sp;
    float hr = length(cell);
    float holeR = sp * 0.44 * infl;
    if (infl > 0.02 && hr < holeR) discard;
    float lip = smoothstep(holeR + 0.005, holeR, hr) * step(0.02, infl);
    c.rgb *= 1.0 - lip * 0.5;

    // Costura: una puntada discontinua bordea la zona perforada.
    float ang = atan(p.y - q.y, p.x - q.x);
    float dash = step(0.45, fract(ang * 9.549 + uTime * 0.25));
    float stitch = (1.0 - smoothstep(0.0025, 0.0045, abs(d - R * 1.04))) * dash * uHover;
    c.rgb = mix(c.rgb, vec3(0.85, 0.2, 0.12), stitch);

    gl_FragColor = vec4(c.rgb, 1.0);
    #include <colorspace_fragment>
  }
`;

interface TileDef {
  geo: THREE.BufferGeometry;
  final: THREE.Vector3;
  rotF: number;
  start: THREE.Vector3;
  rotS: number;
  delay: number;
  w: number;
  h: number;
}

function Tiles({ base, ptr, build, cols, rows, shadows }: { base: THREE.Texture; ptr: React.RefObject<PointerState>; build: React.RefObject<number>; cols: number; rows: number; shadows: boolean }) {
  const refs = useRef<(THREE.Group | null)[]>([]);
  const mat = useMemo(
    () =>
      new THREE.ShaderMaterial({
        vertexShader: tileVert,
        fragmentShader: tileFrag,
        uniforms: { uMap: { value: base }, uPointer: { value: new THREE.Vector2(0.5, 0.5) }, uHover: { value: 0 }, uAspect: { value: W / H }, uTime: { value: 0 } },
      }),
    [base],
  );
  const shadowMat = useMemo(() => new THREE.MeshBasicMaterial({ color: "#000", transparent: true, opacity: 0.28, depthWrite: false }), []);

  const tiles = useMemo<TileDef[]>(() => {
    const out: TileDef[] = [];
    const cw = W / cols;
    const ch = H / rows;
    const over = 1.07; // las teselas se montan unas sobre otras para que no quede ningún hueco
    for (let r = 0; r < rows; r++)
      for (let c = 0; c < cols; c++) {
        const i = r * cols + c;
        const w = cw * over;
        const h = ch * over;
        const cx = -W / 2 + (c + 0.5) * cw;
        const cy = -H / 2 + (r + 0.5) * ch;
        const geo = new THREE.PlaneGeometry(w, h);
        const uv = geo.attributes.uv as THREE.BufferAttribute;
        const local = new Float32Array(uv.count * 2);
        for (let k = 0; k < uv.count; k++) {
          const lu = uv.getX(k);
          const lv = uv.getY(k);
          local[k * 2] = lu;
          local[k * 2 + 1] = lv;
          uv.setXY(k, clamp01((cx + (lu - 0.5) * w) / W + 0.5), clamp01((cy + (lv - 0.5) * h) / H + 0.5));
        }
        geo.setAttribute("aLocal", new THREE.BufferAttribute(local, 2));
        geo.setAttribute("aSeed", new THREE.BufferAttribute(new Float32Array(uv.count).fill(hash(i + 3)), 1));
        const a = hash(i) * Math.PI * 2;
        const rad = 5 + hash(i + 9) * 4;
        out.push({
          geo,
          w,
          h,
          final: new THREE.Vector3(cx, cy, (hash(i + 21) - 0.5) * 0.08 + ((r + c) % 2) * 0.012),
          rotF: (hash(i + 5) - 0.5) * 0.045,
          start: new THREE.Vector3(Math.cos(a) * rad, Math.sin(a) * rad * 0.7, -2 + hash(i + 7) * 5),
          rotS: (hash(i + 11) - 0.5) * Math.PI * 1.6,
          // de arriba hacia abajo, con desorden: la cabeza se arma primero
          delay: ((rows - 1 - r) / rows) * 0.42 + hash(i + 13) * 0.18,
        });
      }
    return out;
  }, [cols, rows]);

  useEffect(() => () => tiles.forEach((t) => t.geo.dispose()), [tiles]);
  useEffect(() => () => mat.dispose(), [mat]);

  useFrame((state) => {
    const p = ptr.current;
    if (!p) return;
    mat.uniforms.uPointer.value.copy(p.uv);
    mat.uniforms.uHover.value = p.hover * clamp01((build.current - 0.9) / 0.1);
    mat.uniforms.uTime.value = state.clock.elapsedTime;
    const b = build.current;
    tiles.forEach((t, i) => {
      const g = refs.current[i];
      if (!g) return;
      const k = easeOut(clamp01((b - t.delay) / 0.4));
      g.position.lerpVectors(t.start, t.final, k);
      g.rotation.z = THREE.MathUtils.lerp(t.rotS, t.rotF, k);
      g.scale.setScalar(0.6 + 0.4 * k);
      g.visible = b > t.delay * 0.6;
    });
  });

  return (
    <group>
      {tiles.map((t, i) => (
        <group key={i} ref={(el) => { refs.current[i] = el; }}>
          {shadows && (
            <mesh position={[0.035, -0.045, -0.012]} material={shadowMat}>
              <planeGeometry args={[t.w * 0.96, t.h * 0.96]} />
            </mesh>
          )}
          <mesh geometry={t.geo} material={mat} />
        </group>
      ))}
    </group>
  );
}

/* --------------------------------- Tiras de papel y cinta ------------------------------------ */

function Strips({ ptr, build, low }: { ptr: React.RefObject<PointerState>; build: React.RefObject<number>; low: boolean }) {
  const strip = useSrgb(STRIP);
  const tape = useSrgb(TAPE);
  const items = useMemo(
    () =>
      [
        { tex: "strip", w: 1.9, h: 1.9 * (270 / 588), pos: [-W / 2 - 0.25, H * 0.18, 0.45], rot: 0.32, depth: 0.55 },
        { tex: "strip", w: 1.6, h: 1.6 * (270 / 588), pos: [W / 2 + 0.2, -H * 0.3, 0.6], rot: -0.22, depth: 0.8 },
        { tex: "tape", w: 1.1, h: 1.1 * (182 / 520), pos: [-W / 2 + 0.3, H / 2 - 0.05, 0.3], rot: -0.6, depth: 0.3 },
        { tex: "tape", w: 1.1, h: 1.1 * (182 / 520), pos: [W / 2 - 0.3, H / 2 - 0.05, 0.3], rot: 0.55, depth: 0.3 },
      ].slice(0, low ? 2 : 4),
    [low],
  );
  const refs = useRef<(THREE.Mesh | null)[]>([]);
  useFrame((state) => {
    const p = ptr.current;
    if (!p) return;
    const show = clamp01((build.current - 0.75) / 0.25);
    items.forEach((it, i) => {
      const m = refs.current[i];
      if (!m) return;
      // las tiras se corren con el cursor según su profundidad
      const dx = (p.uv.x - 0.5) * it.depth * 0.5 * p.hover;
      const dy = (p.uv.y - 0.5) * it.depth * 0.3 * p.hover;
      m.position.set(it.pos[0] + dx, it.pos[1] + dy + (1 - show) * 2.5, it.pos[2]);
      m.rotation.z = it.rot + Math.sin(state.clock.elapsedTime * 0.6 + i) * 0.015;
      (m.material as THREE.MeshBasicMaterial).opacity = show;
    });
  });
  return (
    <group>
      {items.map((it, i) => (
        <mesh key={i} ref={(el) => { refs.current[i] = el; }} renderOrder={2}>
          <planeGeometry args={[it.w, it.h]} />
          <meshBasicMaterial map={it.tex === "strip" ? strip : tape} transparent depthWrite={false} toneMapped={false} />
        </mesh>
      ))}
    </group>
  );
}

/* ---------------------------------- Lentes colgadas de hilos --------------------------------- */

const lensVert = /* glsl */ `
  varying vec2 vPos;
  void main() { vPos = position.xy; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }
`;
const lensFrag = /* glsl */ `
  uniform sampler2D uMap;
  uniform vec2 uCenter;
  uniform float uR;
  uniform float uZoom;
  uniform vec2 uSize;
  varying vec2 vPos;
  void main() {
    vec2 l = vPos / uR;
    float r = length(l);
    if (r > 1.0) discard;
    // lente convexa: aumenta al centro y curva hacia el borde
    vec2 lb = l * (1.0 - 0.22 * r * r);
    vec2 off = vec2(lb.x * uR / uSize.x, lb.y * uR / uSize.y) * uZoom;
    vec2 uv = uCenter + off;
    float ca = 0.004 * r;
    vec3 col = vec3(texture2D(uMap, uv + off * ca * 20.0).r, texture2D(uMap, uv).g, texture2D(uMap, uv - off * ca * 20.0).b);
    if (uv.x < 0.0 || uv.x > 1.0 || uv.y < 0.0 || uv.y > 1.0) col = vec3(0.07);
    // aro dorado, brillo y sombra interior
    float ring = smoothstep(0.86, 0.9, r) - smoothstep(0.97, 1.0, r);
    col = mix(col, vec3(0.83, 0.63, 0.16), ring);
    col *= 1.0 - smoothstep(0.7, 0.9, r) * 0.25 * (1.0 - ring);
    float glint = smoothstep(0.2, 0.0, length(l - vec2(-0.38, 0.42))) * 0.55;
    col += glint;
    gl_FragColor = vec4(col, 1.0);
    #include <colorspace_fragment>
  }
`;

function Lenses({ base, ptr, build, count, reduced }: { base: THREE.Texture; ptr: React.RefObject<PointerState>; build: React.RefObject<number>; count: number; reduced: boolean }) {
  const R = 0.52;
  const TOP = H / 2 + 1.6;
  const defs = useMemo(
    () => [
      { rest: new THREE.Vector2(-W * 0.18, H * 0.2), off: -0.35, zoom: 0.5 },
      { rest: new THREE.Vector2(W * 0.24, -H * 0.06), off: 0.45, zoom: 0.62 },
    ].slice(0, count),
    [count],
  );
  const mats = useMemo(
    () =>
      defs.map(
        (d) =>
          new THREE.ShaderMaterial({
            vertexShader: lensVert,
            fragmentShader: lensFrag,
            uniforms: { uMap: { value: base }, uCenter: { value: new THREE.Vector2(0.5, 0.5) }, uR: { value: R }, uZoom: { value: d.zoom }, uSize: { value: new THREE.Vector2(W, H) } },
          }),
      ),
    [defs, base],
  );
  useEffect(() => () => mats.forEach((m) => m.dispose()), [mats]);
  const state = useRef(defs.map((d) => ({ x: d.rest.x, y: d.rest.y, vx: 0, vy: 0 })));
  const lensRefs = useRef<(THREE.Group | null)[]>([]);
  const threadRefs = useRef<(THREE.Mesh | null)[]>([]);

  useFrame((st, dt) => {
    const p = ptr.current;
    if (!p) return;
    const d = Math.min(dt, 0.04);
    const show = clamp01((build.current - 0.85) / 0.15);
    defs.forEach((def, i) => {
      const s = state.current[i];
      // con el cursor encima, cada lente se acerca a él (con su propio desfase); sin él, vuelve a su sitio
      const px = (p.uv.x - 0.5) * W + def.off;
      const py = (p.uv.y - 0.5) * H + (i ? -0.4 : 0.35);
      const tx = THREE.MathUtils.lerp(def.rest.x, px, p.hover);
      const ty = THREE.MathUtils.lerp(def.rest.y, py, p.hover * 0.7);
      if (reduced) {
        s.x = tx;
        s.y = ty;
      } else {
        // resorte amortiguado: la lente se mece colgada de su hilo
        s.vx += ((tx - s.x) * 18 - s.vx * 5.5) * d;
        s.vy += ((ty - s.y) * 18 - s.vy * 5.5) * d;
        s.x += s.vx * d;
        s.y += s.vy * d;
      }
      const g = lensRefs.current[i];
      const th = threadRefs.current[i];
      const y = s.y + (1 - show) * 4;
      if (g) {
        g.position.set(s.x, y, 0.95);
        g.rotation.z = THREE.MathUtils.clamp(-s.vx * 0.05, -0.3, 0.3);
        mats[i].uniforms.uCenter.value.set(s.x / W + 0.5, y / H + 0.5);
      }
      if (th) {
        // el hilo va del techo a la parte alta del aro
        const topX = s.x * 0.65;
        const len = Math.max(0.1, Math.hypot(s.x - topX, TOP - (y + R)));
        th.position.set((s.x + topX) / 2, (TOP + y + R) / 2, 0.94);
        th.scale.set(1, len, 1);
        th.rotation.z = Math.atan2(s.x - topX, TOP - (y + R));
      }
    });
    void st;
  });

  return (
    <group>
      {defs.map((_, i) => (
        <group key={i}>
          <mesh ref={(el) => { threadRefs.current[i] = el; }}>
            <planeGeometry args={[0.014, 1]} />
            <meshBasicMaterial color="#efe6d2" toneMapped={false} />
          </mesh>
          <group ref={(el) => { lensRefs.current[i] = el; }}>
            <mesh position={[0.05, -0.06, -0.02]}>
              <circleGeometry args={[R, 48]} />
              <meshBasicMaterial color="#000" transparent opacity={0.35} depthWrite={false} />
            </mesh>
            <mesh material={mats[i]}>
              <circleGeometry args={[R, 64]} />
            </mesh>
          </group>
        </group>
      ))}
    </group>
  );
}

/* ----------------------------- Miniaturas flotantes con rótulo ------------------------------- */

function Fact({ fact, i, build, reduced, onOpen }: { fact: PortraitFact; i: number; build: React.RefObject<number>; reduced: boolean; onOpen: () => void }) {
  const tex = useSrgb(fact.thumb);
  const g = useRef<THREE.Group>(null);
  const [hot, setHot] = useState(false);
  const TW = 0.95;
  const TH = 0.72;
  // recorte tipo "cover" sin deformar la foto
  useEffect(() => {
    const img = tex.image as HTMLImageElement | undefined;
    if (!img?.width) return;
    const ia = img.width / img.height;
    const pa = TW / TH;
    tex.wrapS = tex.wrapT = THREE.ClampToEdgeWrapping;
    if (ia > pa) {
      tex.repeat.set(pa / ia, 1);
      tex.offset.set((1 - pa / ia) / 2, 0);
    } else {
      tex.repeat.set(1, ia / pa);
      tex.offset.set(0, (1 - ia / pa) / 2);
    }
    tex.needsUpdate = true;
  }, [tex]);

  const line = useMemo(() => {
    const ax = (fact.anchor[0] - 0.5) * W;
    const ay = (fact.anchor[1] - 0.5) * H;
    const geo = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(ax, ay, 0.06), new THREE.Vector3(...fact.pos)]);
    const l = new THREE.Line(geo, new THREE.LineDashedMaterial({ color: "#d4a12a", dashSize: 0.08, gapSize: 0.06, transparent: true, opacity: 0 }));
    l.computeLineDistances();
    return l;
  }, [fact]);
  useEffect(() => () => { line.geometry.dispose(); (line.material as THREE.Material).dispose(); }, [line]);

  useFrame((state) => {
    const show = easeOut(clamp01((build.current - 0.7 - i * 0.035) / 0.25));
    (line.material as THREE.LineDashedMaterial).opacity = show * 0.85;
    if (!g.current) return;
    const t = state.clock.elapsedTime;
    const bob = reduced ? 0 : Math.sin(t * 0.8 + i * 1.7) * 0.06;
    g.current.position.set(fact.pos[0], fact.pos[1] + bob, fact.pos[2]);
    const sc = show * (hot ? 1.12 : 1);
    g.current.scale.lerp(new THREE.Vector3(sc, sc, sc), 0.18);
    g.current.rotation.z = (hash(i + 40) - 0.5) * 0.14 + (reduced ? 0 : Math.sin(t * 0.5 + i) * 0.02);
  });

  return (
    <>
      <primitive object={line} />
      <group ref={g} scale={0}>
        <mesh position={[0.04, -0.05, -0.02]}>
          <planeGeometry args={[TW + 0.1, TH + 0.1]} />
          <meshBasicMaterial color="#000" transparent opacity={0.35} depthWrite={false} />
        </mesh>
        <mesh position={[0, 0, -0.01]}>
          <planeGeometry args={[TW + 0.08, TH + 0.08]} />
          <meshBasicMaterial color={hot ? "#d4a12a" : "#c9a878"} toneMapped={false} />
        </mesh>
        <mesh
          onClick={(e) => { e.stopPropagation(); onOpen(); }}
          onPointerOver={(e) => { e.stopPropagation(); setHot(true); document.body.style.cursor = "pointer"; }}
          onPointerOut={() => { setHot(false); document.body.style.cursor = ""; }}
        >
          <planeGeometry args={[TW, TH]} />
          <meshBasicMaterial map={tex} toneMapped={false} />
        </mesh>
        <Html position={[0, -TH / 2 - 0.08, 0]} center zIndexRange={[20, 0]}>
          <button type="button" className={`${s.tag} ${hot ? s.tagHot : ""}`} data-cursor="ver" onClick={onOpen} onFocus={() => setHot(true)} onBlur={() => setHot(false)} onMouseEnter={() => setHot(true)} onMouseLeave={() => setHot(false)}>
            {fact.label}
          </button>
        </Html>
      </group>
    </>
  );
}
