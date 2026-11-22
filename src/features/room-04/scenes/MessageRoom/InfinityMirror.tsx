"use client";
import { useEffect, useMemo, useRef, type ReactNode } from "react";
import { useFrame, useThree, type ThreeEvent } from "@react-three/fiber";
import * as THREE from "three";

/**
 * Espejo con reflejo real y recursión simulada («espejo infinito»).
 *
 * 1. Cada pocos fotogramas, una cámara virtual reflejada respecto al plano del espejo
 *    renderiza la habitación en un render target (con plano de recorte oblicuo, como el
 *    Reflector de three). El espejo de enfrente sigue visible en esa pasada con su captura anterior,
 *    así que un par de espejos enfrentados se reflejan uno dentro del otro (retroalimentación).
 * 2. El shader suma además N copias encajadas hacia el centro, cada una más oscura y con su
 *    marco, para que el reflejo parezca continuar en profundidad.
 * Costo acotado: resolución baja, actualización espaciada y menos copias en modo liviano.
 */

const vert = /* glsl */ `
uniform mat4 uTexMat;
varying vec4 vProj;
varying vec2 vUv;
void main() {
  vUv = uv;
  vProj = uTexMat * vec4(position, 1.0);
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}`;

const frag = /* glsl */ `
uniform sampler2D tMap;
uniform mat4 uTexMat;
uniform vec2 uSize;
uniform float uIters;
uniform float uScale;
uniform float uTint;
uniform vec3 uFrame;
uniform vec3 uGlass;
uniform float uHover;
varying vec4 vProj;
varying vec2 vUv;

vec3 sampleAt(vec2 uv) {
  vec4 p = uTexMat * vec4((uv - 0.5) * uSize, 0.0, 1.0);
  return texture2D(tMap, p.xy / p.w).rgb;
}

void main() {
  vec2 c = vUv - 0.5;
  float m = max(abs(c.x), abs(c.y)) * 2.0;            // 0 en el centro, 1 en el borde
  float lvl = uIters > 0.0 ? floor(log(max(m, 1e-4)) / log(uScale)) : 0.0;
  lvl = clamp(lvl, 0.0, uIters);
  float s = pow(uScale, lvl);
  vec2 uvk = 0.5 + c / s;                              // la copia de este nivel, devuelta a tamaño completo
  vec3 col = lvl < 0.5 ? texture2D(tMap, vProj.xy / vProj.w).rgb : sampleAt(uvk);
  col *= pow(uTint, lvl);
  // marco de cada copia encajada: banda dorada que se oscurece con la profundidad
  float mk = m / s;
  float edge = smoothstep(0.955, 0.975, mk) * (1.0 - smoothstep(0.995, 1.0, mk));
  if (lvl > 0.5) col = mix(col, uFrame * pow(uTint, lvl - 1.0), edge * 0.9);
  // tinte del vidrio y un leve brillo al pasar el cursor
  col = col * uGlass + uHover * 0.06;
  gl_FragColor = vec4(col, 1.0);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}`;

export interface InfinityMirrorProps {
  size: [number, number];
  position: [number, number, number];
  rotation: [number, number, number];
  res: number;
  every: number;
  iters: number;
  hover?: boolean;
  onClick?: (e: ThreeEvent<MouseEvent>) => void;
  onPointerOver?: (e: ThreeEvent<PointerEvent>) => void;
  onPointerOut?: (e: ThreeEvent<PointerEvent>) => void;
  children?: ReactNode;
}

