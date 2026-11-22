/**
 * Iconografía Abraxas. Trazo de 1.9 px sobre 24 px, puntas redondas, un acento relleno por icono
 * (el "recorte"). Motivos de su obra y del universo queer: tijeras, ojo, espejo, labios, mariposa,
 * triángulo, corazón cosido, destello, balanza de abogada, tarjetón, la X de su nombre.
 */
import type { SVGProps } from "react";

export type IconName =
  | "x" | "tijeras" | "ojo" | "espejo" | "labios" | "mano" | "corazon" | "destello" | "mariposa" | "triangulo"
  | "balanza" | "libro" | "tarjeton" | "disco" | "menu" | "atras" | "info" | "sonido" | "silencio" | "movimiento"
  | "quieto" | "cerrar" | "play" | "pausa" | "pantalla" | "subtitulos" | "mas" | "menos" | "flecha" | "lupa" | "cinta" | "qr";

const P: Record<IconName, React.ReactNode> = {
  x: (<><path d="M6 4l12 15M18 4L6 19" /><path d="M2 21h5l3-3h12" className="acc-line" /></>),
  tijeras: (<><circle cx="6" cy="17.5" r="3" /><circle cx="6" cy="6.5" r="3" /><path d="M8.6 8l11.4 9M8.6 16L20 7" /><circle cx="12.2" cy="12" r="1.2" className="acc" /></>),
  ojo: (<><path d="M2 12s3.6-6.5 10-6.5S22 12 22 12s-3.6 6.5-10 6.5S2 12 2 12z" /><circle cx="12" cy="12" r="3.2" className="acc" /><path d="M5 5l1.5 1.8M12 3v2.2M19 5l-1.5 1.8" /></>),
  espejo: (<><ellipse cx="12" cy="9.5" rx="6" ry="7.5" /><path d="M12 17v4.5M9 21.5h6" /><path d="M9.2 6.2c.9-1.2 2.2-1.8 3.6-1.8" className="acc-line" /></>),
  labios: (<><path d="M2.5 12c2-3.2 4.6-5 6.6-5 1.2 0 2.1.7 2.9 1.6.8-.9 1.7-1.6 2.9-1.6 2 0 4.6 1.8 6.6 5-2.4 3.5-5.6 5.5-9.5 5.5S4.9 15.5 2.5 12z" /><path d="M2.5 12h19" className="acc-line" /></>),
  mano: (<><path d="M8 13V5.5a1.5 1.5 0 013 0V11m0-6.5a1.5 1.5 0 013 0V11m0-4.5a1.5 1.5 0 013 0v7c0 4-2.6 7-6.5 7-2.6 0-4.3-1.3-5.6-3.4L4.2 13.6a1.6 1.6 0 012.6-1.8L8 13" /><circle cx="12.5" cy="15" r="1.3" className="acc" /></>),
  corazon: (<><path d="M12 20.5S3.5 15.3 3.5 9.2A4.6 4.6 0 0112 6.6a4.6 4.6 0 018.5 2.6c0 6.1-8.5 11.3-8.5 11.3z" /><path d="M9 9l2 2M13 9l2 2M9 13l2 2M13 13l2 2" className="acc-line" /></>),
  destello: (<><path d="M12 2.5l1.9 6.2 6.6.6-5 4.3 1.6 6.4L12 16.6 6.9 20l1.6-6.4-5-4.3 6.6-.6z" /><circle cx="12" cy="12" r="1.6" className="acc" /></>),
  mariposa: (<><path d="M12 7v13" /><path d="M12 9C9 3.5 3 3.8 3 8.4c0 3.6 3.8 4.6 9 3.6M12 9c3-5.5 9-5.2 9-.6 0 3.6-3.8 4.6-9 3.6" /><path d="M12 12c-4 1.2-6.5 3.4-5.4 5.8 1.2 2.3 4.4.8 5.4-2.4M12 12c4 1.2 6.5 3.4 5.4 5.8-1.2 2.3-4.4.8-5.4-2.4" className="acc-soft" /></>),
  triangulo: (<><path d="M12 4l9 16H3z" /><path d="M12 10.5l3.4 6H8.6z" className="acc" /></>),
  balanza: (<><path d="M12 3.5v17M7 20.5h10M4.5 7h15" /><path d="M4.5 7L2 13a2.6 2.6 0 005 0zM19.5 7L17 13a2.6 2.6 0 005 0z" /><circle cx="12" cy="4" r="1.4" className="acc" /></>),
  libro: (<><path d="M3 5.5c3-1.5 6-1.5 9 .5 3-2 6-2 9-.5V19c-3-1.5-6-1.5-9 .5-3-2-6-2-9-.5z" /><path d="M12 6v13.5" /><path d="M15 9.5l3-.8" className="acc-line" /></>),
  tarjeton: (<><rect x="3" y="4" width="18" height="16" rx="1.5" /><path d="M3 10h18M9 10v10M15 10v10" /><path d="M5.5 13.5l2 2.5 3.5-5" className="acc-line" transform="translate(5.5 0)" /></>),
  disco: (<><circle cx="12" cy="12" r="9.5" /><circle cx="12" cy="12" r="3.3" className="acc" /><path d="M5.8 9a7 7 0 013-3.2M18.2 15a7 7 0 01-3 3.2" /></>),
  menu: (<><path d="M4 7h16M4 12h11M4 17h16" /><circle cx="19" cy="12" r="1.4" className="acc" /></>),
  atras: (<><path d="M14.5 5l-7 7 7 7" /><path d="M8 12h12" className="acc-line" /></>),
  info: (<><circle cx="12" cy="12" r="9.5" /><path d="M12 11v6" /><circle cx="12" cy="7.5" r="1.4" className="acc" /></>),
  sonido: (<><path d="M3.5 9.5h4l5-4.5v14l-5-4.5h-4z" /><path d="M16 8.5a5 5 0 010 7M18.8 6a8.6 8.6 0 010 12" className="acc-line" /></>),
  silencio: (<><path d="M3.5 9.5h4l5-4.5v14l-5-4.5h-4z" /><path d="M16 9.5l5 5M21 9.5l-5 5" className="acc-line" /></>),
  movimiento: (<><path d="M2 12c2.5-5 5-5 7.5 0s5 5 7.5 0 3.5-3 5-1.5" /><circle cx="20.5" cy="10" r="1.4" className="acc" /></>),
  quieto: (<><path d="M3 12h18" /><circle cx="12" cy="12" r="2" className="acc" /></>),
  cerrar: (<><path d="M5.5 5.5l13 13M18.5 5.5l-13 13" /></>),
  play: (<><path d="M7 4.5l13 7.5-13 7.5z" className="acc" /></>),
  pausa: (<><path d="M8 5v14M16 5v14" /></>),
  pantalla: (<><path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5" /></>),
  subtitulos: (<><rect x="3" y="5.5" width="18" height="13" rx="2" /><path d="M7 13h4M13 13h4M7 16h7" className="acc-line" /></>),
  mas: (<><path d="M12 5v14M5 12h14" /></>),
  menos: (<><path d="M5 12h14" /></>),
  flecha: (<><path d="M5 12h14M13 6l6 6-6 6" /></>),
  lupa: (<><circle cx="10.5" cy="10.5" r="6.5" /><path d="M15.5 15.5L21 21" /><circle cx="10.5" cy="10.5" r="2.2" className="acc" /></>),
  cinta: (<><path d="M4 8l14-3 2 9-14 3z" /><path d="M7 7.4l2 9M15 5.7l2 9" className="acc-line" /></>),
  qr: (<><rect x="3.5" y="3.5" width="6.5" height="6.5" rx="1.2" /><rect x="14" y="3.5" width="6.5" height="6.5" rx="1.2" /><rect x="3.5" y="14" width="6.5" height="6.5" rx="1.2" /><circle cx="15.5" cy="15.5" r="1.3" className="acc" /><circle cx="19.5" cy="19.5" r="1.3" className="acc" /><circle cx="19.5" cy="15.5" r="1" className="acc" /><circle cx="15.5" cy="19.5" r="1" className="acc" /></>),
};

export function Icon({ name, size = 24, accent, ...rest }: { name: IconName; size?: number; accent?: string } & SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="none"
      stroke="currentColor"
      strokeWidth={1.9}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className="abx-icon"
      style={{ ["--acc" as string]: accent ?? "currentColor" }}
      {...rest}
    >
      {P[name]}
    </svg>
  );
}
