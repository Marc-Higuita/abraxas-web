import Link from "next/link";
import { Todo } from "./LegalShell";
import { RIGHTS } from "@/features/room-04/components/rights";
import { SOURCES } from "@/features/room-04/data/sources";

/**
 * Textos legales compartidos: los usan las páginas /legal/terminos, /legal/privacidad y /creditos
 * y las ventanas del pie del recorrido. Un solo texto, dos presentaciones.
 */

export const LEGAL_UPDATED = "22 de noviembre de 2026";

export function TerminosBody() {
  return (
    <>
      <h2>1. Qué es este sitio</h2>
      <p>
        Museo Abraxas es un proyecto académico de estudiantes de la Universidad de Antioquia (curso Creación de Espacios Interactivos) que documenta
        la vida y la obra de Abraxas Aguilar (Jorge Hernán Betancur Aguilar) y su Casa Museo del Collage en Medellín. No tiene fines comerciales.
        Responsable del sitio: <Todo>nombre del equipo o de la persona responsable, y correo de contacto</Todo>.
      </p>

      <h2>2. Uso de los contenidos</h2>
      <ul>
        <li>Las obras, los muros, los libros y los textos de Abraxas son de su autoría y de quienes tengan hoy sus derechos. Las fotografías, el video y los demás materiales tienen titulares distintos: el detalle está en <Link href="/creditos">Créditos y derechos</Link>.</li>
        <li>Puedes navegar, leer y compartir enlaces del sitio. No está permitido descargar, reproducir o usar los materiales con fines comerciales sin autorización de sus titulares.</li>
        <li>Las citas se muestran con su fuente. Si encuentras un error de atribución, escríbenos a <Todo>correo de contacto</Todo>.</li>
      </ul>

      <h2>3. Tablero «Tu figura, tu mensaje»</h2>
      <ul>
        <li>Puedes armar una figura con los recortes disponibles, escribir un mensaje (hasta 240 caracteres) y, si quieres, una firma o seudónimo.</li>
        <li><strong>La publicación es inmediata:</strong> al pulsar «Publicar», tu figura y tu mensaje quedan visibles para cualquier visitante en la habitación de los mensajes.</li>
        <li>Conservas la autoría de tu mensaje. Al publicarlo nos das permiso, no exclusivo y gratuito, para mostrarlo dentro del sitio mientras permanezca publicado y para conservarlo como parte del archivo del proyecto académico.</li>
        <li>No escribas datos personales (correos, teléfonos, documentos, direcciones) ni los de otras personas. El sistema bloquea algunos de estos datos automáticamente.</li>
        <li>No se permiten mensajes que inciten al odio, acosen, discriminen, contengan contenido sexual explícito o violen derechos de terceros.</li>
      </ul>

      <h2>4. Retiro de contenidos</h2>
      <p>
        El equipo puede retirar cualquier figura o mensaje que incumpla estas normas, sin aviso previo. Si quieres que retiremos tu propia publicación,
        o un contenido que te afecte, escribe a <Todo>correo de contacto</Todo> indicando el mensaje y la fecha aproximada.
      </p>

      <h2>5. Música</h2>
      <p>La playlist se reproduce dentro del reproductor oficial de Spotify y está sujeta a sus propios términos. Sin sesión de Spotify solo suenan adelantos de 30 segundos.</p>

      <h2>6. Responsabilidad</h2>
      <p>
        El sitio se ofrece tal como está, como un ejercicio académico. Intentamos que la información documental sea correcta y la marcamos como «por verificar» cuando no lo es del todo.
        No respondemos por interrupciones del servicio ni por los contenidos de sitios externos enlazados.
      </p>

      <h2>7. Cambios y ley aplicable</h2>
      <p>Podemos actualizar estos términos; la fecha de la última versión aparece arriba. Se rigen por las leyes de la República de Colombia. <Todo>Confirmar con la universidad</Todo>.</p>

      <p>Consulta también la <Link href="/legal/privacidad">Política de privacidad</Link>.</p>
    </>
  );
}

export function PrivacidadBody() {
  return (
    <>
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
    </>
  );
}

export function CreditosBody() {
  return (
    <>
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
    </>
  );
}
