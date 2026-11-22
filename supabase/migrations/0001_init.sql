-- Museo Abraxas · esquema inicial (Sala 04 y base para las demás salas)
-- Ejecutar en Supabase: SQL Editor > pegar > Run. O con la CLI: supabase db push

create extension if not exists "pgcrypto";

-- Registro de salas
create table if not exists public.rooms (
  id text primary key,                 -- '01'..'04'
  title text not null,
  route text not null,
  status text not null default 'pending' check (status in ('pending','active')),
  config jsonb not null default '{}'
);
insert into public.rooms (id, title, route, status) values
  ('01','Caos','/salas/01','pending'), ('02','Transidentidad','/salas/02','pending'),
  ('03','Collage','/salas/03','pending'), ('04','Vida y obra','/salas/04','active')
on conflict (id) do nothing;

-- Fuentes documentales
create table if not exists public.archive_sources (
  id uuid primary key default gen_random_uuid(),
  label text not null,
  url text,
  kind text not null check (kind in ('prensa','documento','archivo-foto','libro','base-de-datos','testimonio')),
  source_date date,
  notes text,
  created_at timestamptz not null default now()
);

-- Recursos del archivo (fotos, PDF, videos, afiches, agendas...)
create table if not exists public.archive_assets (
  id uuid primary key default gen_random_uuid(),
  room_id text references public.rooms(id),
  file_type text not null,
  name text not null,
  description text,
  asset_date text,                     -- texto: admite fechas aproximadas
  provenance text,
  usage_rights text,
  storage_path text,
  thumbnail_path text,
  tags text[] not null default '{}',
  section text,
  wall text,
  heading real,
  layout jsonb,                        -- posición en la habitación reconstruida
  review_status text not null default 'pending' check (review_status in ('pending','approved','restricted','rejected')),
  credits text,
  source_id uuid references public.archive_sources(id),
  created_at timestamptz not null default now()
);

-- Línea de tiempo
create table if not exists public.timeline_events (
  id text primary key,
  title text not null,
  date_label text not null,
  sort_year int,
  date_precision text not null check (date_precision in ('dia','año','decada','aproximada','desconocida')),
  description text not null,
  dimensions text[] not null,
  verification text not null check (verification in ('verificado','documentado','por-verificar','pendiente')),
  certainty text not null check (certainty in ('alta','media','baja')),
  related text[] not null default '{}',
  published boolean not null default false
);
create table if not exists public.timeline_event_assets (
  event_id text references public.timeline_events(id) on delete cascade,
  asset_id uuid references public.archive_assets(id) on delete cascade,
  caption text,
  primary key (event_id, asset_id)
);

-- Libros, fragmentos y citas
create table if not exists public.books (
  id text primary key,
  title text not null,
  subtitle text,
  author text not null,
  year_label text,
  status text not null check (status in ('disponible','pendiente')),
  cover_path text,
  pdf_path text,
  slot int not null check (slot between 1 and 3),
  published boolean not null default false
);
create table if not exists public.quotes (
  id text primary key,
  text text not null,
  kind text not null check (kind in ('cita','curatorial','inspirada')),
  book_id text references public.books(id),
  pdf_page int,
  video_ref text,                      -- video y minuto para citas orales
  source_id uuid references public.archive_sources(id),
  verification text not null check (verification in ('verificado','documentado','por-verificar','pendiente')),
  published boolean not null default false
);
create table if not exists public.book_fragments (
  id uuid primary key default gen_random_uuid(),
  book_id text references public.books(id) on delete cascade,
  quote_id text references public.quotes(id),
  theme text,
  context text,
  sort int not null default 0
);

-- Recortes autorizados para el editor
create table if not exists public.collage_elements (
  id uuid primary key default gen_random_uuid(),
  kind text not null check (kind in ('image','shape','paper','text','sticker')),
  label text,
  storage_path text,
  payload jsonb not null default '{}',
  enabled boolean not null default true
);

-- Aportes de visitantes y moderación
create table if not exists public.visitor_collages (
  id uuid primary key default gen_random_uuid(),
  composition jsonb not null,
  image_path text not null,
  message text not null check (char_length(message) between 2 and 240),
  signature text check (signature is null or char_length(signature) <= 40),
  status text not null default 'pending' check (status in ('pending','approved','rejected')),
  schema_version int not null default 1,
  ip_hash text,
  created_at timestamptz not null default now(),
  moderated_at timestamptz
);
create index if not exists visitor_collages_status_idx on public.visitor_collages (status, created_at);
create index if not exists visitor_collages_ip_idx on public.visitor_collages (ip_hash, created_at);

create table if not exists public.moderation_events (
  id uuid primary key default gen_random_uuid(),
  collage_id uuid references public.visitor_collages(id) on delete cascade,
  action text not null check (action in ('approved','rejected')),
  moderator_email text not null,
  note text,
  created_at timestamptz not null default now()
);

-- ---------- Seguridad (RLS) ----------
alter table public.rooms enable row level security;
alter table public.archive_sources enable row level security;
alter table public.archive_assets enable row level security;
alter table public.timeline_events enable row level security;
alter table public.timeline_event_assets enable row level security;
alter table public.books enable row level security;
alter table public.quotes enable row level security;
alter table public.book_fragments enable row level security;
alter table public.collage_elements enable row level security;
alter table public.visitor_collages enable row level security;
alter table public.moderation_events enable row level security;

-- Lectura pública solo de lo publicado / aprobado
create policy "rooms public read" on public.rooms for select using (true);
create policy "sources public read" on public.archive_sources for select using (true);
create policy "assets public read approved" on public.archive_assets for select using (review_status = 'approved');
create policy "timeline public read" on public.timeline_events for select using (published);
create policy "timeline assets read" on public.timeline_event_assets for select using (true);
create policy "books public read" on public.books for select using (published);
create policy "quotes public read" on public.quotes for select using (published);
create policy "fragments public read" on public.book_fragments for select using (true);
create policy "elements public read" on public.collage_elements for select using (enabled);
create policy "collages public read approved" on public.visitor_collages for select using (status = 'approved');
-- Sin políticas de insert/update para anon: los aportes entran por la ruta API (service role)
-- que valida, limita y los deja en 'pending'. La moderación también pasa por la API.

-- ---------- Storage ----------
-- Bucket privado para collages: las imágenes se sirven con URLs firmadas solo si están aprobadas.
insert into storage.buckets (id, name, public) values ('collages', 'collages', false) on conflict (id) do nothing;
-- Bucket privado para material restringido del archivo (agendas, documentos personales)
insert into storage.buckets (id, name, public) values ('archive-restricted', 'archive-restricted', false) on conflict (id) do nothing;
-- Bucket público solo para recursos autorizados
insert into storage.buckets (id, name, public) values ('archive-public', 'archive-public', true) on conflict (id) do nothing;
