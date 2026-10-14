-- =====================================================================
-- Nera Tech — Precios de venta de los 12 productos (aprobados por Gabriel el 14 oct 2026)
-- Precios sugeridos por el panel: margen 10% en celulares y 15% en accesorios sobre el proveedor más barato.
-- Cómo usarlo: Supabase → SQL Editor → New query → pegar todo → Run.
-- Guarda cada cambio en el historial de precios, igual que el panel. Se puede correr más de una vez.
-- =====================================================================
with datos(slug, ram, alm, precio) as (
  values
    ('jbl-tune-310c', null::int, null::int, 15.99),
    ('samsung-galaxy-buds-4-pro', null::int, null::int, 219.00),
    ('xiaomi-redmi-buds-8-lite', null::int, null::int, 21.99),
    ('infinix-hot-70', 4::int, 128::int, 215.00),
    ('infinix-hot-70', 4::int, 256::int, 245.00),
    ('infinix-hot-70', 8::int, 256::int, 279.00),
    ('infinix-smart-20', 4::int, 64::int, 159.00),
    ('infinix-smart-20', 4::int, 128::int, 175.00),
    ('samsung-galaxy-a06', 4::int, 64::int, 109.00),
    ('samsung-galaxy-a06', 4::int, 128::int, 125.00),
    ('samsung-galaxy-a07', 4::int, 64::int, 129.00),
    ('samsung-galaxy-a07', 4::int, 128::int, 135.00),
    ('samsung-galaxy-a16', 4::int, 128::int, 169.00),
    ('samsung-galaxy-a16', 8::int, 256::int, 189.00),
    ('samsung-galaxy-a17', 4::int, 128::int, 195.00),
    ('samsung-galaxy-a17', 6::int, 128::int, 225.00),
    ('samsung-galaxy-a27', 6::int, 128::int, 329.00),
    ('samsung-galaxy-a27', 8::int, 256::int, 415.00),
    ('samsung-galaxy-a37', 6::int, 128::int, 439.00),
    ('samsung-galaxy-a37', 8::int, 256::int, 455.00),
    ('xiaomi-redmi-note-17', 4::int, 128::int, 245.00),
    ('xiaomi-redmi-note-17', 6::int, 128::int, 269.00),
    ('xiaomi-redmi-note-17', 6::int, 256::int, 265.00),
    ('xiaomi-redmi-note-17', 8::int, 256::int, 299.00)
),
cambios as (
  select v.id, v.precio as anterior, d.precio
  from datos d
  join public.productos p on p.slug = d.slug
  join public.variantes v on v.producto_id = p.id
   and v.ram_gb is not distinct from d.ram
   and v.almacenamiento_gb is not distinct from d.alm
  where v.precio <> d.precio
),
actualizadas as (
  update public.variantes v
  set precio = c.precio, updated_at = now()
  from cambios c
  where v.id = c.id
  returning v.id
)
insert into public.precios_venta (variante_id, precio, precio_anterior, razon, usuario)
select c.id, c.precio, c.anterior, 'sugerido aprobado', 'Gabriel (SQL 14-oct)'
from cambios c;

-- Revisión: precio desde/hasta por producto
select p.nombre,
       count(*) filter (where v.precio > 0) as variantes_con_precio,
       min(v.precio) filter (where v.precio > 0) as desde,
       max(v.precio) as hasta
from public.productos p
join public.variantes v on v.producto_id = p.id and v.activo
where p.slug in ('infinix-hot-70', 'infinix-smart-20', 'jbl-tune-310c', 'samsung-galaxy-a06', 'samsung-galaxy-a07', 'samsung-galaxy-a16', 'samsung-galaxy-a17', 'samsung-galaxy-a27', 'samsung-galaxy-a37', 'samsung-galaxy-buds-4-pro', 'xiaomi-redmi-buds-8-lite', 'xiaomi-redmi-note-17')
group by p.nombre, p.orden
order by p.orden;
