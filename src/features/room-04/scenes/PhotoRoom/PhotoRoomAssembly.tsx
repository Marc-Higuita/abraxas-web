"use client";
import { useEffect, useMemo, useRef, useState, type MutableRefObject } from "react";
import { Canvas, useFrame, useThree, type ThreeEvent } from "@react-three/fiber";
import * as THREE from "three";
import photosData from "../../data/room-photos.json";
import type { RoomPhoto } from "../../types";
import { useRoom } from "../../store";
import {
  BASE_YAW_DEG, PHOTO_H, easeInOut, finalPose, headingDir, scatterPose, smooth, tunnelLength, tunnelPose, type Pose,
} from "./layout";

const ALL = photosData as RoomPhoto[];
const ASSEMBLY_DELAY = 5; // segundos desde que el conjunto mínimo está listo
const ASSEMBLY_DURATION = 3.4;

export type RoomPhase = "loading" | "scattered" | "assembling" | "assembled";

interface Props {
  progress: MutableRefObject<number>;
  onPhase: (p: RoomPhase) => void;
  onLoad: (loaded: number, total: number) => void;
  active: boolean;
}

/** Selecciona las fotos según el dispositivo: en bajo rendimiento, la mitad más nítida por pared. */
function pickPhotos(low: boolean) {
  if (!low) return ALL;
  const keep = new Set<string>();
  const byGroup = new Map<string, RoomPhoto[]>();
  for (const p of ALL) {
    const k = p.wall && p.type !== "techo" && p.type !== "piso" ? p.wall : p.type;
    byGroup.set(k, [...(byGroup.get(k) ?? []), p]);
  }
  for (const list of byGroup.values()) {
    list.sort((a, b) => b.sharp - a.sharp).slice(0, Math.ceil(list.length / 2)).forEach((p) => keep.add(p.id));
  }
  return ALL.filter((p) => keep.has(p.id));
}

export function PhotoRoomCanvas(props: Props) {
  const low = useRoom((s) => s.lowPower);
  return (
    <Canvas
      dpr={low ? 1 : [1, 1.75]}
      frameloop={props.active ? "always" : "never"}
      camera={{ fov: 46, near: 0.05, far: 60, position: [0, 0, 0] }}
      gl={{ antialias: !low, powerPreference: "high-performance" }}
      onCreated={({ gl }) => gl.setClearColor("#121110")}
    >
      <Scene {...props} low={low} />
    </Canvas>
  );
}

