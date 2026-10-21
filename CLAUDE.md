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
   transferencia hay un descuento sobre los productos (no sobre el envío); empezó en 6% (Gabriel lo
   confirmó con su contador y abogado el 14 de octubre de 2026). El % se edita en Panel → Configuración
   (clave pública `descuento_sin_tarjeta`) y llega con `configTienda().descuentoSinTarjeta` /
   `reglasBeneficios()`; las formas que lo tienen y el máximo están en `DESCUENTO_SIN_TARJETA`
   (lib/tienda/formato.ts). Se calcula igual en el navegador y en el servidor; el pedido guarda el
   monto en la columna `descuento`.
9. Nunca extraer datos de Facebook ni de Marketplace por programa. Los precios de mercado
   entran por registro manual en el panel o por fuentes públicas que lo permitan.
10. Nadie necesita cuenta para comprar. El inicio de sesión con Google se ofrece después de
    la compra ("guardá tus datos") y en "Mis pedidos"; nunca antes del checkout.
11. Panel y Mi cuenta: la información se ve como texto; **Editar** abre el formulario y **Guardar** /
    **Cancelar** vuelven a la vista (`components/admin/editable.tsx`: `Editable` y `FilaEditable`;
    `components/admin/vista.tsx` para mostrar datos). Lo nuevo se crea con "+ Nuevo…".

## Modelo de datos (resumen; el detalle está en /docs/modelo-datos.md)
proveedores, listas_precios, lineas_lista, categorias, productos, variantes, imagenes,
producto_proveedor, precios_venta, precios_observados, colecciones, coleccion_producto,
promociones, promocion_productos (campañas con envío gratis), bundles, bundle_items, cupones, clientes, pedidos, lineas_pedido, pagos,
pedido_eventos, suscriptores, eventos, gasto_pauta, configuracion, skus_ignorados, equipo (con rol),
historial (quién cambió qué), cliente_notas; vista clientes_resumen. Fase 8: compras, compra_lineas, lotes (FIFO),
movimientos_inventario (kardex), unidades (IMEI / serie / código Nera, condición y estado); funciones `inv_*`.
Fase 9: gastos (y `configuracion.finanzas` con el saldo inicial); cálculos en `lib/admin/finanzas.ts`.
Fase 10: dte_documentos, dte_eventos, dte_correlativos, dte_sesion, `clientes.datos_fiscales`, `configuracion.dte`;
facturación electrónica en `lib/dte/` (armar, validar contra los esquemas oficiales de `lib/dte/esquemas/`, firma JWS
RS512, API de Hacienda, PDF con QR, emitir/anular/contingencia, pruebas de Hacienda). Una sola serie de números de control.

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
- Disponibilidad: en bodega → "Entrega en menos de 24 horas"; del proveedor → "Recibilo en menos de 48 horas"
  (`TEXTO_DISPONIBILIDAD` en lib/tienda/formato.ts). Lo de bodega se muestra primero.
- Inventario: el stock en bodega solo cambia con las funciones `inv_*` (compras, ventas, devoluciones, ajustes con
  motivo); lo más viejo sale primero y cada venta guarda su costo real. Celulares con IMEI obligatorio; lo demás con
  serie o código Nera. Open Box = ficha aparte enlazada al modelo nuevo (`productos.condicion`).
- Ninguna oferta ni precio especial bajo el costo (el de bodega si hay) sin confirmación explícita.

## Seguridad de datos
- Roles del equipo (`equipo.rol`): `super_admin` ve y cambia todo; `operador` ve Inicio (pedidos y ventas,
  sin costos ni ganancia), Pedidos (con el IMEI que sale), Clientes, Garantía (buscar IMEI) y Catálogo (sin cambiar
  precios). Inventario y compras son solo de administradores. Las rutas de administrador
  están en `SOLO_SUPER_ADMIN` (lib/supabase/equipo.ts); sus acciones usan `superAdmin()` y las del
  operador `equipo()` (lib/admin/sesion.ts). RLS: `es_super_admin()` en todo, más políticas `operador_*`
  en las tablas que el operador usa; trigger `proteger_precio`; `lineas_pedido.costo_unitario` no se
  lee con la sesión (Analítica usa el cliente de servicio tras `superAdmin()`).
- Lectura pública (anon) solo de tablas de catálogo con RLS. Toda escritura pública (pedidos,
  eventos, suscriptores) pasa por Server Actions o Route Handlers que usan
  `createServiceClient()` del servidor; el navegador nunca escribe directo.
- Las claves van en variables de entorno (ver .env.example); nunca en el código ni en el chat.
- Tablas nuevas: desde el 30-oct-2026 Supabase ya no da acceso automático por la API a tablas nuevas en `public`.
  Cada migración que crea una tabla incluye, junto con su RLS, sus `grant` explícitos: `select` a `anon` solo si es
  de catálogo público; `select, insert, update, delete` a `authenticated` (RLS decide qué ve cada rol) y a `service_role`.

## Estructura de carpetas
/app              rutas públicas (/, /celulares, /accesorios, /producto/[slug], /carrito, /checkout, /guias)
/app/admin        panel: /login (público) y (protegido)/… (proveedores, listas, precios, catalogo,
                  pedidos (+ nuevo: pedido manual; Editar pedido en el detalle), clientes (+ importar: Excel y Brevo), inventario
                  (compras, variante/[id] kardex), garantia, promociones (+ campana, envio-gratis/[id]), correos, analitica, finanzas,
                  facturacion, configuracion, equipo, contrasena)
/app/api          webhooks (wompi, brevo), endpoints internos, dte/[id]/[pdf|json] (descarga de facturas)
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

## Datos del negocio (los valores vivos están en Panel → Configuración)
- Razón social: Nera Tech SV, S.A.S. de C.V. (nombre comercial: Nera Tech)
- WhatsApp: +503 6991 6160
- Dominio: www.neratechsv.com (neratechsv.com y nera-tech-store.vercel.app redirigen); DNS en Hostgator
- Envío: $5 fijo, sin envío gratis
- Contra entrega: en todo el país, pedidos de hasta $500; más de $500 se coordina por WhatsApp
- Tasa 0%: hasta 12 meses con tarjetas de Banco Agrícola, BAC o Cuscatlán, solo por WhatsApp
- Cuentas para transferencia: Banco Agrícola y Banco de América Central (tipo, número y titular los carga
  Gabriel en el panel; nunca escribirlos en el código ni en el chat)
- Garantía: 12 meses desde la compra; cubre defectos de fabricación y fallas de funcionamiento normal; no cubre
  daños físicos, líquidos, maltrato, equipos manipulados por terceros; no transferible ni válida para reventa;
  se reclama con factura original, DUI y el equipo
- Pie de página: "San Salvador, El Salvador · NIT 0623-090426-116-2" (sin dirección exacta)
- Medición: Meta Pixel 2742920522860703, GA4 G-ETDPRN6LNF
