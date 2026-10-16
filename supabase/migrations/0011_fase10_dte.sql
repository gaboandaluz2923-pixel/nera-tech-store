-- =====================================================================
-- Nera Tech Store — Migración 0011: facturación electrónica propia (DTE, Hacienda)
-- Cómo ejecutarla: Supabase → SQL Editor → New query → pegar todo → Run.
-- Requiere 0001 a 0010. Se puede correr más de una vez. No borra datos.
--
-- Documentos tributarios electrónicos emitidos por la tienda (Factura 01, Crédito fiscal 03, Nota de crédito 05),
-- eventos (invalidación y contingencia), números de control sin repetir y la sesión con la API de Hacienda.
-- Todo se escribe solo desde el servidor (clave de servicio): firmar y transmitir necesita el certificado.
-- El equipo puede LEER los documentos (para ver la factura de un pedido); los eventos, solo administradores.
-- =====================================================================

-- Eventos: invalidación (anular un documento) y contingencia (avisar documentos hechos sin conexión)
create table if not exists public.dte_eventos (
  id uuid primary key default gen_random_uuid(),
  ambiente text not null check (ambiente in ('00', '01')),         -- 00 pruebas, 01 producción
  tipo text not null check (tipo in ('invalidacion', 'contingencia')),
  version int not null,
  codigo_generacion text not null unique,
  json jsonb not null,
  firma text,
  estado text not null default 'pendiente' check (estado in ('pendiente', 'procesado', 'rechazado')),
  sello_recibido text,
  fh_procesamiento timestamptz,
  mensaje text,
  observaciones text[],
  respuesta jsonb,
  documento_id uuid,            -- invalidación: el documento que se anula
  reemplazo_id uuid,            -- invalidación tipo 1 o 3: el documento que lo reemplaza
  prueba boolean not null default false,
  creado_por text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.dte_documentos (
  id uuid primary key default gen_random_uuid(),
  ambiente text not null check (ambiente in ('00', '01')),
  tipo_dte text not null check (tipo_dte in ('01', '03', '05')),     -- factura, crédito fiscal, nota de crédito
  version int not null,
  codigo_generacion text not null unique,
  numero_control text not null,
  fec_emi date not null,
  hor_emi text not null,
  tipo_modelo smallint not null default 1,      -- 1 previo, 2 diferido (contingencia)
  tipo_operacion smallint not null default 1,   -- 1 normal, 2 contingencia
  pedido_id uuid references public.pedidos (id) on delete set null,
  relacionado_id uuid references public.dte_documentos (id),        -- nota de crédito → crédito fiscal
  receptor_nombre text,
  receptor_documento text,
  receptor_correo text,
  total numeric(12,2) not null,
  iva numeric(12,2) not null default 0,
  json jsonb not null,
  firma text,
  estado text not null default 'pendiente'
    check (estado in ('pendiente', 'procesado', 'rechazado', 'contingencia', 'invalidado', 'descartado')),
  sello_recibido text,
  fh_procesamiento timestamptz,
  mensaje text,
  observaciones text[],
  respuesta jsonb,
  intentos int not null default 0,
  contingencia_id uuid references public.dte_eventos (id),
  prueba boolean not null default false,        -- hecho por el botón de pruebas de Hacienda
  correo_enviado_en timestamptz,
  creado_por text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
-- El número de control no se repite en el año (por ambiente)
create unique index if not exists dte_documentos_control_idx
  on public.dte_documentos (ambiente, numero_control, (extract(year from fec_emi)));
create index if not exists dte_documentos_pedido_idx on public.dte_documentos (pedido_id);
-- Un pedido tiene una sola factura o crédito fiscal vigente por ambiente (evita emitirla dos veces)
create unique index if not exists dte_documentos_un_vigente_idx on public.dte_documentos (pedido_id, ambiente)
  where tipo_dte in ('01', '03') and estado in ('pendiente', 'procesado', 'contingencia') and pedido_id is not null and not prueba;
create index if not exists dte_documentos_estado_idx on public.dte_documentos (ambiente, estado, created_at desc);
create index if not exists dte_documentos_fecha_idx on public.dte_documentos (fec_emi desc);

do $$ begin
  alter table public.dte_eventos
    add constraint dte_eventos_documento_fk foreign key (documento_id) references public.dte_documentos (id);
exception when duplicate_object then null; end $$;
do $$ begin
  alter table public.dte_eventos
    add constraint dte_eventos_reemplazo_fk foreign key (reemplazo_id) references public.dte_documentos (id);
exception when duplicate_object then null; end $$;

drop trigger if exists trg_dte_documentos_updated on public.dte_documentos;
create trigger trg_dte_documentos_updated before update on public.dte_documentos
  for each row execute function public.set_updated_at();
drop trigger if exists trg_dte_eventos_updated on public.dte_eventos;
create trigger trg_dte_eventos_updated before update on public.dte_eventos
  for each row execute function public.set_updated_at();

-- Números de control: uno tras otro por ambiente y año, nunca se repiten. La Normativa 2.0 (regla 7.1.2) pide
-- una sola serie para todos los tipos de documento (salvo resolución de Hacienda): el servidor usa tipo_dte = 'todos'.
create table if not exists public.dte_correlativos (
  ambiente text not null,
  tipo_dte text not null,
  anio int not null,
  ultimo bigint not null default 0,
  primary key (ambiente, tipo_dte, anio)
);

create or replace function public.dte_siguiente_numero(p_ambiente text, p_tipo text, p_anio int)
returns bigint
language sql
security definer
set search_path = public
as $$
  insert into public.dte_correlativos (ambiente, tipo_dte, anio, ultimo)
  values (p_ambiente, p_tipo, p_anio, 1)
  on conflict (ambiente, tipo_dte, anio) do update set ultimo = public.dte_correlativos.ultimo + 1
  returning ultimo;
$$;
revoke all on function public.dte_siguiente_numero(text, text, int) from public, anon, authenticated;
grant execute on function public.dte_siguiente_numero(text, text, int) to service_role;

-- Sesión con la API de Hacienda (el token dura 24 h en producción y 48 h en pruebas): solo el servidor
create table if not exists public.dte_sesion (
  ambiente text primary key,
  token text not null,
  vence timestamptz not null,
  updated_at timestamptz not null default now()
);

-- Datos fiscales del cliente (crédito fiscal): NIT, NRC, actividad, dirección con códigos de Hacienda
alter table public.clientes add column if not exists datos_fiscales jsonb;

-- Seguridad
alter table public.dte_documentos enable row level security;
alter table public.dte_eventos enable row level security;
alter table public.dte_correlativos enable row level security;
alter table public.dte_sesion enable row level security;

drop policy if exists "equipo_todo" on public.dte_documentos;
drop policy if exists "equipo_lee" on public.dte_documentos;
create policy "equipo_lee" on public.dte_documentos for select to authenticated using (public.es_equipo());

drop policy if exists "equipo_todo" on public.dte_eventos;
drop policy if exists "admin_lee" on public.dte_eventos;
create policy "admin_lee" on public.dte_eventos for select to authenticated using (public.es_super_admin());

drop policy if exists "equipo_todo" on public.dte_correlativos;
drop policy if exists "admin_lee" on public.dte_correlativos;
create policy "admin_lee" on public.dte_correlativos for select to authenticated using (public.es_super_admin());

-- dte_sesion: sin políticas (nadie con sesión la lee; solo la clave de servicio)
drop policy if exists "equipo_todo" on public.dte_sesion;

-- Datos del emisor para Hacienda (se llenan en Panel → Facturación). Privado.
insert into public.configuracion (clave, valor, publica)
values ('dte', jsonb_build_object('activo', false, 'automatica', false), false)
on conflict (clave) do nothing;

select 'listo' as migracion_0011,
  (select count(*) from public.dte_documentos) as documentos,
  (select count(*) from public.dte_eventos) as eventos;
