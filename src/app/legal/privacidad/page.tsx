import type { Metadata } from "next";
import Link from "next/link";
import { LegalShell, Todo } from "../LegalShell";

export const metadata: Metadata = { title: "Política de privacidad (borrador)", robots: { index: false } };

export default function Privacidad() {
  return (
    <LegalShell kicker="Legal" title="Política de privacidad" updated="22 de noviembre de 2026">
      <p>
        Esta política explica qué datos guarda el sitio Museo Abraxas cuando participas en el tablero «Tu figura, tu mensaje», y cómo los tratamos,
        de acuerdo con la Ley 1581 de 2012 de protección de datos personales en Colombia. Responsable: <Todo>nombre del responsable y correo de contacto</Todo>.
      </p>

      <h2>1. Qué guardamos</h2>
      <table>
        <thead><tr><th>Dato</th><th>Para qué</th><th>Dónde</th></tr></thead>
        <tbody>
          <tr><td>La figura que armas (imagen) y su composición</td><td>Mostrarla en la habitación de los mensajes</td><td>Supabase (base de datos y almacenamiento)</td></tr>
          <tr><td>Tu mensaje</td><td>Mostrarlo junto a la figura</td><td>Supabase</td></tr>
          <tr><td>Firma o seudónimo (opcional)</td><td>Mostrarla bajo el mensaje, si la escribes</td><td>Supabase</td></tr>
          <tr><td>Fecha de publicación</td><td>Ordenar los mensajes</td><td>Supabase</td></tr>
          <tr><td>Un código derivado de tu dirección IP (hash, no la IP)</td><td>Limitar envíos repetidos y evitar spam</td><td>Supabase</td></tr>
        </tbody>
      </table>
      <p>
        No pedimos nombre real, correo, teléfono ni cuenta. No usamos cookies de publicidad ni de seguimiento. Si Supabase no está disponible,
        tu figura se guarda solo en la memoria de tu propio navegador (almacenamiento local) y no sale de tu dispositivo.
      </p>

      <h2>2. Publicación inmediata</h2>
      <p>
        Al pulsar «Publicar» y marcar la casilla de autorización, aceptas que tu figura, tu mensaje y tu firma (si la escribes) se muestren públicamente de inmediato.
        Por eso te pedimos no incluir datos personales tuyos ni de otras personas.
      </p>

      <h2>3. Cuánto tiempo y quién los ve</h2>
      <ul>
        <li>Los mensajes publicados son visibles para cualquier visitante del sitio.</li>
        <li>Se conservan mientras el proyecto esté en línea o hasta que pidas retirarlos. <Todo>Definir plazo de conservación del archivo al terminar el curso</Todo>.</li>
        <li>Solo el equipo administrador puede ver el código de IP y retirar publicaciones.</li>
      </ul>

      <h2>4. Servicios de terceros</h2>
      <ul>
        <li><strong>Supabase</strong>: base de datos y almacenamiento de las figuras (servidores en Estados Unidos, región us-east-1).</li>
        <li><strong>Vercel</strong>: alojamiento del sitio.</li>
        <li><strong>Spotify</strong>: el reproductor de la playlist se carga desde Spotify cuando llegas a la habitación de los mensajes y se rige por la política de privacidad de Spotify.</li>
      </ul>

      <h2>5. Tus derechos</h2>
      <p>
        Puedes pedir que retiremos o corrijamos tu publicación, o consultar qué datos guardamos de ella, escribiendo a <Todo>correo de contacto</Todo> con el texto del mensaje y la fecha aproximada.
        Como no guardamos datos de identificación, ese texto es la forma de encontrarla.
      </p>

      <p>Consulta también los <Link href="/legal/terminos">Términos y condiciones</Link>.</p>
    </LegalShell>
  );
}