function Scene({ progress, onPhase, onLoad, low }: Props & { low: boolean }) {
  const photos = useMemo(() => pickPhotos(low), [low]);
  const n = photos.length;
  const reduced = useRoom((s) => s.reducedMotion);
  const openFicha = useRoom((s) => s.openFicha);
  const { camera, pointer, gl, size } = useThree();

  const poses = useMemo(
    () => photos.map((p, i) => ({ s: scatterPose(p, i, n), f: finalPose(p, i), t: tunnelPose(p, i) })),
    [photos, n],
  );
  const groups = useRef<(THREE.Group | null)[]>([]);
  const mats = useRef<(THREE.MeshBasicMaterial | null)[]>([]);
  const [hover, setHover] = useState<number | null>(null);

  // --- carga progresiva: primero el conjunto mínimo (las más nítidas), luego el resto ---
  const readyAt = useRef<number | null>(null);
  const phaseRef = useRef<RoomPhase>("loading");
  const setPhase = (p: RoomPhase) => {
    if (phaseRef.current !== p) {
      phaseRef.current = p;
      onPhase(p);
    }
  };
  useEffect(() => {
    const loader = new THREE.TextureLoader();
    const order = photos.map((p, i) => ({ p, i })).sort((a, b) => b.p.sharp - a.p.sharp);
    const critical = Math.min(n, low ? 24 : 40);
    let loaded = 0;
    let cancelled = false;
    const textures: THREE.Texture[] = [];
    const loadOne = (k: number) => {
      if (k >= order.length || cancelled) return;
      const { p, i } = order[k];
      loader.load(
        `/assets/room-04/photos/${p.id}.jpg`,
        (tex) => {
          if (cancelled) { tex.dispose(); return; }
          tex.colorSpace = THREE.SRGBColorSpace;
          tex.anisotropy = Math.min(4, gl.capabilities.getMaxAnisotropy());
          textures.push(tex);
          const m = mats.current[i];
          if (m) { m.map = tex; m.color.set("#ffffff"); m.needsUpdate = true; }
          loaded++;
          onLoad(Math.min(loaded, critical), critical);
          if (loaded === critical && readyAt.current === null) readyAt.current = performance.now() / 1000;
          loadOne(k + 2);
        },
        undefined,
        () => { loaded++; loadOne(k + 2); },
      );
    };
    loadOne(0);
    loadOne(1);
    const fallback = window.setTimeout(() => { if (readyAt.current === null) readyAt.current = performance.now() / 1000; }, 9000);
    return () => {
      cancelled = true;
      window.clearTimeout(fallback);
      textures.forEach((t) => t.dispose()); // liberar memoria GPU al desmontar
    };
  }, [photos, n, low, gl, onLoad]);

  const tmpPos = useMemo(() => new THREE.Vector3(), []);
  const tmpQuat = useMemo(() => new THREE.Quaternion(), []);
  const camDir = useMemo(() => headingDir(BASE_YAW_DEG), []);
  const tunnelLen = tunnelLength(n);
  const yawBase = THREE.MathUtils.degToRad(BASE_YAW_DEG);
  const look = useRef({ yaw: 0, pitch: 0 });

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

    for (let i = 0; i < n; i++) {
      const g = groups.current[i];
      if (!g) continue;
      const { s, f, t } = poses[i];
      const ai = easeInOut(THREE.MathUtils.clamp(a * 1.35 - (i / n) * 0.35, 0, 1));
      lerpPose(s, f, ai, tmpPos, tmpQuat);
      let scale = THREE.MathUtils.lerp(s.scale, f.scale, ai);
      if (tb > 0) {
        tmpPos.lerp(t.pos, tb);
        tmpQuat.slerp(t.quat, tb);
        scale = THREE.MathUtils.lerp(scale, t.scale, tb);
      }
      if (hover === i && tb < 0.05) scale *= 1.06;
      g.position.copy(tmpPos);
      g.quaternion.copy(tmpQuat);
      g.scale.setScalar(scale);
      // micro-flotación de los fragmentos antes de reconstruirse
      if (ai < 1 && !reduced) g.position.y += Math.sin(now * 0.7 + i) * 0.04 * (1 - ai);
    }

    // cámara: zoom por scroll, parallax sutil por cursor, viaje por el túnel
    const settled = a >= 1 ? 1 - tb : 0.3;
    look.current.yaw = THREE.MathUtils.damp(look.current.yaw, -pointer.x * 0.16 * settled, 3, dt);
    look.current.pitch = THREE.MathUtils.damp(look.current.pitch, pointer.y * 0.08 * settled, 3, dt);
    camera.position.copy(camDir).multiplyScalar(zoom * 1.6 + travel * tunnelLen);
    camera.rotation.set(look.current.pitch, -yawBase + look.current.yaw, 0, "YXZ");
    const cam = camera as THREE.PerspectiveCamera;
    const narrow = size.width < size.height;
    const fov = THREE.MathUtils.lerp(narrow ? 74 : 46, narrow ? 58 : 36, zoom);
    if (Math.abs(cam.fov - fov) > 0.01) { cam.fov = fov; cam.updateProjectionMatrix(); }
  });

  const interactive = () => phaseRef.current === "assembled" && progress.current < 0.25;

  const onClick = (e: ThreeEvent<MouseEvent>, i: number) => {
    e.stopPropagation();
    if (!interactive()) return;
    const ph = photos[i];
    openFicha({
      title: ph.note ?? ph.description,
      image: `/assets/room-04/photos/${ph.id}.jpg`,
      body: ph.note ? ph.description : undefined,
      meta: [
        `Archivo ${ph.id} · foto #${ph.seq}`,
        `Rumbo de la cámara: ${Math.round(ph.heading)}°`,
        ph.matched
          ? "Altura y giro calculados al emparejar esta foto con la anterior de la misma pared"
          : "Ubicada por rumbo de brújula; no encadenó con la foto anterior",
      ],
    });
  };

  return (
    <group>
      {photos.map((ph, i) => {
        const w = PHOTO_H * ph.aspect;
        const key = !!ph.note;
        return (
          <group key={ph.id} ref={(el) => { groups.current[i] = el; }}>
            {/* borde blanco de copia fotográfica; dorado si es un punto clave (lo que brilla se toca) */}
            <mesh position={[0, 0, -0.004]}>
              <planeGeometry args={[w + 0.07, PHOTO_H + 0.07]} />
              <meshBasicMaterial color={key ? "#d4a12a" : "#f3eee3"} side={THREE.DoubleSide} toneMapped={false} />
            </mesh>
            <mesh
              onClick={(e) => onClick(e, i)}
              onPointerOver={(e) => { e.stopPropagation(); if (interactive()) { setHover(i); document.body.style.cursor = "pointer"; } }}
              onPointerOut={() => { setHover(null); document.body.style.cursor = ""; }}
            >
              <planeGeometry args={[w, PHOTO_H]} />
              <meshBasicMaterial ref={(m) => { mats.current[i] = m; }} color="#3a3631" side={THREE.DoubleSide} toneMapped={false} />
            </mesh>
          </group>
        );
      })}
    </group>
  );
}

function lerpPose(a: Pose, b: Pose, t: number, outPos: THREE.Vector3, outQuat: THREE.Quaternion) {
  outPos.copy(a.pos).lerp(b.pos, t);
  outQuat.copy(a.quat).slerp(b.quat, t);
}

export const ROOM_PHOTO_COUNT = ALL.length;
export const ROOM_HOTSPOTS = ALL.filter((p) => p.note);
