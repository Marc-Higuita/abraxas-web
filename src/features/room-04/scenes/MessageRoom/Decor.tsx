"use client";
import { createContext, useContext, useEffect, useMemo, useRef, type ReactNode } from "react";
import { useFrame, useLoader, useThree } from "@react-three/fiber";
import * as THREE from "three";

/**
 * Espejos y objetos de la habitación de los mensajes.
 * - Reflejo real (MeshReflectorMaterial) solo en piso, espejo ovalado y espejo alto (escritorio).
 * - El resto de espejos usa un único mapa de entorno capturado por una CubeCamera que se
 *   actualiza de vez en cuando: refleja la habitación real (piezas, hilos, luces) a bajo costo.
 * - Los espejos viven en la capa 1: la cámara principal la ve, la CubeCamera no (sin bucles).
 */
const CubeCtx = createContext<THREE.Texture | null>(null);
export const MIRROR_LAYER = 1;
export const onMirror = (o: THREE.Object3D) => o.layers.set(MIRROR_LAYER);

export function CubeProvider({ low, children }: { low: boolean; children: ReactNode }) {
  const { gl, scene, camera } = useThree();
  const rt = useMemo(() => new THREE.WebGLCubeRenderTarget(low ? 64 : 160, { type: THREE.HalfFloatType, generateMipmaps: true, minFilter: THREE.LinearMipmapLinearFilter }), [low]);
  const cam = useMemo(() => new THREE.CubeCamera(0.1, 30, rt), [rt]);
  useEffect(() => {
    cam.position.set(0, 0.4, -3.6);
    camera.layers.enable(MIRROR_LAYER);
    return () => rt.dispose();
  }, [cam, camera, rt]);
  const n = useRef(0);
  useFrame(() => {
    // primeras capturas seguidas (mientras cargan texturas) y luego cada ~1 s
    const k = n.current++;
    if (k < 90 ? k % 15 === 0 : k % (low ? 180 : 60) === 0) cam.update(gl, scene);
  });
  return <CubeCtx.Provider value={rt.texture}>{children}</CubeCtx.Provider>;
}

export function MirrorMat({ tint = "#e3e7ec", rough = 0.03 }: { tint?: string; rough?: number }) {
  const env = useContext(CubeCtx);
  return <meshStandardMaterial envMap={env ?? undefined} envMapIntensity={1.15} metalness={1} roughness={rough} color={tint} />;
}

const gold = () => new THREE.MeshStandardMaterial({ color: "#d4a12a", metalness: 0.85, roughness: 0.3 });

