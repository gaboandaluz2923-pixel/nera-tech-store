-- =====================================================================
-- Nera Tech Store — Migración 0014: editar pedidos desde el panel
-- Cómo ejecutarla: Supabase → SQL Editor → New query → pegar todo → Run.
-- Requiere 0001 a 0013. Se puede correr más de una vez. No borra datos.
--
-- Un administrador puede corregir un pedido (productos, envío, un descuento extra con su motivo). El total se
-- recalcula, el cliente recibe un correo y en Pago se ve el saldo pendiente o lo que queda a su favor.
-- =====================================================================

alter table public.pedidos add column if not exists descuento_extra numeric(10,2) not null default 0;
alter table public.pedidos add column if not exists descuento_extra_motivo text;
-- Por qué el envío es gratis o distinto de lo normal (ej. "Octubre Naranja", "Cortesía")
alter table public.pedidos add column if not exists envio_motivo text;
alter table public.pedidos add column if not exists modificado_en timestamptz;

do $$ begin
  alter table public.pedidos add constraint pedidos_descuento_extra_check check (descuento_extra >= 0);
exception when duplicate_object then null; end $$;

select 'listo' as migracion_0014,
  (select count(*) from information_schema.columns where table_schema = 'public' and table_name = 'pedidos'
     and column_name in ('descuento_extra', 'descuento_extra_motivo', 'envio_motivo', 'modificado_en')) as columnas_nuevas;
