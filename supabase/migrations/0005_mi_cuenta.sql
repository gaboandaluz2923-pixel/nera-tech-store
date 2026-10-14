-- =====================================================================
-- Nera Tech Store — Migración 0005: "Mi cuenta" del cliente
-- Cómo ejecutarla: Supabase → SQL Editor → New query → pegar todo → Run.
-- Requiere 0001 a 0004. Se puede correr más de una vez.
-- =====================================================================

-- Datos del cliente que él mismo edita en Mi cuenta
alter table public.clientes add column if not exists telefono_alterno text;
alter table public.clientes add column if not exists cumple_dia smallint check (cumple_dia between 1 and 31);
alter table public.clientes add column if not exists cumple_mes smallint check (cumple_mes between 1 and 12);
alter table public.clientes add column if not exists acepta_whatsapp boolean not null default false;
alter table public.clientes add column if not exists acepta_correo boolean not null default false;
alter table public.clientes alter column telefono drop not null;

-- Direcciones guardadas (casa, trabajo…)
create table if not exists public.direcciones (
  id uuid primary key default gen_random_uuid(),
  cliente_id uuid not null references public.clientes(id) on delete cascade,
  nombre text not null default 'Casa',
  zona text not null,
  departamento text,
  municipio text,
  direccion text not null,
  referencia text,
  principal boolean not null default false,
  created_at timestamptz not null default now()
);
create index if not exists direcciones_cliente_idx on public.direcciones (cliente_id);

-- Solo el equipo la ve desde el panel; el cliente la usa a través del servidor de la tienda
alter table public.direcciones enable row level security;
drop policy if exists "equipo_todo" on public.direcciones;
create policy "equipo_todo" on public.direcciones for all to authenticated
  using (public.es_equipo()) with check (public.es_equipo());

-- Reglas del programa de puntos y regalo de cumpleaños (se usan en la fase 4; editables luego en el panel)
insert into public.configuracion (clave, valor, publica) values
  ('puntos', '{"activo": false, "dolares_por_punto": 10, "valor_punto": 0.10, "vence_meses": 12}'::jsonb, true),
  ('regalo_cumple', '{"activo": false, "monto": 5}'::jsonb, true)
on conflict (clave) do nothing;
