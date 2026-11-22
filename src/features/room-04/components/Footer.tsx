import Link from "next/link";
import { Icon } from "@/components/abx/Icon";
import { Sticker } from "@/components/abx/Ticket";
import { StitchLine } from "@/components/abx/Ornaments";
import { RIGHTS } from "./rights";
import s from "./footer.module.css";

/** Pie del recorrido: identificación de Abraxas, créditos, derechos por material y enlaces legales. */
export function Footer() {
  return (
    <footer className={s.footer} aria-labelledby="footer-title">
      <div className={s.top}>
        <section className={s.abraxas} aria-labelledby="footer-title">
          <Sticker tone="amarillo" rotate={-4}>Sobre la obra</Sticker>
          <h2 id="footer-title" className={s.title}>Abraxas Aguilar</h2>
          <p className={s.lead}>
            Nombre de registro: Jorge Hernán Betancur Aguilar. Abogada de la Universidad Autónoma Latinoamericana (UNAULA),
            escritora, política y artista del collage. Desde 1982 cubrió de recortes su casa y oficina en el centro de Medellín,
            hoy la Casa Museo del Collage. Récord Guinness por el libro de collage más grande del mundo (certificado del 8 de mayo de 1997).
            Murió en Medellín el 18 de octubre de 2026.
          </p>
          <p className={s.small}>Las obras, los muros, los objetos y los libros que aparecen en este recorrido son de su autoría. Este sitio los documenta; no los reemplaza.</p>
        </section>

        <section className={s.credits} aria-labelledby="footer-credits">
          <h3 id="footer-credits" className={s.h3}><Icon name="tijeras" size={20} /> Créditos</h3>
          <dl className={s.dl}>
            <dt>Proyecto</dt><dd>Museo Abraxas · museo digital experimental de la Casa Museo del Collage</dd>
            <dt>Sala</dt><dd>04 · Vida y obra</dd>
            <dt>Equipo</dt><dd>Equipo Sala 04 <span className={s.todo}>nombres por completar</span></dd>
            <dt>Curso</dt><dd>Creación de Espacios Interactivos · Universidad de Antioquia</dd>
            <dt>Docente</dt><dd><span className={s.todo}>por completar</span></dd>
            <dt>Año</dt><dd>2026</dd>
          </dl>
          <nav className={s.legal} aria-label="Información legal">
            <Link href="/legal/terminos"><Icon name="balanza" size={18} /> Términos y condiciones</Link>
            <Link href="/legal/privacidad"><Icon name="ojo" size={18} /> Política de privacidad</Link>
            <Link href="/creditos"><Icon name="libro" size={18} /> Créditos y derechos completos</Link>
          </nav>
        </section>
      </div>

      <StitchLine className={s.stitch} color="var(--oro)" width={1200} />

      <section className={s.rights} aria-labelledby="footer-rights">
        <div className={s.rightsHead}>
          <h3 id="footer-rights" className={s.h3}><Icon name="cinta" size={20} /> Derechos de autor por material</h3>
          <Sticker tone="bermellon" shape="flag" rotate={2}>Borrador para revisión</Sticker>
        </div>
        <p className={s.small}>No todos los materiales tienen el mismo titular. Lo marcado en rosado falta por confirmar.</p>
        <div className={s.tableWrap} tabIndex={0} role="region" aria-label="Tabla de derechos por material">
          <table className={s.table}>
            <thead><tr><th scope="col">Material</th><th scope="col">Dónde aparece</th><th scope="col">Titular</th><th scope="col">Uso en el sitio</th></tr></thead>
            <tbody>
              {RIGHTS.map((r) => (
                <tr key={r.material}>
                  <th scope="row">{r.material}</th>
                  <td>{r.donde}</td>
                  <td>{r.titular}</td>
                  <td>{r.uso}{r.pendiente && <span className={s.todo}>Por completar: {r.pendiente}</span>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <div className={s.bottom}>
        <span>© 2026 · Museo Abraxas · Sala 04 · Universidad de Antioquia. Proyecto académico sin fines comerciales.</span>
        <img src="/assets/brand/isotipo-papel.png" alt="" width={32} height={40} />
      </div>
    </footer>
  );
}
