-- =====================================================================
-- Nera Tech Store — Migración 0016: "Relojes Inteligentes" y "Celulares Básicos"
-- Cómo ejecutarla: Supabase → SQL Editor → New query → pegar todo → Run.
-- Requiere 0001 a 0015. Se puede correr más de una vez. No borra datos.
-- Pedido de Gabriel (20 oct 2026): la categoría Relojes se llama "Relojes Inteligentes" y los teléfonos de teclas
-- o flip (Blu, Logic, Gomobile de Maverik) van en "Celulares Básicos".
-- =====================================================================

update public.categorias set nombre = 'Relojes Inteligentes' where slug = 'relojes';

insert into public.categorias (slug, nombre, margen_objetivo_pct, orden, plantilla_caracteristicas) values
  ('celulares-basicos', 'Celulares Básicos', 12, 2, '["pantalla","bateria","red","peso"]'::jsonb)
on conflict (slug) do update set nombre = excluded.nombre;

select string_agg(slug || ' = ' || nombre, ' · ' order by orden) as categorias from public.categorias;
