-- =====================================================================
-- Nera Tech Store — Migración 0006: fase 4 (ofertas, combos, cupones, Puntos Nera,
-- regalo de cumpleaños, avisos de stock y baja de publicidad)
-- Cómo ejecutarla: Supabase → SQL Editor → New query → pegar todo → Run.
-- Requiere 0001 a 0005. Se puede correr más de una vez sin dañar nada.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. Ofertas con fecha: precio de oferta por variante dentro de una promoción
--    (promociones.tipo = 'descuento_fecha', con inicio, fin y activa)
-- ---------------------------------------------------------------------
create table if not exists public.promocion_precios (
  promocion_id uuid not null references public.promociones(id) on delete cascade,
  variante_id uuid not null references public.variantes(id) on delete cascade,
  precio numeric(10,2) not null check (precio > 0),
  primary key (promocion_id, variante_id)
);
create index if not exists promocion_precios_variante_idx on public.promocion_precios (variante_id);

alter table public.promocion_precios enable row level security;
drop policy if exists "equipo_todo" on public.promocion_precios;
create policy "equipo_todo" on public.promocion_precios for all to authenticated
  using (public.es_equipo()) with check (public.es_equipo());
-- La tienda solo ve los precios de ofertas vigentes en este momento
drop policy if exists "publico_lee" on public.promocion_precios;
create policy "publico_lee" on public.promocion_precios for select to anon using (
  exists (
    select 1 from public.promociones p
    where p.id = promocion_id and p.activa
      and (p.inicio is null or p.inicio <= now())
      and (p.fin is null or p.fin >= now())
  )
);

-- Cuándo empieza la próxima oferta programada (para que la tienda se refresque a esa hora)
create or replace view public.promociones_proximas as
  select min(inicio) as proximo_inicio
  from public.promociones
  where activa and inicio > now();
grant select on public.promociones_proximas to anon, authenticated;

-- ---------------------------------------------------------------------
-- 2. Combos "Completá tu equipo": celular (cualquier variante) + accesorios = ahorro fijo
-- ---------------------------------------------------------------------
alter table public.bundles add column if not exists descuento numeric(10,2) not null default 0;
alter table public.bundles alter column precio_bundle drop not null;
comment on column public.bundles.descuento is 'Ahorro en dólares cada vez que el carrito lleva el producto principal y todos los accesorios del combo';

-- ---------------------------------------------------------------------
-- 3. Cupones: más reglas
-- ---------------------------------------------------------------------
alter table public.cupones add column if not exists descripcion text;
alter table public.cupones add column if not exists solo_accesorios boolean not null default false;
alter table public.cupones add column if not exists tope numeric(10,2);
alter table public.cupones add column if not exists por_cliente int default 1;
alter table public.cupones add column if not exists cliente_id uuid references public.clientes(id) on delete cascade;
alter table public.cupones add column if not exists origen text not null default 'panel';
create index if not exists cupones_cliente_idx on public.cupones (cliente_id);
comment on column public.cupones.tope is 'Máximo de descuento en dólares (para cupones de porcentaje)';
comment on column public.cupones.por_cliente is 'Usos por correo de cliente (vacío = sin límite)';
comment on column public.cupones.cliente_id is 'Cupón personal (por ejemplo, regalo de cumpleaños)';

-- ---------------------------------------------------------------------
-- 4. Pedidos: desglose de descuentos
--    pedidos.descuento sigue siendo el 6% por efectivo o transferencia.
-- ---------------------------------------------------------------------
alter table public.pedidos add column if not exists descuento_combos numeric(10,2) not null default 0;
alter table public.pedidos add column if not exists descuento_cupon numeric(10,2) not null default 0;
alter table public.pedidos add column if not exists puntos_usados int not null default 0;
alter table public.pedidos add column if not exists descuento_puntos numeric(10,2) not null default 0;
alter table public.pedidos add column if not exists combos jsonb not null default '[]'::jsonb;
alter table public.lineas_pedido add column if not exists precio_regular numeric(10,2);
comment on column public.lineas_pedido.precio_regular is 'Precio normal cuando la línea se vendió con precio de oferta';

