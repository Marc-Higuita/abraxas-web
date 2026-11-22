import * as THREE from "three";
import type { RoomPhoto } from "../../types";

/**
 * Geometría de la habitación fragmentada.
 * La cámara está en el centro de la oficina. Cada foto vuelve al ángulo desde el que fue tomada
 * (rumbo de brújula EXIF) sobre un cilindro alrededor del visitante: un "joiner" a la Hockney
 * con los desajustes reales de la brújula y del pulso de quien fotografió.
 * Norte = -Z, Este = +X.
 */
export const R = 4.6;
export const PHOTO_H = 1.25;
/** La cámara mira hacia la pared sur ("HELP" y el diploma), la más documentada. */
export const BASE_YAW_DEG = 210;

export interface Pose {
  pos: THREE.Vector3;
  quat: THREE.Quaternion;
  scale: number;
}

const toRad = THREE.MathUtils.degToRad;
const euler = new THREE.Euler();

export function headingDir(deg: number) {
  const t = toRad(deg);
  return new THREE.Vector3(Math.sin(t), 0, -Math.cos(t));
}

function seeded(seed: number) {
  let s = (seed * 16807) % 2147483647;
  return () => ((s = (s * 16807) % 2147483647) - 1) / 2147483646;
}

/** Composición final: la oficina reconstruida. */
export function finalPose(p: RoomPhoto, i: number): Pose {
  const depth = (i % 9) * 0.012; // capas de papel: evita z-fighting y conserva el solapamiento
  if (p.type === "techo" || p.type === "piso") {
    const up = p.type === "techo";
    const pos = new THREE.Vector3((p.px ?? 0) * 0.75, up ? 3.1 : -3.1, (p.pz ?? 0) * 0.75);
    euler.set(up ? Math.PI / 2 : -Math.PI / 2, 0, toRad(-p.heading), "XYZ");
    return { pos, quat: new THREE.Quaternion().setFromEuler(euler), scale: 1.45 };
  }
  const t = toRad(p.heading);
  const r = R - depth;
  // la altura estimada se expande un 35 %: el visitante ve las paredes de piso a techo
  const pos = new THREE.Vector3(Math.sin(t) * r, (p.ly - 2.3) * 1.35, -Math.cos(t) * r);
  euler.set(0, -t, toRad(p.roll), "YXZ");
  return { pos, quat: new THREE.Quaternion().setFromEuler(euler), scale: 1 };
}

/** Estado inicial: fragmentos flotantes con posiciones controladas (espiral áurea por orden de toma). */
export function scatterPose(p: RoomPhoto, i: number, n: number): Pose {
  const rnd = seeded(p.seq + 7);
  const a = i * 2.39996;
  const rr = 0.5 + Math.sqrt((i + 1) / n) * 4.4;
  const local = new THREE.Vector3(Math.cos(a) * rr * 1.35, Math.sin(a) * rr * 0.62, -(3.2 + (i % 7) * 1.05));
  const yaw = toRad(BASE_YAW_DEG);
  const pos = local.applyAxisAngle(new THREE.Vector3(0, 1, 0), -yaw);
  euler.set((rnd() - 0.5) * 0.7, -yaw + (rnd() - 0.5) * 0.9, (rnd() - 0.5) * 0.8, "YXZ");
  return { pos, quat: new THREE.Quaternion().setFromEuler(euler), scale: 0.72 + rnd() * 0.25 };
}

export const TUNNEL_PER_RING = 30;
export const TUNNEL_GAP = 0.6;
/** Túnel corto y decidido: 11 anillos; el resto de piezas se desprende al formarse. */
export const TUNNEL_RINGS = 15;
export const TUNNEL_MAX = TUNNEL_PER_RING * TUNNEL_RINGS;
export const TUNNEL_START = 1.6;
/** Distancia de la puerta al centro de la habitación, sobre el eje de la mirada. */
export const DOOR_D = TUNNEL_START + TUNNEL_RINGS * TUNNEL_GAP + 0.5;