/** Espejos adicionales: redondo con marco de puntos, cuadrícula de teselas, hexágono y espejo de pie. */
export function Mirrors() {
  const frame = useMemo(gold, []);
  const dark = useMemo(() => new THREE.MeshStandardMaterial({ color: "#2a211b", roughness: 0.6, metalness: 0.2 }), []);
  const tiles = useMemo(() => {
    const out: { x: number; y: number; r: number; s: number }[] = [];
    for (let i = 0; i < 3; i++) for (let j = 0; j < 4; j++) out.push({ x: j * 0.5 - 0.75, y: i * 0.5 - 0.5, r: (((i * 7 + j * 3) % 5) - 2) * 0.05, s: 0.42 + ((i + j) % 2) * 0.04 });
    return out;
  }, []);
  return (
    <group>
      {/* pared derecha: espejo redondo grande con marco de puntos dorados */}
      <group position={[6.93, 1.55, 0.6]} rotation={[0, -Math.PI / 2, 0]} scale={0.85}>
        <mesh onUpdate={onMirror}><circleGeometry args={[1.0, 64]} /><MirrorMat /></mesh>
        {Array.from({ length: 48 }, (_, i) => {
          const a = (i / 48) * Math.PI * 2;
          return <mesh key={i} position={[Math.cos(a) * 1.08, Math.sin(a) * 1.08, 0.02]} material={frame}><sphereGeometry args={[0.04, 8, 6]} /></mesh>;
        })}
      </group>
      {/* pared derecha, más adelante: teselas de espejo ligeramente desalineadas, como un collage de vidrio */}
      <group position={[6.92, -0.35, -7.8]} rotation={[0, -Math.PI / 2, 0]}>
        <mesh position={[0, 0, -0.02]} material={dark}><planeGeometry args={[2.25, 1.75]} /></mesh>
        {tiles.map((t, i) => (
          <mesh key={i} position={[t.x, t.y, 0.01 + (i % 3) * 0.008]} rotation={[t.r * 0.6, t.r, t.r]} onUpdate={onMirror}>
            <planeGeometry args={[t.s, t.s]} />
            <MirrorMat tint={i % 4 === 0 ? "#f0d9a8" : "#e3e7ec"} rough={0.05} />
          </mesh>
        ))}
      </group>
      {/* pared izquierda, cerca: espejo hexagonal */}
      <group position={[-6.93, 1.6, 0.8]} rotation={[0, Math.PI / 2, 0]}>
        <mesh onUpdate={onMirror}><circleGeometry args={[0.7, 6]} /><MirrorMat /></mesh>
        <mesh position={[0, 0, -0.01]} material={frame}><circleGeometry args={[0.78, 6]} /></mesh>
      </group>
      {/* espejo de pie (psiché) inclinado hacia el centro */}
      <group position={[-5.4, -1.0, -9.0]} rotation={[0, 0.7, 0]}>
        <mesh rotation={[-0.06, 0, 0]} onUpdate={onMirror}><planeGeometry args={[1.0, 2.2]} /><MirrorMat /></mesh>
        {[[0, 1.14, 1.12, 0.08], [0, -1.14, 1.12, 0.08], [-0.54, 0, 0.08, 2.36], [0.54, 0, 0.08, 2.36]].map(([x, y, w, h], i) => (
          <mesh key={i} position={[x, y, 0.03]} rotation={[-0.06, 0, 0]} material={frame}><boxGeometry args={[w, h, 0.06]} /></mesh>
        ))}
        <mesh position={[-0.42, -1.2, -0.25]} rotation={[0.35, 0, 0]} material={frame}><cylinderGeometry args={[0.025, 0.025, 0.7, 8]} /></mesh>
        <mesh position={[0.42, -1.2, -0.25]} rotation={[0.35, 0, 0]} material={frame}><cylinderGeometry args={[0.025, 0.025, 0.7, 8]} /></mesh>
      </group>
    </group>
  );
}

const PHOTOS = ["casa-1", "casa-2", "casa-3", "casa-4", "casa-5", "casa-6"].map((n) => `/assets/room-04/messageroom/${n}.jpg`);
const DOCS = [
  { src: "/assets/room-04/messageroom/diploma.jpg", pos: [-4.7, 0.9, -10.9] as const, rot: -0.04 },
  { src: "/assets/room-04/messageroom/guinness.jpg", pos: [-3.1, 1.25, -10.9] as const, rot: 0.03 },
  { src: "/assets/room-04/messageroom/tarjeton.jpg", pos: [-1.6, 0.75, -10.9] as const, rot: -0.02 },
];

