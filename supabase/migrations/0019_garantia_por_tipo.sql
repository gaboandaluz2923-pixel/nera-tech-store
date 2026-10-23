-- =====================================================================
-- Nera Tech Store — Migración 0019: garantía de 12 meses en celulares y 6 en accesorios
-- Cómo ejecutarla: Supabase → SQL Editor → New query → pegar todo → Run.
-- Requiere 0001 a 0018. Se puede correr más de una vez. No borra datos.
-- Pedido de Gabriel (23 oct 2026): la garantía de los accesorios es de 6 meses y la de los celulares de 12.
-- Gabriel eligió que tablets, televisores, consolas y energía también lleven 12 (son equipos, no accesorios).
--   - configuracion.garantia_texto: plazo_meses = celulares y equipos (12), plazo_meses_accesorios = accesorios (6).
--   - garantia_meses(producto): 12 en celulares, celulares-basicos, open-box, tablets, televisores, consolas y
--     energia (un Open Box usa la categoría de su modelo nuevo); 6 en lo demás. Misma regla que lib/tienda/garantia.ts.
--   - Garantía → buscar IMEI/serie calcula "vigente hasta" con el plazo de cada producto.
--   - Fichas: en los accesorios, "garantía de 12 meses" pasa a "garantía de 6 meses".
-- =====================================================================

-- 1) Configuración
update public.configuracion
set valor = valor
  || jsonb_build_object('plazo_meses_accesorios', coalesce((valor ->> 'plazo_meses_accesorios')::int, 6))
  || jsonb_build_object('resumen', 'Garantía Nera Tech por defectos de fábrica: '
       || coalesce(valor ->> 'plazo_meses', '12') || ' meses en celulares y equipos, '
       || coalesce(valor ->> 'plazo_meses_accesorios', '6') || ' en accesorios.')
where clave = 'garantia_texto';

-- 2) Plazo de cada producto
create or replace function public.garantia_meses(p_producto uuid)
returns int
language sql
stable
security definer
set search_path = public
as $$
  select case
    when coalesce(cb.slug, c.slug) in ('celulares', 'celulares-basicos', 'open-box', 'tablets', 'televisores', 'consolas', 'energia')
      then coalesce((g.valor ->> 'plazo_meses')::int, 12)
    else coalesce((g.valor ->> 'plazo_meses_accesorios')::int, 6)
  end
  from public.productos p
  left join public.categorias c on c.id = p.categoria_id
  left join public.productos pb on pb.id = p.producto_base_id
  left join public.categorias cb on cb.id = pb.categoria_id
  left join public.configuracion g on g.clave = 'garantia_texto'
  where p.id = p_producto
$$;
revoke all on function public.garantia_meses(uuid) from public, anon;
grant execute on function public.garantia_meses(uuid) to authenticated, service_role;

-- 3) Buscar IMEI / serie con el plazo de cada producto
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
begin
  if not public.inv_puede(false) then raise exception 'Sin permiso.'; end if;
  if ident is null or length(ident) < 4 then return '[]'::jsonb; end if;
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
      'garantia_meses', public.garantia_meses(v.producto_id),
      'garantia_hasta', ((coalesce(pe.entregado_en, u.vendida_en) at time zone 'America/El_Salvador')::date
                         + make_interval(months => public.garantia_meses(v.producto_id)))::date
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

-- 4) Fichas de accesorios: el texto de garantía pasa a 6 meses
update public.productos p
set descripcion = regexp_replace(descripcion, '(garant[ií]a de )12( meses)', '\1' || public.garantia_meses(p.id) || '\2', 'gi'),
    meta_descripcion = regexp_replace(meta_descripcion, '(garant[ií]a de )12( meses)', '\1' || public.garantia_meses(p.id) || '\2', 'gi'),
    resumen = regexp_replace(resumen, '(garant[ií]a de )12( meses)', '\1' || public.garantia_meses(p.id) || '\2', 'gi'),
    incluye = regexp_replace(incluye, '(garant[ií]a de )12( meses)', '\1' || public.garantia_meses(p.id) || '\2', 'gi'),
    garantia = regexp_replace(garantia, '12( meses)', public.garantia_meses(p.id) || '\1', 'gi'),
    faq = regexp_replace(faq::text, '(garant[ií]a de )12( meses)', '\1' || public.garantia_meses(p.id) || '\2', 'gi')::jsonb,
    updated_at = now()
where public.garantia_meses(p.id) <> 12
  and concat_ws(' ', descripcion, meta_descripcion, resumen, incluye, garantia, faq::text) ~* '12 meses';

-- Que la API vea la función nueva enseguida
notify pgrst, 'reload schema';
