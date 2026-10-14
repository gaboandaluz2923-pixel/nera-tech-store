# Nera Tech Store — CLAUDE.md

## Qué es este proyecto
Tienda en línea y panel de administración de Nera Tech, negocio de venta de celulares
y accesorios en El Salvador. Vende Samsung gama baja importado desde Miami (Galaxy A27
y modelos cercanos, Galaxy Buds 4) a precio agresivo con margen de 8–12%, y accesorios
(cases, protectores, cargadores, audífonos, bocinas) con margen de 10–30%. Compra a
proveedores locales (Total Link, Maverik, Idecom, Intcomex) y a Miami. El cliente paga
contra entrega, por transferencia, con tarjeta por Wompi, o con tasa 0% procesada por
WhatsApp. El canal de cierre histórico es WhatsApp; el sitio debe vender solo y, cuando
no, llevar al cliente a WhatsApp con el pedido ya armado.

El dueño (Gabriel) tiene conocimientos técnicos básicos. Explicá cada paso en español,
sin jerga innecesaria, y decí qué comando correr y qué va a pasar antes de correrlo.

## Stack (no cambiar sin preguntar)
- Next.js 16 (App Router, Cache Components activado) + TypeScript + Tailwind CSS 4 + shadcn/ui (Base UI)
  - Leer `node_modules/next/dist/docs/` antes de usar una API de Next: esta versión cambió
    convenciones (proxy.ts en vez de middleware, `use cache`, Suspense obligatorio para cookies()).
  - shadcn aquí usa Base UI: los botones-enlace se hacen con `render={<a … />}`, no con `asChild`.
- Supabase: PostgreSQL, Auth (solo para /admin; Google opcional para clientes después de comprar), Storage (imágenes)
- Vercel para hosting; GitHub para el código (rama main = producción)
- Wompi El Salvador (api.wompi.sv): enlaces de pago + webhooks
- Brevo: listas, etiquetas y secuencias de correo (API)
- Analítica: tabla propia `eventos` + Google Analytics 4 + Meta Pixel y API de conversiones
- Idioma de todo lo visible: español de El Salvador (voseo: "elegí", "escribinos")
- Moneda: USD con dos decimales; impuestos incluidos en el precio mostrado

## Principios de diseño (obligatorios)
1. Móvil primero. Todo se diseña para un teléfono con datos 4G y se adapta a escritorio.
2. No me hagas pensar (Krug): un botón principal por pantalla; lo clicable parece clicable;
   convenciones conocidas (logo al inicio, carrito arriba a la derecha, buscador arriba);
   texto mínimo; precio y costo de envío siempre visibles.
3. El cliente es el héroe (StoryBrand): el encabezado dice qué vendemos, cómo mejora su
   vida y qué hacer; plan de tres pasos; llamado directo (Comprar) y transicional (WhatsApp).
4. Valor antes que precio (Hormozi): bundles "Completá tu equipo", garantía escrita visible,
   escasez y urgencia solo con datos reales (stock del inventario, fechas de promoción).
5. Confianza como infraestructura: contra entrega visible desde la ficha, reseñas con capturas,
   NIT y dirección en el pie, IMEI verificado, garantía clara. El mercado salvadoreño desconfía
   de comprar en línea; cada página debe reducir ese miedo.
6. Todo se mide (Lean Analytics): cada interacción relevante emite un evento desde un solo
   módulo (`lib/analytics.ts`) hacia la tabla propia, GA4 y Meta.
7. Rendimiento: LCP < 2.5 s en móvil, imágenes con next/image, sin scripts de terceros que no
   estén en esta lista.
8. El precio publicado es el de tarjeta y tasa 0%. Al pagar en efectivo contra entrega o por
   transferencia hay 6% de descuento sobre los productos (no sobre el envío). Gabriel lo confirmó
   con su contador y abogado el 14 de octubre de 2026. El porcentaje y las formas que lo tienen
   viven en `DESCUENTO_SIN_TARJETA` (lib/tienda/formato.ts) y se calculan igual en el navegador y
   en el servidor; el pedido guarda el monto en la columna `descuento`.
9. Nunca extraer datos de Facebook ni de Marketplace por programa. Los precios de mercado
   entran por registro manual en el panel o por fuentes públicas que lo permitan.
