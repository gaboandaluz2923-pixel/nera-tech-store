-- =====================================================================
-- Nera Tech Store — Migración 0002: claves para emparejar listas de proveedores
-- Cómo ejecutarla: Supabase → SQL Editor → New query → pegar todo → Run.
-- Requiere haber corrido la 0001. Se puede correr más de una vez sin problema.
-- =====================================================================

-- Productos: clave normalizada (marca|modelo) para emparejar entre proveedores
alter table public.productos add column if not exists clave text;
create unique index if not exists productos_clave_key on public.productos (clave);

-- Variantes: memoria y color separados + clave única (marca|modelo|ram|almacenamiento|color)
alter table public.variantes add column if not exists ram_gb int;
alter table public.variantes add column if not exists almacenamiento_gb int;
alter table public.variantes add column if not exists clave text;
create unique index if not exists variantes_clave_key on public.variantes (clave);

-- Líneas de lista: lo que el normalizador entendió de cada descripción
alter table public.lineas_lista add column if not exists clave text;
alter table public.lineas_lista add column if not exists marca text;
alter table public.lineas_lista add column if not exists modelo text;
alter table public.lineas_lista add column if not exists ram_gb int;
alter table public.lineas_lista add column if not exists almacenamiento_gb int;
alter table public.lineas_lista add column if not exists color text;
alter table public.lineas_lista add column if not exists categoria_slug text;
alter table public.lineas_lista add column if not exists precio_sugerido numeric(10,2);
create index if not exists lineas_lista_clave_idx on public.lineas_lista (clave);

-- Vínculo proveedor ↔ variante: guardar el precio anterior para ver cambios
alter table public.producto_proveedor add column if not exists precio_anterior numeric(10,2);
alter table public.producto_proveedor add column if not exists precio_sugerido numeric(10,2);
alter table public.producto_proveedor add column if not exists lista_id uuid
  references public.listas_precios(id) on delete set null;

-- Categorías que aparecen en las listas de los proveedores
insert into public.categorias (slug, nombre, margen_objetivo_pct, orden, plantilla_caracteristicas) values
  ('tablets', 'Tablets', 10, 6,
   '["pantalla","procesador","ram","almacenamiento","bateria","red"]'::jsonb),
  ('relojes', 'Relojes y bandas', 20, 7,
   '["pantalla","autonomia","resistencia","compatibilidad"]'::jsonb),
  ('otros', 'Otros', 15, 99, '[]'::jsonb)
on conflict (slug) do nothing;

-- Proveedores actuales (Miami se agrega cuando empiece la importación)
insert into public.proveedores (nombre, tipo, plazo_credito_dias)
select v.nombre, 'local'::public.tipo_proveedor, 0
from (values ('Total Link'), ('Maverik'), ('Idecom'), ('Intcomex')) as v(nombre)
where not exists (select 1 from public.proveedores p where p.nombre = v.nombre);

do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'proveedores_nombre_key') then
    alter table public.proveedores add constraint proveedores_nombre_key unique (nombre);
  end if;
end $$;

-- Líneas que el equipo decide no vender (ej. televisores): se recuerdan por proveedor + código
create table if not exists public.skus_ignorados (
  proveedor_id uuid not null references public.proveedores(id) on delete cascade,
  sku_proveedor text not null,
  descripcion text,
  created_at timestamptz not null default now(),
  primary key (proveedor_id, sku_proveedor)
);
alter table public.skus_ignorados enable row level security;
drop policy if exists "equipo_todo" on public.skus_ignorados;
create policy "equipo_todo" on public.skus_ignorados
  for all to authenticated using (true) with check (true);

-- sku_proveedor también en las líneas (código del proveedor o, si no trae, la descripción normalizada)
alter table public.lineas_lista add column if not exists sku_clave text;