/** Túnel: anillos de fotos alrededor de la mirada, sin huecos; el visitante los atraviesa. */
export function tunnelPose(roll: number, i: number): Pose {
  const ring = Math.floor(i / TUNNEL_PER_RING);
  const k = i % TUNNEL_PER_RING;
  const ang = (k / TUNNEL_PER_RING) * Math.PI * 2 + ring * 0.37;
  // profundidad variable: unas piezas sobresalen y otras se hunden, como papel pegado a mano
  const rr = 2.2 + ((i * 7) % 5) * 0.045 + (ring % 2) * 0.04;
  const d = TUNNEL_START + ring * TUNNEL_GAP + ((i * 13) % 7) * 0.02;
  const yaw = toRad(BASE_YAW_DEG);
  const local = new THREE.Vector3(Math.cos(ang) * rr, Math.sin(ang) * rr, -d);
  const pos = local.clone().applyAxisAngle(new THREE.Vector3(0, 1, 0), -yaw);
  // la foto mira hacia el eje del túnel
  const m = new THREE.Matrix4().lookAt(pos, new THREE.Vector3(0, 0, -d).applyAxisAngle(new THREE.Vector3(0, 1, 0), -yaw), new THREE.Vector3(0, 0, -1).applyAxisAngle(new THREE.Vector3(0, 1, 0), -yaw));
  const q = new THREE.Quaternion().setFromRotationMatrix(m);
  q.multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), Math.PI));
  q.multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 0, 1), toRad(roll * 1.5)));
  return { pos, quat: q, scale: 1.12 };
}

export interface DoorTile { photo: number; x: number; y: number; z: number; w: number; h: number; rot: number }

/**
 * Muro final del túnel con un vano de puerta, y las dos hojas de la puerta, todo hecho con fotos.
 * Coordenadas locales: x a la derecha, y arriba, z hacia la cámara (la puerta está en z = 0).
 */
export const DOOR_W = 1.25; // ancho de cada hoja
export const DOOR_H = 3.4;
export const DOOR_Y = -0.15; // centro vertical del vano
export function buildDoor(photos: RoomPhoto[]) {
  const rnd = seeded(203);
  const wallIdx = photos.map((p, i) => ({ p, i })).filter((x) => x.p.type !== "techo" && x.p.type !== "piso").map((x) => x.i);
  const pick = () => wallIdx[Math.floor(rnd() * wallIdx.length)];
  const wall: DoorTile[] = [];
  const halfW = DOOR_W + 0.06;
  const top = DOOR_Y + DOOR_H / 2 + 0.06;
  const bot = DOOR_Y - DOOR_H / 2 - 0.06;
  for (let y = -3.3; y <= 3.4; y += 0.62) {
    for (let x = -3.6; x <= 3.7; x += 0.5) {
      const xx = x + (rnd() - 0.5) * 0.18;
      const yy = y + (rnd() - 0.5) * 0.14;
      const inside = Math.abs(xx) < halfW + 0.25 && yy > bot - 0.3 && yy < top + 0.25;
      if (inside) continue;
      wall.push({ photo: pick(), x: xx, y: yy, z: rnd() * 0.04, w: 0, h: 0.95 + rnd() * 0.35, rot: (rnd() - 0.5) * 0.25 });
    }
  }
  // marco: tiras de fotos alrededor del vano, más pequeñas, que sí pueden entrar al borde
  for (let y = bot; y <= top; y += 0.45) {
    for (const sx of [-1, 1]) wall.push({ photo: pick(), x: sx * (halfW + 0.22), y, z: 0.06, w: 0, h: 0.55, rot: (rnd() - 0.5) * 0.3 });
  }
  for (let x = -halfW - 0.2; x <= halfW + 0.2; x += 0.42) wall.push({ photo: pick(), x, y: top + 0.2, z: 0.06, w: 0, h: 0.5, rot: (rnd() - 0.5) * 0.3 });
  // hojas: cuadrícula de fragmentos que cubre toda la hoja (coordenadas relativas a la bisagra)
  const leaf = (): DoorTile[] => {
    const out: DoorTile[] = [];
    for (let y = -DOOR_H / 2 + 0.3; y <= DOOR_H / 2 - 0.25; y += 0.5) {
      for (let x = 0.24; x <= DOOR_W - 0.2; x += 0.42) out.push({ photo: pick(), x: x + (rnd() - 0.5) * 0.06, y: y + (rnd() - 0.5) * 0.06, z: 0.03 + rnd() * 0.02, w: 0, h: 0.62, rot: (rnd() - 0.5) * 0.22 });
    }
    return out;
  };
  return { wall, left: leaf(), right: leaf() };
}

