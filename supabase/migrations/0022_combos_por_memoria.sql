-- =====================================================================
-- Nera Tech Store — Migración 0022: combo para una memoria exacta del celular
-- Cómo ejecutarla: Supabase → SQL Editor → New query → pegar todo → Run.
-- Requiere 0001 a 0021. Se puede correr más de una vez. No borra datos. No crea tablas.
-- Pedido de Gabriel (24 oct 2026): el combo del Redmi Note 17 es solo para el de 6 + 256 GB.
--   - bundles.principal_ram_gb y bundles.principal_almacenamiento_gb: vacíos = cualquier memoria (como antes);
--     con valor, el combo aplica solo a esa memoria (cualquier color).
-- =====================================================================

alter table public.bundles add column if not exists principal_ram_gb int;
alter table public.bundles add column if not exists principal_almacenamiento_gb int;

notify pgrst, 'reload schema';

select 'migracion 0022 lista' as resultado;
