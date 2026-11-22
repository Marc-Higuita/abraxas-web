import "server-only";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/** Cliente con service role: solo en el servidor (rutas API). Nunca se importa desde componentes cliente. */
export function serviceClient(): SupabaseClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

export const adminEmails = () =>
  (process.env.ADMIN_EMAILS ?? "").split(",").map((e) => e.trim().toLowerCase()).filter(Boolean);

/** Verifica el token de sesión de un administrador. */
export async function requireAdmin(req: Request) {
  const sb = serviceClient();
  if (!sb) return { error: "not-configured" as const };
  const token = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!token) return { error: "unauthorized" as const };
  const { data, error } = await sb.auth.getUser(token);
  const email = data.user?.email?.toLowerCase();
  if (error || !email || !adminEmails().includes(email)) return { error: "forbidden" as const };
  return { sb, email, userId: data.user!.id };
}
