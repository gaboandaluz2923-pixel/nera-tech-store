-- =====================================================================
-- Nera Tech Store — Migración 0015: categorías Televisores y Consolas y videojuegos
-- Cómo ejecutarla: Supabase → SQL Editor → New query → pegar todo → Run.
-- Requiere 0001 a 0014. Se puede correr más de una vez. No borra datos.
-- Pedido de Gabriel (20 oct 2026): los televisores y la Nintendo Switch de Idecom tienen su propia categoría.
-- =====================================================================

insert into public.categorias (slug, nombre, margen_objetivo_pct, orden, plantilla_caracteristicas) values
  ('televisores', 'Televisores', 10, 10, '["pantalla","resolucion","sistema_operativo","conexion","peso"]'::jsonb),
  ('consolas', 'Consolas y videojuegos', 12, 11, '["pantalla","almacenamiento","bateria","conexion","peso"]'::jsonb)
on conflict (slug) do update set nombre = excluded.nombre;

select string_agg(slug || ' = ' || nombre, ' · ' order by orden) as categorias from public.categorias;