10. Nadie necesita cuenta para comprar. El inicio de sesión con Google se ofrece después de
    la compra ("guardá tus datos") y en "Mis pedidos"; nunca antes del checkout.

## Modelo de datos (resumen; el detalle está en /docs/modelo-datos.md)
proveedores, listas_precios, lineas_lista, categorias, productos, variantes, imagenes,
producto_proveedor, precios_venta, precios_observados, colecciones, coleccion_producto,
promociones, bundles, bundle_items, cupones, clientes, pedidos, lineas_pedido, pagos,
pedido_eventos, suscriptores, eventos, gasto_pauta, configuracion, skus_ignorados.

Emparejamiento de listas: `lib/listas/normalizar.ts` (descripción → marca|modelo|ram|almacenamiento|color),
`lib/listas/columnas.ts` (lectura de CSV/pegado y detección de columnas), `lib/admin/importar.ts` (núcleo de
importar/crear/asociar/ignorar, probado contra PostgREST local) y `lib/admin/precios-tabla.ts` (mejor proveedor).
Listas reales de ejemplo en `docs/listas-ejemplo/`.

Reglas de negocio:
- Costo puesto = precio de lista + (costos fijos del lote del proveedor ÷ unidades);
  para Miami incluye transportadora, flete, seguro, DAI e IVA 13% sobre CIF.
- Mejor proveedor = menor costo puesto entre los que tienen stock; empate → mayor plazo de crédito.
- Contribución = precio + envío cobrado − costo puesto − 1.75 − 2.5% × (precio + envío cobrado).
- Precio sugerido = f(costo puesto, margen objetivo por categoría, min/max/moda observados,
  rotación); siempre con explicación en texto; nunca se aplica sin aprobación humana.
- Stock mostrado en la ficha = stock real; si es 0, la ficha ofrece "Avisame cuando haya".

## Seguridad de datos
- Lectura pública (anon) solo de tablas de catálogo con RLS. Toda escritura pública (pedidos,
  eventos, suscriptores) pasa por Server Actions o Route Handlers que usan
  `createServiceClient()` del servidor; el navegador nunca escribe directo.
- Las claves van en variables de entorno (ver .env.example); nunca en el código ni en el chat.

## Estructura de carpetas
/app              rutas públicas (/, /celulares, /accesorios, /producto/[slug], /carrito, /checkout, /guias)
/app/admin        panel: /login (público) y (protegido)/… (proveedores, listas, precios, catalogo,
                  pedidos, promociones, correos, analitica, configuracion)
/app/api          webhooks (wompi, brevo), endpoints internos
/components/ui    shadcn (no editar a mano; regenerar con la CLI)
/components/tienda, /components/admin   componentes propios
/lib              supabase/, analytics, wompi, brevo, pricing (motor de sugerencia), whatsapp
/supabase/migrations   SQL numerado; se ejecuta en el SQL Editor de Supabase en orden
/docs             modelo de datos, decisiones, manual del panel (en español, para el equipo)
/proxy.ts         protege /admin con la sesión de Supabase

## Forma de trabajar
- Antes de cada fase: proponer el plan en una lista corta y esperar "ok".
- Cambios pequeños y frecuentes; un commit por funcionalidad con mensaje en español.
- Nunca borrar datos ni tablas sin confirmación explícita.
- Cada funcionalidad nueva del panel se documenta en /docs/manual-panel.md con capturas
  de pantalla descritas en texto, para que el equipo de Nera Tech la use sin Claude.
- Al terminar una fase: correr `npm run build`, probar en un teléfono real (dar la URL de
  Vercel) y listar qué se probó.
- Si algo no se puede hacer como se pidió, decirlo y proponer la alternativa más cercana.
- Fase actual: ver `FASE_ACTUAL` en app/admin/(protegido)/layout.tsx y /docs/decisiones.md.

## Datos del negocio (completar)
- WhatsApp: [número con código de país]
- Dominio: [tudominio.com]
- Envío: $5 fijo; gratis desde $[monto] o con accesorio en el pedido [confirmar]
- Contra entrega: San Salvador y área metropolitana [confirmar municipios]
- Tasa 0%: hasta [N] meses, solo por WhatsApp
- Cuentas bancarias para transferencia: [banco, tipo, número, nombre]
- Garantía: [plazo y cobertura]
- NIT y dirección para el pie: [datos]
