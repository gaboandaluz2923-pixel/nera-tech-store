-- =====================================================================
-- Nera Tech — FASE 2, TODO EN UNO (13 oct 2026)
-- Cómo usarlo: Supabase → SQL Editor → New query → pegar TODO → Run.
-- Incluye, en orden: migración 0003, corrección de Idecom, unificación del JBL y las fichas.
-- Se puede correr más de una vez: no duplica ni borra datos.
-- Al final muestra una tabla con los 12 productos, sus fotos y cuántas variantes tienen precio.
-- =====================================================================

-- ######################################################################
-- 1. Migración 0003: tienda pública
-- ######################################################################
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

-- ######################################################################
-- 2. Corrección: la tabla azul es de Idecom
-- ######################################################################
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


-- ######################################################################
-- 3. Unificar JBL Tune 310C
-- ######################################################################
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


-- ######################################################################
-- 4. Fichas de los 12 productos
-- ######################################################################
-- =====================================================================
-- Nera Tech — Fichas de producto (fichas-2026-10.json)
-- Generado con scripts/fichas-a-sql.mjs. Cómo usarlo: Supabase → SQL Editor → New query → pegar todo → Run.
-- Se puede correr más de una vez.
-- =====================================================================

-- 1. Textos, características, preguntas frecuentes y publicación
update public.productos p
set nombre = d.nombre,
    resumen = d.resumen,
    descripcion = d.descripcion,
    caracteristicas = d.caracteristicas,
    incluye = d.incluye,
    faq = d.faq,
    meta_descripcion = d.meta_descripcion,
    orden = d.orden,
    estado = case when p.estado = 'oculto' then 'activo'::public.estado_producto else p.estado end,
    publicado_en = coalesce(p.publicado_en, now()),
    updated_at = now()
