"use client";
import { useEffect, useMemo, useRef, type MutableRefObject } from "react";
import { Canvas, useFrame, useThree, type ThreeEvent } from "@react-three/fiber";
import * as THREE from "three";
import photosData from "../../data/room-photos.json";
import holoData from "../../../../../public/assets/room-04/door/holo.json";
import { sound, type SfxName } from "@/lib/audio/useSound";
import type { RoomPhoto } from "../../types";
import { useRoom } from "../../store";
import {
  BASE_YAW_DEG, DOOR_D, DOOR_H, DOOR_W, DOOR_Y, PHOTO_H, TUNNEL_MAX, TUNNEL_PER_RING, buildDoor, buildFill, easeInOut, finalPose,
  headingDir, scatterPose, smooth, tunnelPose, type DoorTile, type Pose,
} from "./layout";

const ALL = photosData as RoomPhoto[];
// montaje rápido: un respiro corto con los fragmentos sueltos y la habitación armada en ~1,7 s
const ASSEMBLY_DELAY = 0.25;
const ASSEMBLY_DURATION = 1.7;
const FADE_IN = 0.28;
const ROOM_SFX: SfxName[] = ["cuarto-magico", "fotos-desplazamiento", "tunel", "puerta-vidrio"];

const BG = "#2a2119";
const KRAFT = "#c9a878";

export type RoomPhase = "loading" | "scattered" | "assembling" | "assembled";

interface Props {
  progress: MutableRefObject<number>;
  onPhase: (p: RoomPhase) => void;
  onLoad: (loaded: number, total: number) => void;
  active: boolean;
  /** puerta: openAt = instante (s, performance.now) en que el visitante la tocó */
  door: MutableRefObject<{ openAt: number | null }>;
  onDoor: () => void;
  /** modo del cursor propio sobre el canvas ("ver" sobre una foto, "entra" sobre la puerta) */
  onCursor: (mode: string | null) => void;
}

function pickPhotos(low: boolean) {
  if (!low) return ALL;
  const keep = new Set<string>();
  const byGroup = new Map<string, RoomPhoto[]>();
  for (const p of ALL) {
    const k = p.wall && p.type !== "techo" && p.type !== "piso" ? p.wall : p.type;
    byGroup.set(k, [...(byGroup.get(k) ?? []), p]);
  }
  for (const list of byGroup.values()) list.sort((a, b) => b.sharp - a.sharp).slice(0, Math.ceil(list.length * 0.6)).forEach((p) => keep.add(p.id));
  return ALL.filter((p) => keep.has(p.id));
}

export function PhotoRoomCanvas(props: Props) {
  const low = useRoom((s) => s.lowPower);
  return (
    <Canvas
      dpr={low ? 1 : [1, 1.6]}
      frameloop={props.active ? "always" : "never"}
      camera={{ fov: 46, near: 0.05, far: 60, position: [0, 0, 0] }}
      gl={{ antialias: !low, powerPreference: "high-performance" }}
      onCreated={({ gl, scene }) => { gl.setClearColor(BG); scene.fog = new THREE.Fog(BG, 9, 26); }}
    >
      <Scene {...props} low={low} />
    </Canvas>
  );
}

interface Item { photo: number; s: Pose; f: Pose; t: Pose; main: boolean; delay: number; ring: number }

