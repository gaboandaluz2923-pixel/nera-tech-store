-- =====================================================================
-- Nera Tech Store — Migración 0013: categorías Cámaras y Estaciones de energía; Cargadores → Powerbanks
-- Cómo ejecutarla: Supabase → SQL Editor → New query → pegar todo → Run.
-- Requiere 0001 a 0012. Se puede correr más de una vez. No borra datos.
--
-- Pedido de Gabriel (20 oct 2026): Insta360 (y cámaras Eufy) en "Cámaras"; EcoFlow (estaciones de energía y
-- paneles solares) en su propia categoría; "Cargadores y cables" pasa a "Powerbanks, Cargadores y Cables"
-- (el slug "cargadores" no cambia, así no se rompen enlaces).
-- =====================================================================

insert into public.categorias (slug, nombre, margen_objetivo_pct, orden, plantilla_caracteristicas) values
  ('camaras', 'Cámaras', 15, 8, '["resolucion","bateria","resistencia","conexion","peso"]'::jsonb),
  ('energia', 'Estaciones de energía y paneles solares', 15, 9, '["capacidad","potencia","puertos","carga","peso"]'::jsonb)
on conflict (slug) do update set nombre = excluded.nombre;

update public.categorias
set nombre = 'Powerbanks, Cargadores y Cables',
    plantilla_caracteristicas = '["capacidad","potencia","conector","largo"]'::jsonb
where slug = 'cargadores';

select string_agg(slug || ' = ' || nombre, ' · ' order by orden) as categorias from public.categorias;
