-- =====================================================================
-- Nera Tech Store — Migración 0008: roles del equipo, historial, clientes y pedidos manuales
-- Cómo ejecutarla: Supabase → SQL Editor → New query → pegar todo → Run.
-- Requiere 0001 a 0007. Se puede correr más de una vez. No borra datos.
--
-- 1) ROLES. Cada persona del equipo es "super_admin" (ve y cambia todo) u "operador"
--    (catálogo sin precios, pedidos y clientes; nunca costos, proveedores ni ganancia).
--    El bloqueo está en la base de datos, no solo en el panel.
-- 2) HISTORIAL. Cada cambio en productos, variantes, fotos y clientes queda con quién y cuándo.
-- 3) CLIENTES. Etiquetas y notas internas; resumen de compras por cliente.
-- 4) PEDIDOS MANUALES. Canal de venta (WhatsApp, Instagram, en persona…) y quién lo creó.
-- 5) DESCUENTO sin tarjeta editable en Configuración (empieza en 6%).
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. Roles
-- ---------------------------------------------------------------------
alter table public.equipo add column if not exists rol text not null default 'operador';
alter table public.equipo drop constraint if exists equipo_rol_check;
alter table public.equipo add constraint equipo_rol_check check (rol in ('super_admin', 'operador'));

-- La primera vez: todos los que ya estaban son super admin, menos Angel (operador)
update public.equipo
set rol = 'super_admin'
where correo <> 'neratech25@gmail.com'
  and not exists (select 1 from public.equipo where rol = 'super_admin');

-- Rol de la sesión actual (null si no es del equipo)
create or replace function public.mi_rol()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select rol from public.equipo
  where correo = lower(coalesce(auth.jwt() ->> 'email', ''));
$$;
revoke all on function public.mi_rol() from public;
grant execute on function public.mi_rol() to anon, authenticated;

create or replace function public.es_super_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(public.mi_rol() = 'super_admin', false);
$$;
revoke all on function public.es_super_admin() from public;
grant execute on function public.es_super_admin() to anon, authenticated;

-- ---------------------------------------------------------------------
-- 2. Historial de cambios (quién y cuándo)
-- ---------------------------------------------------------------------
create table if not exists public.historial (
  id bigint generated always as identity primary key,
  tabla text not null,
  registro_id uuid not null,
  producto_id uuid,
  cliente_id uuid,
  accion text not null check (accion in ('creado', 'cambiado', 'borrado')),
  campos text[] not null default '{}',
  antes jsonb,
  despues jsonb,
  usuario text,
  created_at timestamptz not null default now()
);
create index if not exists historial_producto_idx on public.historial (producto_id, created_at desc);
create index if not exists historial_cliente_idx on public.historial (cliente_id, created_at desc);

create or replace function public.registrar_cambio()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  viejo jsonb := case when tg_op <> 'INSERT' then to_jsonb(old) else '{}'::jsonb end;
  nuevo jsonb := case when tg_op <> 'DELETE' then to_jsonb(new) else '{}'::jsonb end;
  fila jsonb := case when tg_op = 'DELETE' then viejo else nuevo end;
  cambiados text[];
  quien text;
