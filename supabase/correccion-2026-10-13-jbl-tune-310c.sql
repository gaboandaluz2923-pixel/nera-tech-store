-- =====================================================================
-- Nera Tech — Unificar el JBL Tune 310C en un solo producto con 4 colores
-- Las listas lo traían como 3 productos distintos ("JBL TUNE 310C WHITE",
-- "…BLACK USB-C" y "…USB-C BLUE/RED"). Este script pasa los colores Negro, Azul y Rojo
-- al producto "jbl-tune-310c" (que ya tiene el Blanco). Los vínculos con proveedores
-- se conservan porque van pegados a cada color (variante).
-- Los 2 productos que quedan vacíos NO se borran: quedan ocultos y con "(unificado)" en el nombre.
-- Cómo usarlo: Supabase → SQL Editor → New query → pegar todo → Run. Se puede correr más de una vez.
-- =====================================================================

-- Negro (venía sin color, como "Único")
update public.variantes v
set producto_id = destino.id, color = 'Negro', nombre = 'Negro', clave = 'jbl|tune 310c|-|-|negro', updated_at = now()
from public.productos origen, public.productos destino
where origen.slug = 'jbl-tune-310c-black-usb-c'
  and destino.slug = 'jbl-tune-310c'
  and v.producto_id = origen.id;

-- Azul y Rojo
update public.variantes v
set producto_id = destino.id, clave = 'jbl|tune 310c|-|-|' || lower(v.color), updated_at = now()
from public.productos origen, public.productos destino
where origen.slug = 'jbl-tune-310c-usb-c'
  and destino.slug = 'jbl-tune-310c'
  and v.producto_id = origen.id;

-- Los productos vacíos quedan ocultos y marcados
update public.productos
set estado = 'oculto',
    nombre = case when nombre like '%(unificado)' then nombre else nombre || ' (unificado)' end,
    clave = case when clave like '%(unificado)' then clave else clave || ' (unificado)' end,
    updated_at = now()
where slug in ('jbl-tune-310c-black-usb-c', 'jbl-tune-310c-usb-c')
  and not exists (select 1 from public.variantes v where v.producto_id = productos.id);

-- Revisión: debe mostrar Azul, Blanco, Negro y Rojo
select p.slug, v.color, v.clave
from public.variantes v join public.productos p on p.id = v.producto_id
where p.slug = 'jbl-tune-310c'
order by v.color;
