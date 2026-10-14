-- =====================================================================
-- Corrección: la "tabla azul" (Redmi A7, Galaxy A07…A37, TV Xiaomi) es de IDECOM, no de Intcomex.
-- Mueve esa lista, sus vínculos y sus líneas ignoradas de Intcomex a Idecom.
-- Se puede correr más de una vez: la segunda vez no cambia nada.
-- =====================================================================
update public.listas_precios
set proveedor_id = (select id from public.proveedores where nombre = 'Idecom'),
    nombre_archivo = 'idecom-tabla.csv'
where proveedor_id = (select id from public.proveedores where nombre = 'Intcomex');

update public.producto_proveedor
set proveedor_id = (select id from public.proveedores where nombre = 'Idecom')
where proveedor_id = (select id from public.proveedores where nombre = 'Intcomex');

update public.skus_ignorados
set proveedor_id = (select id from public.proveedores where nombre = 'Idecom')
where proveedor_id = (select id from public.proveedores where nombre = 'Intcomex');

-- Resultado: listas por proveedor (Idecom debe tener 2; Intcomex ninguna)
select p.nombre, count(l.id) as listas,
       (select count(*) from public.producto_proveedor pp where pp.proveedor_id = p.id) as vinculos
from public.proveedores p
left join public.listas_precios l on l.proveedor_id = p.id
group by p.id, p.nombre order by p.nombre;