export interface FillItem { photo: number; pose: Pose; roll: number }

/**
 * Relleno: cubre todo el cilindro (de piso a techo) y las tapas con fragmentos de la misma pared.
 * Cada celda toma una de las fotos con rumbo más cercano a su ángulo: si no hay foto, se duplica
 * la de al lado, girada y escalada, como un collage que no deja ver el fondo.
 */
export function buildFill(photos: RoomPhoto[], density = 1): FillItem[] {
  const out: FillItem[] = [];
  const rnd = seeded(91);
  const wall = photos.map((p, i) => ({ p, i })).filter((x) => x.p.type !== "techo" && x.p.type !== "piso");
  const ceil = photos.map((p, i) => ({ p, i })).filter((x) => x.p.type === "techo");
  const floor = photos.map((p, i) => ({ p, i })).filter((x) => x.p.type === "piso" || x.p.type === "mobiliario");
  const floorPool = floor.length ? floor : wall;
  const ceilPool = ceil.length ? ceil : wall;
  const nearest = (deg: number, k: number) => {
    const sorted = [...wall].sort((a, b) => Math.abs(((a.p.heading - deg + 540) % 360) - 180) - Math.abs(((b.p.heading - deg + 540) % 360) - 180));
    return sorted.slice(0, k);
  };
  const r = R + 0.08;
  const colW = 0.8 / density;
  const cols = Math.ceil((Math.PI * 2 * r) / colW);
  const rowH = 0.95 / Math.sqrt(density);
  const recent: number[] = [];
  for (let y = -3.15; y <= 3.2; y += rowH) {
    for (let c = 0; c < cols; c++) {
      const deg = (c / cols) * 360 + (Math.round(y * 10) % 2) * (180 / cols);
      const cand = nearest(deg, 8).filter((x) => !recent.includes(x.i));
      const pick = cand.length ? cand[Math.floor(rnd() * Math.min(5, cand.length))] : nearest(deg, 1)[0];
      recent.push(pick.i); if (recent.length > 6) recent.shift();
      const t = toRad(deg);
      const roll = (rnd() - 0.5) * 10;
      const pos = new THREE.Vector3(Math.sin(t) * (r + rnd() * 0.05), y + (rnd() - 0.5) * 0.2, -Math.cos(t) * (r + rnd() * 0.05));
      euler.set(0, -t, toRad(roll), "YXZ");
      out.push({ photo: pick.i, roll, pose: { pos, quat: new THREE.Quaternion().setFromEuler(euler), scale: 1.05 + rnd() * 0.25 } });
    }
  }
  // tapas: techo y piso en anillos concéntricos
  for (const [pool, yy, up] of [[ceilPool, 3.55, true], [floorPool, -3.55, false]] as const) {
    for (const rad of [r * 0.88, r * 0.66, r * 0.44, r * 0.22, 0]) {
      const n = Math.max(1, Math.ceil(((Math.PI * 2 * rad) / 0.85) * density));
      for (let k = 0; k < n; k++) {
        const a = (k / n) * Math.PI * 2 + rad;
        const pick = pool[Math.floor(rnd() * pool.length)];
        const pos = new THREE.Vector3(Math.sin(a) * rad, yy, -Math.cos(a) * rad);
        euler.set(up ? Math.PI / 2 : -Math.PI / 2, 0, -a + (rnd() - 0.5) * 0.4, "XYZ");
        out.push({ photo: pick.i, roll: 0, pose: { pos, quat: new THREE.Quaternion().setFromEuler(euler), scale: 1.25 + rnd() * 0.3 } });
      }
    }
  }
  return out;
}

export const smooth = (a: number, b: number, x: number) => {
  const t = THREE.MathUtils.clamp((x - a) / (b - a), 0, 1);
  return t * t * (3 - 2 * t);
};
export const easeInOut = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
