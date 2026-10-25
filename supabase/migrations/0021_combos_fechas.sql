-- =====================================================================
-- Nera Tech Store — Migración 0021: combos con fechas (duración)
-- Cómo ejecutarla: Supabase → SQL Editor → New query → pegar todo → Run.
-- Requiere 0001 a 0020. Se puede correr más de una vez. No borra datos. No crea tablas.
-- Pedido de Gabriel (24 oct 2026): poder ponerle duración a un combo (empieza / termina), además de editarlo y
-- eliminarlo desde Promociones.
--   - bundles.inicio y bundles.fin (vacío = sin límite).
--   - La tienda (anon) solo ve los combos activos y dentro de sus fechas.
--   - promociones_proximas también avisa cuándo empieza el próximo combo programado (la tienda se refresca sola).
-- =====================================================================

alter table public.bundles add column if not exists inicio timestamptz;
alter table public.bundles add column if not exists fin timestamptz;

drop policy if exists "publico_lee" on public.bundles;
create policy "publico_lee" on public.bundles for select to anon
  using (activo and (inicio is null or inicio <= now()) and (fin is null or fin > now()));

create or replace view public.promociones_proximas as
  select min(x) as proximo_inicio from (
    select inicio as x from public.promociones where activa and inicio > now()
    union all
    select inicio from public.bundles where activo and inicio > now()
  ) t;
grant select on public.promociones_proximas to anon, authenticated;

notify pgrst, 'reload schema';
