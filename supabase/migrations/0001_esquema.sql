-- =====================================================================
-- Nera Tech Store — Migración 0001: esquema completo + seguridad (RLS)
-- Cómo ejecutarla: Supabase → SQL Editor → New query → pegar todo → Run.
-- Es segura de correr una sola vez en un proyecto nuevo.
-- =====================================================================

create extension if not exists "pgcrypto";

-- ---------- Función auxiliar: updated_at automático ----------
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

-- ---------- Tipos ----------
create type public.tipo_proveedor as enum ('local', 'importacion');
create type public.estado_producto as enum ('activo', 'agotado', 'oculto');
create type public.tipo_promocion as enum ('bundle', 'descuento_fecha', 'cupon', 'envio_gratis');
create type public.tipo_cupon as enum ('porcentaje', 'monto', 'envio_gratis');
create type public.estado_pedido as enum (
  'pendiente_confirmar', 'confirmado', 'pagado', 'en_camino', 'entregado', 'cancelado', 'devuelto'
);
create type public.forma_pago as enum ('contra_entrega', 'transferencia', 'wompi', 'tasa_cero');
create type public.estado_pago as enum ('pendiente', 'aprobado', 'rechazado');
create type public.origen_suscriptor as enum (
  'pedido', 'aviso_precio', 'aviso_stock', 'checklist', 'cupon', 'whatsapp'
);

