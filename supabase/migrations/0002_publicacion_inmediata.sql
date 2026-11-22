-- Fase 2 · Tablero «Tu figura, tu mensaje»
-- Las figuras con mensaje se publican al instante. El equipo puede retirarlas después
-- desde /admin (status 'rejected'); la tabla moderation_events conserva el registro.

alter table public.visitor_collages alter column status set default 'approved';

-- La figura se exporta como PNG con transparencia (también se aceptan JPEG y WebP), hasta 1 MB.
update storage.buckets
   set file_size_limit = 1048576,
       allowed_mime_types = array['image/png', 'image/jpeg', 'image/webp']
 where id = 'collages';

comment on table public.visitor_collages is
  'Figuras y mensajes de visitantes (Sala 04). Publicación inmediata vía API con service role; retiro por moderación posterior.';
