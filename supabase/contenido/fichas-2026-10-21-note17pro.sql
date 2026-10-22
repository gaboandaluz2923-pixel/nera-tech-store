-- =====================================================================
-- Nera Tech — Completar fichas vacías (fichas-2026-10-21-note17pro.json, 1 productos)
-- Generado con scripts/fichas-completar.mjs. Supabase → SQL Editor → New query → pegar todo → Run.
-- Solo llena los campos que están vacíos; no cambia nombre, orden, estado ni fotos. Se puede correr más de una vez.
-- =====================================================================
with d as (
  select * from jsonb_to_recordset($fichas$[
 {
  "slug": "xiaomi-redmi-note-17-pro-5g",
  "resumen": "Batería de 8340 mAh con carga de 67 W, pantalla AMOLED 1.5K y resistencia IP68/IP69K",
  "descripcion": "El Redmi Note 17 Pro 5G trae una batería de 8340 mAh que, según Xiaomi, te dura más de dos días. Con su carga de 67 W llegás al 50% en unos 34 minutos, y hasta podés cargar otro teléfono por cable (22.5 W).\n\nSu pantalla AMOLED de 6.83\" en 1.5K a 120 Hz llega a 3500 nits, así que se ve clara aunque estés bajo el sol. Aguanta polvo y agua (IP66, IP68, IP69 e IP69K) y tiene Gorilla Glass Victus 2.\n\nLa cámara de 50 MP con estabilizador óptico te da fotos nítidas, y con el Snapdragon 6s Gen 4, NFC y 6 años de actualizaciones de seguridad, te acompaña por años.",
  "caracteristicas": {
   "pantalla": "6.83\" AMOLED 1.5K (2772 × 1280), 120 Hz, hasta 3500 nits",
   "procesador": "Snapdragon 6s Gen 4 (4 nm), ocho núcleos hasta 2.4 GHz",
   "ram": "6 GB",
   "almacenamiento": "256 GB (UFS 3.1)",
   "camara": "50 MP con estabilizador óptico + 8 MP gran angular",
   "camara_frontal": "16 MP",
   "bateria": "8340 mAh (silicio-carbono)",
   "carga": "67 W HyperCharge por USB-C; carga inversa por cable de 22.5 W",
   "red": "5G, Dual SIM (nano + nano o nano + eSIM)",
   "sistema_operativo": "Xiaomi HyperOS 3, con 6 años de actualizaciones de seguridad",
   "nfc": "Sí",
   "proteccion": "IP66, IP68, IP69 e IP69K; Gorilla Glass Victus 2; caídas de hasta 3 m (certificación SGS)",
   "peso": "223 g"
  },
  "incluye": "Teléfono\nAdaptador de corriente de 67 W\nCable USB tipo C\nPin para sacar la SIM\nFunda protectora\nGuía rápida y tarjeta de garantía",
  "faq": [
   {
    "pregunta": "¿Trae cargador?",
    "respuesta": "Xiaomi lista en la caja el cargador de 67 W, el cable USB-C y una funda, aunque aclara que el contenido puede variar según la región."
   },
   {
    "pregunta": "¿Se puede mojar?",
    "respuesta": "Tiene IP68 e IP69K: en pruebas de laboratorio aguantó 2 metros de agua dulce por 72 horas y chorros de agua a presión. Xiaomi no lo recomienda para playa ni piscina, y la garantía no cubre daños por líquidos."
   },
   {
    "pregunta": "¿Funciona con las compañías de El Salvador?",
    "respuesta": "Sí, viene liberado y funciona con cualquier compañía de El Salvador."
   }
  ],
  "meta_descripcion": "Xiaomi Redmi Note 17 Pro 5G 6/256 GB: batería 8340 mAh, carga 67 W, AMOLED 1.5K e IP68. Garantía de 12 meses y pago contra entrega."
 }
]$fichas$::jsonb) as d(
    slug text, resumen text, descripcion text, caracteristicas jsonb, incluye text, faq jsonb, meta_descripcion text)
), u as (
  update public.productos p
  set resumen = case when nullif(trim(coalesce(p.resumen, '')), '') is null then d.resumen else p.resumen end,
      descripcion = case when nullif(trim(coalesce(p.descripcion, '')), '') is null then d.descripcion else p.descripcion end,
      caracteristicas = case when coalesce(p.caracteristicas, '{}'::jsonb) = '{}'::jsonb and d.caracteristicas is not null
                             then d.caracteristicas else p.caracteristicas end,
      incluye = case when nullif(trim(coalesce(p.incluye, '')), '') is null then d.incluye else p.incluye end,
      faq = case when coalesce(p.faq, '[]'::jsonb) = '[]'::jsonb and d.faq is not null then d.faq else p.faq end,
      meta_descripcion = case when nullif(trim(coalesce(p.meta_descripcion, '')), '') is null then d.meta_descripcion else p.meta_descripcion end,
      updated_at = now()
  from d
  where p.slug = d.slug
    and (nullif(trim(coalesce(p.descripcion, '')), '') is null or coalesce(p.caracteristicas, '{}'::jsonb) = '{}'::jsonb or nullif(trim(coalesce(p.resumen, '')), '') is null
         or nullif(trim(coalesce(p.incluye, '')), '') is null or coalesce(p.faq, '[]'::jsonb) = '[]'::jsonb or nullif(trim(coalesce(p.meta_descripcion, '')), '') is null)
  returning p.slug
)
select count(*) from u;

-- Revisión: cuántos se completaron recién y cuántos publicados siguen sin descripción o características
select count(*) filter (where updated_at > now() - interval '2 minutes') as completados_ahora,
       count(*) filter (where estado <> 'oculto' and (nullif(trim(coalesce(descripcion, '')), '') is null
                        or coalesce(caracteristicas, '{}'::jsonb) = '{}'::jsonb)) as publicados_sin_ficha
from public.productos;