function Scene({ progress, onPhase, onLoad, low, door: doorState, onDoor, onCursor, active }: Props & { low: boolean }) {
  const photos = useMemo(() => pickPhotos(low), [low]);
  const reduced = useRoom((s) => s.reducedMotion);
  const openFicha = useRoom((s) => s.openFicha);
  const { camera, pointer, gl, size, scene } = useThree();

  // un material por foto: la capa principal y el relleno comparten textura
  const materials = useMemo(
    () => photos.map(() => new THREE.MeshBasicMaterial({ color: "#5a4632", side: THREE.DoubleSide, toneMapped: false })),
    [photos],
  );
  const items = useMemo<Item[]>(() => {
    const n = photos.length;
    const main: Item[] = photos.map((p, i) => ({ photo: i, main: true, s: scatterPose(p, i, n), f: finalPose(p, i), t: tunnelPose(p.roll, 0), delay: (i / n) * 0.3, ring: -1 }));
    const fill: Item[] = buildFill(photos, low ? 0.55 : 1).map((fi, k) => ({
      photo: fi.photo, main: false, f: fi.pose, s: { ...fi.pose, scale: 0 }, t: tunnelPose(fi.roll, 0), delay: 0.3 + (((k * 37) % 100) / 100) * 0.35, ring: -1,
    }));
    const all = [...main, ...fill];
    // reparte piezas en los anillos del túnel; las que sobran se desprenden mientras el túnel se forma
    const order = all.map((_, i) => i).sort((a, b) => ((a * 7919) % 997) - ((b * 7919) % 997));
    order.forEach((idx, k) => {
      const it = all[idx];
      if (k < TUNNEL_MAX) { it.t = tunnelPose(photos[it.photo].roll, k); it.ring = Math.floor(k / TUNNEL_PER_RING); }
      else it.t = { pos: it.f.pos.clone().multiplyScalar(1.12), quat: it.f.quat.clone(), scale: 0 };
    });
    return all;
  }, [photos, low]);
  const door = useMemo(() => buildDoor(photos), [photos]);
  // vidrio de la puerta: refleja la propia habitación (CubeCamera situada frente a la puerta)
  const cubeRT = useMemo(() => new THREE.WebGLCubeRenderTarget(low ? 128 : 256, { generateMipmaps: true, minFilter: THREE.LinearMipmapLinearFilter }), [low]);
  const cubeCam = useMemo(() => new THREE.CubeCamera(0.1, 40, cubeRT), [cubeRT]);
  const glassMat = useMemo(() => new THREE.MeshStandardMaterial({ color: "#e6ede9", metalness: 1, roughness: 0.05, envMap: cubeRT.texture, envMapIntensity: 1.05 }), [cubeRT]);
  const goldMat = useMemo(() => new THREE.MeshStandardMaterial({ color: "#d4a12a", metalness: 1, roughness: 0.28, envMap: cubeRT.texture, emissive: "#7d5a10", emissiveIntensity: 0.15 }), [cubeRT]);
  // capa de vidrio delante de la presencia: el collage reflejado queda por encima de Abraxas
  const veilMat = useMemo(() => new THREE.MeshStandardMaterial({ color: "#eef3f0", metalness: 1, roughness: 0.06, envMap: cubeRT.texture, envMapIntensity: 1, transparent: true, opacity: 0, depthWrite: false }), [cubeRT]);
  useEffect(() => () => { cubeRT.dispose(); glassMat.dispose(); goldMat.dispose(); veilMat.dispose(); }, [cubeRT, glassMat, goldMat, veilMat]);
  const holo = useRef<{ near: number; open: number; yaw: number; pitch: number }>({ near: 0, open: 0, yaw: 0, pitch: 0 });
  const doorGroup = useRef<THREE.Group>(null);
  const cubeFrame = useRef(0);
  const cursorMode = useRef<string | null>(null);
  const setCursor = (m: string | null) => { if (cursorMode.current !== m) { cursorMode.current = m; onCursor(m); } };
  const geo = useMemo(() => photos.map((p) => new THREE.PlaneGeometry(PHOTO_H * p.aspect, PHOTO_H)), [photos]);
  useEffect(() => () => { materials.forEach((m) => { m.map?.dispose(); m.dispose(); }); geo.forEach((g) => g.dispose()); }, [materials, geo]);

  const meshes = useRef<(THREE.Mesh | null)[]>([]);
  const hover = useRef<number | null>(null);
  const readyAt = useRef<number | null>(null);
  const phaseRef = useRef<RoomPhase>("loading");
  const setPhase = (p: RoomPhase) => {
    if (phaseRef.current === p) return;
    phaseRef.current = p; onPhase(p);
    if (p === "assembled") sound.play("cuarto-magico");
  };

  // instante en que cada textura quedó lista (para mostrar la foto solo entonces, con un fundido corto)
  const readyT = useRef<Float64Array>(new Float64Array(0));
  const fading = useRef<Set<number>>(new Set());
  useEffect(() => {
    readyT.current = new Float64Array(photos.length).fill(-1);
    const total = photos.length;
    const maxAniso = Math.min(4, gl.capabilities.getMaxAnisotropy());
    let cancelled = false;
    let loLoaded = 0;

    // la imagen se decodifica de forma asíncrona (img.decode) antes de crear la textura:
    // así la subida a la GPU no bloquea el hilo principal con la decodificación del JPG
    const fetchTex = (url: string, cb: (tex: THREE.Texture | null) => void) => {
      const img = new Image();
      img.decoding = "async";
      img.src = url;
      img.decode().then(() => {
        if (cancelled) return;
        const tex = new THREE.Texture(img);
        tex.needsUpdate = true;
        cb(tex);
      }).catch(() => { if (!cancelled) cb(null); });
    };
    const setMap = (i: number, tex: THREE.Texture, first: boolean) => {
      tex.colorSpace = THREE.SRGBColorSpace;
      tex.anisotropy = maxAniso;
      const old = materials[i].map;
      materials[i].map = tex;
      if (first) { materials[i].color.setScalar(0.2); materials[i].needsUpdate = true; readyT.current[i] = performance.now() / 1000; fading.current.add(i); }
      // sube la textura a la GPU ahora, repartido entre cargas, y no todo en el primer fotograma
      gl.initTexture(tex);
      if (old && old !== tex) old.dispose();
    };

    // fase 2: las fotos completas reemplazan a las livianas, primero las más nítidas
    const startHi = () => {
      const order = photos.map((p, i) => ({ p, i })).sort((a, b) => b.p.sharp - a.p.sharp);
      const PAR = low ? 2 : 4;
      const hiOne = (k: number) => {
        if (k >= order.length || cancelled) return;
        const { p, i } = order[k];
        fetchTex(`/assets/room-04/photos/${p.id}.jpg`, (tex) => { if (tex) setMap(i, tex, readyT.current[i] < 0); hiOne(k + PAR); });
      };
      for (let k = 0; k < PAR; k++) hiOne(k);
    };
    let hiStarted = false;
    const beginHi = () => { if (!hiStarted && !cancelled) { hiStarted = true; startHi(); } };
    // la habitación arranca su montaje; las fotos completas esperan a que terminen las livianas
    // (o unos segundos), para no competir por la conexión con el primer montaje
    const ready = () => {
      if (readyAt.current === null) { readyAt.current = performance.now() / 1000; window.setTimeout(beginHi, 3000); }
    };

    // fase 1: versiones livianas de TODAS las fotos (≈2,7 MB): la habitación se arma completa y rápido
    const PAR_LO = 8;
    const loOne = (k: number) => {
      if (k >= total || cancelled) return;
      fetchTex(`/assets/room-04/photos-lo/${photos[k].id}.jpg`, (tex) => {
        if (tex) setMap(k, tex, true);
        loLoaded++;
        onLoad(loLoaded, total);
        if (loLoaded >= total) { ready(); window.setTimeout(beginHi, 300); }
        loOne(k + PAR_LO);
      });
    };
    for (let k = 0; k < PAR_LO; k++) loOne(k);
    // conexión lenta: se arma con lo que haya (las que falten aparecen con su fundido al llegar)
    const fallback = window.setTimeout(() => { if (loLoaded >= total * 0.8) ready(); }, 2500);
    const hard = window.setTimeout(ready, 5000);
    return () => {
      cancelled = true; window.clearTimeout(fallback); window.clearTimeout(hard);
    };
  }, [photos, materials, low, gl, onLoad]);

  // al salir de la sección se cortan sus efectos largos
  useEffect(() => { if (!active) sound.stop(ROOM_SFX); }, [active]);
  useEffect(() => () => sound.stop(ROOM_SFX), []);
  const sfx = useRef({ tb: 0, travel: 0, near: 0, tunnel: false });

  const tmpPos = useMemo(() => new THREE.Vector3(), []);
  const tmpQuat = useMemo(() => new THREE.Quaternion(), []);
  const camDir = useMemo(() => headingDir(BASE_YAW_DEG), []);
  const yawBase = THREE.MathUtils.degToRad(BASE_YAW_DEG);
  const look = useRef({ yaw: 0, pitch: 0 });
  const doorL = useRef<THREE.Group>(null);
  const doorR = useRef<THREE.Group>(null);
  const tunnelAxisQ = useMemo(() => new THREE.Quaternion(), []);
  useFrame((_, dt) => {
    const now = performance.now() / 1000;
    let a = 0;
    if (readyAt.current !== null) {
      const t0 = readyAt.current + (reduced ? 0 : ASSEMBLY_DELAY);
      a = reduced ? 1 : THREE.MathUtils.clamp((now - t0) / ASSEMBLY_DURATION, 0, 1);
      setPhase(a <= 0 ? "scattered" : a < 1 ? "assembling" : "assembled");
    }
    const p = progress.current;
    // guion: acercarse (0–.22) · la habitación se vuelve túnel (.2–.3) · recorrerlo hasta la puerta (.28–.78)
    // · PARADA frente a la puerta (.78–1): no se atraviesa con scroll; se abre al tocarla
    const zoom = smooth(0, 0.22, p);
    const tb = reduced ? 0 : smooth(0.2, 0.3, p);
    const travel = reduced ? 0 : smooth(0.28, 0.78, p);
    const near = reduced ? 0 : smooth(0.6, 0.82, p);
    const oAt = doorState.current.openAt;
    const o = oAt === null ? 0 : THREE.MathUtils.clamp((now - oAt) / 1.5, 0, 1);
    const open = easeInOut(o);
    // al volver a la habitación con la puerta ya abierta, la cámara regresa; al bajar de nuevo, la cruza
    const pass = oAt === null ? 0 : easeInOut(THREE.MathUtils.clamp((now - oAt - 0.35) / 1.4, 0, 1)) * smooth(0.74, 0.82, p);

    for (let i = 0; i < items.length; i++) {
      const m = meshes.current[i];
      if (!m) continue;
      const it = items[i];
      // la foto aparece solo cuando su textura está lista
      if (readyT.current[it.photo] < 0) { if (m.visible) m.visible = false; continue; }
      if (!m.visible) m.visible = true;
      const ai = easeInOut(THREE.MathUtils.clamp((a * 1.25 - it.delay) / 0.6, 0, 1));
      tmpPos.copy(it.s.pos).lerp(it.f.pos, it.main ? ai : 1);
      tmpQuat.copy(it.s.quat).slerp(it.f.quat, it.main ? ai : 1);
      let scale = THREE.MathUtils.lerp(it.s.scale, it.f.scale, ai);
      if (tb > 0) {
        tmpPos.lerp(it.t.pos, tb);
        tmpQuat.slerp(it.t.quat, tb);
        scale = THREE.MathUtils.lerp(scale, it.t.scale, tb);
        if (it.ring >= 0) {
          // parallax: los anillos giran apenas en sentidos opuestos mientras se avanza
          tunnelAxisQ.setFromAxisAngle(camDir, (it.ring % 2 ? 1 : -1) * (0.08 + it.ring * 0.012) * travel * tb);
          tmpPos.applyQuaternion(tunnelAxisQ);
          tmpQuat.premultiply(tunnelAxisQ);
        }
      }
      if (hover.current === i && tb < 0.05) scale *= 1.04;
      m.position.copy(tmpPos);
      m.quaternion.copy(tmpQuat);
      m.scale.setScalar(Math.max(0.0001, scale));
      if (it.main && ai < 1 && !reduced) m.position.y += Math.sin(now * 0.7 + i) * 0.04 * (1 - ai);
    }

    // fundido corto de cada foto recién cargada (de oscuro a su color)
    if (fading.current.size) {
      fading.current.forEach((i) => {
        const f = THREE.MathUtils.clamp((now - readyT.current[i]) / FADE_IN, 0, 1);
        materials[i].color.setScalar(0.2 + 0.8 * f);
        if (f >= 1) fading.current.delete(i);
      });
    }
    // sonidos en momentos puntuales del recorrido (nunca atados al mouse)
    const sx = sfx.current;
    if (!reduced) {
      if (sx.tb < 0.05 && tb >= 0.05) sound.play("fotos-desplazamiento");
      if (sx.travel < 0.02 && travel >= 0.02) { if (sound.play("tunel")) sx.tunnel = true; }
      if (sx.tunnel && (travel < 0.01 || p < 0.26)) { sound.stop(["tunel"]); sx.tunnel = false; }
      if (sx.near < 0.35 && near >= 0.35) sound.play("puerta-vidrio");
    }
    sx.tb = tb; sx.travel = travel; sx.near = near;

    const settled = a >= 1 ? 1 - tb * 0.7 : 0.3;
    look.current.yaw = THREE.MathUtils.damp(look.current.yaw, -pointer.x * 0.18 * settled, 3, dt);
    look.current.pitch = THREE.MathUtils.damp(look.current.pitch, pointer.y * 0.1 * settled, 3, dt);
    // la cámara se detiene a ~3,4 m de la puerta; al abrirla, la cruza hacia la luz kraft
    const along = zoom * 1.6 + travel * (DOOR_D - 3.4 - 1.6) + pass * 5.2;
    camera.position.copy(camDir).multiplyScalar(along);
    if (travel > 0 && travel < 1 && !reduced) camera.position.y += Math.sin(travel * Math.PI * 6) * 0.03;
    const ang = open * 1.75;
    if (doorL.current) doorL.current.rotation.y = ang;
    if (doorR.current) doorR.current.rotation.y = -ang;
    // en la parada, la puerta "respira": el marco dorado late suave
    const waiting = p > 0.74 && oAt === null;
    goldMat.emissiveIntensity = 0.15 + (waiting ? (Math.sin(now * 2.2) * 0.5 + 0.5) * 0.35 : 0);
    // la presencia de Abraxas en el vidrio se revela al acercarse y se va al abrir
    holo.current.near = near; holo.current.open = o; holo.current.yaw = look.current.yaw; holo.current.pitch = look.current.pitch;
    veilMat.opacity = near * 0.3 * (1 - Math.min(1, o * 3));
    // refresca el reflejo del vidrio mientras la puerta está a la vista
    if (doorGroup.current && tb > 0.95 && p > 0.45) {
      cubeFrame.current++;
      if (cubeFrame.current % (low ? 60 : 18) === 1) {
        doorGroup.current.visible = false;
        cubeCam.position.copy(camDir).multiplyScalar(DOOR_D - 0.9);
        cubeCam.updateMatrixWorld();
        cubeCam.update(gl, scene);
        doorGroup.current.visible = true;
      }
    }
    // sin foto debajo (o en el túnel) no hay «Ver»
    if (hover.current !== null && !interactive()) { hover.current = null; if (cursorMode.current === "ver") setCursor(null); }
    camera.rotation.set(look.current.pitch, -yawBase + look.current.yaw, 0, "YXZ");
    const cam = camera as THREE.PerspectiveCamera;
    const narrow = size.width < size.height;
    const fov = THREE.MathUtils.lerp(narrow ? 74 : 46, narrow ? 60 : 36, zoom) + tb * (narrow ? 12 : 18) - pass * 8;
    if (Math.abs(cam.fov - fov) > 0.01) { cam.fov = fov; cam.updateProjectionMatrix(); }
  });

  const interactive = () => phaseRef.current === "assembled" && progress.current < 0.2;
  const doorReady = () => !reduced && progress.current > 0.7 && doorState.current.openAt === null;
  const onClick = (e: ThreeEvent<MouseEvent>, i: number) => {
    e.stopPropagation();
    // un arrastre o un gesto de scroll no abre la foto
    if (e.delta > 6 || !interactive()) return;
    const ph = photos[items[i].photo];
    // la ficha muestra la foto en grande y solo su número
    openFicha({ title: `Collage #${ph.collage ?? ph.seq}`, image: `/assets/room-04/photos/${ph.id}.jpg` });
  };

  return (
    <group>
      {!reduced && (
        <group
          ref={doorGroup}
          position={camDir.clone().multiplyScalar(DOOR_D)}
          rotation={[0, -yawBase, 0]}
          onClick={(e) => { e.stopPropagation(); if (e.delta <= 6 && doorReady()) onDoor(); }}
          onPointerOver={(e) => { e.stopPropagation(); if (doorReady()) setCursor("entra"); }}
          onPointerOut={() => { if (cursorMode.current === "entra") setCursor(null); }}
        >
          {/* luz kraft al otro lado: empalma con la sección del video */}
          <mesh position={[0, 0, -2.4]}>
            <planeGeometry args={[40, 30]} />
            <meshBasicMaterial color={KRAFT} toneMapped={false} fog={false} />
          </mesh>
          <Tiles tiles={door.wall} geo={geo} materials={materials} />
          <DoorFrame materials={materials} gold={goldMat} glass={glassMat} />
          <group ref={doorL} position={[-DOOR_W, DOOR_Y, 0]}>
            <GlassLeaf materials={materials} gold={goldMat} glass={glassMat} seed={3} />
          </group>
          <group ref={doorR} position={[DOOR_W, DOOR_Y, 0]} scale={[-1, 1, 1]}>
            <GlassLeaf materials={materials} gold={goldMat} glass={glassMat} seed={11} />
          </group>
          {/* presencia de Abraxas detrás del vidrio: capas de fotos a distintas profundidades */}
          <HoloAbraxas state={holo} low={low} />
          <mesh position={[0, DOOR_Y, 0.17]} material={veilMat} renderOrder={8}>
            <planeGeometry args={[DOOR_W * 2 - 0.1, DOOR_H - 0.1]} />
          </mesh>
        </group>
      )}
      {items.map((it, i) => (
        <mesh
          key={i}
          ref={(el) => { meshes.current[i] = el; }}
          geometry={geo[it.photo]}
          material={materials[it.photo]}
          renderOrder={it.main ? 2 : 1}
          onClick={(e) => onClick(e, i)}
          onPointerOver={(e) => { e.stopPropagation(); if (interactive()) { hover.current = i; setCursor("ver"); } }}
          onPointerOut={() => { if (hover.current === i) { hover.current = null; if (cursorMode.current === "ver") setCursor(null); } }}
        />
      ))}
    </group>
  );
}