/** Fotos de la casa colgadas a los lados, documentos del archivo en el fondo y una figura hecha de recortes en vitrina. */
export function Installation({ reduced, low }: { reduced: boolean; low: boolean }) {
  const photos = useLoader(THREE.TextureLoader, PHOTOS);
  const docs = useLoader(THREE.TextureLoader, DOCS.map((d) => d.src));
  const figure = useLoader(THREE.TextureLoader, "/assets/room-04/abraxas/abraxas-figura.png");
  useMemo(() => [...photos, ...docs, figure].forEach((t) => { t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; }), [photos, docs, figure]);
  const frame = useMemo(gold, []);
  const hang = useRef<(THREE.Group | null)[]>([]);
  const spots = useMemo(() => [
    { x: -5.4, y: 1.9, z: -2.2 }, { x: -5.6, y: 1.4, z: -6.4 }, { x: -4.9, y: 2.3, z: -8.6 },
    { x: 5.4, y: 2.2, z: -2.4 }, { x: 5.5, y: 1.5, z: -6.6 }, { x: 4.8, y: 2.4, z: -9.2 },
  ].slice(0, low ? 4 : 6), [low]);

  useFrame((st) => {
    if (reduced) return;
    const t = st.clock.elapsedTime;
    hang.current.forEach((g, i) => { if (g) g.rotation.y = Math.sin(t * 0.35 + i * 1.3) * 0.28 + (i < 3 ? 0.5 : -0.5); });
  });

  const fig = figure.image as HTMLImageElement;
  const figH = 2.0, figW = figH * ((fig?.width || 600) / (fig?.height || 860));

  return (
    <group>
      {/* fotos de la casa colgando del techo con un hilo */}
      {spots.map((s, i) => (
        <group key={i} ref={(g) => { hang.current[i] = g; }} position={[s.x, s.y, s.z]}>
          <mesh position={[0, 1.2, 0]}><cylinderGeometry args={[0.004, 0.004, 2.4, 4]} /><meshBasicMaterial color="#e8dcc4" /></mesh>
          <mesh position={[0, -0.45, -0.004]}><planeGeometry args={[0.76, 0.98]} /><meshStandardMaterial color="#efe6d2" roughness={0.95} /></mesh>
          <mesh position={[0, -0.45, 0]}><planeGeometry args={[0.7, 0.92]} /><meshStandardMaterial map={photos[i]} roughness={0.8} side={THREE.DoubleSide} /></mesh>
          <mesh position={[0, 0.02, 0.01]}><boxGeometry args={[0.06, 0.12, 0.03]} /><meshStandardMaterial color="#c9a878" /></mesh>
        </group>
      ))}

      {/* archivo en el fondo: diploma, certificado Guinness y tarjetón, en marcos dorados */}
      {DOCS.map((d, i) => (
        <group key={d.src} position={d.pos} rotation={[0, 0, d.rot]}>
          <mesh position={[0, 0, -0.01]} material={frame}><boxGeometry args={[1.08, 1.4, 0.04]} /></mesh>
          <mesh position={[0, 0, 0.015]}><planeGeometry args={[0.96, 1.28]} /><meshStandardMaterial map={docs[i]} roughness={0.7} /></mesh>
        </group>
      ))}

      {/* vitrina con la figura de recortes de Abraxas (su cabeza sobre un cuerpo de muñeca) */}
      <group position={[-3.4, -2.2, 0.9]} rotation={[0, 0.5, 0]}>
        <mesh position={[0, 0.35, 0]}><boxGeometry args={[1.1, 0.7, 0.8]} /><meshStandardMaterial color="#8a6a43" roughness={0.85} /></mesh>
        <mesh position={[0, 0.71, 0]}><boxGeometry args={[1.16, 0.04, 0.86]} /><meshStandardMaterial color="#d4a12a" metalness={0.8} roughness={0.3} /></mesh>
        {/* tres capas de cartón desplazadas: grosor de recorte */}
        {[-0.03, -0.015, 0].map((z, k) => (
          <mesh key={k} position={[0, 0.73 + figH / 2, z]}>
            <planeGeometry args={[figW, figH]} />
            <meshStandardMaterial map={figure} transparent alphaTest={0.4} color={k < 2 ? "#5b4632" : "#ffffff"} roughness={0.8} side={THREE.DoubleSide} />
          </mesh>
        ))}
        {!low && (
          <mesh position={[0, 0.73 + 1.15, 0]}>
            <boxGeometry args={[1.12, 2.3, 0.82]} />
            <meshPhysicalMaterial transmission={1} roughness={0.06} thickness={0.05} ior={1.5} color="#f2fbfb" metalness={0} envMapIntensity={1.1} />
          </mesh>
        )}
      </group>
    </group>
  );
}

