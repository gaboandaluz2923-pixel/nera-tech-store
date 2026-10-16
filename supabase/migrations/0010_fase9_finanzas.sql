-- =====================================================================
-- Nera Tech Store — Migración 0010: finanzas (solo administradores)
-- Cómo ejecutarla: Supabase → SQL Editor → New query → pegar todo → Run.
-- Requiere 0001 a 0009. Se puede correr más de una vez. No borra datos.
--
-- Gastos del negocio (alquiler, sueldos, servicios, honorarios…) con su documento (crédito fiscal o no),
-- si son fijos cada mes y cuándo se pagaron. Con esto, las ventas, el costo de lo vendido (lotes), las compras
-- y la pauta, el panel arma el estado de resultados, el flujo de caja, el IVA del mes y los indicadores.
-- =====================================================================

create table if not exists public.gastos (
  id uuid primary key default gen_random_uuid(),
  fecha date not null default current_date,
  categoria text not null check (categoria in (
    'alquiler', 'sueldos', 'publicidad', 'envios', 'comisiones', 'servicios', 'software',
    'honorarios', 'impuestos', 'transporte', 'empaque', 'garantias', 'otros'
  )),
  descripcion text not null,
  beneficiario text,
  -- ccf = crédito fiscal (el IVA se recupera); factura = consumidor final; recibo o sin documento
  documento text not null default 'sin' check (documento in ('ccf', 'factura', 'recibo', 'sin')),
  numero text,
  nit text,
  monto numeric(12,2) not null check (monto >= 0),          -- sin IVA (o el total si no hay IVA aparte)
  iva numeric(12,2) not null default 0 check (iva >= 0),     -- IVA del documento (solo crédito fiscal se recupera)
  total numeric(12,2) generated always as (monto + iva) stored,
  fijo boolean not null default false,                       -- se repite cada mes (para el punto de equilibrio)
  forma_pago text check (forma_pago in ('efectivo', 'transferencia', 'tarjeta', 'otro')),
  pagado_en date,                                            -- null = todavía no se pagó
  notas text,
  creado_por text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists gastos_fecha_idx on public.gastos (fecha desc);
create index if not exists gastos_pagado_idx on public.gastos (pagado_en);
drop trigger if exists trg_gastos_updated on public.gastos;
create trigger trg_gastos_updated before update on public.gastos
  for each row execute function public.set_updated_at();

alter table public.gastos enable row level security;
drop policy if exists "equipo_todo" on public.gastos;
create policy "equipo_todo" on public.gastos for all to authenticated
  using (public.es_super_admin()) with check (public.es_super_admin());

-- Saldo de caja y bancos en una fecha (punto de partida del flujo de caja)
insert into public.configuracion (clave, valor, publica)
values ('finanzas', jsonb_build_object('saldo_inicial', 0, 'saldo_fecha', to_char(date_trunc('month', current_date), 'YYYY-MM-DD')), false)
on conflict (clave) do nothing;

select 'listo' as migracion_0010, (select count(*) from public.gastos) as gastos;
