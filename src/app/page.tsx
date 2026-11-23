import Link from "next/link";
import { ROOMS } from "@/config/rooms";
import { GlobalMenu } from "@/components/site";
import styles from "./home.module.css";

export default function Home() {
  return (
    <>
    <GlobalMenu />
    <main className={styles.main} style={{ paddingTop: 56 }}>
      <header className={styles.head}>
        {/* Logotipo sobre cartela lisa negra, sin rotar ni recolorear */}
        <img src="/assets/brand/logo-papel.png" alt="Museo Abraxas · Collage Guinness World Records" width={320} height={150} className={styles.logo} />
        <p className={styles.claim}>Recortar, reflejar, ordenar.</p>
      </header>
      <svg className="linea-abraxas" viewBox="0 0 1000 24" preserveAspectRatio="none" aria-hidden="true">
        <path d="M0 20 H430 L500 4 H1000" stroke="var(--oro)" strokeWidth="3" fill="none" />
      </svg>
      <ol className={styles.list}>
        {ROOMS.map((r) => (
          <li key={r.id} className={r.status === "active" ? styles.active : styles.pending}>
            <Link href={r.route} className={styles.card}>
              <span className={styles.num}>{r.id}</span>
              <span>
                <span className={styles.title}>{r.title}</span>
                <span className={styles.meta}>
                  {r.status === "active" ? r.summary : "En construcción"} · {r.team.join(" y ")}
                </span>
              </span>
            </Link>
          </li>
        ))}
      </ol>
      <footer className={styles.foot}>
        <span>Casa Museo del Collage de Abraxas Aguilar Betancur · Medellín</span>
        <img src="/assets/brand/isotipo-papel.png" alt="" width={32} height={40} />
      </footer>
    </main>
    </>
  );
}