begin
  select coalesce(array_agg(k order by k), '{}') into cambiados
  from (select jsonb_object_keys(viejo || nuevo) as k) x
  where k not in ('updated_at', 'created_at', 'baja_token')
    and (viejo -> k) is distinct from (nuevo -> k);
  if tg_op = 'UPDATE' and cardinality(cambiados) = 0 then
    return new;
  end if;
  quien := coalesce(
    nullif(auth.jwt() ->> 'email', ''),
    case when auth.jwt() ->> 'role' = 'service_role' then 'tienda' else 'base de datos' end
  );
  insert into public.historial (tabla, registro_id, producto_id, cliente_id, accion, campos, antes, despues, usuario)
  values (
    tg_table_name,
    (fila ->> 'id')::uuid,
    case
      when tg_table_name = 'productos' then (fila ->> 'id')::uuid
      when tg_table_name in ('variantes', 'imagenes') then (fila ->> 'producto_id')::uuid
    end,
    case when tg_table_name = 'clientes' then (fila ->> 'id')::uuid end,
    case tg_op when 'INSERT' then 'creado' when 'UPDATE' then 'cambiado' else 'borrado' end,
    case when tg_op = 'UPDATE' then cambiados else '{}' end,
    case when tg_op = 'UPDATE' then (select jsonb_object_agg(k, viejo -> k) from unnest(cambiados) k) end,
    case when tg_op = 'UPDATE' then (select jsonb_object_agg(k, nuevo -> k) from unnest(cambiados) k) end,
    quien
  );
  return case when tg_op = 'DELETE' then old else new end;
end $$;

drop trigger if exists trg_historial on public.productos;
create trigger trg_historial after insert or update or delete on public.productos
  for each row execute function public.registrar_cambio();
drop trigger if exists trg_historial on public.variantes;
create trigger trg_historial after insert or update or delete on public.variantes
  for each row execute function public.registrar_cambio();
drop trigger if exists trg_historial on public.imagenes;
create trigger trg_historial after insert or delete on public.imagenes
  for each row execute function public.registrar_cambio();
drop trigger if exists trg_historial on public.clientes;
create trigger trg_historial after insert or update on public.clientes
  for each row execute function public.registrar_cambio();

-- ---------------------------------------------------------------------
-- 3. Clientes: etiquetas, notas internas y resumen de compras
-- ---------------------------------------------------------------------
alter table public.clientes add column if not exists etiquetas text[] not null default '{}';
create index if not exists clientes_telefono_idx on public.clientes (telefono);

create table if not exists public.cliente_notas (
  id uuid primary key default gen_random_uuid(),
  cliente_id uuid not null references public.clientes(id) on delete cascade,
  nota text not null,
  usuario text,
  created_at timestamptz not null default now()
);
create index if not exists cliente_notas_idx on public.cliente_notas (cliente_id, created_at desc);

-- ---------------------------------------------------------------------
-- 4. Pedidos manuales: canal de venta y quién lo creó
-- ---------------------------------------------------------------------
alter table public.pedidos add column if not exists canal text not null default 'web';
alter table public.pedidos drop constraint if exists pedidos_canal_check;
alter table public.pedidos add constraint pedidos_canal_check
  check (canal in ('web', 'whatsapp', 'instagram', 'facebook', 'tiktok', 'llamada', 'en_persona', 'otro'));
alter table public.pedidos add column if not exists creado_por text;

-- Resumen por cliente (respeta los permisos de quien la consulta)
create or replace view public.clientes_resumen
  with (security_invoker = true) as
select
  c.id,
  c.nombre,
  c.telefono,
  c.correo,
  c.etiquetas,
  c.origen,
  c.created_at,
  c.auth_user_id is not null as con_cuenta,
  count(p.id) filter (where p.estado::text not in ('cancelado', 'devuelto')) as pedidos,
  coalesce(sum(p.total) filter (where p.estado::text not in ('cancelado', 'devuelto')), 0) as total_comprado,
  max(p.created_at) filter (where p.estado::text not in ('cancelado', 'devuelto')) as ultima_compra,
  coalesce(array_agg(distinct p.canal) filter (where p.canal is not null), '{}') as canales
from public.clientes c
left join public.pedidos p on p.cliente_id = c.id
group by c.id;
grant select on public.clientes_resumen to authenticated;

-- ---------------------------------------------------------------------
-- 5. Descuento por pagar sin tarjeta (efectivo o transferencia), editable en Configuración
-- ---------------------------------------------------------------------
insert into public.configuracion (clave, valor, publica)
values ('descuento_sin_tarjeta', '{"porcentaje": 6}'::jsonb, true)
on conflict (clave) do update set publica = true;

