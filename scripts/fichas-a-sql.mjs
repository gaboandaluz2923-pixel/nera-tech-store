// Convierte un archivo de fichas (supabase/contenido/*.json) en SQL para pegar en el SQL Editor de Supabase.
// Uso:  node scripts/fichas-a-sql.mjs supabase/contenido/fichas-2026-10.json > supabase/contenido/fichas-2026-10.sql
//
// - Actualiza textos, características y FAQ de cada producto (por slug) y lo publica (estado activo).
//   Un producto publicado igual NO aparece en la tienda hasta que tenga precio de venta.
// - Agrega las fotos que estén en public/productos/<slug>/ (1.webp, 2.webp…), sin duplicarlas.
// - Lo agrega a las colecciones indicadas (Los más pedidos, Recién llegado…).
// Se puede correr más de una vez: no duplica ni borra nada.
import { readFileSync, readdirSync, existsSync } from "node:fs";
import path from "node:path";

const archivo = process.argv[2];
if (!archivo) {
  console.error("Falta el archivo .json de fichas");
  process.exit(1);
}
const fichas = JSON.parse(readFileSync(archivo, "utf8"));

const imagenes = [];
for (const f of fichas) {
  const carpeta = path.join("public", "productos", f.slug);
  if (!existsSync(carpeta)) continue;
  const fotos = readdirSync(carpeta)
    .filter((n) => /\.(webp|jpe?g|png|avif)$/i.test(n))
    .sort((a, b) => parseInt(a) - parseInt(b));
  fotos.forEach((n, i) => {
    const vista = f.imagenes?.[i];
    imagenes.push({
      slug: f.slug,
      url: `/productos/${f.slug}/${n}`,
      alt: vista ? `${f.nombre}, ${vista}` : f.nombre,
      orden: i,
    });
  });
}

const productos = fichas.map((f) => ({
  slug: f.slug,
  nombre: f.nombre,
  resumen: f.resumen,
  descripcion: f.descripcion,
  caracteristicas: f.caracteristicas,
  incluye: f.incluye,
  faq: f.faq,
  meta_descripcion: f.meta_descripcion,
  orden: f.orden,
}));
const colecciones = fichas.flatMap((f) => (f.colecciones ?? []).map((c) => ({ slug: f.slug, coleccion: c })));

const json = (v) => {
  const s = JSON.stringify(v, null, 1);
  if (s.includes("$fichas$")) throw new Error("El texto no puede contener $fichas$");
  return `$fichas$${s}$fichas$::jsonb`;
};

console.log(`-- =====================================================================
-- Nera Tech — Fichas de producto (${path.basename(archivo)})
-- Generado con scripts/fichas-a-sql.mjs. Cómo usarlo: Supabase → SQL Editor → New query → pegar todo → Run.
-- Se puede correr más de una vez.
-- =====================================================================

-- 1. Textos, características, preguntas frecuentes y publicación
update public.productos p
set nombre = d.nombre,
    resumen = d.resumen,
    descripcion = d.descripcion,
    caracteristicas = d.caracteristicas,
    incluye = d.incluye,
    faq = d.faq,
    meta_descripcion = d.meta_descripcion,
    orden = d.orden,
    estado = case when p.estado = 'oculto' then 'activo'::public.estado_producto else p.estado end,
    publicado_en = coalesce(p.publicado_en, now()),
    updated_at = now()
from jsonb_to_recordset(${json(productos)}) as d(
  slug text, nombre text, resumen text, descripcion text, caracteristicas jsonb,
  incluye text, faq jsonb, meta_descripcion text, orden int
)
where p.slug = d.slug;

-- 2. Fotos (las que ya estén cargadas no se repiten)
insert into public.imagenes (producto_id, url, alt, orden, principal)
select p.id, i.url, i.alt, i.orden, i.orden = 0
from jsonb_to_recordset(${json(imagenes)}) as i(slug text, url text, alt text, orden int)
join public.productos p on p.slug = i.slug
where not exists (select 1 from public.imagenes x where x.producto_id = p.id and x.url = i.url);

-- 3. Colecciones de la página de inicio
insert into public.coleccion_producto (coleccion_id, producto_id, orden)
select c.id, p.id, p.orden
from jsonb_to_recordset(${json(colecciones)}) as k(slug text, coleccion text)
join public.productos p on p.slug = k.slug
join public.colecciones c on c.slug = k.coleccion
on conflict do nothing;

-- Revisión: qué quedó publicado y cuántas fotos tiene cada uno
select p.nombre, p.estado, count(distinct i.id) as fotos,
       count(distinct v.id) filter (where v.precio > 0) as variantes_con_precio
from public.productos p
left join public.imagenes i on i.producto_id = p.id
left join public.variantes v on v.producto_id = p.id and v.activo
where p.slug in (${productos.map((p) => `'${p.slug}'`).join(", ")})
group by p.nombre, p.estado, p.orden
order by p.orden;`);
