import { NextResponse } from "next/server";
import { createHash, randomUUID } from "node:crypto";
import { serviceClient } from "@/lib/supabase/server";
import { submissionSchema, containsPersonalData, sanitize, imageMeta, COLLAGE_SCHEMA_VERSION } from "@/lib/collage-schema";

export const runtime = "nodejs";
const PAGE = 24;
const WINDOW_MIN = 10;
const MAX_PER_WINDOW = 3;
const memory = new Map<string, number[]>();

const ipHash = (req: Request) => {
  const ip = (req.headers.get("x-forwarded-for") ?? "").split(",")[0].trim() || "local";
  return createHash("sha256").update(ip + (process.env.RATE_LIMIT_SALT ?? "abraxas")).digest("hex").slice(0, 32);
};

/** Habitación de mensajes: piezas publicadas (status approved; las retiradas quedan en rejected), paginadas, con URLs firmadas de corta duración. */
export async function GET(req: Request) {
  const sb = serviceClient();
  if (!sb) return NextResponse.json({ error: "not-configured" }, { status: 503 });
  const page = Math.max(0, Number(new URL(req.url).searchParams.get("page") ?? 0) || 0);
  const { data, error, count } = await sb
    .from("visitor_collages")
    .select("id, message, signature, created_at, image_path", { count: "exact" })
    .eq("status", "approved")
    .order("created_at", { ascending: true })
    .range(page * PAGE, page * PAGE + PAGE - 1);
  if (error) { console.error("collages GET", error.code, error.message); return NextResponse.json({ error: "db" }, { status: 500 }); }
  const paths = (data ?? []).map((d) => d.image_path);
  const signed = paths.length ? await sb.storage.from("collages").createSignedUrls(paths, 3600) : { data: [] };
  const items = (data ?? []).map((d, i) => ({ id: d.id, message: d.message, signature: d.signature, createdAt: d.created_at, image: signed.data?.[i]?.signedUrl ?? null }));
  return NextResponse.json({ items, page, total: count ?? items.length, pageSize: PAGE }, { headers: { "Cache-Control": "s-maxage=5, stale-while-revalidate=30" } });
}

/**
 * Publicación de una figura con mensaje: validación, anti-spam y límite por IP anonimizada.
 * Se publica al instante (status "approved"); el panel de administración puede retirarla después ("rejected").
 */
export async function POST(req: Request) {
  const sb = serviceClient();
  if (!sb) return NextResponse.json({ error: "not-configured", message: "El mural todavía no está conectado a la base de datos." }, { status: 503 });
  const len = Number(req.headers.get("content-length") ?? 0);
  if (len > 1_500_000) return NextResponse.json({ error: "too-large" }, { status: 413 });

  let body: unknown;
  try { body = await req.json(); } catch { return NextResponse.json({ error: "json" }, { status: 400 }); }
  const parsed = submissionSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "invalid", issues: parsed.error.issues.map((i) => i.message) }, { status: 422 });
  const sub = parsed.data;
  const message = sanitize(sub.message);
  const signature = sanitize(sub.signature);
  if (containsPersonalData(message) || containsPersonalData(signature))
    return NextResponse.json({ error: "personal-data", message: "Quita correos, teléfonos o números de documento del mensaje." }, { status: 422 });

  const ip = ipHash(req);
  const now = Date.now();
  const recent = (memory.get(ip) ?? []).filter((t) => now - t < WINDOW_MIN * 60_000);
  if (recent.length >= MAX_PER_WINDOW) return NextResponse.json({ error: "rate-limit" }, { status: 429 });
  const since = new Date(now - WINDOW_MIN * 60_000).toISOString();
  const { count } = await sb.from("visitor_collages").select("id", { count: "exact", head: true }).eq("ip_hash", ip).gte("created_at", since);
  if ((count ?? 0) >= MAX_PER_WINDOW) return NextResponse.json({ error: "rate-limit" }, { status: 429 });

  const id = randomUUID();
  const { mime, ext } = imageMeta(sub.image);
  const path = `${id}.${ext}`;
  const buf = Buffer.from(sub.image.split(",")[1], "base64");
  const up = await sb.storage.from("collages").upload(path, buf, { contentType: mime, upsert: false });
  if (up.error) return NextResponse.json({ error: "storage" }, { status: 500 });
  const { error } = await sb.from("visitor_collages").insert({
    id, composition: sub.composition, image_path: path, message, signature: signature || null,
    status: "approved", schema_version: COLLAGE_SCHEMA_VERSION, ip_hash: ip,
  });
  if (error) {
    await sb.storage.from("collages").remove([path]);
    return NextResponse.json({ error: "db" }, { status: 500 });
  }
  memory.set(ip, [...recent, now]);
  const signedUrl = await sb.storage.from("collages").createSignedUrl(path, 3600);
  const piece = { id, message, signature: signature || null, createdAt: new Date(now).toISOString(), image: signedUrl.data?.signedUrl ?? null };
  return NextResponse.json({ ok: true, id, status: "approved", piece }, { status: 201 });
}