/** Fragmentos fijos (muro y hojas de la puerta) que reutilizan geometría y textura de las fotos. */
function Tiles({ tiles, geo, materials, mirrored }: { tiles: DoorTile[]; geo: THREE.PlaneGeometry[]; materials: THREE.MeshBasicMaterial[]; mirrored?: boolean }) {
  return (
    <>
      {tiles.map((t, k) => (
        <mesh key={k} geometry={geo[t.photo]} material={materials[t.photo]} position={[t.x, t.y, t.z]} rotation={[0, 0, t.rot]}
          scale={[mirrored ? -t.h / PHOTO_H : t.h / PHOTO_H, t.h / PHOTO_H, 1]} />
      ))}
    </>
  );
}

/** Marco de la puerta: jambas y dintel forrados de fotos, molduras doradas y un medio punto de vidrio. */
function DoorFrame({ materials, gold, glass }: { materials: THREE.MeshBasicMaterial[]; gold: THREE.Material; glass: THREE.Material }) {
  const n = materials.length;
  const m = (k: number) => materials[(k * 37) % n];
  const top = DOOR_Y + DOOR_H / 2;
  const jamb = DOOR_W * 2 + 0.36;
  return (
    <group>
      {/* jambas y dintel de collage */}
      <mesh position={[-DOOR_W - 0.12, DOOR_Y, 0.08]} material={m(1)}><boxGeometry args={[0.2, DOOR_H + 0.12, 0.18]} /></mesh>
      <mesh position={[DOOR_W + 0.12, DOOR_Y, 0.08]} material={m(2)}><boxGeometry args={[0.2, DOOR_H + 0.12, 0.18]} /></mesh>
      <mesh position={[0, top + 0.1, 0.08]} material={m(3)}><boxGeometry args={[jamb, 0.2, 0.18]} /></mesh>
      {/* molduras doradas */}
      {[-1, 1].map((sx) => (
        <mesh key={sx} position={[sx * (DOOR_W + 0.025), DOOR_Y, 0.17]} material={gold}><boxGeometry args={[0.03, DOOR_H + 0.1, 0.03]} /></mesh>
      ))}
      <mesh position={[0, top + 0.005, 0.17]} material={gold}><boxGeometry args={[jamb - 0.3, 0.03, 0.03]} /></mesh>
      {/* medio punto: arco de vidrio sobre el dintel */}
      <group position={[0, top + 0.2, 0.06]}>
        <mesh material={glass}><circleGeometry args={[DOOR_W + 0.1, 48, 0, Math.PI]} /></mesh>
        <mesh position={[0, 0, 0.03]} material={gold}><torusGeometry args={[DOOR_W + 0.1, 0.035, 10, 48, Math.PI]} /></mesh>
        {[0.25, 0.5, 0.75].map((f) => (
          <mesh key={f} position={[Math.cos(Math.PI * f) * (DOOR_W + 0.1) / 2, Math.sin(Math.PI * f) * (DOOR_W + 0.1) / 2, 0.03]} rotation={[0, 0, Math.PI * f]} material={gold}>
            <boxGeometry args={[DOOR_W + 0.1, 0.02, 0.02]} />
          </mesh>
        ))}
        <mesh position={[0, 0, 0.04]} material={m(5)}><circleGeometry args={[0.16, 24]} /></mesh>
      </group>
    </group>
  );
}