-- ---------------------------------------------------------------------
-- 5. Puntos Nera: cada movimiento (ganados, canje, reintegro, anulados, ajuste)
-- ---------------------------------------------------------------------
create table if not exists public.puntos_movimientos (
  id uuid primary key default gen_random_uuid(),
  cliente_id uuid not null references public.clientes(id) on delete cascade,
  pedido_id uuid references public.pedidos(id) on delete set null,
  tipo text not null check (tipo in ('ganados', 'canje', 'reintegro', 'anulados', 'ajuste')),
  puntos int not null check (puntos <> 0),
  vence_en timestamptz,
  nota text,
  usuario text,
  created_at timestamptz not null default now()
);
create index if not exists puntos_cliente_idx on public.puntos_movimientos (cliente_id, created_at);
-- Un solo movimiento de cada tipo por pedido (evita dar o cobrar puntos dos veces)
create unique index if not exists puntos_ganados_pedido on public.puntos_movimientos (pedido_id) where tipo = 'ganados';
create unique index if not exists puntos_canje_pedido on public.puntos_movimientos (pedido_id) where tipo = 'canje';
create unique index if not exists puntos_reintegro_pedido on public.puntos_movimientos (pedido_id) where tipo = 'reintegro';
create unique index if not exists puntos_anulados_pedido on public.puntos_movimientos (pedido_id) where tipo = 'anulados';

alter table public.puntos_movimientos enable row level security;
drop policy if exists "equipo_todo" on public.puntos_movimientos;
create policy "equipo_todo" on public.puntos_movimientos for all to authenticated
  using (public.es_equipo()) with check (public.es_equipo());

-- ---------------------------------------------------------------------
-- 6. Avisos "ya hay stock": cuándo se avisó
-- ---------------------------------------------------------------------
alter table public.suscriptores add column if not exists avisado_en timestamptz;

-- ---------------------------------------------------------------------
-- 7. Publicidad: el cliente la recibe salvo que elija no recibirla (decisión de Gabriel, 14 oct 2026)
--    baja_token: enlace personal "Darme de baja" en los correos de ofertas.
--    ofertas_elegido_en: cuándo el cliente eligió (null = nunca eligió).
-- ---------------------------------------------------------------------
alter table public.clientes alter column acepta_whatsapp set default true;
alter table public.clientes alter column acepta_correo set default true;
alter table public.clientes add column if not exists baja_token uuid not null default gen_random_uuid();
alter table public.clientes add column if not exists ofertas_elegido_en timestamptz;
create unique index if not exists clientes_baja_token_idx on public.clientes (baja_token);
-- Antes la casilla venía apagada por defecto; quien nunca eligió pasa a recibir ofertas
update public.clientes
  set acepta_whatsapp = true, acepta_correo = true
  where ofertas_elegido_en is null and not (acepta_whatsapp and acepta_correo);

-- ---------------------------------------------------------------------
-- 8. Reglas de puntos y regalo de cumpleaños (se editan en Configuración)
--    Solo la primera vez: si ya se editaron, no se tocan.
-- ---------------------------------------------------------------------
insert into public.configuracion (clave, valor, publica) values
  ('puntos', '{"activo": true, "dolares_por_punto": 10, "valor_punto": 0.10, "vence_meses": 12, "minimo_canje": 0}'::jsonb, true),
  ('regalo_cumple', '{"activo": true, "monto": 5, "minimo": 20}'::jsonb, true)
on conflict (clave) do nothing;
update public.configuracion
  set valor = valor || '{"activo": true, "minimo_canje": 0}'::jsonb
  where clave = 'puntos' and not (valor ? 'minimo_canje');
update public.configuracion
  set valor = valor || '{"activo": true, "minimo": 20}'::jsonb
  where clave = 'regalo_cumple' and not (valor ? 'minimo');

notify pgrst, 'reload schema';
