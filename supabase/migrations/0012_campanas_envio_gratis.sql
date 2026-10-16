-- =====================================================================
-- Nera Tech Store — Migración 0012: campañas con envío gratis (ej. "Octubre Naranja")
-- Cómo ejecutarla: Supabase → SQL Editor → New query → pegar todo → Run.
-- Requiere 0001 a 0011. Se puede correr más de una vez. No borra datos.
--
-- Una campaña es una promoción de tipo 'envio_gratis' con fechas: los pedidos que llevan alguno de sus
-- productos no pagan envío, las fichas y tarjetas lo dicen y el inicio puede mostrar un banner con el
-- producto destacado (promociones.config: { destacado: producto_id, banner: true, texto: "..." }).
-- =====================================================================

create table if not exists public.promocion_productos (
  promocion_id uuid not null references public.promociones(id) on delete cascade,
  producto_id uuid not null references public.productos(id) on delete cascade,
  orden int not null default 0,
  primary key (promocion_id, producto_id)
);
create index if not exists promocion_productos_producto_idx on public.promocion_productos (producto_id);

alter table public.promocion_productos enable row level security;
drop policy if exists "equipo_todo" on public.promocion_productos;
drop policy if exists "admin_todo" on public.promocion_productos;
create policy "admin_todo" on public.promocion_productos for all to authenticated
  using (public.es_super_admin()) with check (public.es_super_admin());
drop policy if exists "operador_lee" on public.promocion_productos;
create policy "operador_lee" on public.promocion_productos for select to authenticated using (public.es_equipo());
-- La tienda solo ve los productos de campañas activas y dentro de sus fechas
drop policy if exists "publico_lee" on public.promocion_productos;
create policy "publico_lee" on public.promocion_productos for select to anon using (
  exists (
    select 1 from public.promociones p
    where p.id = promocion_id and p.activa
      and (p.inicio is null or p.inicio <= now())
      and (p.fin is null or p.fin >= now())
  )
);

select 'listo' as migracion_0012, (select count(*) from public.promocion_productos) as productos_en_campanas;
