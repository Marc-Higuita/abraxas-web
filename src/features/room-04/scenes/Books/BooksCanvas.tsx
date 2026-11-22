"use client";
import { useEffect, useMemo, useRef } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import type { Book } from "../../types";
import { useRoom } from "../../store";

/**
 * Biblioteca 3D: tres libros de pie. Al pasar el cursor, halo dorado, elevación y sombra que se abre.
 * Al elegir uno, viaja al centro, la tapa gira sobre el lomo y el bloque se reparte en dos según la
 * página: las hojas escaneadas se pasan con una hoja que se curva (vertex shader).
 */

const H = 1.85;
const BOARD = 0.035;
const SLOTS = [-1.95, 0, 1.95];

export interface FlipState {
  /** Pliego visible: página izquierda = 2·spread, derecha = 2·spread + 1. */
  spread: number;
  /** Hoja en movimiento: dirección y momento de inicio (s). */
  flip: { dir: 1 | -1; from: number } | null;
}

interface Props {
  books: Book[];
  selected: number | null;
  hovered: number | null;
  onSelect: (i: number) => void;
  onHover: (i: number | null) => void;
  flip: FlipState;
  onFlipDone: () => void;
  active: boolean;
  narrow: boolean;
  focus: "left" | "right";
}

export const FLIP_MS = 720;

export function BooksCanvas(props: Props) {
  const low = useRoom((s) => s.lowPower);
  return (
    <Canvas
      dpr={low ? 1 : [1, 1.75]}
      frameloop={props.active ? "always" : "never"}
      camera={{ fov: 38, position: [0, 0.25, 6.6] }}
      gl={{ antialias: true }}
      onCreated={({ gl }) => { gl.setClearColor("#121110"); gl.toneMapping = THREE.ACESFilmicToneMapping; }}
      onPointerMissed={() => props.onHover(null)}
    >
      <ambientLight intensity={0.7} />
      <directionalLight position={[3, 5, 4]} intensity={2.1} />
      <directionalLight position={[-4, 2, -2]} intensity={0.7} color="#f6dc8c" />
      <PageCache>
        {props.books.map((b, i) => (
          <Book3D key={b.id} book={b} index={i} {...props} />
        ))}
      </PageCache>
      <CameraRig selected={props.selected} narrow={props.narrow} focus={props.focus} books={props.books} />
    </Canvas>
  );
}

/* ---------- utilidades de textura ---------- */

const cache = new Map<string, THREE.Texture>();
const loader = new THREE.TextureLoader();
function tex(url: string | null): THREE.Texture | null {
  if (!url) return null;
  let t = cache.get(url);
  if (!t) {
    t = loader.load(url, (x) => { x.colorSpace = THREE.SRGBColorSpace; x.anisotropy = 4; x.needsUpdate = true; });
    t.colorSpace = THREE.SRGBColorSpace;
    cache.set(url, t);
    // límite simple de memoria: se liberan las más antiguas
    if (cache.size > 28) {
      const first = cache.keys().next().value as string;
      cache.get(first)?.dispose();
      cache.delete(first);
    }
  }
  return t;
}
function PageCache({ children }: { children: React.ReactNode }) {
  useEffect(() => () => { cache.forEach((t) => t.dispose()); cache.clear(); }, []);
  return <>{children}</>;
}

