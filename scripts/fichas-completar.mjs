// Completa las fichas de productos que todavía no tienen textos, SIN tocar lo que ya esté escrito.
// Uso:  node scripts/fichas-completar.mjs supabase/contenido/fichas-2026-10-21.json > supabase/contenido/fichas-2026-10-21.sql
//
// - Por slug, llena resumen, descripción, características, "incluye", preguntas frecuentes y meta descripción
//   solo si ese campo está vacío en la base (lo que Gabriel ya escribió en el panel se respeta).
// - No cambia el nombre, el orden, el estado ni las fotos.
// - Se puede correr más de una vez.
import { readFileSync } from "node:fs";
import path from "node:path";

const archivo = process.argv[2];
if (!archivo) {
  console.error("Falta el archivo .json de fichas");
  process.exit(1);
}
const fichas = JSON.parse(readFileSync(archivo, "utf8")).map((f) => ({
  slug: f.slug,
  resumen: f.resumen ?? null,
  descripcion: f.descripcion ?? null,
  caracteristicas: f.caracteristicas ?? null,
  incluye: f.incluye ?? null,
  faq: f.faq ?? null,
  meta_descripcion: f.meta_descripcion ?? null,
}));

const s = JSON.stringify(fichas, null, 1);
if (s.includes("$fichas$")) throw new Error("El texto no puede contener $fichas$");

const vacio = (c) => `nullif(trim(coalesce(p.${c}, '')), '') is null`;
console.log(`-- =====================================================================
-- Nera Tech — Completar fichas vacías (${path.basename(archivo)}, ${fichas.length} productos)
-- Generado con scripts/fichas-completar.mjs. Supabase → SQL Editor → New query → pegar todo → Run.
-- Solo llena los campos que están vacíos; no cambia nombre, orden, estado ni fotos. Se puede correr más de una vez.
-- =====================================================================
with d as (
  select * from jsonb_to_recordset($fichas$${s}$fichas$::jsonb) as d(
    slug text, resumen text, descripcion text, caracteristicas jsonb, incluye text, faq jsonb, meta_descripcion text)
), u as (
  update public.productos p
  set resumen = case when ${vacio("resumen")} then d.resumen else p.resumen end,
      descripcion = case when ${vacio("descripcion")} then d.descripcion else p.descripcion end,
      caracteristicas = case when coalesce(p.caracteristicas, '{}'::jsonb) = '{}'::jsonb and d.caracteristicas is not null
                             then d.caracteristicas else p.caracteristicas end,
      incluye = case when ${vacio("incluye")} then d.incluye else p.incluye end,
      faq = case when coalesce(p.faq, '[]'::jsonb) = '[]'::jsonb and d.faq is not null then d.faq else p.faq end,
      meta_descripcion = case when ${vacio("meta_descripcion")} then d.meta_descripcion else p.meta_descripcion end,
      updated_at = now()
  from d
  where p.slug = d.slug
    and (${vacio("descripcion")} or coalesce(p.caracteristicas, '{}'::jsonb) = '{}'::jsonb or ${vacio("resumen")}
         or ${vacio("incluye")} or coalesce(p.faq, '[]'::jsonb) = '[]'::jsonb or ${vacio("meta_descripcion")})
  returning p.slug
)
select count(*) from u;

-- Revisión: cuántos se completaron recién y cuántos publicados siguen sin descripción o características
select count(*) filter (where updated_at > now() - interval '2 minutes') as completados_ahora,
       count(*) filter (where estado <> 'oculto' and (nullif(trim(coalesce(descripcion, '')), '') is null
                        or coalesce(caracteristicas, '{}'::jsonb) = '{}'::jsonb)) as publicados_sin_ficha
from public.productos;`);
