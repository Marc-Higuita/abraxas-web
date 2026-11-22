import type { Metadata } from "next";
import Link from "next/link";
import { LegalShell, Todo } from "../legal/LegalShell";
import { RIGHTS } from "@/features/room-04/components/rights";
import { SOURCES } from "@/features/room-04/data/sources";

export const metadata: Metadata = { title: "Créditos y derechos (borrador)", robots: { index: false } };

export default function Creditos() {
  return (
    <LegalShell kicker="Créditos" title="Créditos y derechos de autor" updated="22 de noviembre de 2026">
      <h2>Abraxas Aguilar</h2>
      <p>
        Abraxas Aguilar (nombre de registro: Jorge Hernán Betancur Aguilar) fue abogada de la Universidad Autónoma Latinoamericana (UNAULA), escritora,
        política y artista del collage. Su casa y oficina en el centro de Medellín, la Casa Museo del Collage, reúne su obra. Murió el 18 de octubre de 2026.
        Todas las obras, muros, objetos y libros que aparecen en el recorrido son de su autoría.
      </p>

      <h2>Equipo</h2>
      <p>Equipo Sala 04 · Vida y obra. Curso Creación de Espacios Interactivos, Universidad de Antioquia, 2026. <Todo>Nombres, roles y docente</Todo>.</p>

      <h2>Derechos por material</h2>
      <table>
        <thead><tr><th>Material</th><th>Titular</th><th>Uso</th></tr></thead>
        <tbody>
          {RIGHTS.map((r) => (
            <tr key={r.material}>
              <td><strong>{r.material}</strong><br />{r.donde}</td>
              <td>{r.titular}</td>
              <td>{r.uso}{r.pendiente && <><br /><Todo>Por completar: {r.pendiente}</Todo></>}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <h2>Fuentes documentales</h2>
      <ul>
        {Object.values(SOURCES).map((src) => (
          <li key={src.id}>
            {src.url ? <a href={src.url} target="_blank" rel="noreferrer">{src.label}</a> : src.label}
            {src.date ? ` (${src.date})` : ""}
          </li>
        ))}
      </ul>

      <p><Link href="/legal/terminos">Términos y condiciones</Link> · <Link href="/legal/privacidad">Política de privacidad</Link></p>
    </LegalShell>
  );
}