/** Papel liso (guardas y páginas aún sin digitalizar). */
function paperTexture() {
  const c = document.createElement("canvas");
  c.width = 256; c.height = 360;
  const g = c.getContext("2d")!;
  g.fillStyle = "#efe6d2"; g.fillRect(0, 0, 256, 360);
  for (let i = 0; i < 1800; i++) {
    g.fillStyle = `rgba(120,96,60,${Math.random() * 0.05})`;
    g.fillRect(Math.random() * 256, Math.random() * 360, 1.5, 1.5);
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

/** Halo dorado radial. */
function haloTexture() {
  const c = document.createElement("canvas");
  c.width = c.height = 256;
  const g = c.getContext("2d")!;
  const r = g.createRadialGradient(128, 128, 0, 128, 128, 128);
  r.addColorStop(0, "rgba(255,214,120,0.95)");
  r.addColorStop(0.35, "rgba(212,161,42,0.55)");
  r.addColorStop(1, "rgba(212,161,42,0)");
  g.fillStyle = r; g.fillRect(0, 0, 256, 256);
  return new THREE.CanvasTexture(c);
}

/** Sombra de contacto suave. */
function blobTexture() {
  const c = document.createElement("canvas");
  c.width = c.height = 128;
  const g = c.getContext("2d")!;
  const r = g.createRadialGradient(64, 64, 0, 64, 64, 64);
  r.addColorStop(0, "rgba(0,0,0,0.75)");
  r.addColorStop(1, "rgba(0,0,0,0)");
  g.fillStyle = r; g.fillRect(0, 0, 128, 128);
  return new THREE.CanvasTexture(c);
}

/* ---------- hoja que se curva al pasar ---------- */

const sheetVert = /* glsl */ `
  uniform float uTheta; uniform float uCurl; uniform float uW;
  varying vec2 vUv; varying float vShade;
  void main() {
    vUv = uv;
    float u = uv.x;
    float c = uCurl + 0.0001;
    float phi = uTheta + c * u;
    float x = uW * (sin(phi) - sin(uTheta)) / c;
    float z = uW * (cos(uTheta) - cos(phi)) / c;
    // giro alrededor del eje Y: la hoja se levanta hacia la cámara (+z) y cae a la izquierda
    vec3 p = vec3(x, position.y, z);
    vShade = 0.72 + 0.28 * abs(cos(phi));
    gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
  }
`;
const sheetFrag = /* glsl */ `
  uniform sampler2D uFront; uniform sampler2D uBack;
  varying vec2 vUv; varying float vShade;
  void main() {
    vec4 col = gl_FrontFacing ? texture2D(uFront, vUv) : texture2D(uBack, vec2(1.0 - vUv.x, vUv.y));
    gl_FragColor = vec4(col.rgb * vShade, 1.0);
    #include <colorspace_fragment>
  }
`;

/* ---------- cámara ---------- */

function CameraRig({ selected, narrow, focus, books }: { selected: number | null; narrow: boolean; focus: "left" | "right"; books: Book[] }) {
  const { camera, pointer, size } = useThree();
  const reduced = useRoom((s) => s.reducedMotion);
  useFrame((_, dt) => {
    const cam = camera as THREE.PerspectiveCamera;
    const aspect = size.width / size.height;
    const tan = Math.tan(THREE.MathUtils.degToRad(cam.fov / 2));
    let z = 6.6;
    let x = pointer.x * 0.35;
    let y = 0.25;
    if (selected !== null) {
      const W = H * books[selected].aspect;
      // en pantallas estrechas se enfoca la página derecha; en anchas, el pliego completo
      const spanW = narrow ? W * 1.12 : W * 2 * 1.12;
      const spanH = H * 1.18;
      z = Math.max(spanH / (2 * tan), spanW / (2 * tan * aspect));
      x = narrow ? (focus === "right" ? W / 2 : -W / 2) : 0;
      y = 0;
    } else if (aspect < 0.9) {
      z = 3.6 / (2 * tan * aspect); // que quepan los tres libros
    }
    const k = reduced ? 1 : 1 - Math.exp(-dt * 3);
    cam.position.x += (x - cam.position.x) * k;
    cam.position.y += (y - cam.position.y) * k;
    cam.position.z += (z - cam.position.z) * k;
    cam.lookAt(cam.position.x * (selected !== null ? 1 : 0), 0, 0);
  });
  return null;
}

/* ---------- libro ---------- */

function Book3D({ book, index, selected, hovered, onSelect, onHover, flip, onFlipDone, narrow }: Props & { book: Book; index: number }) {
  const root = useRef<THREE.Group>(null);
  const hinge = useRef<THREE.Group>(null);
  const halo = useRef<THREE.Mesh>(null);
  const blob = useRef<THREE.Mesh>(null);
  const rightBlock = useRef<THREE.Mesh>(null);
  const leftBlock = useRef<THREE.Mesh>(null);
  const leftPage = useRef<THREE.Mesh>(null);
  const rightPage = useRef<THREE.Mesh>(null);
  const sheet = useRef<THREE.Mesh>(null);
  const reduced = useRoom((s) => s.reducedMotion);

  const W = H * book.aspect;
  const PW = W - 0.06;
  const PH = H - 0.06;
  const T = book.thickness;
  const TP = T - BOARD * 2;
  const isSel = selected === index;
  const maxSpread = Math.max(1, Math.ceil(book.pageCount / 2));

  const mats = useMemo(() => {
    const paper = paperTexture();
    const cover = book.cover ? loader.load(book.cover, (x) => { x.colorSpace = THREE.SRGBColorSpace; x.anisotropy = 8; x.needsUpdate = true; }) : null;
    if (cover) cover.colorSpace = THREE.SRGBColorSpace;
    const board = new THREE.MeshStandardMaterial({ color: book.color, roughness: 0.72 });
    const spine = new THREE.MeshStandardMaterial({ color: book.spine, roughness: 0.5, metalness: 0.15 });
    const coverFace = new THREE.MeshStandardMaterial({ map: cover, color: cover ? "#ffffff" : book.color, roughness: 0.62 });
    const inside = new THREE.MeshStandardMaterial({ map: paper, roughness: 0.9 });
    const c = document.createElement("canvas");
    c.width = 64; c.height = 256;
    const g = c.getContext("2d")!;
    g.fillStyle = "#f1eadb"; g.fillRect(0, 0, 64, 256);
    g.fillStyle = "rgba(110,104,95,0.25)";
    for (let x = 0; x < 64; x += 3) g.fillRect(x, 0, 1, 256);
    const edges = new THREE.MeshStandardMaterial({ map: new THREE.CanvasTexture(c), roughness: 0.95 });
    const left = new THREE.MeshBasicMaterial({ map: paper, toneMapped: false });
    const right = new THREE.MeshBasicMaterial({ map: paper, toneMapped: false });
    const sheetMat = new THREE.ShaderMaterial({
      vertexShader: sheetVert,
      fragmentShader: sheetFrag,
      side: THREE.DoubleSide,
      uniforms: { uTheta: { value: 0 }, uCurl: { value: 0 }, uW: { value: PW }, uFront: { value: paper }, uBack: { value: paper } },
    });
    const haloMat = new THREE.MeshBasicMaterial({ map: haloTexture(), transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, opacity: 0 });
    const blobMat = new THREE.MeshBasicMaterial({ map: blobTexture(), transparent: true, depthWrite: false, opacity: 0.5 });
    return { paper, board, spine, coverFace, inside, edges, left, right, sheetMat, haloMat, blobMat };
  }, [book.cover, book.color, book.spine, PW]);
  useEffect(() => () => {
    // las texturas de página viven en la caché compartida; aquí solo se liberan las generadas
    [mats.paper, mats.coverFace.map, mats.edges.map, mats.haloMat.map, mats.blobMat.map].forEach((x) => x?.dispose());
    [mats.board, mats.spine, mats.coverFace, mats.inside, mats.edges, mats.left, mats.right, mats.sheetMat, mats.haloMat, mats.blobMat].forEach((m) => m.dispose());
  }, [mats]);

  // caras de BoxGeometry: +x, -x, +y, -y, +z, -z
  const frontMats = useMemo(() => [mats.board, mats.board, mats.board, mats.board, mats.coverFace, mats.inside], [mats]);

  const page = (p: number) => (p >= 1 && p <= book.pageCount ? tex(book.pageImage(p)) : mats.paper);

  // Texturas del pliego según el estado de la hoja
  useEffect(() => {
    if (!isSel) return;
    const s = flip.spread;
    const L = 2 * s, R = 2 * s + 1;
    const m = mats;
    if (flip.flip?.dir === 1) {
      m.left.map = page(L);
      m.right.map = page(R + 2);
      m.sheetMat.uniforms.uFront.value = page(R);
      m.sheetMat.uniforms.uBack.value = page(R + 1);
    } else if (flip.flip?.dir === -1) {
      m.left.map = page(L - 2);
      m.right.map = page(R);
      m.sheetMat.uniforms.uFront.value = page(L - 1);
      m.sheetMat.uniforms.uBack.value = page(L);
    } else {
      m.left.map = page(L);
      m.right.map = page(R);
    }
    m.left.needsUpdate = true;
    m.right.needsUpdate = true;
    // precarga de las páginas vecinas
    for (let p = L - 2; p <= R + 4; p++) page(p);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isSel, flip.spread, flip.flip, mats, book]);

  const st = useRef({ open: 0, hover: 0, frac: 0 });
  const doneRef = useRef(onFlipDone);
  doneRef.current = onFlipDone;

  useFrame((s3, dt) => {
    const g = root.current, h = hinge.current;
    if (!g || !h) return;
    const others = selected !== null && !isSel;
    const k = reduced ? 1 : 1 - Math.exp(-dt * 3.2);
    const hov = hovered === index && selected === null ? 1 : 0;
    st.current.hover += (hov - st.current.hover) * (reduced ? 1 : 1 - Math.exp(-dt * 6));
    const hv = st.current.hover;

    // posición en la biblioteca / al centro
    const narrowLib = s3.size.width / s3.size.height < 0.9;
    const slot = SLOTS[index] * (narrowLib ? 0.62 : 1);
    const tx = isSel ? 0 : others ? (index < (selected ?? 0) ? -4.6 : 4.6) : slot;
    const tz = isSel ? 0 : others ? -2.2 : hv * 0.25;
    const ty = isSel ? 0 : hv * 0.12 + (reduced ? 0 : Math.sin(s3.clock.elapsedTime * 0.8 + index * 2) * 0.03);
    const tryaw = isSel ? 0 : others ? (index < (selected ?? 0) ? 0.7 : -0.7) : (index - 1) * -0.3 * (1 - hv * 0.6) + s3.pointer.x * 0.08 * hv;
    const trpitch = isSel ? 0 : -s3.pointer.y * 0.06 * hv;
    g.position.x += (tx - g.position.x) * k;
    g.position.z += (tz - g.position.z) * k;
    g.position.y += (ty - g.position.y) * k;
    g.rotation.y += (tryaw - g.rotation.y) * k;
    g.rotation.x += (trpitch - g.rotation.x) * k;
    const sc = others ? 0.6 : narrowLib && !isSel ? 0.6 : 1;
    g.scale.setScalar(g.scale.x + (sc - g.scale.x) * k);

    // apertura: la tapa gira sobre el lomo y el lomo se aplana hacia la contracubierta
    const target = isSel ? 1 : 0;
    st.current.open += (target - st.current.open) * (reduced ? 1 : 1 - Math.exp(-dt * 2.6));
    const o = st.current.open;
    h.rotation.y = -o * Math.PI;
    h.position.z = THREE.MathUtils.lerp(T / 2 - BOARD / 2, -T / 2 + BOARD / 2, o);
    // el libro abierto se desplaza para que el lomo quede al centro
    const shift = o * (W / 2);
    h.parent!.position.x = shift;

    // volumen: el bloque se reparte entre izquierda y derecha según el avance
    const fTarget = isSel ? Math.min(1, flip.spread / maxSpread) : 0;
    st.current.frac += (fTarget - st.current.frac) * (reduced ? 1 : 1 - Math.exp(-dt * 4));
    const tL = Math.max(0.004, o * Math.max(0.06, st.current.frac) * TP);
    const tR = Math.max(0.004, TP - tL * o);
    const rb = rightBlock.current!, lb = leftBlock.current!;
    rb.scale.z = tR;
    rb.position.z = -T / 2 + BOARD + tR / 2;
    lb.scale.z = tL;
    lb.position.z = -(BOARD / 2 + tL / 2);
    lb.visible = o > 0.02;
    const topR = -T / 2 + BOARD + tR;
    const topL = -T / 2 + BOARD + tL;
    const lp = leftPage.current!, rp = rightPage.current!, sh = sheet.current!;
    const pagesOn = o > 0.96;
    rp.visible = pagesOn || isSel;
    rp.position.z = topR + 0.002;
    lp.visible = pagesOn;
    lp.position.z = topL + 0.002;
    (rp.material as THREE.MeshBasicMaterial).opacity = 1;

    // hoja en movimiento
    const f = flip.flip;
    if (isSel && f && pagesOn) {
      const t = Math.min(1, (performance.now() / 1000 - f.from) / (reduced ? 0.01 : FLIP_MS / 1000));
      const e = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
      const p = f.dir === 1 ? e : 1 - e;
      mats.sheetMat.uniforms.uTheta.value = p * Math.PI;
      mats.sheetMat.uniforms.uCurl.value = Math.sin(p * Math.PI) * 0.9;
      sh.visible = true;
      sh.position.z = Math.max(topL, topR) + 0.006;
      if (t >= 1) { sh.visible = false; doneRef.current(); }
    } else {
      sh.visible = false;
    }

    // halo y sombra
    const haloOp = hv * 0.9;
    mats.haloMat.opacity += (haloOp - mats.haloMat.opacity) * (reduced ? 1 : 0.2);
    if (halo.current) halo.current.scale.setScalar(1 + hv * 0.12 + (reduced ? 0 : Math.sin(s3.clock.elapsedTime * 2) * 0.02 * hv));
    if (blob.current) {
      blob.current.visible = !isSel;
      blob.current.scale.set(1.4 + hv * 0.35, 0.5 + hv * 0.12, 1);
      mats.blobMat.opacity = 0.55 - hv * 0.25;
    }
  });

  return (
    <group
      ref={root}
      position={[SLOTS[index], 0, 0]}
      onClick={(e) => { e.stopPropagation(); if (!isSel) onSelect(index); }}
      onPointerOver={(e) => { e.stopPropagation(); if (selected === null) onHover(index); }}
      onPointerOut={() => { if (hovered === index) onHover(null); }}
    >
      {/* halo dorado detrás del libro */}
      <mesh ref={halo} position={[0, 0.05, -T / 2 - 0.25]} material={mats.haloMat} renderOrder={-1}>
        <planeGeometry args={[W * 2.4, H * 1.7]} />
      </mesh>
      {/* sombra de contacto */}
      <mesh ref={blob} position={[0, -H / 2 - 0.02, 0.05]} rotation-x={-Math.PI / 2} material={mats.blobMat}>
        <planeGeometry args={[W, W]} />
      </mesh>
      <group>
        {/* contracubierta */}
        <mesh position={[0, 0, -T / 2 + BOARD / 2]} material={mats.board}>
          <boxGeometry args={[W, H, BOARD]} />
        </mesh>
        {/* lomo */}
        <mesh position={[-W / 2 + BOARD / 2, 0, 0]} material={mats.spine}>
          <boxGeometry args={[BOARD * 1.4, H, T]} />
        </mesh>
        {/* bloque derecho (todo el libro cuando está cerrado) */}
        <mesh ref={rightBlock} position={[0.01, 0, 0]} material={mats.edges}>
          <boxGeometry args={[PW, PH, 1]} />
        </mesh>
        {/* página derecha visible */}
        <mesh ref={rightPage} position={[0.01, 0, 0]} material={mats.right} visible={false}>
          <planeGeometry args={[PW, PH]} />
        </mesh>
        {/* hoja que se pasa: bisagra en el lomo */}
        <mesh ref={sheet} position={[-W / 2 + 0.04, 0, 0]} material={mats.sheetMat} visible={false} frustumCulled={false}>
          <planeGeometry args={[PW, PH, 28, 1]} />
        </mesh>
        {/* página izquierda (sobre el bloque izquierdo, en coordenadas del mundo del libro) */}
        <mesh ref={leftPage} position={[-W - 0.01, 0, 0]} material={mats.left} visible={false}>
          <planeGeometry args={[PW, PH]} />
        </mesh>
        {/* tapa con bisagra en el lomo; el bloque izquierdo viaja con ella */}
        <group ref={hinge} position={[-W / 2, 0, T / 2 - BOARD / 2]}>
          <mesh position={[W / 2, 0, 0]} material={frontMats}>
            <boxGeometry args={[W, H, BOARD]} />
          </mesh>
          <mesh ref={leftBlock} position={[W / 2 - 0.01, 0, -BOARD]} material={mats.edges} visible={false}>
            <boxGeometry args={[PW, PH, 1]} />
          </mesh>
        </group>
      </group>
    </group>
  );
}