/** Hoja de vidrio espejado en tres paños, con travesaños forrados de fotos y tirador dorado (bisagra en x = 0). */
function GlassLeaf({ materials, gold, glass, seed }: { materials: THREE.MeshBasicMaterial[]; gold: THREE.Material; glass: THREE.Material; seed: number }) {
  const n = materials.length;
  const m = (k: number) => materials[((k + seed) * 53) % n];
  const w = DOOR_W, h = DOOR_H, bar = 0.09;
  const panes = [0.34, 0.33, 0.33];
  let y0 = -h / 2 + bar;
  const inner = h - bar * 2;
  return (
    <group>
      {/* bastidor de collage */}
      <mesh position={[bar / 2, 0, 0.02]} material={m(1)}><boxGeometry args={[bar, h, 0.06]} /></mesh>
      <mesh position={[w - bar / 2, 0, 0.02]} material={m(2)}><boxGeometry args={[bar, h, 0.06]} /></mesh>
      <mesh position={[w / 2, h / 2 - bar / 2, 0.02]} material={m(3)}><boxGeometry args={[w, bar, 0.06]} /></mesh>
      <mesh position={[w / 2, -h / 2 + bar / 2, 0.02]} material={m(4)}><boxGeometry args={[w, bar, 0.06]} /></mesh>
      {panes.map((f, k) => {
        const ph = inner * f;
        const cy = y0 + ph / 2;
        y0 += ph;
        return (
          <group key={k}>
            <mesh position={[w / 2, cy, 0.02]} material={glass}><planeGeometry args={[w - bar * 2, ph - 0.03]} /></mesh>
            {k < panes.length - 1 && (
              <mesh position={[w / 2, cy + ph / 2, 0.03]} material={m(6 + k)}><boxGeometry args={[w - bar * 2, 0.05, 0.05]} /></mesh>
            )}
          </group>
        );
      })}
      {/* filete dorado interior y tirador */}
      <mesh position={[w / 2, 0, 0.055]} material={gold}><boxGeometry args={[w - bar * 2 + 0.02, 0.012, 0.012]} /></mesh>
      <mesh position={[w - 0.2, -0.05, 0.09]} rotation={[0, 0, 0]} material={gold}><cylinderGeometry args={[0.022, 0.022, 0.42, 12]} /></mesh>
    </group>
  );
}