from jsonb_to_recordset($fichas$[
 {
  "slug": "samsung-galaxy-a27",
  "nombre": "Samsung Galaxy A27 5G",
  "resumen": "5G, pantalla AMOLED de 120 Hz y cámara de 50 MP con estabilizador",
  "descripcion": "El Galaxy A27 es el Samsung más completo que podés tener sin pagar precio de gama alta. Su pantalla Super AMOLED de 6.7\" a 120 Hz se ve nítida y fluida, con colores intensos aunque estés bajo el sol.\n\nLa cámara de 50 MP tiene estabilizador óptico, así que las fotos de noche y los videos salen sin temblor. Con el procesador Snapdragon 6 Gen 3 y 5G, abre apps y juegos rápido, y sigue rápido con los años: Samsung le promete hasta 6 actualizaciones de Android.\n\nResiste salpicaduras y polvo (IP64) y su batería de 5000 mAh te dura el día completo.",
  "caracteristicas": {
   "pantalla": "6.7\" Super AMOLED Full HD+, 120 Hz",
   "procesador": "Snapdragon 6 Gen 3",
   "camara": "50 MP con estabilizador + 5 MP gran angular + 2 MP macro",
   "camara_frontal": "12 MP",
   "bateria": "5000 mAh",
   "carga": "Carga rápida 25 W",
   "red": "5G",
   "sistema_operativo": "Android 16 (hasta 6 actualizaciones)",
   "nfc": "Sí",
   "proteccion": "IP64 (polvo y salpicaduras), Gorilla Glass Victus+",
   "peso": "200 g"
  },
  "incluye": "Teléfono\nCable USB-C\nHerramienta para la bandeja SIM\nGuía rápida",
  "faq": [
   {
    "pregunta": "¿Trae cargador?",
    "respuesta": "Samsung ya no incluye cargador en la caja de la serie A; solo trae el cable USB-C. Si querés carga rápida, agregá un cargador de 25 W."
   },
   {
    "pregunta": "¿Funciona el 5G en El Salvador?",
    "respuesta": "Sí. Usa 5G donde tu compañía lo tenga y 4G en el resto del país, sin que tengas que configurar nada."
   },
   {
    "pregunta": "¿Viene liberado?",
    "respuesta": "Sí, funciona con cualquier compañía de El Salvador."
   }
  ],
  "meta_descripcion": "Samsung Galaxy A27 5G nuevo y sellado: AMOLED 120 Hz, 50 MP con estabilizador, Snapdragon 6 Gen 3. Garantía de 12 meses y pago contra entrega.",
  "orden": 1
 },
 {
  "slug": "samsung-galaxy-a17",
  "nombre": "Samsung Galaxy A17",
  "resumen": "Pantalla AMOLED de 90 Hz, cámara de 50 MP con estabilizador y hasta 6 actualizaciones de Android",
  "descripcion": "El Galaxy A17 te da lo que más se nota en el día a día: una pantalla Super AMOLED de 6.7\" que se ve brillante y con negros profundos, y una cámara de 50 MP con estabilizador óptico para fotos más nítidas.\n\nSu batería de 5000 mAh aguanta el día completo, resiste salpicaduras (IP54) y trae Android 15 con hasta 6 actualizaciones: un teléfono para varios años, no para uno.",
  "caracteristicas": {
   "pantalla": "6.7\" Super AMOLED Full HD+, 90 Hz",
   "procesador": "MediaTek Helio G99",
   "camara": "50 MP con estabilizador + 5 MP gran angular + 2 MP macro",
   "camara_frontal": "13 MP",
   "bateria": "5000 mAh",
   "carga": "Carga rápida 25 W",
   "red": "4G",
   "sistema_operativo": "Android 15, One UI 7 (hasta 6 actualizaciones)",
   "nfc": "Sí",
   "proteccion": "IP54 (polvo y salpicaduras), Gorilla Glass Victus+",
   "peso": "190 g"
  },
  "incluye": "Teléfono\nCable USB-C\nHerramienta para la bandeja SIM\nGuía rápida",
  "faq": [
   {
    "pregunta": "¿Es la versión 4G o 5G?",
    "respuesta": "Es el Galaxy A17 4G (SM-A175F), la versión que se vende en Latinoamérica."
   },
   {
    "pregunta": "¿Trae cargador?",
    "respuesta": "Samsung ya no incluye cargador en la caja de la serie A; solo trae el cable USB-C. Si querés carga rápida, agregá un cargador de 25 W."
   },
   {
    "pregunta": "¿Viene liberado?",
    "respuesta": "Sí, funciona con cualquier compañía de El Salvador."
   }
  ],
  "meta_descripcion": "Samsung Galaxy A17 nuevo y sellado: AMOLED 90 Hz, 50 MP con estabilizador, 5000 mAh. Garantía de 12 meses y pago contra entrega.",
  "orden": 2
 },
 {
  "slug": "samsung-galaxy-a16",
  "nombre": "Samsung Galaxy A16",
  "resumen": "Pantalla AMOLED de 6.7\", triple cámara de 50 MP y batería de 5000 mAh",
  "descripcion": "El Galaxy A16 es un Samsung confiable con pantalla Super AMOLED: la diferencia se nota al ver videos y fotos, con colores más vivos que en una pantalla LCD.\n\nTiene triple cámara con gran angular para fotos de grupo y paisajes, batería de 5000 mAh con carga rápida de 25 W y resistencia a salpicaduras (IP54). Samsung le da hasta 6 actualizaciones de Android.",
  "caracteristicas": {
   "pantalla": "6.7\" Super AMOLED Full HD+, 90 Hz",
   "procesador": "MediaTek Helio G99",
   "camara": "50 MP + 5 MP gran angular + 2 MP macro",
   "camara_frontal": "13 MP",
   "bateria": "5000 mAh",
   "carga": "Carga rápida 25 W",
   "red": "4G",
   "sistema_operativo": "Android 14 (hasta 6 actualizaciones)",
   "nfc": "Sí",
   "proteccion": "IP54 (polvo y salpicaduras)",
   "peso": "200 g"
  },
  "incluye": "Teléfono\nCable USB-C\nHerramienta para la bandeja SIM\nGuía rápida",
  "faq": [
   {
    "pregunta": "¿Es la versión 4G o 5G?",
    "respuesta": "Es el Galaxy A16 4G, la versión que se vende en Latinoamérica."
   },
   {
    "pregunta": "¿Trae cargador?",
    "respuesta": "Samsung ya no incluye cargador en la caja de la serie A; solo trae el cable USB-C. Si querés carga rápida, agregá un cargador de 25 W."
   },
   {
    "pregunta": "¿Viene liberado?",
    "respuesta": "Sí, funciona con cualquier compañía de El Salvador."
   }
  ],
  "meta_descripcion": "Samsung Galaxy A16 nuevo y sellado: AMOLED 6.7\", triple cámara 50 MP, 5000 mAh. Garantía de 12 meses y pago contra entrega.",
  "orden": 3
 },
 {
  "slug": "samsung-galaxy-a07",
  "nombre": "Samsung Galaxy A07",
  "resumen": "Pantalla de 6.7\" a 90 Hz, batería de 5000 mAh y hasta 6 actualizaciones de Android",
  "descripcion": "El Galaxy A07 es la forma más económica de tener un Samsung nuevo que dure. Su pantalla de 6.7\" a 90 Hz se siente fluida al pasar el dedo, y el procesador Helio G99 le da buena velocidad para WhatsApp, redes y videos.\n\nResiste polvo y salpicaduras (IP54), su batería de 5000 mAh dura todo el día y Samsung le promete hasta 6 actualizaciones de Android.",
  "caracteristicas": {
   "pantalla": "6.7\" HD+ (LCD), 90 Hz",
   "procesador": "MediaTek Helio G99",
   "camara": "50 MP + 2 MP",
   "camara_frontal": "8 MP",
   "bateria": "5000 mAh",
   "carga": "Carga rápida 25 W",
   "red": "4G",
   "sistema_operativo": "Android 15 (hasta 6 actualizaciones)",
   "nfc": "No",
   "proteccion": "IP54 (polvo y salpicaduras)",
   "peso": "184 g"
  },
  "incluye": "Teléfono\nCable USB-C\nHerramienta para la bandeja SIM\nGuía rápida",
  "faq": [
   {
    "pregunta": "¿Trae cargador?",
    "respuesta": "Samsung ya no incluye cargador en la caja de la serie A; solo trae el cable USB-C. Si querés carga rápida, agregá un cargador de 25 W."
   },
   {
    "pregunta": "¿Se puede pagar con el celular (NFC)?",
    "respuesta": "No, el A07 no tiene NFC. Si lo necesitás, el Galaxy A16 o el A17 sí lo traen."
   },
   {
    "pregunta": "¿Viene liberado?",
    "respuesta": "Sí, funciona con cualquier compañía de El Salvador."
   }
  ],
  "meta_descripcion": "Samsung Galaxy A07 nuevo y sellado: 6.7\" 90 Hz, Helio G99, 5000 mAh, IP54. Garantía de 12 meses y pago contra entrega en San Salvador.",
  "orden": 4
 },
 {
  "slug": "samsung-galaxy-a06",
  "nombre": "Samsung Galaxy A06",
  "resumen": "Pantalla de 6.7\", cámara de 50 MP y batería de 5000 mAh",
  "descripcion": "El Galaxy A06 es el Samsung de entrada: ideal para WhatsApp, llamadas, redes sociales y videos, o para regalar a alguien que quiere un teléfono sencillo y de marca.\n\nTiene pantalla grande de 6.7\", cámara de 50 MP, batería de 5000 mAh que dura todo el día y carga rápida de 25 W.",
  "caracteristicas": {
   "pantalla": "6.7\" HD+ (LCD)",
   "procesador": "MediaTek Helio G85",
   "camara": "50 MP + 2 MP",
   "camara_frontal": "8 MP",
   "bateria": "5000 mAh",
   "carga": "Carga rápida 25 W",
   "red": "4G",
   "sistema_operativo": "Android 14",
   "nfc": "No",
   "peso": "189 g"
  },
  "incluye": "Teléfono\nCable USB-C\nHerramienta para la bandeja SIM\nGuía rápida",
  "faq": [
   {
    "pregunta": "¿Trae cargador?",
    "respuesta": "Samsung ya no incluye cargador en la caja de la serie A; solo trae el cable USB-C. Si querés carga rápida, agregá un cargador de 25 W."
   },
   {
    "pregunta": "¿Cuál es la diferencia con el A07?",
    "respuesta": "El A07 tiene pantalla de 90 Hz (más fluida), un procesador más rápido (Helio G99), resistencia IP54 y más años de actualizaciones."
   },
   {
    "pregunta": "¿Viene liberado?",
    "respuesta": "Sí, funciona con cualquier compañía de El Salvador."
   }
  ],
  "meta_descripcion": "Samsung Galaxy A06 nuevo y sellado al mejor precio: 6.7\", 50 MP, 5000 mAh. Garantía de 12 meses y pago contra entrega.",
  "orden": 5
 },
 {
  "slug": "xiaomi-redmi-note-17",
  "nombre": "Xiaomi Redmi Note 17",
  "resumen": "Batería gigante de 7700 mAh, pantalla AMOLED de 6.99\" a 120 Hz y carga de 45 W",
  "descripcion": "El Redmi Note 17 es para quien no quiere andar buscando dónde cargar: su batería de 7700 mAh aguanta fácilmente más de un día, y con carga de 45 W se recupera rápido. Hasta puede cargar otro teléfono o tus audífonos por cable.\n\nSu pantalla AMOLED de 6.99\" a 120 Hz es enorme y fluida, ideal para videos y juegos. Resiste polvo y chorros de agua (IP65).",
  "caracteristicas": {
   "pantalla": "6.99\" AMOLED Full HD+, 120 Hz, Gorilla Glass 7i",
   "procesador": "Snapdragon 6s 4G Gen 2",
   "camara": "50 MP",
   "camara_frontal": "16 MP",
   "bateria": "7700 mAh",
   "carga": "Carga rápida 45 W; carga inversa por cable",
   "red": "4G",
   "sistema_operativo": "Android 16, HyperOS 3",
   "nfc": "Sí",
   "proteccion": "IP65 (polvo y chorros de agua)",
   "peso": "224 g"
  },
  "incluye": "Teléfono\nCable USB-C\nHerramienta para la bandeja SIM\nGuía rápida",
  "faq": [
   {
    "pregunta": "¿Cuánto dura la batería?",
    "respuesta": "Con 7700 mAh, un uso normal (WhatsApp, redes, videos) pasa con holgura de un día completo."
   },
   {
    "pregunta": "¿Es la versión 4G o 5G?",
    "respuesta": "Es el Redmi Note 17 4G, con NFC y Snapdragon 6s 4G Gen 2."
   },
   {
    "pregunta": "¿Viene liberado?",
    "respuesta": "Sí, funciona con cualquier compañía de El Salvador."
   }
  ],
  "meta_descripcion": "Xiaomi Redmi Note 17 nuevo y sellado: 7700 mAh, AMOLED 6.99\" 120 Hz, carga 45 W, IP65. Garantía de 12 meses y pago contra entrega.",
  "orden": 6
 },
 {
  "slug": "samsung-galaxy-a37",
  "nombre": "Samsung Galaxy A37 5G",
  "resumen": "Resistente al agua IP68, AMOLED de 120 Hz, carga de 45 W y 5G",
  "descripcion": "El Galaxy A37 trae lo que antes era solo de gama alta: resistencia al agua IP68, carga rápida de 45 W y una cámara de 50 MP con estabilizador óptico y gran angular de 8 MP.\n\nLa pantalla Super AMOLED de 120 Hz con Gorilla Glass Victus+ se ve y se siente premium, y el procesador Exynos 1480 con 5G mueve todo con soltura. Samsung le promete hasta 6 actualizaciones de Android.",
  "caracteristicas": {
   "pantalla": "6.7\" Super AMOLED Full HD+, 120 Hz",
   "procesador": "Exynos 1480",
   "camara": "50 MP con estabilizador + 8 MP gran angular + 5 MP macro",
   "camara_frontal": "12 MP",
   "bateria": "5000 mAh",
   "carga": "Carga rápida 45 W",
   "red": "5G",
   "sistema_operativo": "Android 16 (hasta 6 actualizaciones)",
   "nfc": "Sí",
   "proteccion": "IP68 (agua y polvo), Gorilla Glass Victus+",
   "peso": "196 g"
  },
  "incluye": "Teléfono\nCable USB-C\nHerramienta para la bandeja SIM\nGuía rápida",
  "faq": [
   {
    "pregunta": "¿Se puede mojar?",
    "respuesta": "Tiene certificación IP68: resiste lluvia, salpicaduras y una caída al agua dulce. La garantía no cubre daños por líquidos, así que mejor no lo sumerjas a propósito."
   },
   {
    "pregunta": "¿Trae cargador?",
    "respuesta": "Samsung ya no incluye cargador en la caja; solo trae el cable USB-C. Para aprovechar la carga de 45 W necesitás un cargador compatible."
   },
   {
    "pregunta": "¿Viene liberado?",
    "respuesta": "Sí, funciona con cualquier compañía de El Salvador."
   }
  ],
  "meta_descripcion": "Samsung Galaxy A37 5G nuevo y sellado: IP68, AMOLED 120 Hz, carga 45 W, 50 MP con estabilizador. Garantía de 12 meses y pago contra entrega.",
  "orden": 7
 },
 {
  "slug": "infinix-hot-70",
  "nombre": "Infinix Hot 70",
  "resumen": "Batería de 6000 mAh, carga de 45 W y pantalla de 120 Hz",
  "descripcion": "El Infinix Hot 70 te da mucha batería por tu dinero: 6000 mAh con carga rápida de 45 W, para que el teléfono te dure el día completo y se cargue en poco tiempo.\n\nSu pantalla de 6.78\" a 120 Hz es grande y fluida, tiene cámara de 50 MP, NFC y resiste polvo y chorros de agua (IP65).",
  "caracteristicas": {
   "pantalla": "6.78\" HD+ (LCD), 120 Hz",
   "procesador": "MediaTek Helio G100 Ultimate",
   "camara": "50 MP",
   "camara_frontal": "8 MP",
   "bateria": "6000 mAh",
   "carga": "Carga rápida 45 W",
   "red": "4G",
   "sistema_operativo": "Android 16, XOS 16",
   "nfc": "Sí",
   "proteccion": "IP65 (polvo y chorros de agua)",
   "peso": "195 g"
  },
  "incluye": "Teléfono\nCargador\nCable USB-C\nHerramienta para la bandeja SIM",
  "faq": [
   {
    "pregunta": "¿Trae cargador?",
    "respuesta": "Sí, Infinix incluye cargador en la caja."
   },
   {
    "pregunta": "¿Viene liberado?",
    "respuesta": "Sí, funciona con cualquier compañía de El Salvador."
   }
  ],
  "meta_descripcion": "Infinix Hot 70 nuevo y sellado: 6000 mAh, carga 45 W, pantalla 120 Hz, NFC. Garantía de 12 meses y pago contra entrega en San Salvador.",
  "orden": 8
 },
 {
  "slug": "infinix-smart-20",
  "nombre": "Infinix Smart 20",
  "resumen": "Pantalla de 6.78\" a 120 Hz, batería de 5200 mAh y resistencia IP64",
  "descripcion": "El Infinix Smart 20 es un teléfono sencillo y resistente para el día a día: WhatsApp, llamadas, redes y videos en una pantalla grande de 6.78\" a 120 Hz.\n\nSu batería de 5200 mAh dura todo el día, trae NFC y resiste polvo y salpicaduras (IP64). Una buena opción para regalar o como segundo teléfono.",
  "caracteristicas": {
   "pantalla": "6.78\" HD+ (LCD), 120 Hz",
   "procesador": "MediaTek Helio G81 Ultimate",
   "camara": "8 MP",
   "camara_frontal": "8 MP",
   "bateria": "5200 mAh",
   "carga": "15 W (cargador de 10 W en la caja)",
   "red": "4G",
   "sistema_operativo": "Android 16, XOS 16",
   "nfc": "Sí",
   "proteccion": "IP64 (polvo y salpicaduras)",
   "peso": "185 g"
  },
  "incluye": "Teléfono\nCargador de 10 W\nCable USB-C\nHerramienta para la bandeja SIM",
  "faq": [
   {
    "pregunta": "¿Trae cargador?",
    "respuesta": "Sí, trae cargador de 10 W. El teléfono acepta hasta 15 W si usás un cargador más potente."
   },
   {
    "pregunta": "¿Viene liberado?",
    "respuesta": "Sí, funciona con cualquier compañía de El Salvador."
   }
  ],
  "meta_descripcion": "Infinix Smart 20 nuevo y sellado: 6.78\" 120 Hz, 5200 mAh, NFC, IP64. Garantía de 12 meses y pago contra entrega en San Salvador.",
  "orden": 9
 },
 {
  "slug": "samsung-galaxy-buds-4-pro",
  "nombre": "Samsung Galaxy Buds4 Pro",
  "resumen": "Cancelación de ruido adaptativa, hasta 30 h con estuche y resistencia IP57",
  "descripcion": "Los Galaxy Buds4 Pro te aíslan del ruido del bus, la oficina o la calle con cancelación de ruido adaptativa, que se ajusta sola según lo que pasa a tu alrededor.\n\nTe duran hasta 7 horas por carga y hasta 30 horas con el estuche. Resisten sudor y agua (IP57), así que podés usarlos para hacer ejercicio. Con un Galaxy se conectan al abrir el estuche.",
  "caracteristicas": {
   "tipo": "Inalámbricos in-ear (TWS)",
   "autonomia": "Hasta 7 h (6 h con cancelación); hasta 30 h con estuche",
   "cancelacion_ruido": "Sí, adaptativa",
   "resistencia": "IP57 (los audífonos)",
   "conexion": "Bluetooth 6.1",
   "peso": "5.1 g cada audífono"
  },
  "incluye": "Audífonos\nEstuche de carga\nCable USB-C\nAlmohadillas de repuesto",
  "faq": [
   {
    "pregunta": "¿Funcionan con iPhone u otros Android?",
    "respuesta": "Sí, se conectan por Bluetooth con cualquier teléfono. Algunas funciones avanzadas son exclusivas de los Samsung Galaxy."
   },
   {
    "pregunta": "¿El estuche resiste agua?",
    "respuesta": "No. Los audífonos son IP57, pero el estuche no es resistente al agua."
   }
  ],
  "meta_descripcion": "Samsung Galaxy Buds4 Pro originales y sellados: cancelación de ruido adaptativa, 30 h con estuche, IP57. Garantía y pago contra entrega.",
  "orden": 20
 },
 {
  "slug": "xiaomi-redmi-buds-8-lite",
  "nombre": "Xiaomi Redmi Buds 8 Lite",
  "resumen": "Cancelación de ruido de hasta 42 dB y hasta 36 h de batería con estuche",
  "descripcion": "Los Redmi Buds 8 Lite te dan cancelación de ruido real por poco dinero: hasta 42 dB, suficiente para escuchar tranquilo en el bus o en la calle.\n\nDuran hasta 8 horas por carga y hasta 36 horas con el estuche, y resisten sudor y salpicaduras (IP54).",
  "caracteristicas": {
   "tipo": "Inalámbricos in-ear (TWS)",
   "autonomia": "Hasta 8 h; hasta 36 h con estuche",
   "cancelacion_ruido": "Sí, híbrida hasta 42 dB",
   "resistencia": "IP54 (sudor y salpicaduras)",
   "conexion": "Bluetooth 5.4"
  },
  "incluye": "Audífonos\nEstuche de carga\nCable USB-C\nAlmohadillas de repuesto",
  "faq": [
   {
    "pregunta": "¿Funcionan con cualquier celular?",
    "respuesta": "Sí, se conectan por Bluetooth con cualquier teléfono Android o iPhone."
   }
  ],
  "meta_descripcion": "Xiaomi Redmi Buds 8 Lite originales: cancelación de ruido 42 dB, 36 h con estuche, IP54. Garantía y pago contra entrega en San Salvador.",
  "orden": 21
 },
 {
  "slug": "jbl-tune-310c",
  "nombre": "JBL Tune 310C USB-C",
  "resumen": "Audífonos de cable USB-C con sonido Hi-Res y micrófono",
  "descripcion": "Los JBL Tune 310C se conectan directo a la entrada USB-C de tu celular, sin adaptadores. Su sonido es de alta resolución (Hi-Res), con los bajos característicos de JBL.\n\nEl cable plano no se enreda, y el control de 3 botones con micrófono te deja contestar llamadas y cambiar canciones sin sacar el teléfono.",
  "caracteristicas": {
   "tipo": "De cable, in-ear",
   "conector": "USB-C",
   "conexion": "Cable plano con control de 3 botones y micrófono",
   "peso": "14.3 g"
  },
  "incluye": "Audífonos\nAlmohadillas de 3 tamaños",
  "faq": [
   {
    "pregunta": "¿Sirven para mi celular?",
    "respuesta": "Sí, si tu celular tiene entrada USB-C (todos los celulares de esta tienda la tienen). No tienen conector de 3.5 mm."
   }
  ],
  "meta_descripcion": "JBL Tune 310C USB-C originales: sonido Hi-Res, cable plano y micrófono. Garantía y pago contra entrega en San Salvador.",
  "orden": 22
 }
]$fichas$::jsonb) as d(
  slug text, nombre text, resumen text, descripcion text, caracteristicas jsonb,
  incluye text, faq jsonb, meta_descripcion text, orden int
)
where p.slug = d.slug;