/** Tela estampada procedural (sin descargas): fondo de color, motivo de puntos y borde cosido. */
function makeTextile(bg: string, dot: string, stitch: string, seed: number) {
  const c = document.createElement("canvas");
  c.width = 256; c.height = 512;
  const g = c.getContext("2d")!;
  g.fillStyle = bg; g.fillRect(0, 0, 256, 512);
  // trama de tejido
  for (let y = 0; y < 512; y += 3) { g.fillStyle = `rgba(0,0,0,${0.03 + ((y + seed) % 9 === 0 ? 0.04 : 0)})`; g.fillRect(0, y, 256, 1); }
  for (let x = 0; x < 256; x += 3) { g.fillStyle = "rgba(255,255,255,0.025)"; g.fillRect(x, 0, 1, 512); }
  // motivo: flores de puntos
  g.fillStyle = dot;
  for (let y = 30; y < 512; y += 64) for (let x = (y / 64) % 2 ? 28 : 60; x < 256; x += 64) {
    for (let k = 0; k < 6; k++) { const a = (k / 6) * Math.PI * 2; g.beginPath(); g.arc(x + Math.cos(a) * 9, y + Math.sin(a) * 9, 4, 0, 7); g.fill(); }
    g.beginPath(); g.arc(x, y, 3, 0, 7); g.fill();
  }
  // borde cosido
  g.strokeStyle = stitch; g.lineWidth = 3; g.setLineDash([10, 8]);
  g.strokeRect(10, 10, 236, 492);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}

const PANELS = [1, 2, 3, 4].map((n) => `/assets/room-04/messageroom/panel-${n}.webp`);
const FLOATERS = [
  "/assets/room-04/cutouts/signos/signo-01.png", "/assets/room-04/cutouts/caras/boca-ojo-01.png", "/assets/room-04/cutouts/signos/signo-03.png",
  "/assets/room-04/cutouts/naturaleza/pez-02.png", "/assets/room-04/cutouts/signos/signo-05.png", "/assets/room-04/cutouts/caras/boca-ojo-03.png",
  "/assets/room-04/cutouts/naturaleza/pez-05.png", "/assets/room-04/cutouts/signos/signo-08.png",
];

/**
 * Paredes habitadas: muros de collage fotografiados en la casa, telas estampadas que cuelgan del techo
 * y recortes suspendidos en el aire a distintas alturas. Todo en los laterales y al fondo:
 * el pasillo central queda libre para recorrer y leer las piezas.
 */