/* ───────── Reflejo holográfico de Abraxas ───────── */
type HoloKey = keyof typeof holoData;
/** capas: x, y relativos al centro del vano; h altura; d profundidad virtual "detrás" del vidrio; op opacidad; add = mezcla aditiva */
const HOLO: { k: HoloKey; x: number; y: number; h?: number; w?: number; d: number; op: number; add?: boolean; dark?: boolean; tint: string }[] = [
  // penumbra detrás de la figura: le da cuerpo frente al brillo del vidrio
  { k: "cuerpo", x: 0.14, y: -0.06, h: 2.55, d: 1.3, op: 0.38, dark: true, tint: "#000000" },
  { k: "cara-blanca", x: -0.58, y: 0.82, h: 0.95, d: 1.35, op: 0.55, tint: "#d9e7e8" },
  { k: "cuerpo", x: 0.05, y: 0.02, h: 2.35, d: 1.0, op: 0.75, tint: "#f1e3cf" },
  { k: "satin", x: -0.06, y: -0.62, h: 1.0, d: 0.72, op: 0.3, add: true, tint: "#f2d7c4" },
  { k: "pelo", x: 0.34, y: 1.02, w: 0.56, d: 0.6, op: 0.4, add: true, tint: "#f5c6d6" },
  { k: "cara-roja", x: 0.4, y: 0.55, h: 0.9, d: 0.45, op: 0.7, tint: "#f6e6d4" },
  { k: "manos", x: 0.02, y: -0.98, w: 1.05, d: 0.25, op: 0.55, tint: "#efe0cf" },
  { k: "ojos", x: 0.08, y: 0.66, w: 0.92, d: 0.12, op: 0.4, add: true, tint: "#e8f1f1" },
];

