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
    cam.position.set(0, 0.4, -1.6);
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

function MirrorMat({ tint = "#e3e7ec", rough = 0.03 }: { tint?: string; rough?: number }) {
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
      <group position={[6.42, 1.15, -3.2]} rotation={[0, -Math.PI / 2, 0]}>
        <mesh onUpdate={onMirror}><circleGeometry args={[1.0, 64]} /><MirrorMat /></mesh>
        {Array.from({ length: 48 }, (_, i) => {
          const a = (i / 48) * Math.PI * 2;
          return <mesh key={i} position={[Math.cos(a) * 1.08, Math.sin(a) * 1.08, 0.02]} material={frame}><sphereGeometry args={[0.04, 8, 6]} /></mesh>;
        })}
      </group>
      {/* pared derecha, más adelante: teselas de espejo ligeramente desalineadas, como un collage de vidrio */}
      <group position={[6.4, -0.45, -0.6]} rotation={[0, -Math.PI / 2, 0]}>
        <mesh position={[0, 0, -0.02]} material={dark}><planeGeometry args={[2.25, 1.75]} /></mesh>
        {tiles.map((t, i) => (
          <mesh key={i} position={[t.x, t.y, 0.01 + (i % 3) * 0.008]} rotation={[t.r * 0.6, t.r, t.r]} onUpdate={onMirror}>
            <planeGeometry args={[t.s, t.s]} />
            <MirrorMat tint={i % 4 === 0 ? "#f0d9a8" : "#e3e7ec"} rough={0.05} />
          </mesh>
        ))}
      </group>
      {/* pared izquierda, cerca: espejo hexagonal */}
      <group position={[-6.42, 1.5, 0.6]} rotation={[0, Math.PI / 2, 0]}>
        <mesh onUpdate={onMirror}><circleGeometry args={[0.7, 6]} /><MirrorMat /></mesh>
        <mesh position={[0, 0, -0.01]} material={frame}><circleGeometry args={[0.78, 6]} /></mesh>
      </group>
      {/* espejo de pie (psiché) inclinado hacia el centro */}
      <group position={[-5.0, -1.0, -2.4]} rotation={[0, 0.9, 0]}>
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
  { src: "/assets/room-04/messageroom/diploma.jpg", pos: [-4.7, 0.9, -6.12] as const, rot: -0.04 },
  { src: "/assets/room-04/messageroom/guinness.jpg", pos: [-3.1, 1.25, -6.12] as const, rot: 0.03 },
  { src: "/assets/room-04/messageroom/tarjeton.jpg", pos: [-1.6, 0.75, -6.12] as const, rot: -0.02 },
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
    { x: -5.3, y: 1.9, z: -1.6 }, { x: -5.6, y: 1.35, z: -3.4 }, { x: -4.9, y: 2.25, z: -4.9 },
    { x: 5.3, y: 2.2, z: -1.9 }, { x: 5.5, y: 1.5, z: -3.9 }, { x: 4.8, y: 2.4, z: -5.2 },
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
