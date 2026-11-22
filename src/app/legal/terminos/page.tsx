import type { Metadata } from "next";
import Link from "next/link";
import { LegalShell, Todo } from "../LegalShell";

export const metadata: Metadata = { title: "Términos y condiciones (borrador)", robots: { index: false } };

export default function Terminos() {
  return (
    <LegalShell kicker="Legal" title="Términos y condiciones de uso" updated="22 de noviembre de 2026">
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
    </LegalShell>
  );
}
