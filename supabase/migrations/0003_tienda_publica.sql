-- =====================================================================
-- Nera Tech Store — Migración 0003: datos públicos de la tienda
-- Cómo ejecutarla: Supabase → SQL Editor → New query → pegar todo → Run.
-- Requiere 0001 y 0002. Se puede correr más de una vez.
-- =====================================================================

-- Texto corto bajo el nombre del producto en listados y ficha (ej. "Pantalla de 6.7"…, 5G, 50 MP")
alter table public.productos add column if not exists resumen text;
-- Productos publicados más recientemente primero en "Recién llegado"
alter table public.productos add column if not exists publicado_en timestamptz;

-- ---------------------------------------------------------------------
-- Disponibilidad pública por variante, sin exponer proveedores ni costos.
--   en_bodega: Nera Tech tiene unidades propias (variantes.stock > 0)
--   con_proveedor: algún proveedor vigente la tiene (o no informa existencia)
-- La vista corre con permisos de su dueño, así que el visitante solo ve estas dos banderas.
-- ---------------------------------------------------------------------
create or replace view public.disponibilidad_publica
  with (security_invoker = false) as
select
  v.id as variante_id,
  v.producto_id,
  (v.stock > 0) as en_bodega,
  exists (
    select 1 from public.producto_proveedor pp
    where pp.variante_id = v.id
      and pp.activo
      and (pp.ultimo_stock is null or pp.ultimo_stock > 0)
  ) as con_proveedor
from public.variantes v
join public.productos p on p.id = v.producto_id
where v.activo and p.estado <> 'oculto';

grant select on public.disponibilidad_publica to anon, authenticated;

-- ---------------------------------------------------------------------
-- Garantía (texto base, editable luego en Configuración)
-- ---------------------------------------------------------------------
update public.configuracion
set valor = jsonb_build_object(
  'plazo_meses', 12,
  'resumen', '12 meses de garantía Nera Tech por defectos de fábrica.',
  'cambio_inmediato_dias', 7,
  'cubre', jsonb_build_array(
    'Fallas de fábrica del equipo: no enciende, no carga, pantalla o táctil que deja de responder sin golpe',
    'Fallas de botones, cámaras, altavoz, micrófono, señal, Wi-Fi o Bluetooth',
    'Batería que no retiene carga en condiciones normales de uso'
  ),
  'no_cubre', jsonb_build_array(
    'Golpes, caídas, pantallas o tapas quebradas',
    'Contacto con agua u otros líquidos',
    'Equipos abiertos, reparados o modificados por terceros',
    'Desgaste normal (rayones, pintura) y accesorios dañados por mal uso',
    'Problemas de aplicaciones de terceros o pérdida de información'
  ),
  'como_reclamar', jsonb_build_array(
    'Escribinos por WhatsApp con tu número de pedido y qué le pasa al equipo',
    'Lo revisamos en un máximo de 48 horas hábiles',
    'Si es falla de fábrica, lo reparamos o lo cambiamos sin costo'
  ),
  'nota', 'En los primeros 7 días, si el equipo tiene una falla de fábrica, te lo cambiamos por uno nuevo. Los equipos importados tienen garantía directa de Nera Tech.'
)
where clave = 'garantia_texto'
  and coalesce(valor->>'texto', '') = ''
  and not (valor ? 'plazo_meses');
