import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/supabase/server";

export const runtime = "nodejs";

/** Lista de piezas pendientes para moderar. */
export async function GET(req: Request) {
  const auth = await requireAdmin(req);
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.error === "not-configured" ? 503 : 401 });
  const status = new URL(req.url).searchParams.get("status") ?? "approved";
  const { data, error } = await auth.sb
    .from("visitor_collages")
    .select("id, message, signature, created_at, image_path, status")
    .eq("status", status)
    .order("created_at", { ascending: true })
    .limit(60);
  if (error) return NextResponse.json({ error: "db" }, { status: 500 });
  const paths = (data ?? []).map((d) => d.image_path);
  const signed = paths.length ? await auth.sb.storage.from("collages").createSignedUrls(paths, 600) : { data: [] };
  return NextResponse.json({ items: (data ?? []).map((d, i) => ({ ...d, image: signed.data?.[i]?.signedUrl ?? null })) });
}

const action = z.object({ id: z.string().uuid(), action: z.enum(["approved", "rejected"]), note: z.string().max(240).optional() });

export async function POST(req: Request) {
  const auth = await requireAdmin(req);
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.error === "not-configured" ? 503 : 401 });
  const parsed = action.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "invalid" }, { status: 422 });
  const { id, action: status, note } = parsed.data;
  const { error } = await auth.sb.from("visitor_collages").update({ status, moderated_at: new Date().toISOString() }).eq("id", id);
  if (error) return NextResponse.json({ error: "db" }, { status: 500 });
  await auth.sb.from("moderation_events").insert({ collage_id: id, action: status, moderator_email: auth.email, note: note ?? null });
  return NextResponse.json({ ok: true });
}