-- 2. Fotos (las que ya estén cargadas no se repiten)
insert into public.imagenes (producto_id, url, alt, orden, principal)
select p.id, i.url, i.alt, i.orden, i.orden = 0
from jsonb_to_recordset($fichas$[
 {
  "slug": "samsung-galaxy-a27",
  "url": "/productos/samsung-galaxy-a27/1.webp",
  "alt": "Samsung Galaxy A27 5G, vista frontal",
  "orden": 0
 },
 {
  "slug": "samsung-galaxy-a27",
  "url": "/productos/samsung-galaxy-a27/2.webp",
  "alt": "Samsung Galaxy A27 5G, reverso",
  "orden": 1
 },
 {
  "slug": "samsung-galaxy-a27",
  "url": "/productos/samsung-galaxy-a27/3.webp",
  "alt": "Samsung Galaxy A27 5G, reverso de lado",
  "orden": 2
 },
 {
  "slug": "samsung-galaxy-a17",
  "url": "/productos/samsung-galaxy-a17/1.webp",
  "alt": "Samsung Galaxy A17, vista frontal",
  "orden": 0
 },
 {
  "slug": "samsung-galaxy-a17",
  "url": "/productos/samsung-galaxy-a17/2.webp",
  "alt": "Samsung Galaxy A17, reverso",
  "orden": 1
 },
 {
  "slug": "samsung-galaxy-a17",
  "url": "/productos/samsung-galaxy-a17/3.webp",
  "alt": "Samsung Galaxy A17, reverso de lado",
  "orden": 2
 },
 {
  "slug": "samsung-galaxy-a16",
  "url": "/productos/samsung-galaxy-a16/1.webp",
  "alt": "Samsung Galaxy A16, vista frontal",
  "orden": 0
 },
 {
  "slug": "samsung-galaxy-a16",
  "url": "/productos/samsung-galaxy-a16/2.webp",
  "alt": "Samsung Galaxy A16, reverso",
  "orden": 1
 },
 {
  "slug": "samsung-galaxy-a16",
  "url": "/productos/samsung-galaxy-a16/3.webp",
  "alt": "Samsung Galaxy A16, reverso de lado",
  "orden": 2
 },
 {
  "slug": "samsung-galaxy-a07",
  "url": "/productos/samsung-galaxy-a07/1.webp",
  "alt": "Samsung Galaxy A07, vista frontal",
  "orden": 0
 },
 {
  "slug": "samsung-galaxy-a07",
  "url": "/productos/samsung-galaxy-a07/2.webp",
  "alt": "Samsung Galaxy A07, reverso",
  "orden": 1
 },
 {
  "slug": "samsung-galaxy-a07",
  "url": "/productos/samsung-galaxy-a07/3.webp",
  "alt": "Samsung Galaxy A07, reverso de lado",
  "orden": 2
 },
 {
  "slug": "samsung-galaxy-a06",
  "url": "/productos/samsung-galaxy-a06/1.webp",
  "alt": "Samsung Galaxy A06, vista frontal",
  "orden": 0
 },
 {
  "slug": "samsung-galaxy-a06",
  "url": "/productos/samsung-galaxy-a06/2.webp",
  "alt": "Samsung Galaxy A06, reverso",
  "orden": 1
 },
 {
  "slug": "samsung-galaxy-a06",
  "url": "/productos/samsung-galaxy-a06/3.webp",
  "alt": "Samsung Galaxy A06, reverso de lado",
  "orden": 2
 },
 {
  "slug": "xiaomi-redmi-note-17",
  "url": "/productos/xiaomi-redmi-note-17/1.webp",
  "alt": "Xiaomi Redmi Note 17, frente y reverso",
  "orden": 0
 },
 {
  "slug": "xiaomi-redmi-note-17",
  "url": "/productos/xiaomi-redmi-note-17/2.webp",
  "alt": "Xiaomi Redmi Note 17, reverso",
  "orden": 1
 },
 {
  "slug": "xiaomi-redmi-note-17",
  "url": "/productos/xiaomi-redmi-note-17/3.webp",
  "alt": "Xiaomi Redmi Note 17, de lado",
  "orden": 2
 },
 {
  "slug": "samsung-galaxy-a37",
  "url": "/productos/samsung-galaxy-a37/1.webp",
  "alt": "Samsung Galaxy A37 5G, vista frontal",
  "orden": 0
 },
 {
  "slug": "samsung-galaxy-a37",
  "url": "/productos/samsung-galaxy-a37/2.webp",
  "alt": "Samsung Galaxy A37 5G, reverso",
  "orden": 1
 },
 {
  "slug": "samsung-galaxy-a37",
  "url": "/productos/samsung-galaxy-a37/3.webp",
  "alt": "Samsung Galaxy A37 5G, reverso de lado",
  "orden": 2
 },
 {
  "slug": "infinix-hot-70",
  "url": "/productos/infinix-hot-70/1.webp",
  "alt": "Infinix Hot 70, frente y reverso",
  "orden": 0
 },
 {
  "slug": "infinix-smart-20",
  "url": "/productos/infinix-smart-20/1.webp",
  "alt": "Infinix Smart 20, frente y reverso",
  "orden": 0
 },
 {
  "slug": "infinix-smart-20",
  "url": "/productos/infinix-smart-20/2.webp",
  "alt": "Infinix Smart 20, colores disponibles",
  "orden": 1
 },
 {
  "slug": "infinix-smart-20",
  "url": "/productos/infinix-smart-20/3.webp",
  "alt": "Infinix Smart 20, colores, reverso",
  "orden": 2
 },
 {
  "slug": "samsung-galaxy-buds-4-pro",
  "url": "/productos/samsung-galaxy-buds-4-pro/1.webp",
  "alt": "Samsung Galaxy Buds4 Pro, en su estuche",
  "orden": 0
 },
 {
  "slug": "samsung-galaxy-buds-4-pro",
  "url": "/productos/samsung-galaxy-buds-4-pro/2.webp",
  "alt": "Samsung Galaxy Buds4 Pro, audífonos",
  "orden": 1
 },
 {
  "slug": "samsung-galaxy-buds-4-pro",
  "url": "/productos/samsung-galaxy-buds-4-pro/3.webp",
  "alt": "Samsung Galaxy Buds4 Pro, estuche abierto",
  "orden": 2
 },
 {
  "slug": "xiaomi-redmi-buds-8-lite",
  "url": "/productos/xiaomi-redmi-buds-8-lite/1.webp",
  "alt": "Xiaomi Redmi Buds 8 Lite, audífonos y estuche",
  "orden": 0
 },
 {
  "slug": "xiaomi-redmi-buds-8-lite",
  "url": "/productos/xiaomi-redmi-buds-8-lite/2.webp",
  "alt": "Xiaomi Redmi Buds 8 Lite, estuche",
  "orden": 1
 },
 {
  "slug": "xiaomi-redmi-buds-8-lite",
  "url": "/productos/xiaomi-redmi-buds-8-lite/3.webp",
  "alt": "Xiaomi Redmi Buds 8 Lite, estuche abierto",
  "orden": 2
 },
 {
  "slug": "jbl-tune-310c",
  "url": "/productos/jbl-tune-310c/1.webp",
  "alt": "JBL Tune 310C USB-C, audífonos con control",
  "orden": 0
 },
 {
  "slug": "jbl-tune-310c",
  "url": "/productos/jbl-tune-310c/2.webp",
  "alt": "JBL Tune 310C USB-C, audífonos y cable",
  "orden": 1
 },
 {
  "slug": "jbl-tune-310c",
  "url": "/productos/jbl-tune-310c/3.webp",
  "alt": "JBL Tune 310C USB-C, detalle",
  "orden": 2
 }
]$fichas$::jsonb) as i(slug text, url text, alt text, orden int)
join public.productos p on p.slug = i.slug
where not exists (select 1 from public.imagenes x where x.producto_id = p.id and x.url = i.url);

