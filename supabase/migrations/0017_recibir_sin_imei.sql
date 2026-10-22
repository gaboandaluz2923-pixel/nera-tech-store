-- =====================================================================
-- Nera Tech Store — Migración 0017: recibir compras de celulares sin tener todos los IMEI
-- Cómo ejecutarla: Supabase → SQL Editor → New query → pegar todo → Run.
-- Requiere 0001 a 0016. Se puede correr más de una vez. No borra datos.
-- Pedido de Gabriel (21 oct 2026): poder recibir la compra sin IMEI y agregarlos después.
-- Antes, recibir pedía el IMEI de cada celular. Ahora entran a bodega las unidades que se pidan; las que no
-- tienen IMEI quedan como "Faltan IMEI" en Inventario y se registran después (Inventario → la variante →
-- "Registrar IMEI"), igual que el stock que ya estaba antes del control por unidad.
-- Los accesorios siguen igual: los que no traen serie reciben un código Nera al recibir.
-- =====================================================================

create or replace function public.inv_recibir_compra(p_compra uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare c record; l record; lote uuid; base numeric; factor numeric := 1; con_id int;
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
    -- Celulares: solo se crean las unidades que ya traen IMEI; el resto queda pendiente de registrar.
    -- Lo demás: todas (las que no traen serie reciben código Nera).
    con_id := case when public.inv_tipo_identificador(l.variante_id) = 'imei'
                   then least(l.cantidad, jsonb_array_length(coalesce(l.identificadores, '[]'::jsonb)))
                   else l.cantidad end;
    if con_id > 0 then
      perform public.inv_crear_unidades(l.variante_id, lote, l.identificadores, l.condicion, con_id,
        'Compra ' || coalesce(nullif(c.numero, ''), 'sin número'));
    end if;
  end loop;
  update public.compras set estado = 'recibida', recibida_por = public.inv_quien(), recibida_en = now() where id = p_compra;
end $$;

revoke all on function public.inv_recibir_compra(uuid) from public, anon;
grant execute on function public.inv_recibir_compra(uuid) to authenticated, service_role;

-- Registrar los IMEI que faltan de una línea de compra ya recibida: las unidades quedan en el lote de ESA compra
-- (con su costo), no en el lote más viejo de la variante.
create or replace function public.inv_registrar_unidades_compra(p_linea uuid, p_items jsonb)
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
  var uuid;
begin
  if not public.inv_puede(false) then raise exception 'Sin permiso para cambiar el inventario.'; end if;
  select cl.variante_id, cl.condicion into var, cond from public.compra_lineas cl where cl.id = p_linea;
  if var is null then raise exception 'No se encontró la línea de la compra.'; end if;
  for l in select * from public.lotes where compra_linea_id = p_linea and cantidad > 0 order by fecha, created_at loop
    exit when jsonb_array_length(pendientes) = 0;
    libres := l.cantidad - (select count(*) from public.unidades where lote_id = l.id and estado = 'en_bodega');
    continue when libres <= 0;
    toma := least(libres, jsonb_array_length(pendientes));
    total := total + public.inv_crear_unidades(l.variante_id, l.id,
      (select coalesce(jsonb_agg(e order by n), '[]'::jsonb) from jsonb_array_elements(pendientes) with ordinality as t(e, n) where n <= toma),
      cond, toma, 'Registrada después de recibir la compra');
    pendientes := (select coalesce(jsonb_agg(e order by n), '[]'::jsonb) from jsonb_array_elements(pendientes) with ordinality as t(e, n) where n > toma);
  end loop;
  if jsonb_array_length(pendientes) > 0 then
    raise exception 'Hay % IMEI de más: de esta compra solo faltaban % de %.',
      jsonb_array_length(pendientes), total, public.inv_nombre_variante(var);
  end if;
  return total;
end $$;

revoke all on function public.inv_registrar_unidades_compra(uuid, jsonb) from public, anon;
grant execute on function public.inv_registrar_unidades_compra(uuid, jsonb) to authenticated, service_role;

-- Que la API vea la función nueva enseguida
notify pgrst, 'reload schema';
