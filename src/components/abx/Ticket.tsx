"use client";
import Link from "next/link";
import type { ButtonHTMLAttributes, ReactNode } from "react";
import { Icon, type IconName } from "./Icon";

export type Tone = "lima" | "naranja" | "lila" | "amarillo" | "bermellon" | "ultramar" | "magenta" | "papel" | "negro" | "oro";

interface Common { icon?: IconName; tone?: Tone; size?: "sm" | "md" | "lg"; children?: ReactNode; className?: string; cursor?: string }

/** Botón ticket: el icono va en su propio talón, separado del texto por una muesca troquelada. */
export function Ticket({ icon, tone = "papel", size = "md", children, className = "", cursor = "toca", ...rest }: Common & ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button className={`ticket t-${tone} t-${size} ${children ? "" : "t-solo"} ${className}`} data-cursor={cursor} {...rest}>
      {icon && <span className="ticket-stub"><Icon name={icon} size={size === "lg" ? 26 : size === "sm" ? 18 : 22} /></span>}
      {children && <span className="ticket-body">{children}</span>}
    </button>
  );
}

export function TicketLink({ icon, tone = "papel", size = "md", children, className = "", href, cursor = "toca" }: Common & { href: string }) {
  return (
    <Link href={href} className={`ticket t-${tone} t-${size} ${className}`} data-cursor={cursor}>
      {icon && <span className="ticket-stub"><Icon name={icon} size={size === "lg" ? 26 : size === "sm" ? 18 : 22} /></span>}
      {children && <span className="ticket-body">{children}</span>}
    </Link>
  );
}

/** Sello o etiqueta girada (sticker) para titulares: forma de píldora, onda o estrella. */
export function Sticker({ children, tone = "amarillo", shape = "pill", rotate = -6, className = "" }: { children: ReactNode; tone?: Tone; shape?: "pill" | "wave" | "burst" | "flag"; rotate?: number; className?: string }) {
  return (
    <span className={`sticker s-${shape} t-${tone} ${className}`} style={{ ["--rot" as string]: `${rotate}deg` }}>
      {children}
    </span>
  );
}
