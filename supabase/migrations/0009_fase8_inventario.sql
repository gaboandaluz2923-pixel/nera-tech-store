-- =====================================================================
-- Nera Tech Store — Migración 0009: inventario, compras al proveedor y Open Box
-- Cómo ejecutarla: Supabase → SQL Editor → New query → pegar todo → Run.
-- Requiere 0001 a 0008. Se puede correr más de una vez. No borra datos.
--
-- 1) DISPONIBILIDAD: bodega (entrega en menos de 24 h) o proveedor (recibilo en menos de 48 h).
--    Cada variante puede forzarse a "bajo pedido" o "agotado" desde el panel.
-- 2) COMPRAS al proveedor (factura, contado o crédito con vencimiento) y LOTES con su costo:
--    lo primero que entra es lo primero que sale. El stock en bodega = suma de los lotes.
-- 3) MOVIMIENTOS: compra, venta, devolución y ajuste, con quién y cuándo.
-- 4) OPEN BOX: productos de caja abierta, en su propia categoría y enlazados al modelo nuevo.
-- 5) UNIDADES con identificador: IMEI (celulares) o número de serie / código Nera (lo demás), con su
--    condición (nuevo, open box, usado). Sirve para saber si un equipo es nuestro cuando llega por garantía.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. Disponibilidad manual por variante
-- ---------------------------------------------------------------------
alter table public.variantes add column if not exists disponibilidad_manual text not null default 'auto';
alter table public.variantes drop constraint if exists variantes_disponibilidad_manual_check;
alter table public.variantes add constraint variantes_disponibilidad_manual_check
  check (disponibilidad_manual in ('auto', 'bajo_pedido', 'agotado'));

create or replace view public.disponibilidad_publica
  with (security_invoker = false) as
select
  v.id as variante_id,
  v.producto_id,
  (v.stock > 0) as en_bodega,
  case v.disponibilidad_manual
    when 'bajo_pedido' then true
    when 'agotado' then false
    else exists (
      select 1 from public.producto_proveedor pp
      where pp.variante_id = v.id
        and pp.activo
        and (pp.ultimo_stock is null or pp.ultimo_stock > 0)
    )
  end as con_proveedor
from public.variantes v
join public.productos p on p.id = v.producto_id
where v.activo and p.estado <> 'oculto';
grant select on public.disponibilidad_publica to anon, authenticated;

-- ---------------------------------------------------------------------
-- 2. Open Box
-- ---------------------------------------------------------------------
alter table public.productos add column if not exists condicion text not null default 'nuevo';
alter table public.productos drop constraint if exists productos_condicion_check;
alter table public.productos add constraint productos_condicion_check check (condicion in ('nuevo', 'open_box', 'usado'));
alter table public.productos add column if not exists producto_base_id uuid references public.productos(id) on delete set null;
alter table public.productos add column if not exists condicion_detalle text;

insert into public.categorias (slug, nombre, margen_objetivo_pct, orden, plantilla_caracteristicas)
values ('open-box', 'Open Box', 8, 0,
  '["pantalla","procesador","camara","camara_frontal","bateria","carga","red","sistema_operativo","nfc","proteccion","peso"]'::jsonb)
on conflict (slug) do nothing;

-- Qué identificador lleva cada unidad: IMEI para celulares (y su Open Box); serie o código Nera para lo demás
alter table public.categorias add column if not exists identificador text not null default 'serie';
alter table public.categorias drop constraint if exists categorias_identificador_check;
alter table public.categorias add constraint categorias_identificador_check check (identificador in ('imei', 'serie'));
update public.categorias set identificador = 'imei' where slug in ('celulares', 'open-box') and identificador <> 'imei';

-- ---------------------------------------------------------------------
-- 3. Compras, lotes y movimientos
-- ---------------------------------------------------------------------
-- NIT del proveedor: sirve para reconocerlo al subir su factura electrónica (DTE)
alter table public.proveedores add column if not exists nit text;

