"use client";
import { useEffect, useMemo, useRef, type MutableRefObject } from "react";
import { Canvas, useFrame, useThree, type ThreeEvent } from "@react-three/fiber";
import * as THREE from "three";
import photosData from "../../data/room-photos.json";
import type { RoomPhoto } from "../../types";
import { useRoom } from "../../store";
import {
  BASE_YAW_DEG, PHOTO_H, buildFill, easeInOut, finalPose, headingDir, scatterPose, smooth, tunnelLength, tunnelPose, type Pose,
} from "./layout";

const ALL = photosData as RoomPhoto[];
const ASSEMBLY_DELAY = 5;
const ASSEMBLY_DURATION = 3.6;
const BG = "#2a2119";

export type RoomPhase = "loading" | "scattered" | "assembling" | "assembled";

interface Props {
  progress: MutableRefObject<number>;
  onPhase: (p: RoomPhase) => void;
  onLoad: (loaded: number, total: number) => void;
  active: boolean;
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

interface Item { photo: number; s: Pose; f: Pose; t: Pose; main: boolean; delay: number }

function Scene({ progress, onPhase, onLoad, low }: Props & { low: boolean }) {
  const photos = useMemo(() => pickPhotos(low), [low]);
  const reduced = useRoom((s) => s.reducedMotion);
  const openFicha = useRoom((s) => s.openFicha);
  const { camera, pointer, gl, size } = useThree();

  // un material por foto: la capa principal y el relleno comparten textura
  const materials = useMemo(
    () => photos.map(() => new THREE.MeshBasicMaterial({ color: "#5a4632", side: THREE.DoubleSide, toneMapped: false })),
    [photos],
  );
  const items = useMemo<Item[]>(() => {
    const n = photos.length;
    const main: Item[] = photos.map((p, i) => ({ photo: i, main: true, s: scatterPose(p, i, n), f: finalPose(p, i), t: tunnelPose(p.roll, 0), delay: (i / n) * 0.35 }));
    const fill: Item[] = buildFill(photos, low ? 0.55 : 1).map((fi, k) => ({
      photo: fi.photo, main: false, f: fi.pose, s: { ...fi.pose, scale: 0 }, t: tunnelPose(fi.roll, 0), delay: 0.35 + (((k * 37) % 100) / 100) * 0.5,
    }));
    const all = [...main, ...fill];
    // reparte todas las piezas en los anillos del túnel, mezclando principales y relleno
    const order = all.map((_, i) => i).sort((a, b) => ((a * 7919) % 997) - ((b * 7919) % 997));
    order.forEach((idx, k) => { all[idx].t = tunnelPose(photos[all[idx].photo].roll, k); });
    return all;
  }, [photos, low]);
  const geo = useMemo(() => photos.map((p) => new THREE.PlaneGeometry(PHOTO_H * p.aspect, PHOTO_H)), [photos]);
  useEffect(() => () => { materials.forEach((m) => { m.map?.dispose(); m.dispose(); }); geo.forEach((g) => g.dispose()); }, [materials, geo]);

  const meshes = useRef<(THREE.Mesh | null)[]>([]);
  const hover = useRef<number | null>(null);
  const readyAt = useRef<number | null>(null);
  const phaseRef = useRef<RoomPhase>("loading");
  const setPhase = (p: RoomPhase) => { if (phaseRef.current !== p) { phaseRef.current = p; onPhase(p); } };

  useEffect(() => {
    const loader = new THREE.TextureLoader();
    const order = photos.map((p, i) => ({ p, i })).sort((a, b) => b.p.sharp - a.p.sharp);
    const critical = Math.min(photos.length, low ? 24 : 40);
    let loaded = 0;
    let cancelled = false;
    const loadOne = (k: number) => {
      if (k >= order.length || cancelled) return;
      const { p, i } = order[k];
      loader.load(`/assets/room-04/photos/${p.id}.jpg`, (tex) => {
        if (cancelled) { tex.dispose(); return; }
        tex.colorSpace = THREE.SRGBColorSpace;
        tex.anisotropy = Math.min(4, gl.capabilities.getMaxAnisotropy());
        materials[i].map = tex; materials[i].color.set("#ffffff"); materials[i].needsUpdate = true;
        loaded++;
        onLoad(Math.min(loaded, critical), critical);
        if (loaded === critical && readyAt.current === null) readyAt.current = performance.now() / 1000;
        loadOne(k + 3);
      }, undefined, () => { loaded++; loadOne(k + 3); });
    };
    [0, 1, 2].forEach(loadOne);
    const fallback = window.setTimeout(() => { if (readyAt.current === null) readyAt.current = performance.now() / 1000; }, 9000);
    return () => { cancelled = true; window.clearTimeout(fallback); };
  }, [photos, materials, low, gl, onLoad]);

  const tmpPos = useMemo(() => new THREE.Vector3(), []);
  const tmpQuat = useMemo(() => new THREE.Quaternion(), []);
  const camDir = useMemo(() => headingDir(BASE_YAW_DEG), []);
  const tunnelLen = tunnelLength(items.length);
  const yawBase = THREE.MathUtils.degToRad(BASE_YAW_DEG);
  const look = useRef({ yaw: 0, pitch: 0 });
  // al final del túnel espera el video: su primer fotograma como tapa
  const endTex = useMemo(() => { const tx = new THREE.TextureLoader().load("/assets/room-04/misc/video-poster.jpg"); tx.colorSpace = THREE.SRGBColorSpace; return tx; }, []);
  useEffect(() => () => endTex.dispose(), [endTex]);
  const endPos = useMemo(() => camDir.clone().multiplyScalar(tunnelLen + 0.4), [camDir, tunnelLen]);

  useFrame((_, dt) => {
    const now = performance.now() / 1000;
    let a = 0;
    if (readyAt.current !== null) {
      const t0 = readyAt.current + (reduced ? 0 : ASSEMBLY_DELAY);
      a = reduced ? 1 : THREE.MathUtils.clamp((now - t0) / ASSEMBLY_DURATION, 0, 1);
      setPhase(a <= 0 ? "scattered" : a < 1 ? "assembling" : "assembled");
    }
    const p = progress.current;
    const zoom = smooth(0, 0.25, p);
    const tb = reduced ? 0 : smooth(0.25, 0.45, p);
    const travel = reduced ? 0 : smooth(0.4, 0.97, p);

    for (let i = 0; i < items.length; i++) {
      const m = meshes.current[i];
      if (!m) continue;
      const it = items[i];
      const ai = easeInOut(THREE.MathUtils.clamp((a * 1.5 - it.delay) / 0.65, 0, 1));
      tmpPos.copy(it.s.pos).lerp(it.f.pos, it.main ? ai : 1);
      tmpQuat.copy(it.s.quat).slerp(it.f.quat, it.main ? ai : 1);
      let scale = THREE.MathUtils.lerp(it.s.scale, it.f.scale, ai);
      if (tb > 0) {
        tmpPos.lerp(it.t.pos, tb);
        tmpQuat.slerp(it.t.quat, tb);
        scale = THREE.MathUtils.lerp(scale, it.t.scale, tb);
      }
      if (hover.current === i && tb < 0.05) scale *= 1.07;
      m.position.copy(tmpPos);
      m.quaternion.copy(tmpQuat);
      m.scale.setScalar(Math.max(0.0001, scale));
      if (it.main && ai < 1 && !reduced) m.position.y += Math.sin(now * 0.7 + i) * 0.04 * (1 - ai);
    }

    const settled = a >= 1 ? 1 - tb : 0.3;
    look.current.yaw = THREE.MathUtils.damp(look.current.yaw, -pointer.x * 0.18 * settled, 3, dt);
    look.current.pitch = THREE.MathUtils.damp(look.current.pitch, pointer.y * 0.1 * settled, 3, dt);
    camera.position.copy(camDir).multiplyScalar(zoom * 1.6 + travel * (tunnelLen - 3.6));
    camera.rotation.set(look.current.pitch, -yawBase + look.current.yaw, 0, "YXZ");
    const cam = camera as THREE.PerspectiveCamera;
    const narrow = size.width < size.height;
    const fov = THREE.MathUtils.lerp(narrow ? 74 : 46, narrow ? 58 : 36, zoom) + tb * 18;
    if (Math.abs(cam.fov - fov) > 0.01) { cam.fov = fov; cam.updateProjectionMatrix(); }
  });

  const interactive = () => phaseRef.current === "assembled" && progress.current < 0.25;
  const onClick = (e: ThreeEvent<MouseEvent>, i: number) => {
    e.stopPropagation();
    if (!interactive()) return;
    const ph = photos[items[i].photo];
    openFicha({
      title: ph.note ?? ph.description,
      image: `/assets/room-04/photos/${ph.id}.jpg`,
      body: ph.note ? ph.description : undefined,
      meta: [
        `Archivo ${ph.id} · foto #${ph.seq}`,
        `Rumbo de la cámara: ${Math.round(ph.heading)}°`,
        items[i].main ? (ph.matched ? "Altura y giro calculados al emparejar esta foto con la anterior de la misma pared" : "Ubicada por rumbo de brújula") : "Fragmento repetido de la misma pared para completar el collage",
      ],
    });
  };

  return (
    <group>
      <mesh position={endPos} rotation={[0, -yawBase, 0]}>
        <planeGeometry args={[6.4, 3.62]} />
        <meshBasicMaterial map={endTex} toneMapped={false} />
      </mesh>
      <mesh position={endPos.clone().add(camDir.clone().multiplyScalar(0.05))} rotation={[0, -yawBase, 0]}>
        <planeGeometry args={[7.2, 4.4]} />
        <meshBasicMaterial color="#f3eee3" toneMapped={false} />
      </mesh>
      {items.map((it, i) => (
        <mesh
          key={i}
          ref={(el) => { meshes.current[i] = el; }}
          geometry={geo[it.photo]}
          material={materials[it.photo]}
          renderOrder={it.main ? 2 : 1}
          onClick={(e) => onClick(e, i)}
          onPointerOver={(e) => { e.stopPropagation(); if (interactive()) hover.current = i; }}
          onPointerOut={() => { hover.current = null; }}
        />
      ))}
    </group>
  );
}

export const ROOM_PHOTO_COUNT = ALL.length;
export const ROOM_HOTSPOTS = ALL.filter((p) => p.note);
