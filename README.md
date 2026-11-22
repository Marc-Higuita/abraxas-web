# Museo Abraxas · web

Museo digital experimental de la Casa Museo del Collage de Abraxas Aguilar Betancur (Medellín).
Proyecto de la materia Creación de Espacios Interactivos (Universidad de Antioquia).

En esta etapa solo está desarrollada la **Sala 04 · Vida y obra** (`/salas/04`). Las salas 01, 02 y 03 tienen su ruta y su carpeta listas, sin contenido.

## Recorrido de la Sala 04

| # | Experiencia | Qué hace | Archivo principal |
|---|---|---|---|
| 01 | La habitación fragmentada | 88 fotos flotan; a los 5 s se reconstruye la oficina como un *joiner* de Hockney; el scroll acerca la cámara y atraviesa un túnel de fotos | `src/features/room-04/scenes/PhotoRoom/` |
| 02 | La imagen que habla | El video entra como fragmento y se expande; reproductor accesible con subtítulos | `scenes/DocumentaryVideo/` |
| 03 | Los libros de una vida | 3 libros 3D con tapas, lomo, bloque de páginas y bisagra; al abrirse sueltan recortes con citas verificadas y la página real del PDF | `scenes/Books/` |
| 04 | Las transformaciones | Línea de tiempo collage con filtros (vida, política, arte, pensamiento, patrimonio), fuentes y estado de verificación | `scenes/Timeline/` |
| 05 | El collage colectivo | Editor (Konva) + mural persistente en Supabase con moderación | `scenes/CollectiveCollage/` |
| · | Coda musical | Partículas que forman un retrato de Abraxas + playlist de Spotify | `scenes/Particles/` |

Otras rutas: `/salas/04/archivo` (mosaico de contacto de las 640 fotos), `/admin` (moderación del mural).

## Cómo se reconstruyó la habitación

Las 640 fotos (23 sep 2026) traen en el EXIF el rumbo de la brújula del teléfono. Se agrupan en cuatro paredes (~30°, ~120°, ~210°, ~300°). Cada foto vuelve a su ángulo real sobre un cilindro alrededor del visitante. La altura y el giro salen de emparejar puntos (ORB + RANSAC, OpenCV) entre fotos consecutivas de la misma pared: 306 de 446 fotos de pared encadenaron. Para cada pared se elige la foto más nítida por celda de una rejilla. Los huecos son zonas sin foto y no se rellenan.

Scripts en `../scripts` (Python): `convert.py` (HEIC→JPG y EXIF), `recon.py` (clasificación, emparejamiento y layout), `export_assets.py` (genera `public/assets` y `src/features/room-04/data/*.json`), `contact_pdf.py` (mosaico en PDF).

## Instalación

```bash
npm install
cp .env.example .env.local   # completar variables
npm run dev                  # http://localhost:3000/salas/04
npm run build && npm start   # producción
```

Requiere Node 20 o superior.

## Variables de entorno

| Variable | Dónde se usa | Pública |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | cliente y servidor | sí |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | inicio de sesión en `/admin` | sí |
| `SUPABASE_SERVICE_ROLE_KEY` | solo rutas API del servidor | **no** |
| `ADMIN_EMAILS` | correos con permiso de moderación | no |
| `RATE_LIMIT_SALT` | anonimizar IPs | no |
| `NEXT_PUBLIC_SPOTIFY_PLAYLIST_URL` | reproductor de la coda | sí |

## Supabase (mural colectivo)

1. Crea un proyecto en supabase.com.
2. SQL Editor → pega `supabase/migrations/0001_init.sql` → Run. Crea las tablas, las políticas RLS y los buckets (`collages` privado, `archive-restricted` privado, `archive-public` público).
3. Settings → API: copia la URL, la anon key y la service role key en las variables.
4. Authentication → URL Configuration: agrega `https://TU-DOMINIO/admin` como Redirect URL.
5. Escribe tu correo en `ADMIN_EMAILS`.

Flujo: el visitante envía su pieza → la API valida (Zod), bloquea datos personales evidentes, aplica un campo trampa contra bots y un límite de 3 envíos cada 10 minutos por IP anonimizada → la guarda como `pending`. El mural público solo muestra `approved`, con URLs firmadas. Sin Supabase configurado, el mural lo dice y no simula el guardado.

## Despliegue en Vercel

1. Sube este repositorio a GitHub.
2. En vercel.com → Add New → Project → importa el repositorio (framework: Next.js; no hace falta configurar nada más).
3. En Settings → Environment Variables agrega las variables de la tabla.
4. Deploy. Cada push a `main` vuelve a desplegar.

## Cómo incorporar el material real

| Material | Dónde va | Cambio de código |
|---|---|---|
| Video MP4 | `public/assets/room-04/videos/abraxas.mp4` (+ `abraxas.es.vtt`) | ninguno; textos en `data/media.ts` |
| Tercer libro (PDF) | páginas en `public/assets/room-04/books/`, citas en `data/books.ts` | cambiar `status` a `disponible` |
| Citas nuevas | `data/books.ts` (con página) o `data/phrases.ts` | ninguno |
| Hitos de la cronología | `data/timeline.ts` | ninguno |
| Playlist | variable `NEXT_PUBLIC_SPOTIFY_PLAYLIST_URL` | ninguno |
| Nuevas fotos de pared | volver a correr `scripts/convert.py → recon.py → export_assets.py` | ninguno |

## Reglas de contenido

- Citas de Abraxas: solo literales, con fuente y página o minuto. Las transcripciones del equipo están marcadas como pendientes hasta asociarlas a un video y un minuto.
- Textos curatoriales y frases inspiradas siempre aparecen identificados como textos del proyecto.
- Fechas aproximadas se muestran como aproximadas, con su estado de verificación.
- A Abraxas se la nombra en femenino; los documentos de época con otro nombre se contextualizan.

## Sistema visual

Del Manual de identidad visual v0.3.1: Jost (sustituto libre de Futura, alojada en el proyecto) para títulos y Arial/Helvetica para lectura; paleta papel, negro y tinta con acentos de revista; el oro marca solo lo interactivo; botones de 56 px; recortes con sombra dura de 6 px y giros de ±8°.

## Estructura

```
src/app/                rutas: /, /salas/01..04, /salas/04/archivo, /admin, /api/*
src/config/rooms.ts     registro de salas
src/features/room-04/   módulo independiente de la Sala 04
  scenes/               una carpeta por experiencia
  data/                 contenidos (separados de los componentes 3D)
  components/ hooks/ types/ store.ts
src/features/room-01..03/  carpetas listas para las otras salas
src/lib/                supabase, validación del collage
supabase/migrations/    SQL
public/assets/          fotos optimizadas, libros, marca
```