export function WallArt({ reduced, low }: { reduced: boolean; low: boolean }) {
  const panels = useLoader(THREE.TextureLoader, PANELS);
  const floaters = useLoader(THREE.TextureLoader, low ? FLOATERS.slice(0, 4) : FLOATERS);
  useMemo(() => [...panels, ...floaters].forEach((t) => { t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; }), [panels, floaters]);
  const cloths = useMemo(() => [makeTextile("#c81e6e", "#f2b90f", "#f3eee3", 1), makeTextile("#1e7a4c", "#e07bf0", "#f2b90f", 4), makeTextile("#2340a8", "#f3eee3", "#d9341f", 7)], []);
  useEffect(() => () => cloths.forEach((c) => c.dispose()), [cloths]);
  const frame = useMemo(gold, []);
  const fl = useRef<(THREE.Group | null)[]>([]);
  const cl = useRef<(THREE.Group | null)[]>([]);

  // muros de collage pegados a las paredes laterales (entre los espejos) y al fondo
  const walls = [
    { i: 0, pos: [-6.95, 0.4, -1.7] as const, rot: Math.PI / 2, s: 1.6 },
    { i: 1, pos: [6.95, 0.5, -2.0] as const, rot: -Math.PI / 2, s: 1.5 },
    { i: 2, pos: [-6.95, 0.6, -7.0] as const, rot: Math.PI / 2, s: 1.7 },
    { i: 3, pos: [0.6, 1.0, -10.95] as const, rot: 0, s: 1.4 },
  ];
  const floats = useMemo(() => floaters.map((_, k) => ({
    x: ((k * 2.3) % 8) - 4, y: 2.6 + ((k * 0.7) % 1.3), z: -2.2 - ((k * 1.9) % 7.5), s: 0.5 + (k % 3) * 0.15, ph: k * 1.7,
  })), [floaters]);

  useFrame((st) => {
    if (reduced) return;
    const t = st.clock.elapsedTime;
    fl.current.forEach((g, k) => { if (g) { g.rotation.y = Math.sin(t * 0.4 + floats[k].ph) * 0.6; g.position.y = floats[k].y + Math.sin(t * 0.6 + floats[k].ph) * 0.06; } });
    cl.current.forEach((g, k) => { if (g) g.rotation.x = Math.sin(t * 0.5 + k) * 0.035; });
  });

  return (
    <group>
      {walls.map((w) => {
        const img = panels[w.i].image as HTMLImageElement;
        const ar = (img?.width || 525) / (img?.height || 700);
        const h = 2.2 * w.s, ww = h * ar;
        return (
          <group key={w.i} position={w.pos} rotation={[0, w.rot, 0]}>
            <mesh position={[0, 0, 0.005]}><planeGeometry args={[ww, h]} /><meshStandardMaterial map={panels[w.i]} roughness={0.85} /></mesh>
            {/* cinta en las esquinas: pegado a mano, no enmarcado */}
            {[[-1, 1], [1, -1]].map(([sx, sy], k) => (
              <mesh key={k} position={[sx * ww * 0.45, sy * h * 0.47, 0.012]} rotation={[0, 0, sx * sy * 0.6]}>
                <planeGeometry args={[0.42, 0.12]} /><meshStandardMaterial color="#f5bcd9" transparent opacity={0.8} roughness={0.9} />
              </mesh>
            ))}
          </group>
        );
      })}

      {/* telas que cuelgan del techo a los lados del pasillo, en tres profundidades */}
      {cloths.slice(0, low ? 2 : 3).map((tx, k) => (
        <group key={k} ref={(g) => { cl.current[k] = g; }} position={[k % 2 ? 4.3 : -4.3, 4.5, -3.2 - k * 2.6]}>
          <mesh position={[0, 0.02, 0]} material={frame} rotation={[0, 0, Math.PI / 2]}><cylinderGeometry args={[0.03, 0.03, 1.5, 8]} /></mesh>
          <mesh position={[0, -1.55, 0]} rotation={[0, k % 2 ? -0.35 : 0.35, 0]}>
            <planeGeometry args={[1.3, 3.0, 1, 8]} />
            <meshStandardMaterial map={tx} roughness={0.95} side={THREE.DoubleSide} />
          </mesh>
        </group>
      ))}

      {/* recortes suspendidos del techo con hilo */}
      {floaters.map((tx, k) => {
        const f = floats[k];
        const img = tx.image as HTMLImageElement;
        const ar = (img?.width || 1) / (img?.height || 1);
        return (
          <group key={k} ref={(g) => { fl.current[k] = g; }} position={[f.x, f.y, f.z]}>
            <mesh position={[0, 1.0, 0]}><cylinderGeometry args={[0.003, 0.003, 2.0, 4]} /><meshBasicMaterial color="#e8dcc4" /></mesh>
            <mesh>
              <planeGeometry args={[f.s * ar, f.s]} />
              <meshStandardMaterial map={tx} transparent alphaTest={0.3} roughness={0.85} side={THREE.DoubleSide} />
            </mesh>
          </group>
        );
      })}
    </group>
  );
}