const HOLO_VS = /* glsl */ `
varying vec2 vUv;
void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }
`;
const HOLO_FS = /* glsl */ `
uniform sampler2D map; uniform float uOp; uniform float uTime; uniform float uSeed; uniform vec3 uTint; uniform float uDark; uniform float uAdd;
varying vec2 vUv;
void main() {
  vec2 uv = vUv;
  // leve refracción: el vidrio ondula apenas lo que hay detrás
  uv.x += sin(uv.y * 17.0 + uTime * 0.8 + uSeed) * 0.004 + sin(uv.y * 5.0 - uTime * 0.35 + uSeed) * 0.003;
  uv.y += sin(uv.x * 9.0 + uTime * 0.5 + uSeed) * 0.0025;
  float ab = 0.0028;
  vec4 c = texture2D(map, uv);
  c.r = texture2D(map, uv + vec2(ab, 0.0)).r;
  c.b = texture2D(map, uv - vec2(ab, 0.0)).b;
  float shimmer = 0.86 + 0.14 * sin(uTime * 0.6 + uv.y * 5.0 + uSeed);
  // luz suave: se levantan las sombras para que la figura sea presencia luminosa, no mancha
  // las capas normales conservan el tono de la foto (se leen contra el vidrio claro);
  // las aditivas suman una luz cálida suave; la penumbra oscurece apenas detrás
  vec3 col = mix(c.rgb, uTint, 0.12) * 1.12;
  col = mix(col, col * 0.75 + 0.22 * uTint, uAdd);
  col = mix(col, vec3(0.02, 0.015, 0.01), uDark);
  gl_FragColor = vec4(col, c.a * uOp * shimmer);
  #include <colorspace_fragment>
}
`;

