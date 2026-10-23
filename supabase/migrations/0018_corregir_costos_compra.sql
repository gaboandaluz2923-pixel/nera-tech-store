-- =====================================================================
-- Nera Tech Store — Migración 0018: corregir el costo de una compra ya recibida
-- Cómo ejecutarla: Supabase → SQL Editor → New query → pegar todo → Run.
-- Requiere 0001 a 0017. Se puede correr más de una vez. No borra datos.
-- Pedido de Gabriel (23 oct 2026): poder editar un costo después de recibir. Antes, "Otros costos" y el costo de
-- cada línea solo se cambiaban antes de recibir; si se equivocaba, el costo en bodega quedaba mal.
-- Ahora, en una compra recibida se puede corregir "Otros costos" y el costo c/u de cada producto. Se recalcula:
--   - el costo de cada lote de esa compra (lo que queda en bodega y lo que ya salió),
--   - los movimientos del kardex de esos lotes,
--   - el costo de las ventas que ya salieron de esos lotes (para que Analítica y Finanzas den bien).
-- =====================================================================

create or replace function public.inv_corregir_costos_compra(p_compra uuid, p_otros numeric default null, p_costos jsonb default '[]'::jsonb)
returns int
language plpgsql
security definer
set search_path = public
as $$
declare c record; l record; it jsonb; base numeric; factor numeric := 1; nuevo numeric; ventas int := 0; lp uuid;
begin
  if not public.inv_puede(true) then raise exception 'Solo un administrador puede corregir costos.'; end if;
  select * into c from public.compras where id = p_compra for update;
  if c.id is null then raise exception 'No se encontró la compra.'; end if;
  if c.estado <> 'recibida' then raise exception 'Solo se corrigen así las compras recibidas.'; end if;
  if p_otros is not null and p_otros < 0 then raise exception 'Los otros costos no pueden ser negativos.'; end if;

  for it in select * from jsonb_array_elements(coalesce(p_costos, '[]'::jsonb)) loop
    if (it ->> 'costo')::numeric < 0 then raise exception 'El costo no puede ser negativo.'; end if;
    update public.compra_lineas set costo_unitario = round((it ->> 'costo')::numeric, 4)
    where id = (it ->> 'linea')::uuid and compra_id = p_compra;
  end loop;
  if p_otros is not null then
    update public.compras set otros_costos = round(p_otros, 2) where id = p_compra;
    c.otros_costos := round(p_otros, 2);
  end if;

  select sum(cantidad * costo_unitario) into base from public.compra_lineas where compra_id = p_compra;
  if coalesce(base, 0) > 0 and c.otros_costos > 0 then factor := 1 + c.otros_costos / base; end if;

  for l in select * from public.compra_lineas where compra_id = p_compra loop
    nuevo := round(l.costo_unitario * factor, 4);
    update public.lotes set costo_unitario = nuevo where compra_linea_id = l.id;
    update public.movimientos_inventario set costo_unitario = nuevo
    where lote_id in (select id from public.lotes where compra_linea_id = l.id);
  end loop;

  -- Ventas que ya salieron de estos lotes: su costo se vuelve a calcular con el costo corregido
  for lp in
    select distinct m.linea_pedido_id from public.movimientos_inventario m
    join public.lotes lo on lo.id = m.lote_id
    join public.compra_lineas cl on cl.id = lo.compra_linea_id
    where cl.compra_id = p_compra and m.linea_pedido_id is not null
  loop
    perform public.inv_costo_linea(lp);
    ventas := ventas + 1;
  end loop;
  return ventas;
end $$;

revoke all on function public.inv_corregir_costos_compra(uuid, numeric, jsonb) from public, anon;
grant execute on function public.inv_corregir_costos_compra(uuid, numeric, jsonb) to authenticated, service_role;

-- Que la API vea la función nueva enseguida
notify pgrst, 'reload schema';