-- 3. Colecciones de la página de inicio
insert into public.coleccion_producto (coleccion_id, producto_id, orden)
select c.id, p.id, p.orden
from jsonb_to_recordset($fichas$[
 {
  "slug": "samsung-galaxy-a27",
  "coleccion": "mas-pedidos"
 },
 {
  "slug": "samsung-galaxy-a27",
  "coleccion": "recien-llegado"
 },
 {
  "slug": "samsung-galaxy-a17",
  "coleccion": "mas-pedidos"
 },
 {
  "slug": "samsung-galaxy-a16",
  "coleccion": "mas-pedidos"
 },
 {
  "slug": "xiaomi-redmi-note-17",
  "coleccion": "recien-llegado"
 },
 {
  "slug": "samsung-galaxy-a37",
  "coleccion": "recien-llegado"
 },
 {
  "slug": "infinix-hot-70",
  "coleccion": "recien-llegado"
 },
 {
  "slug": "samsung-galaxy-buds-4-pro",
  "coleccion": "recien-llegado"
 }
]$fichas$::jsonb) as k(slug text, coleccion text)
join public.productos p on p.slug = k.slug
join public.colecciones c on c.slug = k.coleccion
on conflict do nothing;

-- Revisión: qué quedó publicado y cuántas fotos tiene cada uno
select p.nombre, p.estado, count(distinct i.id) as fotos,
       count(distinct v.id) filter (where v.precio > 0) as variantes_con_precio
from public.productos p
left join public.imagenes i on i.producto_id = p.id
left join public.variantes v on v.producto_id = p.id and v.activo
where p.slug in ('samsung-galaxy-a27', 'samsung-galaxy-a17', 'samsung-galaxy-a16', 'samsung-galaxy-a07', 'samsung-galaxy-a06', 'xiaomi-redmi-note-17', 'samsung-galaxy-a37', 'infinix-hot-70', 'infinix-smart-20', 'samsung-galaxy-buds-4-pro', 'xiaomi-redmi-buds-8-lite', 'jbl-tune-310c')
group by p.nombre, p.estado, p.orden
order by p.orden;