create table if not exists public.compras (
  id uuid primary key default gen_random_uuid(),
  proveedor_id uuid references public.proveedores(id) on delete set null,
  numero text,                -- número de control del DTE (o el número de la factura)
  codigo_generacion text,     -- código de generación del DTE (identifica la factura ante Hacienda)
  fecha date not null default current_date,
  condicion text not null default 'contado' check (condicion in ('contado', 'credito')),
  dias_credito int not null default 0 check (dias_credito between 0 and 180),
  vence_en date generated always as (fecha + dias_credito) stored,
  -- ccf = comprobante de crédito fiscal: precios sin IVA y el IVA se recupera (el costo es sin IVA)
  -- factura = consumidor final: precios con IVA incluido, no se recupera (el costo lleva IVA)
  -- sin_iva = recibo o compra en Miami sin IVA en el documento
  documento text not null default 'ccf' check (documento in ('ccf', 'factura', 'sin_iva')),
  -- flete, envío, aduana, seguro…: se reparten en el costo de cada unidad según su valor
  otros_costos numeric(12,2) not null default 0 check (otros_costos >= 0),
  subtotal numeric(12,2) not null default 0,
  iva numeric(12,2) not null default 0,
  total numeric(12,2) not null default 0,
  estado text not null default 'borrador' check (estado in ('borrador', 'recibida', 'anulada')),
  pagada_en date,
  archivo text,
  notas text,
  creado_por text,
  recibida_por text,
  recibida_en timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
-- La misma factura electrónica no se carga dos veces
create unique index if not exists compras_codigo_generacion_key on public.compras (codigo_generacion)
  where codigo_generacion is not null and estado <> 'anulada';
create index if not exists compras_vence_idx on public.compras (vence_en) where pagada_en is null and estado <> 'anulada';
drop trigger if exists trg_compras_updated on public.compras;
create trigger trg_compras_updated before update on public.compras
  for each row execute function public.set_updated_at();

create table if not exists public.compra_lineas (
  id uuid primary key default gen_random_uuid(),
  compra_id uuid not null references public.compras(id) on delete cascade,
  variante_id uuid references public.variantes(id) on delete set null,
  descripcion text not null,
  sku_proveedor text,
  cantidad int not null check (cantidad > 0),
  costo_unitario numeric(12,4) not null check (costo_unitario >= 0), -- como sale en el documento
  -- cómo vienen las unidades (se revisa al recibir) y sus identificadores:
  -- [{"identificador": "356789…", "identificador2": "356789…"}, …]
  condicion text not null default 'nuevo' check (condicion in ('nuevo', 'open_box', 'usado')),
  identificadores jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);
create index if not exists compra_lineas_compra_idx on public.compra_lineas (compra_id);

create table if not exists public.lotes (
  id uuid primary key default gen_random_uuid(),
  variante_id uuid not null references public.variantes(id) on delete cascade,
  compra_linea_id uuid references public.compra_lineas(id) on delete set null,
  origen text not null check (origen in ('compra', 'inicial', 'ajuste', 'devolucion')),
  fecha date not null default current_date,
  cantidad_inicial int not null check (cantidad_inicial > 0),
  cantidad int not null check (cantidad >= 0),
  -- lo que cuesta cada unidad para el margen (con IVA si la compra no da crédito fiscal); null = sin dato
  costo_unitario numeric(12,4),
  created_at timestamptz not null default now()
);
create index if not exists lotes_disponibles_idx on public.lotes (variante_id, fecha, created_at) where cantidad > 0;

create table if not exists public.movimientos_inventario (
  id bigint generated always as identity primary key,
  variante_id uuid not null references public.variantes(id) on delete cascade,
  lote_id uuid references public.lotes(id) on delete set null,
  tipo text not null check (tipo in ('compra', 'inicial', 'venta', 'devolucion', 'ajuste')),
  cantidad int not null, -- + entra, − sale
  costo_unitario numeric(12,4),
  pedido_id uuid references public.pedidos(id) on delete set null,
  linea_pedido_id uuid references public.lineas_pedido(id) on delete set null,
  compra_id uuid references public.compras(id) on delete set null,
  unidad_id uuid,
  nota text,
  usuario text,
  created_at timestamptz not null default now()
);
create index if not exists movimientos_variante_idx on public.movimientos_inventario (variante_id, created_at desc);
create index if not exists movimientos_pedido_idx on public.movimientos_inventario (pedido_id);

-- Cada unidad física con su identificador
create sequence if not exists public.codigo_nera_seq;
create table if not exists public.unidades (
  id uuid primary key default gen_random_uuid(),
  -- sin variante solo las del registro anterior al sistema (estado 'historial'), hasta que se reciban en bodega
  variante_id uuid references public.variantes(id) on delete cascade,
  lote_id uuid references public.lotes(id) on delete set null,
  identificador text not null unique,      -- IMEI 1, número de serie o código Nera (NT-000123)
  identificador2 text unique,              -- IMEI 2 (doble SIM)
  tipo text not null check (tipo in ('imei', 'serie', 'codigo_nera')),
  condicion text not null default 'nuevo' check (condicion in ('nuevo', 'open_box', 'usado')),
  -- historial = registrada antes del sistema (Excel de órdenes de compra): es nuestra, pero sin detalle de venta
  estado text not null default 'en_bodega' check (estado in ('en_bodega', 'vendida', 'garantia', 'baja', 'historial')),
  pedido_id uuid references public.pedidos(id) on delete set null,
  linea_pedido_id uuid references public.lineas_pedido(id) on delete set null,
  vendida_en timestamptz,
  notas text,
  descripcion text,        -- lo que decía el registro anterior ("Infinix GT50 Pro 12/256")
  proveedor_texto text,    -- proveedor según el registro anterior
  creado_por text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint unidades_variante_o_historial check (variante_id is not null or estado = 'historial')
);
create index if not exists unidades_lote_idx on public.unidades (lote_id, estado);
create index if not exists unidades_variante_idx on public.unidades (variante_id, estado);
create index if not exists unidades_pedido_idx on public.unidades (pedido_id);
drop trigger if exists trg_unidades_updated on public.unidades;
create trigger trg_unidades_updated before update on public.unidades
  for each row execute function public.set_updated_at();
drop trigger if exists trg_historial on public.unidades;
create trigger trg_historial after insert or update on public.unidades
  for each row execute function public.registrar_cambio();

-- Al confirmar, la línea guarda aparte el costo que traía del proveedor (para recalcular si cambia el equipo)
alter table public.lineas_pedido add column if not exists costo_proveedor numeric(10,2);

insert into storage.buckets (id, name, public) values ('compras', 'compras', false)
on conflict (id) do nothing;

-- (las facturas de compra se suben desde el servidor tras comprobar que es administrador)

-- Un pedido sabe si ya sacó sus unidades de bodega (para no descontarlas dos veces ni devolver de más)
alter table public.pedidos add column if not exists inventario_descontado boolean not null default false;

-- ---------------------------------------------------------------------
-- 4. Funciones de inventario
--    Las internas no se pueden llamar desde el navegador; las públicas revisan permisos adentro.
-- ---------------------------------------------------------------------
create or replace function public.inv_quien()
returns text
language sql
stable
as $$
  select coalesce(nullif(auth.jwt() ->> 'email', ''), case when auth.jwt() ->> 'role' = 'service_role' then 'tienda' else 'base de datos' end);
$$;

-- true para el servidor (clave de servicio), el SQL Editor y el equipo (o solo administradores)
create or replace function public.inv_puede(solo_admin boolean default false)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(auth.jwt() ->> 'role', '') in ('', 'service_role')
      or (case when solo_admin then public.es_super_admin() else public.es_equipo() end);
$$;

-- "356 789 012-345 678" → "356789012345678"; "sn: ab12" → "SN:AB12"
create or replace function public.inv_normalizar(p text)
returns text
language sql
immutable
as $$
  select nullif(upper(regexp_replace(coalesce(p, ''), '[\s\-./]', '', 'g')), '');
$$;

-- IMEI válido: 15 dígitos y dígito verificador (Luhn) correcto
create or replace function public.imei_valido(p text)
returns boolean
language plpgsql
immutable
as $$
declare suma int := 0; d int; i int;
begin
  if p is null or p !~ '^\d{15}$' then return false; end if;
  for i in 1..15 loop
    d := substr(p, i, 1)::int;
    if i % 2 = 0 then d := d * 2; if d > 9 then d := d - 9; end if; end if;
    suma := suma + d;
  end loop;
  return suma % 10 = 0;
end $$;

-- 'imei' o 'serie' según la categoría del producto (un Open Box usa la de su modelo nuevo)
create or replace function public.inv_tipo_identificador(p_variante uuid)
returns text
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(cb.identificador, c.identificador, 'serie')
  from public.variantes v
  join public.productos p on p.id = v.producto_id
  left join public.categorias c on c.id = p.categoria_id
  left join public.productos pb on pb.id = p.producto_base_id
  left join public.categorias cb on cb.id = pb.categoria_id
  where v.id = p_variante;
$$;

-- Nombre corto de una variante para los mensajes: "Infinix GT 50 Pro 12/256 Negro"
create or replace function public.inv_nombre_variante(p_variante uuid)
returns text
language sql
stable
security definer
set search_path = public
as $$
  select trim(p.nombre || ' ' ||
    coalesce(case when v.ram_gb is not null and v.almacenamiento_gb is not null then v.ram_gb || '/' || v.almacenamiento_gb end, '') || ' ' ||
    coalesce(v.color, ''))
  from public.variantes v join public.productos p on p.id = v.producto_id where v.id = p_variante;
$$;

-- Stock en bodega = suma de los lotes. Marca la transacción para que el trigger de sincronía no actúe.
create or replace function public.inv_recalcular(p_variante uuid)
returns int
language plpgsql
security definer
set search_path = public
as $$
declare total int;
begin
  perform set_config('nera.inventario', 'si', true);
  update public.variantes
  set stock = coalesce((select sum(cantidad) from public.lotes where variante_id = p_variante), 0)
  where id = p_variante
  returning stock into total;
  perform set_config('nera.inventario', '', true);
  return total;
end $$;

-- Registra unidades con identificador dentro de un lote.
-- p_items: [{"identificador": "...", "identificador2": "..."}]; sin identificador → código Nera (solo si no es IMEI)
create or replace function public.inv_crear_unidades(
  p_variante uuid, p_lote uuid, p_items jsonb, p_condicion text, p_cantidad int, p_nota text default null
)
returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  tipo_cat text := public.inv_tipo_identificador(p_variante);
  cond_producto text;
  nombre text := public.inv_nombre_variante(p_variante);
  it jsonb;
  i int := 0;
  id1 text;
  id2 text;
  t_id text;
  dup record;
  creadas int := 0;
begin
  select p.condicion into cond_producto from public.variantes v join public.productos p on p.id = v.producto_id where v.id = p_variante;
  if coalesce(p_condicion, 'nuevo') <> cond_producto then
    raise exception '% es un producto %; las unidades % van en su propia ficha (Open Box o usado).',
      nombre,
      case cond_producto when 'nuevo' then 'nuevo' when 'open_box' then 'Open Box' else 'usado' end,
      case p_condicion when 'nuevo' then 'nuevas' when 'open_box' then 'Open Box' else 'usadas' end;
  end if;
  if jsonb_array_length(coalesce(p_items, '[]'::jsonb)) > p_cantidad then
    raise exception 'Hay más identificadores (%) que unidades (%) para %.', jsonb_array_length(p_items), p_cantidad, nombre;
  end if;
  for i in 1..p_cantidad loop
    it := coalesce(p_items -> (i - 1), '{}'::jsonb);
    id1 := public.inv_normalizar(it ->> 'identificador');
    id2 := public.inv_normalizar(it ->> 'identificador2');
    if tipo_cat = 'imei' then
      if id1 is null then
        raise exception 'Falta el IMEI de la unidad % de % (son % en total).', i, nombre, p_cantidad;
      end if;
      if not public.imei_valido(id1) then
        raise exception 'El IMEI % de % no es válido (son 15 números; revisá si falta o sobra uno).', id1, nombre;
      end if;
      if id2 is not null and not public.imei_valido(id2) then
        raise exception 'El IMEI 2 % de % no es válido.', id2, nombre;
      end if;
      t_id := 'imei';
    elsif id1 is null then
      id1 := 'NT-' || lpad(nextval('public.codigo_nera_seq')::text, 6, '0');
      t_id := 'codigo_nera';
    else
      t_id := 'serie';
    end if;
    select u.id, u.estado, coalesce(public.inv_nombre_variante(u.variante_id), u.descripcion, 'otro producto') as prod into dup
    from public.unidades u
    where u.identificador in (id1, id2) or u.identificador2 in (id1, id2)
    limit 1;
    if found and dup.estado = 'historial' then
      -- Estaba en el registro anterior (Excel): ahora se recibe en bodega con su producto
      update public.unidades
      set variante_id = p_variante, lote_id = p_lote, identificador = id1, identificador2 = coalesce(id2, identificador2),
          tipo = t_id, condicion = coalesce(p_condicion, 'nuevo'), estado = 'en_bodega',
          notas = concat_ws(' · ', notas, p_nota), creado_por = public.inv_quien()
      where id = dup.id;
      creadas := creadas + 1;
      continue;
    elsif found then
      raise exception 'El identificador % ya está registrado (%). Revisá que no se haya digitado dos veces.', coalesce(id2, id1), dup.prod;
    end if;
    insert into public.unidades (variante_id, lote_id, identificador, identificador2, tipo, condicion, notas, creado_por)
    values (p_variante, p_lote, id1, id2, t_id, coalesce(p_condicion, 'nuevo'), p_nota, public.inv_quien());
    creadas := creadas + 1;
  end loop;
  return creadas;
end $$;

-- Entrada: crea un lote y su movimiento
create or replace function public.inv_entrada(
  p_variante uuid, p_cantidad int, p_costo numeric, p_origen text,
  p_nota text default null, p_compra_linea uuid default null, p_compra uuid default null, p_pedido uuid default null,
  p_recalcular boolean default true
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare lote uuid;
begin
  if p_cantidad is null or p_cantidad <= 0 then raise exception 'La cantidad debe ser mayor que cero.'; end if;
  insert into public.lotes (variante_id, compra_linea_id, origen, cantidad_inicial, cantidad, costo_unitario)
  values (p_variante, p_compra_linea, p_origen, p_cantidad, p_cantidad, p_costo)
  returning id into lote;
  insert into public.movimientos_inventario (variante_id, lote_id, tipo, cantidad, costo_unitario, compra_id, pedido_id, nota, usuario)
  values (p_variante, lote, p_origen, p_cantidad, p_costo, p_compra, p_pedido, p_nota, public.inv_quien());
  if p_recalcular then perform public.inv_recalcular(p_variante); end if;
  return lote;
end $$;

-- Salida: descuenta de los lotes más viejos primero (FIFO).
-- En una venta, las unidades con identificador de ese lote quedan "vendidas" al pedido (las más viejas primero);
-- en un ajuste quedan "de baja". Devuelve {salidas, con_costo, costo_total}.
create or replace function public.inv_salida(
  p_variante uuid, p_cantidad int, p_tipo text, p_pedido uuid default null, p_nota text default null,
  p_recalcular boolean default true, p_linea uuid default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  l record;
  resta int := p_cantidad;
  toma int;
  salidas int := 0;
  costo_total numeric := 0;
  con_costo int := 0;
begin
  for l in
    select * from public.lotes where variante_id = p_variante and cantidad > 0 order by fecha, created_at for update
  loop
    exit when resta <= 0;
    toma := least(l.cantidad, resta);
    update public.lotes set cantidad = cantidad - toma where id = l.id;
    insert into public.movimientos_inventario (variante_id, lote_id, tipo, cantidad, costo_unitario, pedido_id, linea_pedido_id, nota, usuario)
    values (p_variante, l.id, p_tipo, -toma, l.costo_unitario, p_pedido, p_linea, p_nota, public.inv_quien());
    if p_tipo = 'venta' then
      update public.unidades set estado = 'vendida', pedido_id = p_pedido, linea_pedido_id = p_linea, vendida_en = now()
      where id in (select id from public.unidades where lote_id = l.id and estado = 'en_bodega' order by created_at limit toma);
    else
      -- solo las que sobran: si el lote queda con menos unidades que identificadores en bodega
      update public.unidades set estado = 'baja', notas = concat_ws(' · ', notas, coalesce(p_nota, 'Ajuste'))
      where id in (
        select id from public.unidades where lote_id = l.id and estado = 'en_bodega' order by created_at desc
        limit greatest(0, (select count(*) from public.unidades where lote_id = l.id and estado = 'en_bodega') - (l.cantidad - toma))
      );
    end if;
    resta := resta - toma;
    salidas := salidas + toma;
    if l.costo_unitario is not null then
      costo_total := costo_total + toma * l.costo_unitario;
      con_costo := con_costo + toma;
    end if;
  end loop;
  if p_recalcular then perform public.inv_recalcular(p_variante); end if;
  return jsonb_build_object('salidas', salidas, 'con_costo', con_costo, 'costo_total', costo_total);
end $$;

-- Deja los lotes de una variante sumando `p_total` (entra o sale la diferencia como ajuste)
create or replace function public.inv_lotes_a(p_variante uuid, p_total int, p_nota text, p_costo numeric, p_recalcular boolean)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare actual int; costo numeric := p_costo; origen text := 'ajuste';
begin
  select coalesce(sum(cantidad), 0) into actual from public.lotes where variante_id = p_variante;
  if p_total > actual then
    if costo is null then
      select costo_unitario into costo from public.lotes
      where variante_id = p_variante and costo_unitario is not null order by created_at desc limit 1;
    end if;
    if not exists (select 1 from public.lotes where variante_id = p_variante) then origen := 'inicial'; end if;
    perform public.inv_entrada(p_variante, p_total - actual, costo, origen, p_nota, null, null, null, p_recalcular);
  elsif p_total < actual then
    perform public.inv_salida(p_variante, actual - p_total, 'ajuste', null, p_nota, p_recalcular);
  end if;
end $$;

-- Ajuste por conteo físico (Catálogo → variante → Editar): deja la variante con `p_total` en bodega.
-- El costo de lo que entra lo indica un administrador; si no, se usa el del último lote.
create or replace function public.inv_ajustar(p_variante uuid, p_total int, p_nota text default null, p_costo numeric default null)
returns int
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.inv_puede(false) then raise exception 'Sin permiso para cambiar el inventario.'; end if;
  if p_total is null or p_total < 0 then raise exception 'El stock no puede ser negativo.'; end if;
  perform public.inv_lotes_a(p_variante, p_total, coalesce(nullif(p_nota, ''), 'Ajuste de inventario'),
    case when public.inv_puede(true) then p_costo end, true);
  return (select stock from public.variantes where id = p_variante);
end $$;

-- Si alguien cambia variantes.stock directo (SQL o código viejo), los lotes se ponen al día solos
create or replace function public.inv_sincronizar_stock()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if coalesce(current_setting('nera.inventario', true), '') = 'si' then return new; end if;
  if tg_op = 'INSERT' and coalesce(new.stock, 0) > 0 then
    perform public.inv_lotes_a(new.id, new.stock, 'Stock al crear la variante', null, false);
  elsif tg_op = 'UPDATE' and new.stock is distinct from old.stock then
    perform public.inv_lotes_a(new.id, greatest(coalesce(new.stock, 0), 0), 'Cambio directo del stock', null, false);
  end if;
  return new;
end $$;
drop trigger if exists trg_inv_sincronizar on public.variantes;
create trigger trg_inv_sincronizar after insert or update of stock on public.variantes
  for each row execute function public.inv_sincronizar_stock();

-- Costo de una línea de pedido: lo que salió de bodega a su costo real + lo demás al costo del proveedor
create or replace function public.inv_costo_linea(p_linea uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare l record; total numeric; n int; base numeric;
begin
  select * into l from public.lineas_pedido where id = p_linea;
  select coalesce(sum(-cantidad * costo_unitario), 0), coalesce(sum(-cantidad) filter (where costo_unitario is not null), 0)
  into total, n
  from public.movimientos_inventario where linea_pedido_id = p_linea and tipo in ('venta', 'devolucion');
  if n <= 0 then
    update public.lineas_pedido set costo_unitario = costo_proveedor where id = p_linea and costo_proveedor is not null;
    return;
  end if;
  base := coalesce(l.costo_proveedor, total / n);
  update public.lineas_pedido
  set costo_unitario = round((total + base * greatest(l.cantidad - n, 0)) / l.cantidad, 2)
  where id = p_linea;
end $$;

-- Al confirmar un pedido: sale de bodega lo que haya (lo más viejo primero), con sus IMEI,
-- y cada línea guarda su costo real.
create or replace function public.inv_confirmar_pedido(p_pedido uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare ped record; l record;
begin
  if not public.inv_puede(false) then raise exception 'Sin permiso para cambiar el inventario.'; end if;
  select id, numero, inventario_descontado into ped from public.pedidos where id = p_pedido for update;
  if ped.id is null or ped.inventario_descontado then return; end if;
  for l in select * from public.lineas_pedido where pedido_id = p_pedido and variante_id is not null order by id loop
    update public.lineas_pedido set costo_proveedor = coalesce(costo_proveedor, costo_unitario) where id = l.id;
    perform public.inv_salida(l.variante_id, l.cantidad, 'venta', p_pedido, 'Pedido #' || ped.numero, true, l.id);
    perform public.inv_costo_linea(l.id);
  end loop;
  update public.pedidos set inventario_descontado = true where id = p_pedido;
end $$;

-- Al cancelar, devolver o regresar a "por confirmar": lo que salió de bodega vuelve a su mismo lote
-- (con su costo y su fecha) y las unidades vuelven a "en bodega".
create or replace function public.inv_devolver_pedido(p_pedido uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare ped record; m record;
begin
  if not public.inv_puede(false) then raise exception 'Sin permiso para cambiar el inventario.'; end if;
  select id, numero, inventario_descontado into ped from public.pedidos where id = p_pedido for update;
  if ped.id is null or not ped.inventario_descontado then return; end if;
  for m in
    select mv.variante_id, mv.lote_id, mv.linea_pedido_id, mv.costo_unitario, -sum(mv.cantidad)::int as unidades
    from public.movimientos_inventario mv
    where mv.pedido_id = p_pedido and mv.tipo in ('venta', 'devolucion')
    group by mv.variante_id, mv.lote_id, mv.linea_pedido_id, mv.costo_unitario
    having sum(mv.cantidad) < 0
  loop
    if m.lote_id is not null and exists (select 1 from public.lotes where id = m.lote_id) then
      update public.lotes set cantidad = least(cantidad_inicial, cantidad + m.unidades) where id = m.lote_id;
      insert into public.movimientos_inventario (variante_id, lote_id, tipo, cantidad, costo_unitario, pedido_id, linea_pedido_id, nota, usuario)
      values (m.variante_id, m.lote_id, 'devolucion', m.unidades, m.costo_unitario, p_pedido, m.linea_pedido_id,
        'Vuelve del pedido #' || ped.numero, public.inv_quien());
      perform public.inv_recalcular(m.variante_id);
    else
      perform public.inv_entrada(m.variante_id, m.unidades, m.costo_unitario, 'devolucion',
        'Vuelve del pedido #' || ped.numero, null, null, p_pedido);
    end if;
  end loop;
  update public.unidades
  set estado = 'en_bodega', pedido_id = null, linea_pedido_id = null, vendida_en = null,
      notas = concat_ws(' · ', notas, 'Volvió del pedido #' || ped.numero || ' el ' || to_char(now() at time zone 'America/El_Salvador', 'DD/MM/YYYY'))
  where pedido_id = p_pedido and estado = 'vendida';
  update public.pedidos set inventario_descontado = false where id = p_pedido;
end $$;

-- Asignar a una línea de pedido el equipo que realmente sale (por IMEI o serie).
-- p_quitar: la unidad que el sistema había apartado y se reemplaza (null si la línea no tenía).
create or replace function public.inv_asignar_unidad(p_linea uuid, p_identificador text, p_quitar uuid default null)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  l record;
  ped record;
  u record;
  q record;
  ident text := public.inv_normalizar(p_identificador);
  lote_libre uuid;
  lote_costo numeric;
begin
  if not public.inv_puede(false) then raise exception 'Sin permiso para cambiar el inventario.'; end if;
  select * into l from public.lineas_pedido where id = p_linea;
  if l.id is null then raise exception 'No se encontró la línea del pedido.'; end if;
  select id, numero, inventario_descontado, estado into ped from public.pedidos where id = l.pedido_id for update;
  if ped.estado in ('pendiente_confirmar', 'cancelado', 'devuelto') or not ped.inventario_descontado then
    raise exception 'Primero confirmá el pedido; al confirmarlo se apartan los equipos de bodega.';
  end if;
  select * into u from public.unidades where identificador = ident or identificador2 = ident;
  if u.id is null then
    raise exception 'El identificador % no está registrado en bodega. Registralo primero en Inventario.', ident;
  end if;
  if u.variante_id <> l.variante_id then
    raise exception 'El identificador % es de %, no de %.', ident, public.inv_nombre_variante(u.variante_id), public.inv_nombre_variante(l.variante_id);
  end if;
  if u.estado = 'vendida' and u.linea_pedido_id = p_linea then
    return jsonb_build_object('ok', true, 'mensaje', 'Ese equipo ya está en este pedido.');
  end if;
  if u.estado <> 'en_bodega' then
    raise exception 'El identificador % no está en bodega (está %).', ident,
      case u.estado when 'vendida' then 'vendido' when 'garantia' then 'en garantía' else 'de baja' end;
  end if;

  if p_quitar is not null then
    select * into q from public.unidades where id = p_quitar and linea_pedido_id = p_linea and estado = 'vendida';
    if q.id is null then raise exception 'La unidad a reemplazar no es de este pedido.'; end if;
    lote_libre := q.lote_id;
  else
    if (select count(*) from public.unidades where linea_pedido_id = p_linea and estado = 'vendida') >= l.cantidad then
      raise exception 'Esta línea ya tiene sus % equipos; usá "Cambiar" en el que querés reemplazar.', l.cantidad;
    end if;
    -- ¿Salió de bodega una unidad sin identificar de esta línea? Esa es la que se reemplaza.
    select mv.lote_id into lote_libre
    from public.movimientos_inventario mv
    where mv.linea_pedido_id = p_linea and mv.tipo in ('venta', 'devolucion') and mv.lote_id is not null
    group by mv.lote_id
    having -sum(mv.cantidad) > (select count(*) from public.unidades x where x.linea_pedido_id = p_linea and x.estado = 'vendida' and x.lote_id = mv.lote_id)
    limit 1;
  end if;

  if lote_libre is distinct from u.lote_id then
    -- vuelve a bodega lo que había salido (si había) y sale el lote del equipo elegido
    if lote_libre is not null then
      select costo_unitario into lote_costo from public.lotes where id = lote_libre;
      update public.lotes set cantidad = least(cantidad_inicial, cantidad + 1) where id = lote_libre;
      insert into public.movimientos_inventario (variante_id, lote_id, tipo, cantidad, costo_unitario, pedido_id, linea_pedido_id, nota, usuario)
      values (l.variante_id, lote_libre, 'devolucion', 1, lote_costo, ped.id, p_linea, 'Cambio de equipo en pedido #' || ped.numero, public.inv_quien());
    end if;
    if u.lote_id is not null then
      select costo_unitario into lote_costo from public.lotes where id = u.lote_id;
      update public.lotes set cantidad = greatest(cantidad - 1, 0) where id = u.lote_id;
      insert into public.movimientos_inventario (variante_id, lote_id, tipo, cantidad, costo_unitario, pedido_id, linea_pedido_id, unidad_id, nota, usuario)
      values (l.variante_id, u.lote_id, 'venta', -1, lote_costo, ped.id, p_linea, u.id, 'Pedido #' || ped.numero, public.inv_quien());
    end if;
    perform public.inv_recalcular(l.variante_id);
  end if;

  if q.id is not null then
    update public.unidades set estado = 'en_bodega', pedido_id = null, linea_pedido_id = null, vendida_en = null where id = q.id;
  end if;
  update public.unidades set estado = 'vendida', pedido_id = ped.id, linea_pedido_id = p_linea, vendida_en = now() where id = u.id;
  perform public.inv_costo_linea(p_linea);
  return jsonb_build_object('ok', true, 'mensaje', 'Equipo ' || u.identificador || ' asignado al pedido #' || ped.numero);
end $$;

-- Registrar identificadores del stock que ya estaba en bodega sin ellos (se reparten en los lotes más viejos)
create or replace function public.inv_registrar_unidades(p_variante uuid, p_items jsonb, p_condicion text default null)
returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  l record;
  libres int;
  pendientes jsonb := coalesce(p_items, '[]'::jsonb);
  toma int;
  total int := 0;
  cond text;
begin
  if not public.inv_puede(false) then raise exception 'Sin permiso para cambiar el inventario.'; end if;
  select coalesce(p_condicion, p.condicion) into cond from public.variantes v join public.productos p on p.id = v.producto_id where v.id = p_variante;
  for l in select * from public.lotes where variante_id = p_variante and cantidad > 0 order by fecha, created_at loop
    exit when jsonb_array_length(pendientes) = 0;
    libres := l.cantidad - (select count(*) from public.unidades where lote_id = l.id and estado = 'en_bodega');
    continue when libres <= 0;
    toma := least(libres, jsonb_array_length(pendientes));
    total := total + public.inv_crear_unidades(p_variante, l.id,
      (select coalesce(jsonb_agg(e order by n), '[]'::jsonb) from jsonb_array_elements(pendientes) with ordinality as t(e, n) where n <= toma),
      cond, toma, 'Registrada en bodega');
    pendientes := (select coalesce(jsonb_agg(e order by n), '[]'::jsonb) from jsonb_array_elements(pendientes) with ordinality as t(e, n) where n > toma);
  end loop;
  if jsonb_array_length(pendientes) > 0 then
    raise exception 'Hay % identificadores de más: en bodega solo hay % unidades sin registrar de %.',
      jsonb_array_length(pendientes), total, public.inv_nombre_variante(p_variante);
  end if;
  return total;
end $$;

-- Mover una unidad en bodega a otra variante (por ejemplo, un equipo devuelto y abierto pasa a su ficha Open Box).
-- Conserva su costo.
create or replace function public.inv_mover_unidad(p_unidad uuid, p_variante_destino uuid, p_condicion text, p_nota text default null)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare u record; costo numeric; cond_destino text; lote uuid;
begin
  if not public.inv_puede(true) then raise exception 'Solo un administrador puede mover unidades entre productos.'; end if;
  select * into u from public.unidades where id = p_unidad for update;
  if u.id is null or u.estado <> 'en_bodega' then raise exception 'La unidad no está en bodega.'; end if;
  select p.condicion into cond_destino from public.variantes v join public.productos p on p.id = v.producto_id where v.id = p_variante_destino;
  if cond_destino is distinct from p_condicion then
    raise exception 'La condición de la unidad no coincide con el producto de destino.';
  end if;
  select costo_unitario into costo from public.lotes where id = u.lote_id;
  if u.lote_id is not null then
    update public.lotes set cantidad = greatest(cantidad - 1, 0) where id = u.lote_id;
    insert into public.movimientos_inventario (variante_id, lote_id, tipo, cantidad, costo_unitario, unidad_id, nota, usuario)
    values (u.variante_id, u.lote_id, 'ajuste', -1, costo, u.id,
      'Pasa a ' || public.inv_nombre_variante(p_variante_destino) || coalesce(' · ' || nullif(p_nota, ''), ''), public.inv_quien());
    perform public.inv_recalcular(u.variante_id);
  end if;
  lote := public.inv_entrada(p_variante_destino, 1, costo, 'ajuste',
    'Viene de ' || public.inv_nombre_variante(u.variante_id) || coalesce(' · ' || nullif(p_nota, ''), ''));
  update public.unidades set variante_id = p_variante_destino, lote_id = lote, condicion = p_condicion,
    notas = concat_ws(' · ', notas, nullif(p_nota, ''))
  where id = u.id;
  return lote;
end $$;

-- Garantía: un equipo vendido entra a revisión, sale de revisión, o una unidad en bodega se da de baja
create or replace function public.inv_estado_unidad(p_unidad uuid, p_estado text, p_nota text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare u record; f text := to_char(now() at time zone 'America/El_Salvador', 'DD/MM/YYYY');
begin
  if not public.inv_puede(false) then raise exception 'Sin permiso para cambiar el inventario.'; end if;
  select * into u from public.unidades where id = p_unidad for update;
  if u.id is null then raise exception 'No se encontró la unidad.'; end if;
  if p_estado = 'garantia' and u.estado = 'vendida' then
    update public.unidades set estado = 'garantia', notas = concat_ws(' · ', notas, f || ' entra a garantía: ' || coalesce(p_nota, '')) where id = u.id;
  elsif p_estado = 'vendida' and u.estado = 'garantia' then
    update public.unidades set estado = 'vendida', notas = concat_ws(' · ', notas, f || ' sale de garantía: ' || coalesce(p_nota, '')) where id = u.id;
  elsif p_estado = 'baja' and u.estado = 'en_bodega' then
    if not public.inv_puede(true) then raise exception 'Solo un administrador puede dar de baja una unidad.'; end if;
    if u.lote_id is not null then
      update public.lotes set cantidad = greatest(cantidad - 1, 0) where id = u.lote_id;
      insert into public.movimientos_inventario (variante_id, lote_id, tipo, cantidad, costo_unitario, unidad_id, nota, usuario)
      values (u.variante_id, u.lote_id, 'ajuste', -1, (select costo_unitario from public.lotes where id = u.lote_id), u.id,
        'Baja de ' || u.identificador || coalesce(': ' || nullif(p_nota, ''), ''), public.inv_quien());
      perform public.inv_recalcular(u.variante_id);
    end if;
    update public.unidades set estado = 'baja', notas = concat_ws(' · ', notas, f || ' baja: ' || coalesce(p_nota, '')) where id = u.id;
  else
    raise exception 'Ese cambio no se puede hacer.';
  end if;
end $$;

-- Buscar un equipo por IMEI o serie (pantalla de garantía, también para el operador; sin costos)
create or replace function public.inv_buscar_unidad(p_texto text)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  ident text := public.inv_normalizar(p_texto);
  res jsonb;
  meses int;
begin
  if not public.inv_puede(false) then raise exception 'Sin permiso.'; end if;
  if ident is null or length(ident) < 4 then return '[]'::jsonb; end if;
  select coalesce((valor ->> 'plazo_meses')::int, 12) into meses from public.configuracion where clave = 'garantia_texto';
  select coalesce(jsonb_agg(x order by x ->> 'identificador'), '[]'::jsonb) into res from (
    select jsonb_build_object(
      'id', u.id,
      'identificador', u.identificador,
      'identificador2', u.identificador2,
      'tipo', u.tipo,
      'condicion', u.condicion,
      'estado', u.estado,
      'notas', u.notas,
      'producto', coalesce(public.inv_nombre_variante(u.variante_id), u.descripcion),
      'producto_id', v.producto_id,
      'registrada_en', u.created_at,
      'registrada_por', u.creado_por,
      'compra_numero', c.numero,
      'compra_fecha', coalesce(c.fecha, lo.fecha),
      'proveedor', coalesce(pr.nombre, u.proveedor_texto),
      'pedido_id', pe.id,
      'pedido_numero', pe.numero,
      'pedido_estado', pe.estado,
      'cliente_id', pe.cliente_id,
      'cliente', cl.nombre,
      'cliente_telefono', cl.telefono,
      'vendida_en', coalesce(pe.entregado_en, u.vendida_en),
      'garantia_hasta', ((coalesce(pe.entregado_en, u.vendida_en) at time zone 'America/El_Salvador')::date + make_interval(months => coalesce(meses, 12)))::date
    ) as x
    from public.unidades u
    left join public.variantes v on v.id = u.variante_id
    left join public.lotes lo on lo.id = u.lote_id
    left join public.compra_lineas cli on cli.id = lo.compra_linea_id
    left join public.compras c on c.id = cli.compra_id
    left join public.proveedores pr on pr.id = c.proveedor_id
    left join public.pedidos pe on pe.id = u.pedido_id
    left join public.clientes cl on cl.id = pe.cliente_id
    where u.identificador = ident or u.identificador2 = ident
       or (length(ident) >= 6 and (u.identificador like '%' || ident || '%' or u.identificador2 like '%' || ident || '%'))
    limit 20
  ) t;
  return res;
end $$;

-- Recibir una compra: cada línea entra como lote con su costo y sus unidades con identificador.
-- El costo es el de la línea como sale en el documento (en factura de consumidor final ya trae el IVA, que no
-- se recupera) más su parte de los otros costos (flete, aduana…), repartidos según el valor de cada línea.
create or replace function public.inv_recibir_compra(p_compra uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare c record; l record; lote uuid; base numeric; factor numeric := 1;
begin
  if not public.inv_puede(true) then raise exception 'Solo un administrador puede recibir compras.'; end if;
  select * into c from public.compras where id = p_compra for update;
  if c.id is null then raise exception 'No se encontró la compra.'; end if;
  if c.estado <> 'borrador' then raise exception 'Esta compra ya fue recibida o anulada.'; end if;
  if not exists (select 1 from public.compra_lineas where compra_id = p_compra) then
    raise exception 'La compra no tiene productos.';
  end if;
  if exists (select 1 from public.compra_lineas where compra_id = p_compra and variante_id is null) then
    raise exception 'Hay líneas sin producto del catálogo. Elegí el producto de cada línea antes de recibir.';
  end if;
  select sum(cantidad * costo_unitario) into base from public.compra_lineas where compra_id = p_compra;
  if coalesce(base, 0) > 0 and c.otros_costos > 0 then factor := 1 + c.otros_costos / base; end if;
  for l in select * from public.compra_lineas where compra_id = p_compra order by created_at, id loop
    lote := public.inv_entrada(l.variante_id, l.cantidad, round(l.costo_unitario * factor, 4),
      'compra', 'Compra ' || coalesce(nullif(c.numero, ''), 'sin número'), l.id, p_compra);
    perform public.inv_crear_unidades(l.variante_id, lote, l.identificadores, l.condicion, l.cantidad,
      'Compra ' || coalesce(nullif(c.numero, ''), 'sin número'));
  end loop;
  update public.compras set estado = 'recibida', recibida_por = public.inv_quien(), recibida_en = now() where id = p_compra;
end $$;

-- Anular una compra recibida: salen de bodega sus unidades (si ninguna se vendió)
create or replace function public.inv_anular_compra(p_compra uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare c record; l record;
begin
  if not public.inv_puede(true) then raise exception 'Solo un administrador puede anular compras.'; end if;
  select * into c from public.compras where id = p_compra for update;
  if c.id is null then raise exception 'No se encontró la compra.'; end if;
  if c.estado = 'anulada' then return; end if;
  if c.estado = 'recibida' then
    if exists (
      select 1 from public.lotes lo join public.compra_lineas cl on cl.id = lo.compra_linea_id
      where cl.compra_id = p_compra and lo.cantidad < lo.cantidad_inicial
    ) or exists (
      select 1 from public.unidades u join public.lotes lo on lo.id = u.lote_id join public.compra_lineas cl on cl.id = lo.compra_linea_id
      where cl.compra_id = p_compra and u.estado <> 'en_bodega'
    ) then
      raise exception 'Ya salieron unidades de esta compra; no se puede anular. Hacé un ajuste de inventario.';
    end if;
    for l in
      select lo.* from public.lotes lo join public.compra_lineas cl on cl.id = lo.compra_linea_id where cl.compra_id = p_compra
    loop
      update public.lotes set cantidad = 0 where id = l.id;
      insert into public.movimientos_inventario (variante_id, lote_id, tipo, cantidad, costo_unitario, compra_id, nota, usuario)
      values (l.variante_id, l.id, 'ajuste', -l.cantidad, l.costo_unitario, p_compra,
        'Compra ' || coalesce(nullif(c.numero, ''), 'sin número') || ' anulada', public.inv_quien());
      -- los identificadores se liberan para poder recibirlos otra vez bien
      delete from public.unidades where lote_id = l.id and estado = 'en_bodega';
      perform public.inv_recalcular(l.variante_id);
    end loop;
  end if;
  update public.compras set estado = 'anulada' where id = p_compra;
end $$;

-- Permisos de ejecución
do $$
declare f text;
begin
  -- internas: solo el servidor
  foreach f in array array[
    'inv_entrada(uuid, int, numeric, text, text, uuid, uuid, uuid, boolean)',
    'inv_salida(uuid, int, text, uuid, text, boolean, uuid)',
    'inv_recalcular(uuid)',
    'inv_lotes_a(uuid, int, text, numeric, boolean)',
    'inv_sincronizar_stock()',
    'inv_costo_linea(uuid)',
    'inv_crear_unidades(uuid, uuid, jsonb, text, int, text)',
    'inv_tipo_identificador(uuid)',
    'inv_nombre_variante(uuid)'
  ] loop
    execute format('revoke all on function public.%s from public, anon, authenticated', f);
    execute format('grant execute on function public.%s to service_role', f);
  end loop;
  -- públicas: el equipo (cada una revisa si hace falta ser administrador)
  foreach f in array array[
    'inv_ajustar(uuid, int, text, numeric)',
    'inv_confirmar_pedido(uuid)',
    'inv_devolver_pedido(uuid)',
    'inv_asignar_unidad(uuid, text, uuid)',
    'inv_registrar_unidades(uuid, jsonb, text)',
    'inv_mover_unidad(uuid, uuid, text, text)',
    'inv_estado_unidad(uuid, text, text)',
    'inv_buscar_unidad(text)',
    'inv_recibir_compra(uuid)',
    'inv_anular_compra(uuid)'
  ] loop
    execute format('revoke all on function public.%s from public, anon', f);
    execute format('grant execute on function public.%s to authenticated, service_role', f);
  end loop;
end $$;
-- se borró una versión de prueba con otra firma (si existía)
drop function if exists public.inv_salida(uuid, int, text, uuid, text, boolean);

-- Lo que ya estaba en bodega queda como lote inicial (sin costo ni identificadores: se completan en Inventario)
do $$
declare v record;
begin
  for v in
    select x.id, x.stock from public.variantes x
    where x.stock > 0 and not exists (select 1 from public.lotes where variante_id = x.id)
  loop
    perform public.inv_entrada(v.id, v.stock, null, 'inicial', 'Stock que ya estaba en el catálogo', null, null, null, false);
  end loop;
end $$;

-- ---------------------------------------------------------------------
-- 5. Permisos de las tablas
--    compras, lotes y movimientos tienen costos → solo administradores.
--    unidades (sin costos): el operador las ve para garantía y entregas; los cambios pasan por las funciones.
-- ---------------------------------------------------------------------
do $$
declare t text;
begin
  foreach t in array array['compras', 'compra_lineas', 'lotes', 'movimientos_inventario', 'unidades']
  loop
    execute format('alter table public.%I enable row level security', t);
    execute format('drop policy if exists "equipo_todo" on public.%I', t);
    execute format(
      'create policy "equipo_todo" on public.%I for all to authenticated using (public.es_super_admin()) with check (public.es_super_admin())', t
    );
  end loop;
end $$;
drop policy if exists "operador_ve" on public.unidades;
create policy "operador_ve" on public.unidades for select to authenticated using (public.es_equipo());

select 'listo' as migracion_0009,
  (select count(*) from public.lotes) as lotes,
  (select coalesce(sum(cantidad), 0) from public.lotes) as unidades_en_bodega,
  (select count(*) from public.categorias where slug = 'open-box') as categoria_open_box;