function HoloAbraxas({ state, low }: { state: MutableRefObject<{ near: number; open: number; yaw: number; pitch: number }>; low: boolean }) {
  const layers = useMemo(() => (low ? HOLO.filter((l) => l.k !== "satin" && l.k !== "cara-blanca") : HOLO), [low]);
  const mats = useMemo(() => {
    const loader = new THREE.TextureLoader();
    return layers.map((l, i) => {
      const tex = loader.load(holoData[l.k].src);
      tex.colorSpace = THREE.SRGBColorSpace;
      return new THREE.ShaderMaterial({
        vertexShader: HOLO_VS, fragmentShader: HOLO_FS, transparent: true, depthWrite: false, depthTest: true, fog: false,
        blending: l.add ? THREE.AdditiveBlending : THREE.NormalBlending, toneMapped: false,
        uniforms: { map: { value: tex }, uOp: { value: 0 }, uTime: { value: 0 }, uSeed: { value: i * 1.7 }, uTint: { value: new THREE.Color(l.tint) }, uDark: { value: l.dark ? 1 : 0 }, uAdd: { value: l.add ? 1 : 0 } },
      });
    });
  }, [layers]);
  useEffect(() => () => mats.forEach((m) => { (m.uniforms.map.value as THREE.Texture).dispose(); m.dispose(); }), [mats]);
  const refs = useRef<(THREE.Mesh | null)[]>([]);
  useFrame(({ clock }) => {
    const { near, open, yaw, pitch } = state.current;
    const t = clock.elapsedTime;
    const gone = 1 - Math.min(1, open * 2.5);
    layers.forEach((l, i) => {
      const m = refs.current[i];
      if (!m) return;
      // las capas profundas aparecen primero; las cercanas después
      const order = (1.4 - l.d) / 1.4;
      const rev = smooth(order * 0.35, order * 0.35 + 0.55, near);
      const op = l.op * rev * gone * (0.92 + Math.sin(t * 0.7 + i) * 0.08);
      mats[i].uniforms.uOp.value = op;
      mats[i].uniforms.uTime.value = t;
      m.visible = op > 0.002;
      // parallax de profundidad: lo que está más "adentro" del vidrio se corre más con la mirada
      m.position.set(l.x + yaw * l.d * 0.9, DOOR_Y + l.y - pitch * l.d * 0.6 + Math.sin(t * 0.45 + i * 1.3) * 0.012 * l.d, 0.1 + (1.4 - l.d) * 0.03);
      const sc = 1 - l.d * 0.05 * (1 - near) + (1 - rev) * 0.06;
      m.scale.setScalar(sc);
    });
  });
  return (
    <group>
      {layers.map((l, i) => {
        const a = holoData[l.k].aspect;
        const h = l.h ?? (l.w ?? 1) / a;
        const w = l.w ?? h * a;
        return (
          <mesh key={i} ref={(el) => { refs.current[i] = el; }} material={mats[i]} renderOrder={6 + i * 0.01} raycast={() => null}>
            <planeGeometry args={[w, h]} />
          </mesh>
        );
      })}
    </group>
  );
}

export const ROOM_PHOTO_COUNT = ALL.length;
export const ROOM_HOTSPOTS = ALL.filter((p) => p.note);
