"use client";
import { useEffect, useMemo, useRef, useState, type MutableRefObject } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { useRoom } from "../../store";

interface Props { src: string; progress: MutableRefObject<number>; active: boolean }

export function ParticlesCanvas(props: Props) {
  const low = useRoom((s) => s.lowPower);
  return (
    <Canvas dpr={low ? 1 : [1, 1.5]} frameloop={props.active ? "always" : "never"} camera={{ fov: 40, position: [0, 0, 5.2] }} gl={{ antialias: false }} onCreated={({ gl }) => gl.setClearColor("#121110")}>
      <Portrait {...props} low={low} />
    </Canvas>
  );
}

/** Muestrea el retrato en una rejilla: cada partícula guarda el color y la posición de un píxel. */
function useSamples(src: string, cols: number) {
  const [data, setData] = useState<{ target: Float32Array; color: Float32Array; random: Float32Array; count: number } | null>(null);
  useEffect(() => {
    const img = new Image();
    img.src = src;
    img.onload = () => {
      const rows = Math.round(cols * (img.height / img.width));
      const c = document.createElement("canvas");
      c.width = cols; c.height = rows;
      const g = c.getContext("2d")!;
      g.drawImage(img, 0, 0, cols, rows);
      const px = g.getImageData(0, 0, cols, rows).data;
      const n = cols * rows;
      const target = new Float32Array(n * 3);
      const color = new Float32Array(n * 3);
      const random = new Float32Array(n * 3);
      const h = 3.4;
      const w = h * (cols / rows);
      let k = 0;
      for (let y = 0; y < rows; y++) for (let x = 0; x < cols; x++) {
        const i = (y * cols + x) * 4;
        const r = px[i] / 255, gg = px[i + 1] / 255, b = px[i + 2] / 255;
        const lum = 0.3 * r + 0.59 * gg + 0.11 * b;
        target[k * 3] = (x / cols - 0.5) * w;
        target[k * 3 + 1] = -(y / rows - 0.5) * h;
        target[k * 3 + 2] = (lum - 0.5) * 0.5; // relieve por luminosidad
        color[k * 3] = r; color[k * 3 + 1] = gg; color[k * 3 + 2] = b;
        const th = Math.random() * Math.PI * 2, ph = Math.acos(2 * Math.random() - 1), rad = 3 + Math.random() * 3;
        random[k * 3] = Math.sin(ph) * Math.cos(th) * rad;
        random[k * 3 + 1] = Math.sin(ph) * Math.sin(th) * rad;
        random[k * 3 + 2] = Math.cos(ph) * rad - 2;
        k++;
      }
      setData({ target, color, random, count: n });
    };
  }, [src, cols]);
  return data;
}

const vert = /* glsl */ `
  attribute vec3 aTarget; attribute vec3 aRandom; attribute vec3 aColor;
  uniform float uTime; uniform float uMix; uniform float uSpeed; uniform float uSize; uniform float uAmp;
  varying vec3 vColor;
  void main() {
    vColor = aColor;
    vec3 p = mix(aRandom, aTarget, uMix);
    float t = uTime * uSpeed;
    p.x += sin(t + aRandom.y * 3.1) * uAmp * (1.2 - uMix);
    p.y += cos(t * 0.9 + aRandom.x * 2.7) * uAmp * (1.2 - uMix);
    p.z += sin(t * 1.3 + aRandom.z) * uAmp * 0.6;
    vec4 mv = modelViewMatrix * vec4(p, 1.0);
    gl_PointSize = uSize * (5.0 / -mv.z);
    gl_Position = projectionMatrix * mv;
  }`;
const frag = /* glsl */ `
  varying vec3 vColor;
  void main() {
    vec2 c = gl_PointCoord - 0.5;
    if (dot(c, c) > 0.25) discard;
    gl_FragColor = vec4(vColor, 1.0);
  }`;

function Portrait({ src, progress, low }: Props & { low: boolean }) {
  const data = useSamples(src, low ? 110 : 190);
  const music = useRoom((s) => s.musicMode);
  const reduced = useRoom((s) => s.reducedMotion);
  const mat = useRef<THREE.ShaderMaterial>(null);
  const pts = useRef<THREE.Points>(null);
  const uniforms = useMemo(() => ({ uTime: { value: 0 }, uMix: { value: 0 }, uSpeed: { value: 0.6 }, uSize: { value: low ? 5 : 4 }, uAmp: { value: 0.08 } }), [low]);
  const geo = useMemo(() => {
    if (!data) return null;
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(data.target.slice(), 3));
    g.setAttribute("aTarget", new THREE.BufferAttribute(data.target, 3));
    g.setAttribute("aRandom", new THREE.BufferAttribute(data.random, 3));
    g.setAttribute("aColor", new THREE.BufferAttribute(data.color, 3));
    return g;
  }, [data]);
  useEffect(() => () => geo?.dispose(), [geo]);

  useFrame((st, dt) => {
    const m = mat.current;
    if (!m) return;
    const target = reduced ? 1 : Math.min(1, progress.current / 0.45);
    m.uniforms.uMix.value += (target - m.uniforms.uMix.value) * Math.min(1, dt * 2.5);
    m.uniforms.uTime.value = st.clock.elapsedTime;
    const sp = music ? 2.6 : 0.6;
    m.uniforms.uSpeed.value += (sp - m.uniforms.uSpeed.value) * Math.min(1, dt * 2);
    const amp = reduced ? 0 : music ? 0.22 : 0.06;
    m.uniforms.uAmp.value += (amp - m.uniforms.uAmp.value) * Math.min(1, dt * 2);
    if (pts.current && !reduced) pts.current.rotation.y = Math.sin(st.clock.elapsedTime * 0.2) * (music ? 0.25 : 0.08);
  });

  if (!geo) return null;
  return (
    <points ref={pts} geometry={geo} frustumCulled={false}>
      <shaderMaterial ref={mat} vertexShader={vert} fragmentShader={frag} uniforms={uniforms} />
    </points>
  );
}