-- ---------------------------------------------------------------------
-- 6. Permisos por rol
-- ---------------------------------------------------------------------
-- a) Todas las tablas: solo super admin (reemplaza "cualquiera del equipo")
do $$
declare t text;
begin
  for t in select tablename from pg_tables where schemaname = 'public'
  loop
    execute format('alter table public.%I enable row level security', t);
    execute format('drop policy if exists "equipo_todo" on public.%I', t);
    execute format(
      'create policy "equipo_todo" on public.%I for all to authenticated using (public.es_super_admin()) with check (public.es_super_admin())', t
    );
  end loop;
end $$;

-- b) Lo que también puede ver el operador
do $$
declare t text;
begin
  foreach t in array array['categorias', 'colecciones', 'lineas_pedido', 'pagos', 'historial', 'equipo', 'puntos_movimientos', 'cupones']
  loop
    execute format('drop policy if exists "operador_lee" on public.%I', t);
    execute format('create policy "operador_lee" on public.%I for select to authenticated using (public.es_equipo())', t);
  end loop;
end $$;

-- c) Lo que también puede ver, crear y cambiar el operador (borrar: solo fotos, colecciones y sus notas)
do $$
declare t text;
begin
  foreach t in array array['productos', 'variantes', 'imagenes', 'coleccion_producto', 'clientes', 'direcciones', 'pedidos', 'pedido_eventos', 'cliente_notas']
  loop
    execute format('drop policy if exists "operador_lee" on public.%I', t);
    execute format('drop policy if exists "operador_crea" on public.%I', t);
    execute format('drop policy if exists "operador_cambia" on public.%I', t);
    execute format('create policy "operador_lee" on public.%I for select to authenticated using (public.es_equipo())', t);
    execute format('create policy "operador_crea" on public.%I for insert to authenticated with check (public.es_equipo())', t);
    execute format(
      'create policy "operador_cambia" on public.%I for update to authenticated using (public.es_equipo()) with check (public.es_equipo())', t
    );
  end loop;
  foreach t in array array['imagenes', 'coleccion_producto', 'cliente_notas']
  loop
    execute format('drop policy if exists "operador_borra" on public.%I', t);
    execute format('create policy "operador_borra" on public.%I for delete to authenticated using (public.es_equipo())', t);
  end loop;
end $$;

-- d) El precio de venta solo lo cambia un super admin (el operador sí cambia color, stock y si se muestra)
create or replace function public.proteger_precio()
returns trigger
language plpgsql
as $$
begin
  if coalesce(auth.jwt() ->> 'role', '') = 'authenticated' and not public.es_super_admin() then
    if tg_op = 'INSERT' and coalesce(new.precio, 0) > 0 then
      raise exception 'Solo un administrador puede poner precios.';
    end if;
    if tg_op = 'UPDATE' and new.precio is distinct from old.precio then
      raise exception 'Solo un administrador puede cambiar precios.';
    end if;
  end if;
  return new;
end $$;
drop trigger if exists trg_proteger_precio on public.variantes;
create trigger trg_proteger_precio before insert or update on public.variantes
  for each row execute function public.proteger_precio();

-- e) El costo de cada venta no se ve con la sesión del panel (ni siquiera de super admin):
--    Analítica lo lee desde el servidor después de confirmar que es super admin.
do $$
declare columnas text;
begin
  select string_agg(quote_ident(column_name), ', ' order by ordinal_position) into columnas
  from information_schema.columns
  where table_schema = 'public' and table_name = 'lineas_pedido' and column_name <> 'costo_unitario';
  execute 'revoke select on public.lineas_pedido from authenticated';
  execute format('grant select (%s) on public.lineas_pedido to authenticated', columnas);
end $$;

-- Resultado: quién es quién
select correo, nombre, rol from public.equipo order by rol desc, correo;
