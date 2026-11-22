"use client";
import { useCallback, useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { browserClient } from "@/lib/supabase/client";

interface Item { id: string; message: string; signature: string | null; created_at: string; image: string | null; status: string }

/** Panel privado mínimo: moderación del mural. Acceso por enlace mágico a correos listados en ADMIN_EMAILS. */
export default function Admin() {
  const sb = browserClient();
  const [session, setSession] = useState<Session | null>(null);
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [items, setItems] = useState<Item[]>([]);
  const [status, setStatus] = useState("approved");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!sb) return;
    sb.auth.getSession().then(({ data }) => setSession(data.session));
    const { data } = sb.auth.onAuthStateChange((_e, s) => setSession(s));
    return () => data.subscription.unsubscribe();
  }, [sb]);

  const load = useCallback(async () => {
    if (!session) return;
    const r = await fetch(`/api/admin/collages?status=${status}`, { headers: { Authorization: `Bearer ${session.access_token}` } });
    if (!r.ok) { setError(r.status === 401 ? "Tu correo no tiene permiso de moderación." : "No se pudo cargar la lista."); return; }
    setError(null);
    setItems((await r.json()).items);
  }, [session, status]);
  useEffect(() => { load(); }, [load]);

  const act = async (id: string, action: "approved" | "rejected") => {
    if (!session) return;
    const r = await fetch("/api/admin/collages", { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${session.access_token}` }, body: JSON.stringify({ id, action }) });
    if (r.ok) setItems((cur) => cur.filter((i) => i.id !== id));
    else setError("No se pudo guardar la decisión.");
  };

  const wrap: React.CSSProperties = { background: "var(--papel)", color: "var(--negro)", minHeight: "100svh", padding: "32px max(16px, 4vw)" };
  if (!sb) return <main style={wrap}><h1 className="t-title">Administración</h1><p>Supabase no está configurado. Completa las variables de entorno (ver README).</p></main>;
  if (!session)
    return (
      <main style={wrap}>
        <h1 className="t-title">Administración del mural</h1>
        {sent ? <p>Revisa tu correo y abre el enlace de acceso.</p> : (
          <form onSubmit={async (e) => { e.preventDefault(); const { error: err } = await sb.auth.signInWithOtp({ email, options: { emailRedirectTo: `${location.origin}/admin` } }); if (err) setError(err.message); else setSent(true); }} style={{ display: "flex", gap: 8, flexWrap: "wrap", maxWidth: 520 }}>
            <label htmlFor="em" className="sr-only">Correo</label>
            <input id="em" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="tu correo" style={{ flex: 1, minHeight: 48, fontSize: 16, padding: "0 12px", border: "2px solid var(--negro)" }} />
            <button className="btn" style={{ color: "var(--negro)" }}>Enviar enlace</button>
          </form>
        )}
        {error && <p role="alert" style={{ color: "var(--bermellon)" }}>{error}</p>}
      </main>
    );
  return (
    <main style={wrap}>
      <h1 className="t-title">Moderación del mural</h1>
      <p className="t-meta" style={{ color: "var(--gris)" }}>{session.user.email} · <button className="btn btn-sm" style={{ color: "var(--negro)" }} onClick={() => sb.auth.signOut()}>Salir</button></p>
      <div style={{ display: "flex", gap: 8, margin: "16px 0" }}>
        {["pending", "approved", "rejected"].map((s) => (
          <button key={s} className={`btn btn-sm ${status === s ? "btn-oro" : ""}`} style={{ color: "var(--negro)" }} onClick={() => setStatus(s)}>{{ pending: "Pendientes", approved: "Publicadas", rejected: "Retiradas" }[s]}</button>
        ))}
      </div>
      {error && <p role="alert" style={{ color: "var(--bermellon)" }}>{error}</p>}
      {!items.length && <p>No hay piezas en esta lista.</p>}
      <ul style={{ listStyle: "none", padding: 0, display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 16 }}>
        {items.map((i) => (
          <li key={i.id} style={{ background: "var(--blanco)", padding: 12 }}>
            {i.image && <img src={i.image} alt={i.message} style={{ width: "100%", aspectRatio: "1", objectFit: "cover" }} />}
            <p><strong>{i.signature || "Anónimo"}</strong> · {new Date(i.created_at).toLocaleString("es-CO")}</p>
            <p>{i.message}</p>
            {status !== "approved" && <button className="btn btn-sm btn-oro" onClick={() => act(i.id, "approved")}>Aprobar</button>}{" "}
            {status !== "rejected" && <button className="btn btn-sm" style={{ color: "var(--negro)" }} onClick={() => act(i.id, "rejected")}>Retirar</button>}
          </li>
        ))}
      </ul>
    </main>
  );
}
