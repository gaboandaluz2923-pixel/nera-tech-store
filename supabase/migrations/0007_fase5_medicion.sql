-- =====================================================================
-- Nera Tech Store — Migración 0007: fase 5 (medición y precios de mercado)
-- Cómo ejecutarla: Supabase → SQL Editor → New query → pegar todo → Run.
-- Requiere 0001 a 0006. Se puede correr más de una vez.
-- =====================================================================

-- De dónde vino cada pedido (origen de la visita y cookies de Meta) para unir la compra con el anuncio
alter table public.pedidos add column if not exists atribucion jsonb not null default '{}'::jsonb;
-- Cuándo se le avisó a Meta (API de conversiones) que la compra quedó pagada: una sola vez
alter table public.pedidos add column if not exists meta_enviado_en timestamptz;

-- Costo puesto de cada línea al momento de vender (para la contribución real de cada semana)
alter table public.lineas_pedido add column if not exists costo_unitario numeric(10,2);

-- Eventos: consultas del panel de Analítica por fecha y por sesión
create index if not exists eventos_fecha_idx on public.eventos (created_at desc);
create index if not exists eventos_sesion_idx on public.eventos (sesion_id, created_at);

-- Gasto de pauta: nota opcional (ej. "campaña A17")
alter table public.gasto_pauta add column if not exists notas text;

-- Precios observados (se anotan a mano en Precios): memoria del equipo visto
alter table public.precios_observados add column if not exists ram_gb smallint;
alter table public.precios_observados add column if not exists almacenamiento_gb int;

-- Precios observados: un índice para buscar los recientes por producto
create index if not exists precios_observados_producto_idx on public.precios_observados (producto_id, fecha desc);

-- Solo el equipo ve y edita estas tablas (las escrituras públicas de eventos pasan por el servidor)
do $$
declare t text;
begin
  foreach t in array array['eventos', 'gasto_pauta', 'precios_observados'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('drop policy if exists "equipo_todo" on public.%I', t);
    execute format('create policy "equipo_todo" on public.%I for all to authenticated using (public.es_equipo()) with check (public.es_equipo())', t);
  end loop;
end $$;

-- ---------------------------------------------------------------------
-- Resúmenes para el panel de Analítica (semanas de lunes a domingo, hora de El Salvador)
-- Corren con los permisos de quien consulta: solo el equipo ve resultados.
-- ---------------------------------------------------------------------
create or replace function public.analitica_embudo(desde timestamptz)
returns table (semana date, sesiones bigint, vieron_producto bigint, agregaron bigint, checkout bigint, whatsapp bigint)
language sql stable as $$
  select date_trunc('week', e.created_at at time zone 'America/El_Salvador')::date,
         count(distinct e.sesion_id),
         count(distinct e.sesion_id) filter (where e.tipo = 'vista_producto'),
         count(distinct e.sesion_id) filter (where e.tipo = 'agregar_carrito'),
         count(distinct e.sesion_id) filter (where e.tipo = 'inicio_checkout'),
         count(*) filter (where e.tipo = 'clic_whatsapp')
  from public.eventos e
  where e.created_at >= desde
  group by 1
  order by 1 desc
$$;

create or replace function public.analitica_productos(desde timestamptz)
returns table (producto_id uuid, vistas bigint, agregados bigint, fotos bigint)
language sql stable as $$
  select e.producto_id,
         count(distinct e.sesion_id) filter (where e.tipo = 'vista_producto'),
         count(distinct e.sesion_id) filter (where e.tipo in ('agregar_carrito', 'clic_bundle')),
         count(distinct e.sesion_id) filter (where e.tipo = 'clic_foto')
  from public.eventos e
  where e.created_at >= desde and e.producto_id is not null
  group by 1
$$;

create or replace function public.analitica_origenes(desde timestamptz)
returns table (origen text, sesiones bigint)
language sql stable as $$
  select coalesce(e.origen, 'directo'), count(distinct e.sesion_id)
  from public.eventos e
  where e.created_at >= desde
  group by 1
  order by 2 desc
  limit 20
$$;

create or replace function public.analitica_whatsapp(desde timestamptz)
returns table (codigo text, clics bigint)
language sql stable as $$
  select coalesce(e.datos->>'codigo', e.pagina, '—'), count(*)
  from public.eventos e
  where e.created_at >= desde and e.tipo = 'clic_whatsapp'
  group by 1
  order by 2 desc
  limit 20
$$;

-- Unidades vendidas por producto desde una fecha (pedidos no cancelados): para la rotación de precios
create or replace function public.ventas_por_producto(desde timestamptz)
returns table (producto_id uuid, unidades bigint)
language sql stable as $$
  select v.producto_id, sum(l.cantidad)::bigint
  from public.lineas_pedido l
  join public.pedidos p on p.id = l.pedido_id
  join public.variantes v on v.id = l.variante_id
  where p.created_at >= desde and p.estado not in ('cancelado', 'devuelto')
  group by 1
$$;

-- Lo que más buscan los clientes (y si encontraron algo)
create or replace function public.analitica_busquedas(desde timestamptz)
returns table (termino text, veces bigint, sin_resultados bigint)
language sql stable as $$
  select lower(trim(e.datos->>'termino')),
         count(*),
         count(*) filter (where coalesce((e.datos->>'resultados')::int, 0) = 0)
  from public.eventos e
  where e.created_at >= desde and e.tipo = 'busqueda' and coalesce(trim(e.datos->>'termino'), '') <> ''
  group by 1
  order by 2 desc
  limit 40
$$;
revoke execute on function public.analitica_busquedas(timestamptz) from anon;

-- Unidades vendidas por configuración (producto + RAM + almacenamiento): rotación para la sugerencia de precio
create or replace function public.ventas_por_configuracion(desde timestamptz)
returns table (producto_id uuid, ram_gb smallint, almacenamiento_gb int, unidades bigint)
language sql stable as $$
  select v.producto_id, v.ram_gb, v.almacenamiento_gb, sum(l.cantidad)::bigint
  from public.lineas_pedido l
  join public.pedidos p on p.id = l.pedido_id
  join public.variantes v on v.id = l.variante_id
  where p.created_at >= desde and p.estado not in ('cancelado', 'devuelto')
  group by 1, 2, 3
$$;

revoke execute on function public.ventas_por_configuracion(timestamptz) from anon;
revoke execute on function public.analitica_embudo(timestamptz) from anon;
revoke execute on function public.analitica_productos(timestamptz) from anon;
revoke execute on function public.analitica_origenes(timestamptz) from anon;
revoke execute on function public.analitica_whatsapp(timestamptz) from anon;
revoke execute on function public.ventas_por_producto(timestamptz) from anon;

notify pgrst, 'reload schema';
