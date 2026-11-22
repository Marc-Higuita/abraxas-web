import { Icon } from "@/components/abx/Icon";
import { Sticker } from "@/components/abx/Ticket";
import { StitchLine } from "@/components/abx/Ornaments";
import { LegalLinks } from "./LegalDialog";
import s from "./footer.module.css";

/** Pie del recorrido: identificación de Abraxas y créditos. Derechos, términos, privacidad y créditos completos se abren en ventanas. */
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
          <LegalLinks />
        </section>
      </div>

      <StitchLine className={s.stitch} color="var(--oro)" width={1200} />
      <div className={s.bottom}>
        <span>© 2026 · Museo Abraxas · Sala 04 · Universidad de Antioquia. Proyecto académico sin fines comerciales.</span>
        <img src="/assets/brand/isotipo-papel.png" alt="" width={32} height={40} />
      </div>
    </footer>
  );
}
