-- =====================================================================
-- Nera Tech Store — Migración 0020: cierre de cada pedido (quién entregó, cuánto entró al banco) y costos de cobro
-- Cómo ejecutarla: Supabase → SQL Editor → New query → pegar todo → Run.
-- Requiere 0001 a 0019. Se puede correr más de una vez. No borra datos. No crea tablas (no hacen falta grants nuevos).
-- Pedido de Gabriel (24 oct 2026): llevar medido el costo de envío y el margen neto real de cada pedido.
--   - Quién lo entregó (paquetera, un motorista o lo recogió el cliente) y cuánto costó esa entrega.
--   - Tasa 0%: con qué banco y a cuántos meses (cada uno tiene su comisión).
--   - Estado del dinero (se calcula, no se guarda): por cobrar → cobrado, por recibir (lo tiene la paquetera, el
--     motorista, Wompi o el banco) → recibido y conciliado (cuánto entró exacto al banco, cuándo y con qué referencia).
--   - configuracion.costos_cobro (privada): envío de la paquetera, paquetería, comisiones y repartidores.
-- =====================================================================

alter table public.pedidos add column if not exists entrega_servicio text;              -- "Paquetera", "Motorista Juan"…
alter table public.pedidos add column if not exists entrega_costo numeric(10,2);        -- lo que costó entregarlo
alter table public.pedidos add column if not exists tasa_cero_banco text;
alter table public.pedidos add column if not exists tasa_cero_plazo int;
alter table public.pedidos add column if not exists dinero_recibido numeric(10,2);      -- lo que entró al banco
alter table public.pedidos add column if not exists dinero_recibido_en date;
alter table public.pedidos add column if not exists dinero_referencia text;
alter table public.pedidos add column if not exists conciliado_por text;
alter table public.pedidos add column if not exists conciliado_en timestamptz;

insert into public.configuracion (clave, valor, publica)
values ('costos_cobro', jsonb_build_object(
  'envio_paquetera', 3.75,
  'paqueteria', 1.50,
  'contra_entrega_pct', 2.5,
  'wompi_pct', 5.5,
  'tasa_cero_pct', 9,
  'tasa_cero_bancos', jsonb_build_array(
    jsonb_build_object('banco', 'Banco Agrícola', 'plazos', jsonb_build_object('3', 9, '6', 9, '12', 9)),
    jsonb_build_object('banco', 'BAC', 'plazos', jsonb_build_object('3', 9, '6', 9, '12', 9)),
    jsonb_build_object('banco', 'Cuscatlán', 'plazos', jsonb_build_object('3', 9, '6', 9, '12', 9))
  ),
  'repartidores', jsonb_build_array(
    jsonb_build_object('nombre', 'Paquetera', 'tipo', 'paquetera', 'tarifa', 3.75),
    jsonb_build_object('nombre', 'Motorista San Salvador', 'tipo', 'motorista', 'tarifa', null)
  )
), false)
on conflict (clave) do nothing;

notify pgrst, 'reload schema';
