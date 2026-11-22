/** Ornamentos gráficos: marco ovalado en puntos (el espejo del manual), costura en zigzag y esquina bordada. */

export function DottedOval({ className = "", color = "currentColor" }: { className?: string; color?: string }) {
  const dots: React.ReactNode[] = [];
  const rings = [{ rx: 46, ry: 60, n: 120, r: 0.9 }, { rx: 41, ry: 54, n: 96, r: 0.6 }];
  rings.forEach((g, gi) => {
    for (let i = 0; i < g.n; i++) {
      const a = (i / g.n) * Math.PI * 2;
      const wob = gi === 0 ? Math.sin(a * 8) * 2.2 : 0;
      dots.push(<circle key={`${gi}-${i}`} cx={50 + Math.cos(a) * (g.rx + wob)} cy={64 + Math.sin(a) * (g.ry + wob)} r={g.r} />);
    }
  });
  // volutas superior e inferior
  const scroll = (cy: number, flip: number) =>
    Array.from({ length: 28 }, (_, i) => {
      const t = i / 27;
      const a = t * Math.PI * 2.2;
      const r = 3 + t * 9;
      return [<circle key={`l${cy}${i}`} cx={50 - 6 - Math.cos(a) * r} cy={cy + flip * Math.sin(a) * r * 0.55} r={0.75} />, <circle key={`r${cy}${i}`} cx={50 + 6 + Math.cos(a) * r} cy={cy + flip * Math.sin(a) * r * 0.55} r={0.75} />];
    });
  return (
    <svg viewBox="0 0 100 128" className={className} fill={color} aria-hidden="true">
      {dots}
      {scroll(6, 1)}
      {scroll(122, -1)}
    </svg>
  );
}

export function Stitch({ className = "", color = "currentColor", width = 600, height = 18 }: { className?: string; color?: string; width?: number; height?: number }) {
  const step = 14;
  let d = `M0 ${height / 2}`;
  for (let x = 0; x <= width; x += step) d += ` L${x + step / 2} ${x / step % 2 ? 2 : height - 2} L${x + step} ${height / 2}`;
  return (
    <svg viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none" className={className} aria-hidden="true">
      <path d={`M0 ${height / 2} H${width}`} stroke={color} strokeWidth="1" strokeDasharray="5 5" opacity="0.5" fill="none" />
      <path d={d} stroke={color} strokeWidth="1.4" fill="none" strokeLinecap="round" />
    </svg>
  );
}

export function DottedCorner({ className = "", color = "currentColor" }: { className?: string; color?: string }) {
  const pts: React.ReactNode[] = [];
  for (let i = 0; i < 70; i++) {
    const t = i / 69;
    const a = t * Math.PI * 3.1;
    const r = 30 * (1 - t) + 4;
    pts.push(<circle key={`s${i}`} cx={40 + Math.cos(a) * r} cy={40 + Math.sin(a) * r} r={1.1} />);
  }
  for (let i = 0; i < 60; i++) pts.push(<circle key={`v${i}`} cx={8 + Math.sin(i / 5) * 3} cy={70 + i * 4} r={1} />);
  for (let i = 0; i < 60; i++) pts.push(<circle key={`h${i}`} cx={70 + i * 4} cy={8 + Math.sin(i / 5) * 3} r={1} />);
  return <svg viewBox="0 0 320 320" className={className} fill={color} aria-hidden="true">{pts}</svg>;
}

/**
 * Costura que se "cose" sola al entrar en pantalla: puntadas en zigzag con hilo continuo.
 * Animación por stroke-dashoffset (clase .stitch-sew en globals.css); quieta con reduced-motion.
 */
export function StitchLine({ className = "", color = "currentColor", width = 320, height = 14, delay = 0 }: { className?: string; color?: string; width?: number; height?: number; delay?: number }) {
  const step = 12;
  let zig = `M0 ${height / 2}`;
  for (let x = 0; x < width; x += step) zig += ` L${x + step / 2} ${(x / step) % 2 ? 2 : height - 2} L${x + step} ${height / 2}`;
  return (
    <svg viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none" className={`stitch-sew reveal ${className}`} aria-hidden="true" style={{ ["--sew-delay" as string]: `${delay}ms` }}>
      <path d={`M0 ${height / 2} H${width}`} stroke={color} strokeWidth="1" strokeDasharray="4 5" opacity="0.45" fill="none" />
      <path className="stitch-thread" d={zig} stroke={color} strokeWidth="1.8" fill="none" strokeLinecap="round" strokeLinejoin="round" pathLength={1} />
      <circle className="stitch-needle" cx={width} cy={height / 2} r="2.4" fill={color} />
    </svg>
  );
}