export function InfinityMirror({ size, position, rotation, res, every, iters, hover = false, onClick, onPointerOver, onPointerOut, children }: InfinityMirrorProps) {
  const mesh = useRef<THREE.Mesh>(null);
  const { gl, scene, camera } = useThree();
  const rts = useMemo(() => [0, 1].map(() => new THREE.WebGLRenderTarget(res, Math.round(res * (size[1] / size[0])), { type: THREE.HalfFloatType, colorSpace: THREE.LinearSRGBColorSpace })), [res, size]);
  const idx = useRef(0);
  const frame = useRef(0);
  const vcam = useMemo(() => new THREE.PerspectiveCamera(), []);
  const tmp = useMemo(() => ({
    mirrorPos: new THREE.Vector3(), camPos: new THREE.Vector3(), rot: new THREE.Matrix4(), normal: new THREE.Vector3(),
    view: new THREE.Vector3(), look: new THREE.Vector3(), target: new THREE.Vector3(), plane: new THREE.Plane(),
    clip: new THREE.Vector4(), q: new THREE.Vector4(), texMat: new THREE.Matrix4(),
  }), []);

  const mat = useMemo(() => new THREE.ShaderMaterial({
    vertexShader: vert,
    fragmentShader: frag,
    uniforms: {
      tMap: { value: rts[0].texture },
      uTexMat: { value: new THREE.Matrix4() },
      uSize: { value: new THREE.Vector2(size[0], size[1]) },
      uIters: { value: iters },
      uScale: { value: 0.72 },
      uTint: { value: 0.8 },
      uFrame: { value: new THREE.Color("#d4a12a") },
      uGlass: { value: new THREE.Color("#e7efec") },
      uHover: { value: 0 },
    },
  }), [rts, size, iters]);

  useEffect(() => () => { rts.forEach((r) => r.dispose()); mat.dispose(); }, [rts, mat]);

  useFrame(() => {
    const m = mesh.current;
    if (!m) return;
    mat.uniforms.uHover.value += ((hover ? 1 : 0) - mat.uniforms.uHover.value) * 0.15;
    if (frame.current++ % every !== 0) return;
    const t = tmp;
    const cam = camera as THREE.PerspectiveCamera;
    t.mirrorPos.setFromMatrixPosition(m.matrixWorld);
    t.camPos.setFromMatrixPosition(cam.matrixWorld);
    t.rot.extractRotation(m.matrixWorld);
    t.normal.set(0, 0, 1).applyMatrix4(t.rot);
    t.view.subVectors(t.mirrorPos, t.camPos);
    if (t.view.dot(t.normal) > 0) return; // la cámara está detrás del espejo
    t.view.reflect(t.normal).negate().add(t.mirrorPos);
    t.rot.extractRotation(cam.matrixWorld);
    t.look.set(0, 0, -1).applyMatrix4(t.rot).add(t.camPos);
    t.target.subVectors(t.mirrorPos, t.look).reflect(t.normal).negate().add(t.mirrorPos);
    vcam.position.copy(t.view);
    vcam.up.set(0, 1, 0).applyMatrix4(t.rot).reflect(t.normal);
    vcam.lookAt(t.target);
    vcam.near = cam.near; vcam.far = cam.far;
    vcam.layers.mask = cam.layers.mask;
    vcam.updateMatrixWorld();
    vcam.projectionMatrix.copy(cam.projectionMatrix);

    // matriz de textura (para el espejo visto desde la cámara principal)
    t.texMat.set(0.5, 0, 0, 0.5, 0, 0.5, 0, 0.5, 0, 0, 0.5, 0.5, 0, 0, 0, 1)
      .multiply(vcam.projectionMatrix).multiply(vcam.matrixWorldInverse).multiply(m.matrixWorld);

    // plano de recorte oblicuo: lo que queda detrás del espejo (la pared) no tapa el reflejo
    t.plane.setFromNormalAndCoplanarPoint(t.normal, t.mirrorPos).applyMatrix4(vcam.matrixWorldInverse);
    t.clip.set(t.plane.normal.x, t.plane.normal.y, t.plane.normal.z, t.plane.constant);
    const pm = vcam.projectionMatrix.elements;
    t.q.set((Math.sign(t.clip.x) + pm[8]) / pm[0], (Math.sign(t.clip.y) + pm[9]) / pm[5], -1, (1 + pm[10]) / pm[14]);
    t.clip.multiplyScalar(2 / t.clip.dot(t.q));
    pm[2] = t.clip.x; pm[6] = t.clip.y; pm[10] = t.clip.z + 1 - 0.003; pm[14] = t.clip.w;

    // render en el buffer libre; el espejo sigue mostrando la captura anterior (recursión real)
    const write = rts[1 - idx.current];
    const prevRT = gl.getRenderTarget();
    const prevXr = gl.xr.enabled;
    const prevShadow = gl.shadowMap.autoUpdate;
    gl.xr.enabled = false;
    gl.shadowMap.autoUpdate = false;
    m.visible = false; // un espejo no se ve a sí mismo; sí ve al espejo de enfrente
    gl.setRenderTarget(write);
    gl.clear();
    gl.render(scene, vcam);
    m.visible = true;
    gl.setRenderTarget(prevRT);
    gl.xr.enabled = prevXr;
    gl.shadowMap.autoUpdate = prevShadow;
    idx.current = 1 - idx.current;
    mat.uniforms.tMap.value = write.texture;
    (mat.uniforms.uTexMat.value as THREE.Matrix4).copy(t.texMat);
  });

  return (
    <group position={position} rotation={rotation}>
      <mesh ref={mesh} material={mat} onClick={onClick} onPointerOver={onPointerOver} onPointerOut={onPointerOut}>
        <planeGeometry args={size} />
      </mesh>
      {children}
    </group>
  );
}
