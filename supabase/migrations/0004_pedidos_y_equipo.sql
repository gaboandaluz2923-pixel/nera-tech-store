-- =====================================================================
-- Nera Tech Store — Migración 0004: equipo, pedidos y factura electrónica
-- Cómo ejecutarla: Supabase → SQL Editor → New query → pegar todo → Run.
-- Requiere 0001 a 0003. Se puede correr más de una vez.
--
-- 1) SEGURIDAD. Hasta ahora cualquier usuario con sesión podía ver y cambiar todo.
--    Con el inicio de sesión con Google para clientes eso ya no sirve: desde aquí
--    solo los correos de la tabla "equipo" tienen acceso al panel y a los datos internos.
-- 2) Pedidos: enlace privado "Ver mi pedido", datos de factura, fechas de pago/entrega.
-- 3) Bucket privado "facturas" para los PDF de factura electrónica.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. Equipo
-- ---------------------------------------------------------------------
create table if not exists public.equipo (
  correo text primary key check (correo = lower(correo)),
  nombre text,
  created_at timestamptz not null default now()
);
alter table public.equipo enable row level security;

-- Los usuarios que existen hoy son del equipo (todavía no hay clientes con cuenta)
insert into public.equipo (correo)
select lower(email) from auth.users where email is not null
on conflict (correo) do nothing;

-- ¿El usuario de esta sesión es del equipo?
create or replace function public.es_equipo()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.equipo
    where correo = lower(coalesce(auth.jwt() ->> 'email', ''))
  );
$$;
revoke all on function public.es_equipo() from public;
grant execute on function public.es_equipo() to anon, authenticated;

-- Cambiar "cualquier usuario con sesión" por "solo el equipo" en todas las tablas
do $$
declare t text;
begin
  for t in select tablename from pg_tables where schemaname = 'public'
  loop
    execute format('alter table public.%I enable row level security', t);
    execute format('drop policy if exists "equipo_todo" on public.%I', t);
    execute format(
      'create policy "equipo_todo" on public.%I for all to authenticated using (public.es_equipo()) with check (public.es_equipo())', t
    );
  end loop;
end $$;

-- Archivos: solo el equipo sube y borra
drop policy if exists "equipo_sube_productos" on storage.objects;
create policy "equipo_sube_productos" on storage.objects for all to authenticated
  using (bucket_id in ('productos', 'listas', 'facturas') and public.es_equipo())
  with check (bucket_id in ('productos', 'listas', 'facturas') and public.es_equipo());

insert into storage.buckets (id, name, public) values ('facturas', 'facturas', false)
on conflict (id) do nothing;

-- ---------------------------------------------------------------------
-- 2. Pedidos
-- ---------------------------------------------------------------------
-- Enlace privado del pedido (/pedido/<token>): sirve sin cuenta
alter table public.pedidos add column if not exists token text;
update public.pedidos set token = replace(gen_random_uuid()::text || gen_random_uuid()::text, '-', '')
where token is null;
alter table public.pedidos alter column token set default replace(gen_random_uuid()::text || gen_random_uuid()::text, '-', '');
alter table public.pedidos alter column token set not null;
create unique index if not exists pedidos_token_unico on public.pedidos (token);

-- Fechas clave
alter table public.pedidos add column if not exists pagado_en timestamptz;
alter table public.pedidos add column if not exists confirmado_en timestamptz;
alter table public.pedidos add column if not exists entregado_en timestamptz;

-- Factura electrónica (DTE)
--   facturacion: {"tipo": "consumidor_final" | "credito_fiscal", "nit", "nrc", "nombre", "giro", "direccion"}
alter table public.pedidos add column if not exists facturacion jsonb not null default '{"tipo": "consumidor_final"}'::jsonb;
alter table public.pedidos add column if not exists factura_estado text not null default 'pendiente';
alter table public.pedidos drop constraint if exists pedidos_factura_estado_check;
alter table public.pedidos add constraint pedidos_factura_estado_check
  check (factura_estado in ('pendiente', 'emitida', 'no_aplica'));
alter table public.pedidos add column if not exists factura_numero text;   -- código de generación o número de control
alter table public.pedidos add column if not exists factura_archivo text;  -- ruta en el bucket "facturas"
alter table public.pedidos add column if not exists factura_emitida_en timestamptz;

create index if not exists pedidos_factura_idx on public.pedidos (factura_estado, created_at desc);

-- Clientes: un registro por correo; enlace con la cuenta de Google
create unique index if not exists clientes_correo_unico on public.clientes (lower(correo)) where correo is not null;
create index if not exists clientes_auth_idx on public.clientes (auth_user_id);

-- Cuentas para transferencia (privadas; la tienda las muestra solo en la página del pedido)
--   [{"banco": "", "tipo": "", "numero": "", "titular": ""}]
insert into public.configuracion (clave, valor, publica)
values ('cuentas_bancarias', '[]'::jsonb, false)
on conflict (clave) do nothing;

-- ---------------------------------------------------------------------
-- Revisión: quién quedó en el equipo (deben ser solo ustedes)
-- ---------------------------------------------------------------------
select correo as equipo from public.equipo order by correo;
