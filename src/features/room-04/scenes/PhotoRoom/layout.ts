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
export const PHOTO_H = 1.05;
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

export const tunnelLength = (n: number) => 2.6 + n * 0.3 + 2;

/** Túnel de fotografías a lo largo de la mirada: el visitante atraviesa las capas. */
export function tunnelPose(p: RoomPhoto, i: number): Pose {
  const d = 2.6 + i * 0.3;
  const ang = toRad(i * 137.5);
  const rr = 1.25 + (i % 5) * 0.38;
  const yaw = toRad(BASE_YAW_DEG);
  const local = new THREE.Vector3(Math.cos(ang) * rr * 1.25, Math.sin(ang) * rr * 0.85, -d);
  const pos = local.applyAxisAngle(new THREE.Vector3(0, 1, 0), -yaw);
  euler.set(0, -yaw, toRad(p.roll * 2 + ((i % 3) - 1) * 4), "YXZ");
  return { pos, quat: new THREE.Quaternion().setFromEuler(euler), scale: 0.85 };
}

export const smooth = (a: number, b: number, x: number) => {
  const t = THREE.MathUtils.clamp((x - a) / (b - a), 0, 1);
  return t * t * (3 - 2 * t);
};
export const easeInOut = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