-- =====================================================================
-- PROVEEDORES Y LISTAS
-- =====================================================================
create table public.proveedores (
  id uuid primary key default gen_random_uuid(),
  nombre text not null,
  tipo public.tipo_proveedor not null default 'local',
  contacto text,
  telefono text,
  correo text,
  plazo_credito_dias int not null default 0,
  transporte_lote numeric(10,2) not null default 0,
  flete_lote numeric(10,2) not null default 0,
  seguro_lote numeric(10,2) not null default 0,
  dai_pct numeric(5,2) not null default 0,
  iva_pct numeric(5,2) not null default 0,
  unidades_lote int not null default 1,
  activo boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger trg_proveedores_updated before update on public.proveedores
  for each row execute function public.set_updated_at();

create table public.listas_precios (
  id uuid primary key default gen_random_uuid(),
  proveedor_id uuid not null references public.proveedores(id) on delete cascade,
  fecha date not null default current_date,
  archivo_url text,
  nombre_archivo text,
  mapeo_columnas jsonb,
  notas text,
  created_at timestamptz not null default now()
);
create index on public.listas_precios (proveedor_id, fecha desc);

-- =====================================================================
-- CATÁLOGO
-- =====================================================================
create table public.categorias (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  nombre text not null,
  plantilla_caracteristicas jsonb not null default '[]'::jsonb,
  margen_objetivo_pct numeric(5,2) not null default 10,
  orden int not null default 0,
  created_at timestamptz not null default now()
);

create table public.productos (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  nombre text not null,
  marca text,
  modelo text,
  categoria_id uuid references public.categorias(id) on delete set null,
  descripcion text,
  caracteristicas jsonb not null default '{}'::jsonb,
  incluye text,
  garantia text,
  faq jsonb not null default '[]'::jsonb,
  estado public.estado_producto not null default 'oculto',
  orden int not null default 0,
  meta_titulo text,
  meta_descripcion text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index on public.productos (categoria_id, estado, orden);
create trigger trg_productos_updated before update on public.productos
  for each row execute function public.set_updated_at();

create table public.variantes (
  id uuid primary key default gen_random_uuid(),
  producto_id uuid not null references public.productos(id) on delete cascade,
  nombre text not null,
  memoria text,
  color text,
  sku text unique,
  stock int not null default 0 check (stock >= 0),
  precio numeric(10,2) not null default 0 check (precio >= 0),
  activo boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index on public.variantes (producto_id);
create trigger trg_variantes_updated before update on public.variantes
  for each row execute function public.set_updated_at();

create table public.imagenes (
  id uuid primary key default gen_random_uuid(),
  producto_id uuid not null references public.productos(id) on delete cascade,
  url text not null,
  alt text,
  orden int not null default 0,
  principal boolean not null default false,
  created_at timestamptz not null default now()
);
create index on public.imagenes (producto_id, orden);

-- Líneas de las listas de precios (dependen de variantes para el emparejamiento)
create table public.lineas_lista (
  id uuid primary key default gen_random_uuid(),
  lista_id uuid not null references public.listas_precios(id) on delete cascade,
  sku_proveedor text,
  descripcion text not null,
  precio numeric(10,2) not null check (precio >= 0),
  stock int,
  variante_id uuid references public.variantes(id) on delete set null,
  created_at timestamptz not null default now()
);
create index on public.lineas_lista (lista_id);
create index on public.lineas_lista (variante_id);

create table public.producto_proveedor (
  id uuid primary key default gen_random_uuid(),
  variante_id uuid not null references public.variantes(id) on delete cascade,
  proveedor_id uuid not null references public.proveedores(id) on delete cascade,
  sku_proveedor text not null,
  ultimo_precio numeric(10,2),
  ultimo_stock int,
  ultima_fecha date,
  activo boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (proveedor_id, sku_proveedor)
);
create index on public.producto_proveedor (variante_id);
create trigger trg_producto_proveedor_updated before update on public.producto_proveedor
  for each row execute function public.set_updated_at();

create table public.precios_venta (
  id uuid primary key default gen_random_uuid(),
  variante_id uuid not null references public.variantes(id) on delete cascade,
  precio numeric(10,2) not null,
  precio_anterior numeric(10,2),
  razon text,
  usuario text,
  created_at timestamptz not null default now()
);
create index on public.precios_venta (variante_id, created_at desc);

create table public.precios_observados (
  id uuid primary key default gen_random_uuid(),
  producto_id uuid not null references public.productos(id) on delete cascade,
  precio numeric(10,2) not null,
  fuente text not null,
  nuevo_sellado boolean not null default true,
  url text,
  notas text,
  fecha date not null default current_date,
  usuario text,
  created_at timestamptz not null default now()
);
create index on public.precios_observados (producto_id, fecha desc);

create table public.colecciones (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  nombre text not null,
  orden int not null default 0
);

create table public.coleccion_producto (
  coleccion_id uuid not null references public.colecciones(id) on delete cascade,
  producto_id uuid not null references public.productos(id) on delete cascade,
  orden int not null default 0,
  primary key (coleccion_id, producto_id)
);

-- =====================================================================
-- PROMOCIONES
-- =====================================================================
create table public.promociones (
  id uuid primary key default gen_random_uuid(),
  tipo public.tipo_promocion not null,
  nombre text not null,
  descripcion text,
  inicio timestamptz,
  fin timestamptz,
  config jsonb not null default '{}'::jsonb,
  activa boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger trg_promociones_updated before update on public.promociones
  for each row execute function public.set_updated_at();

create table public.bundles (
  id uuid primary key default gen_random_uuid(),
  producto_principal_id uuid not null references public.productos(id) on delete cascade,
  promocion_id uuid references public.promociones(id) on delete set null,
  nombre text not null,
  precio_bundle numeric(10,2) not null,
  activo boolean not null default true,
  created_at timestamptz not null default now()
);
create index on public.bundles (producto_principal_id);

create table public.bundle_items (
  bundle_id uuid not null references public.bundles(id) on delete cascade,
  variante_id uuid not null references public.variantes(id) on delete cascade,
  cantidad int not null default 1 check (cantidad > 0),
  primary key (bundle_id, variante_id)
);

create table public.cupones (
  id uuid primary key default gen_random_uuid(),
  codigo text not null unique,
  tipo public.tipo_cupon not null,
  valor numeric(10,2) not null default 0,
  min_pedido numeric(10,2) not null default 0,
  usos_max int,
  usos int not null default 0,
  inicio timestamptz,
  fin timestamptz,
  promocion_id uuid references public.promociones(id) on delete set null,
  activo boolean not null default true,
  created_at timestamptz not null default now()
);

-- =====================================================================
-- CLIENTES Y PEDIDOS
-- =====================================================================
create table public.clientes (
  id uuid primary key default gen_random_uuid(),
  nombre text not null,
  telefono text not null,
  correo text,
  direccion jsonb,
  auth_user_id uuid,
  origen text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index on public.clientes (telefono);
create index on public.clientes (correo);
create trigger trg_clientes_updated before update on public.clientes
  for each row execute function public.set_updated_at();

create sequence public.pedidos_numero_seq start 1001;

create table public.pedidos (
  id uuid primary key default gen_random_uuid(),
  numero int not null unique default nextval('public.pedidos_numero_seq'),
  cliente_id uuid references public.clientes(id) on delete set null,
  estado public.estado_pedido not null default 'pendiente_confirmar',
  forma_pago public.forma_pago not null,
  subtotal numeric(10,2) not null default 0,
  envio numeric(10,2) not null default 0,
  descuento numeric(10,2) not null default 0,
  total numeric(10,2) not null default 0,
  cupon_id uuid references public.cupones(id) on delete set null,
  entrega jsonb,
  origen text,
  notas text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index on public.pedidos (estado, created_at desc);
create trigger trg_pedidos_updated before update on public.pedidos
  for each row execute function public.set_updated_at();

create table public.lineas_pedido (
  id uuid primary key default gen_random_uuid(),
  pedido_id uuid not null references public.pedidos(id) on delete cascade,
  variante_id uuid references public.variantes(id) on delete set null,
  nombre text not null,
  cantidad int not null check (cantidad > 0),
  precio_unitario numeric(10,2) not null,
  bundle_id uuid references public.bundles(id) on delete set null
);
create index on public.lineas_pedido (pedido_id);

create table public.pagos (
  id uuid primary key default gen_random_uuid(),
  pedido_id uuid not null references public.pedidos(id) on delete cascade,
  metodo public.forma_pago not null,
  monto numeric(10,2) not null,
  estado public.estado_pago not null default 'pendiente',
  referencia_externa text,
  comprobante_url text,
  payload jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index on public.pagos (pedido_id);
create index on public.pagos (referencia_externa);
create trigger trg_pagos_updated before update on public.pagos
  for each row execute function public.set_updated_at();

create table public.pedido_eventos (
  id uuid primary key default gen_random_uuid(),
  pedido_id uuid not null references public.pedidos(id) on delete cascade,
  estado_anterior public.estado_pedido,
  estado_nuevo public.estado_pedido not null,
  nota text,
  usuario text,
  created_at timestamptz not null default now()
);
create index on public.pedido_eventos (pedido_id, created_at);

-- =====================================================================
-- CORREOS, ANALÍTICA Y CONFIGURACIÓN
-- =====================================================================
create table public.suscriptores (
  id uuid primary key default gen_random_uuid(),
  correo text not null,
  telefono text,
  origen public.origen_suscriptor not null,
  producto_id uuid references public.productos(id) on delete set null,
  brevo_id text,
  activo boolean not null default true,
  created_at timestamptz not null default now(),
  unique (correo, origen, producto_id)
);
create index on public.suscriptores (correo);

create table public.eventos (
  id uuid primary key default gen_random_uuid(),
  tipo text not null,
  producto_id uuid references public.productos(id) on delete set null,
  variante_id uuid references public.variantes(id) on delete set null,
  pedido_id uuid references public.pedidos(id) on delete set null,
  sesion_id text,
  origen text,
  dispositivo text,
  pagina text,
  datos jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index on public.eventos (tipo, created_at desc);
create index on public.eventos (producto_id, created_at desc);

create table public.gasto_pauta (
  id uuid primary key default gen_random_uuid(),
  semana date not null,
  canal text not null default 'meta',
  monto numeric(10,2) not null default 0,
  conversaciones int,
  created_at timestamptz not null default now(),
  unique (semana, canal)
);

create table public.configuracion (
  clave text primary key,
  valor jsonb not null,
  publica boolean not null default false,
  updated_at timestamptz not null default now()
);
create trigger trg_configuracion_updated before update on public.configuracion
  for each row execute function public.set_updated_at();

-- Vista con solo las claves públicas (la tienda la lee; el panel lee la tabla completa)
create view public.configuracion_publica
  with (security_invoker = false) as
  select clave, valor from public.configuracion where publica = true;

-- =====================================================================
-- DATOS INICIALES
-- =====================================================================
insert into public.categorias (slug, nombre, margen_objetivo_pct, orden, plantilla_caracteristicas) values
  ('celulares', 'Celulares', 10, 1,
   '["pantalla","procesador","ram","almacenamiento","camara","bateria","red"]'::jsonb),
  ('audifonos', 'Audífonos', 15, 2,
   '["autonomia","cancelacion_ruido","resistencia","conexion"]'::jsonb),
  ('cargadores', 'Cargadores y cables', 25, 3,
   '["potencia","conector","largo"]'::jsonb),
  ('proteccion', 'Protección', 25, 4,
   '["compatible_con","material"]'::jsonb),
  ('bocinas', 'Bocinas', 15, 5,
   '["potencia","autonomia","resistencia","conexion"]'::jsonb);

insert into public.colecciones (slug, nombre, orden) values
  ('mas-pedidos', 'Los más pedidos', 1),
  ('recien-llegado', 'Recién llegado', 2),
  ('quincena', 'Oferta de quincena', 3);

insert into public.configuracion (clave, valor, publica) values
  ('whatsapp', '{"numero": ""}'::jsonb, true),
  ('envio', '{"costo": 5, "gratis_desde": null, "gratis_con_accesorio": false}'::jsonb, true),
  ('municipios_contra_entrega', '["San Salvador"]'::jsonb, true),
  ('tasa_cero', '{"meses": 12, "banco": ""}'::jsonb, true),
  ('negocio', '{"nombre": "Nera Tech", "nit": "", "direccion": "", "correo": ""}'::jsonb, true),
  ('garantia_texto', '{"texto": ""}'::jsonb, true),
  ('cuentas_bancarias', '[]'::jsonb, false);

-- =====================================================================
-- SEGURIDAD (RLS)
-- anon          = visitantes del sitio: solo lectura del catálogo
-- authenticated = equipo que entra por /admin: todo
-- service_role  = el servidor de Next.js: salta RLS (pedidos, eventos, suscriptores)
-- =====================================================================
do $$
declare t text;
begin
  for t in
    select tablename from pg_tables where schemaname = 'public'
  loop
    execute format('alter table public.%I enable row level security', t);
    execute format(
      'create policy "equipo_todo" on public.%I for all to authenticated using (true) with check (true)', t
    );
  end loop;
end $$;

-- Lectura pública del catálogo
create policy "publico_lee" on public.categorias for select to anon using (true);
create policy "publico_lee" on public.productos for select to anon using (estado <> 'oculto');
create policy "publico_lee" on public.variantes for select to anon using (activo);
create policy "publico_lee" on public.imagenes for select to anon using (true);
create policy "publico_lee" on public.colecciones for select to anon using (true);
create policy "publico_lee" on public.coleccion_producto for select to anon using (true);
create policy "publico_lee" on public.promociones for select to anon
  using (activa and (inicio is null or inicio <= now()) and (fin is null or fin >= now()));
create policy "publico_lee" on public.bundles for select to anon using (activo);
create policy "publico_lee" on public.bundle_items for select to anon using (true);

-- La vista configuracion_publica corre con los permisos de su dueño (postgres),
-- así que anon puede leerla sin ver la tabla completa.
grant select on public.configuracion_publica to anon, authenticated;

-- =====================================================================
-- STORAGE: bucket público para imágenes de productos y privado para listas
-- =====================================================================
insert into storage.buckets (id, name, public) values
  ('productos', 'productos', true),
  ('listas', 'listas', false)
on conflict (id) do nothing;

create policy "publico_ve_productos" on storage.objects for select to anon
  using (bucket_id = 'productos');
create policy "equipo_sube_productos" on storage.objects for all to authenticated
  using (bucket_id in ('productos', 'listas')) with check (bucket_id in ('productos', 'listas'));
