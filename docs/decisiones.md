# Decisiones del proyecto

Registro corto de decisiones técnicas y de negocio, con fecha, para no volver a discutirlas.

| Fecha | Decisión | Por qué |
| --- | --- | --- |
| 2026-10-13 | Desarrollo propio con Next.js + Supabase + Vercel, no WordPress ni Shopify | Comparación de proveedores, sugerencia de precios y analítica propia no existen en los otros dos sin plugins |
| 2026-10-13 | Next.js 16 en vez de 15 | La 15 arrastra una dependencia con vulnerabilidad conocida; el proyecto es nuevo y no hay nada que migrar |
| 2026-10-13 | Escrituras públicas solo por el servidor (service role) | Más simple y seguro que dar permisos de escritura al navegador con RLS |
| 2026-10-13 | Migraciones por SQL Editor de Supabase | No hace falta instalar la CLI de Supabase en la computadora de Gabriel |
| 2026-10-13 | Nadie necesita cuenta para comprar; Google opcional después de la compra | Krug: pedir cuenta antes de comprar es la fricción que más carritos mata |
| 2026-10-13 | Tasa 0% por WhatsApp (pendiente: si es con Banco Agrícola, evaluar cuotas por Wompi) | Restricción operativa actual de Nera Tech |
| 2026-10-13 | Miami fuera por ahora; proveedores iniciales: Total Link, Maverik, Idecom, Intcomex | Indicación de Gabriel |
| 2026-10-13 | Emparejar por clave normalizada (marca, modelo, RAM, almacenamiento, color) y recordar el código del proveedor | Cada proveedor describe distinto el mismo equipo; la RAM virtual "(6+6)" de Maverik se toma como 6 |
| 2026-10-13 | La comparación de proveedores es por configuración (modelo + memoria), no por color | El color casi nunca cambia el costo y simplifica la tabla |
| 2026-10-13 | Los PDF no se leen automáticamente; se pide Excel o se pega la tabla | Las tablas en PDF se extraen mal; pegar desde Excel es confiable |
| 2026-10-13 | La tabla azul es de Idecom (no Intcomex). Un proveedor puede mandar su lista en varias partes: todas las de la fecha más reciente son vigentes | Corrección de Gabriel; Idecom manda 3 archivos |
| 2026-10-13 | Los precios de los proveedores incluyen IVA | Confirmado por Gabriel |
| 2026-10-13 | Garantía: 12 meses (texto base a revisar) | Indicación de Gabriel |
| 2026-10-13 | La tienda lee el catálogo en caché ("use cache", etiqueta `catalogo`) y el panel la refresca al guardar | Páginas instantáneas y buenas para Google; los cambios del panel se ven de inmediato |
| 2026-10-13 | Si la base de datos falla, la tienda queda vacía unos minutos en vez de dar error | Un despliegue nunca se rompe por una migración pendiente o una caída de Supabase |
| 2026-10-13 | Un producto se ve en la tienda solo si está publicado y tiene foto, categoría y precio de venta | Nunca mostrar fichas a medias ni precios en $0 |
| 2026-10-13 | Disponibilidad pública: "En stock" (unidades propias), "Disponible" (algún proveedor tiene) o "Agotado"; sin mostrar proveedores ni costos | Escasez solo con datos reales (Hormozi) sin exponer información interna |
| 2026-10-13 | Mientras no exista el carrito (fase 3), el botón principal es "Comprar por WhatsApp" con el pedido ya escrito | El canal que hoy cierra ventas, sin perder la venta mientras se construye el checkout |
| 2026-10-13 | La barra fija de compra en el teléfono aparece solo cuando el botón principal no está a la vista | Krug: un solo botón principal por pantalla |
| 2026-10-13 | Fotos: las de internet en public/productos (WebP 1000 px); las nuevas se suben desde el panel a Supabase Storage, achicadas en el navegador | Carga rápida con datos móviles; Gabriel puede reemplazarlas cuando tenga las propias |
| 2026-10-13 | Textos de las fichas en supabase/contenido/*.json → SQL con scripts/fichas-a-sql.mjs | Contenido revisable en un solo archivo; se puede volver a cargar sin duplicar |
| 2026-10-13 | JBL Tune 310C unificado en un producto con 4 colores; los productos vacíos quedan ocultos con "(unificado)" | Las listas lo describían como 3 productos; no se borra nada |
| 2026-10-14 | Solo los correos de la tabla `equipo` entran al panel y ven datos internos (RLS con `es_equipo()`) | Con clientes entrando con Google, "cualquier usuario con sesión" ya no puede ser el equipo |
| 2026-10-14 | Cuentas de cliente solo con Google (Apple descartado por ahora) | Decisión de Gabriel; Apple exige cuenta de desarrollador y puede ocultar el correo |
| 2026-10-14 | Compra sin cuenta; enlace por correo verificado, por enlace privado del pedido o por número + teléfono | Nadie necesita cuenta para comprar, pero puede ver sus pedidos después |
| 2026-10-14 | Carrito en el navegador; precios y envío siempre se calculan en el servidor con la base | El navegador nunca decide precios; si cambian mientras compra, se le avisa |
| 2026-10-14 | Wompi: un enlace de pago por intento; se marca pagado con el regreso (hash + consulta de la transacción) o con el webhook (firma wompi_hash), lo que llegue primero | Si el cliente cierra el navegador, el webhook igual marca el pago; nunca se registra dos veces |
| 2026-10-14 | Tasa 0% sigue solo por WhatsApp | Decisión de Gabriel |
| 2026-10-14 | Factura: por ahora se emite en Factura Llama y se sube el PDF al pedido; el cliente la descarga en su pedido. Más adelante: emisión automática con la API de Hacienda | El sistema actual no tiene integración; Gabriel quiere automatizarlo después |
| 2026-10-14 | Por facturar: pagado + confirmado (tarjeta, transferencia, tasa 0%); contra entrega desde el día siguiente a la entrega | Regla de Gabriel |
| 2026-10-14 | Envío gratis "con accesorio" = pedido con un celular y al menos un accesorio | Premia el bundle (Completá tu equipo); se activa en Configuración |
| 2026-10-14 | Al confirmar un pedido se descuentan las unidades propias en bodega | El stock propio refleja lo vendido sin pasos extra |

| 2026-10-14 | "Mi cuenta": datos, teléfono alterno, cumpleaños (día y mes, sin año), hasta 5 direcciones y permiso de ofertas | Pedido de Gabriel; el permiso explícito hace falta antes de mandar promociones |
| 2026-10-14 | Puntos (fase 4): opción B, 1 punto por cada $10 (1 punto = $0.10), se ganan con pedido entregado y pagado, vencen a 12 meses; regalo de cumpleaños de $5. Reglas editables | Decisión de Gabriel; con margen de 8–12% en celulares cuesta ~10% de la ganancia |
| 2026-10-14 | Correos de pedidos con Brevo adelantados de la fase 4: salen de pedidos@neratechsv.com, responden y avisan a Gmail de Gabriel; se envían después de responder (after) y quedan en el historial | Gabriel no recibió confirmación de su primera compra |
| 2026-10-14 | Brevo: bloqueo de IP desactivado para las claves API | Vercel cambia de IP; la clave solo vive en Vercel como secreta |
| 2026-10-14 | 6% de descuento sobre los productos (no el envío) al pagar en efectivo contra entrega o por transferencia; el precio publicado es el de tarjeta y tasa 0%. Reemplaza la regla "un solo precio para todas las formas de pago" | Decisión de Gabriel, confirmada con su contador y abogado. Se muestra en la ficha, el checkout, Envíos y pagos, el pedido, el panel y los correos; se guarda en `pedidos.descuento` |
| 2026-10-14 | Fase 4: el 6% siempre aplica y además UN beneficio por pedido (cupón o Puntos Nera) | Decisión de Gabriel |
| 2026-10-14 | Ningún cupón ni canje de puntos deja el pedido bajo costo: se recorta al máximo con contribución ≥ 0 (costo puesto del mejor proveedor + $1.75 + 2.5%) | Decisión de Gabriel; margen de 8–12% en celulares |
| 2026-10-14 | Regalo de cumpleaños: cupón personal de $5, compra desde $20, válido todo el mes del cumpleaños; lo crea la revisión diaria (cron de Vercel 7:00 a. m.) | Decisión de Gabriel |
| 2026-10-14 | Publicidad por exclusión voluntaria: todos reciben salvo que marquen "No quiero recibir publicidad" (checkout, Mi cuenta o enlace de baja en cada correo de ofertas, con List-Unsubscribe de un toque) | Decisión de Gabriel. Se le recomendó confirmarlo con su abogado por la Ley de Protección de Datos Personales (Decreto 144, 2024) |
| 2026-10-14 | Ofertas con fecha por variante (promocion_precios); la caché de la tienda se refresca a la hora en que empieza o termina una oferta y el navegador muestra el precio normal si ya terminó | Que el precio cambie solo, sin tocar el panel |
| 2026-10-14 | Combos = producto principal (cualquier variante) + accesorios con ahorro fijo en dólares | Más simple que un precio de combo y no se rompe si cambia el precio de un accesorio |
| 2026-10-14 | Puntos: se ganan sobre lo pagado por productos (sin envío) al quedar entregado y pagado; se usan con sesión de Google; al cancelar se devuelven los usados y se quitan los ganados | Evita dar puntos por pedidos que no se cobran |
| 2026-10-15 | Fase 5: medición desde un solo módulo (lib/analytics.ts) → tabla `eventos` + GA4 + Meta Pixel; los pasos del embudo también van a Meta desde el servidor con el mismo event_id | Meta recomienda navegador + servidor; no se pierden con bloqueadores |
| 2026-10-15 | La compra (Purchase) va a Meta solo desde el servidor y solo cuando el pago está confirmado; correo y teléfono cifrados con SHA-256 | Que Meta aprenda de ventas reales, no de pedidos que luego se cancelan |
| 2026-10-15 | Aviso sencillo de cookies (no bloquea la compra) y texto de medición en Privacidad | Recomendado; Gabriel no tuvo preferencia |
| 2026-10-15 | Rotación = unidades vendidas de la configuración en 30 días (≥5 rápida, 1–4 normal, 0 lenta) | Recomendado; Gabriel no tuvo preferencia |
| 2026-10-15 | Precio sugerido: costo + margen objetivo, ajustado por mercado (anotado a mano) y rotación; nunca bajo el mínimo sin pérdida; se aplica solo con "Usar" | CLAUDE.md: siempre con explicación y aprobación humana |
| 2026-10-15 | Se guarda el costo puesto de cada línea al vender (`lineas_pedido.costo_unitario`) | La contribución de semanas pasadas no cambia cuando cambian los costos |
| 2026-10-15 | Meta: conjunto de datos nuevo "Nera Tech tienda" (no el "OFFLINE DATA" que ya existía); configuración manual, sin Birch | Evita mezclar datos y pagar un intermediario |
| 2026-10-15 | Vercel en plan Hobby por ahora; pasar a Pro ($20/mes) en 1–2 meses o el día que empiece la pauta pagada, lo que pase primero | Decisión de Gabriel. Hobby es solo para uso no comercial y pausa el sitio si se pasan los límites |
| 2026-10-15 | Dominio principal www.neratechsv.com (neratechsv.com redirige); DNS sigue en Hostgator; solo se cambian el A de @ y el CNAME de www | Opción recomendada por Vercel; el correo y Brevo no se tocan. El hosting viejo de Hostgator se puede cancelar después, cuidando el dominio |
| 2026-10-15 | Fase 6: Search Console (propiedad de dominio) y Meta (dominio) verificados con registros TXT nuevos en Hostgator; no se tocó ningún registro existente | Verificar el dominio completo (con y sin www) sin depender del HTML del sitio |
| 2026-10-15 | Contra entrega en todo el país hasta $500 por pedido; sobre ese monto se coordina por WhatsApp. Se guarda en `municipios_contra_entrega` como { municipios, todo_el_pais, maximo } (acepta el formato viejo de lista) y el servidor valida igual que el checkout | Indicación de Gabriel. Misma clave pública: no hizo falta migración |
| 2026-10-15 | Envío $5 fijo, sin envío gratis | Indicación de Gabriel |
| 2026-10-15 | Tasa 0% hasta 12 meses con tarjetas de Banco Agrícola, BAC o Cuscatlán, solo por WhatsApp | Indicación de Gabriel |
| 2026-10-15 | Transferencias a Banco Agrícola y Banco de América Central; el número de cuenta lo escribe Gabriel en el panel | Los números de cuenta no pasan por el chat |
| 2026-10-15 | Garantía según la carta de Nera Tech: 12 meses, sin cambio inmediato (antes el texto base decía 7 días), no transferible ni válida para reventa; se reclama con factura, DUI y equipo | La carta es la política oficial |
| 2026-10-15 | Pie de página: "San Salvador, El Salvador · NIT 0623-090426-116-2", sin dirección exacta | Indicación de Gabriel |
| 2026-10-15 | Velocidad: CSS en línea (`experimental.inlineCss`), foto LCP con `fetchPriority="high"` + `loading="eager"` (en Next 16 `priority` está obsoleto) y la barra de confianza dentro del contenido que carga después; checkout con alto mínimo | LCP móvil: inicio 2.4→0.9 s, ficha 2.3→2.1 s, celulares 2.4 s, checkout 2.4 s; CLS de fichas y celulares 0.10→0 / 0.03 |
| 2026-10-15 | Fichas y fotos de 82 productos ocultos cargadas con `supabase/contenido/fichas-2026-10-15.sql` (generado con `--sin-publicar`: no cambia el estado). Specs y fotos solo de páginas oficiales; 201 fotos en `public/productos/<slug>/` procesadas con `scripts/procesar-foto.py` | Angel solo sube las fotos de 9 productos sin foto oficial encontrada. Nada se publica sin precio aprobado por Gabriel |
| 2026-10-15 | Fase 7: dos roles, `super_admin` y `operador` (columna `equipo.rol`, funciones `mi_rol()` y `es_super_admin()`, migración 0008). El operador ve Inicio, Pedidos, Clientes y Catálogo; no ve costos, proveedores, precios de compra, ganancia, promociones, correos, analítica, configuración ni equipo | Pedido de Gabriel. El bloqueo está en la base (RLS) y en el panel (proxy.ts, `superAdmin()` en cada acción), no solo en el menú |
| 2026-10-15 | El operador ve el resumen de pedidos y ventas (Inicio) pero no la contribución ni el costo | Pedido de Gabriel: Angel debe saber cuántos pedidos y ventas llevamos |
| 2026-10-15 | El precio de venta solo lo cambia un super admin: trigger `proteger_precio` en variantes; el operador sí cambia color, stock y si se muestra | El panel ya no lo ofrece, y la base lo impide aunque alguien llame la API |
| 2026-10-15 | `lineas_pedido.costo_unitario` no se puede leer con la sesión del panel (permiso por columna). Analítica lo lee desde el servidor con la clave de servicio después de `superAdmin()` | Un operador con su sesión no puede ver costos por ningún lado |
| 2026-10-15 | Historial con nombre: tabla `historial` llenada por triggers en productos, variantes, imágenes y clientes (quién = correo de la sesión; "tienda" = el servidor). Los pedidos siguen en `pedido_eventos`. Los nombres salen de `equipo.nombre` | No depende de que cada acción se acuerde de anotar |
| 2026-10-15 | Equipo en el panel: el super admin agrega personas con contraseña temporal que se muestra una vez (no se envía por correo: el correo de Supabase solo llega a miembros del proyecto); "Mi contraseña" para cambiarla; "Olvidó su contraseña" genera otra | Gabriel ya no entra a Supabase para dar acceso |
| 2026-10-15 | Pedidos manuales (`/admin/pedidos/nuevo`) con canal (`pedidos.canal`: web, whatsapp, instagram, facebook, tiktok, llamada, en_persona, otro) y `creado_por`. Precios de la base (oferta vigente si hay), descuento sin tarjeta y envío como la tienda; sin combos ni cupones. Precio especial por línea solo para super admin | Todas las ventas del negocio pasan por el sistema (pedido de Gabriel) |
| 2026-10-15 | Meta: los pedidos manuales pagados se envían como compra con `action_source` chat / physical_store / phone_call (no "website") | Son ventas reales que pueden venir de los anuncios, sin mentirle a Meta sobre el origen |
| 2026-10-15 | CRM: `clientes.etiquetas`, tabla `cliente_notas`, vista `clientes_resumen` (security_invoker). Un cliente por correo; los de pedidos manuales sin correo se buscan por teléfono, y si después compra en la tienda con el mismo teléfono se le agrega el correo | Un solo historial por cliente aunque compre por varios canales |
| 2026-10-15 | El descuento sin tarjeta es editable en Configuración (clave pública `descuento_sin_tarjeta`, empieza en 6%, máximo 30%). Lo usan la tienda, el checkout, el servidor al crear el pedido, la sugerencia de precios y el mínimo sin pérdida | Pedido de Gabriel (para probar 8%, 9%…) |
| 2026-10-15 | Todo el panel y Mi cuenta muestran la información como texto con **Editar** → **Guardar** / **Cancelar** (`components/admin/editable.tsx`); lo nuevo con "+ Nuevo…" | Pedido de Gabriel: menos cambios por accidente y más fácil de leer |
| 2026-10-15 | Mi cuenta: primero los pedidos, los Puntos Nera en una línea que se abre, y "Datos de mi cuenta" detrás de un botón | Pedido de Gabriel |
| 2026-10-15 | Quitar el fondo gratis en el navegador con U2-Net (u2netp, Apache 2.0) y onnxruntime-web 1.22.0 (MIT), servidos desde `/modelos` y `/ort` del propio sitio, sin hilos (no pide encabezados especiales). Además toda foto subida se recorta, centra con 6% de aire y queda de 1200 px en WebP | Sin costo por foto y sin mandar fotos a terceros. Descartados por licencia: @imgly/background-removal (AGPL) y RMBG-1.4 (no comercial) |
| 2026-10-15 | Fase 8: dos disponibilidades en la tienda. En bodega (unidades propias): "Entrega en menos de 24 horas". Del proveedor: "Recibilo en menos de 48 horas". Cada variante puede forzarse a "bajo pedido" o "agotado" (`variantes.disponibilidad_manual`) | Pedido de Gabriel. "Recibilo" en vez de "recibe" por el voseo de la tienda |
| 2026-10-15 | Lo que está en bodega se muestra primero: listados ordenados bodega → proveedor → agotado, y la ficha y "Completá tu equipo" arrancan en la variante en bodega | Prioridad de Gabriel: mover primero el inventario propio |
| 2026-10-15 | Inventario por lotes (FIFO): cada compra entra como lote con su costo y su fecha; las ventas salen del lote más viejo. `variantes.stock` = suma de los lotes y solo lo cambian las funciones `inv_*` (si alguien lo cambia directo, un trigger pone los lotes al día como ajuste) | Las unidades entran a un precio y salen a otro: el costo real de cada venta queda en `lineas_pedido.costo_unitario` |
| 2026-10-15 | El costo de una venta: lo que salió de bodega a su costo real + lo demás al costo del proveedor que traía la línea (`costo_proveedor`) | Un pedido puede salir parte de bodega y parte pedida al proveedor |
| 2026-10-15 | Compras al proveedor con tipo de documento: crédito fiscal (costo sin IVA), factura de consumidor final (costo con IVA) o sin IVA (Miami); otros costos (flete, aduana) se reparten en el costo de cada unidad según su valor. Contado o crédito con días y vencimiento (`vence_en`), y cuentas por pagar | Pedido de Gabriel (10, 14 o más días según el proveedor) |
| 2026-10-15 | La factura se lee sola: el JSON del DTE (exacto) o el PDF como texto (`unpdf` 1.8.1, MIT); lo que no se entiende se corrige a mano antes de recibir. Una factura (código de generación) no se carga dos veces | Opción 1 de Gabriel (subir el PDF) sin pagar un servicio de lectura. Se fijó 1.8.1 porque 1.9.0 salió el mismo día |
| 2026-10-15 | Cada unidad con identificador (`unidades`): IMEI obligatorio en celulares y Open Box (15 dígitos, dígito verificador), número de serie o código Nera NT-000123 en lo demás; condición nuevo / Open Box / usado revisada al recibir; no se repite ningún identificador | Pedido de Gabriel: saber en una garantía si el equipo es nuestro |
| 2026-10-15 | Al confirmar un pedido se apartan las unidades más viejas con su IMEI; quien entrega puede cambiar el IMEI por el que realmente sale. Al cancelar, devolver o regresar a "por confirmar" vuelven a su mismo lote. La búsqueda de garantía también la usa el operador (sin costos) | El IMEI vendido queda ligado al pedido y al cliente |
| 2026-10-15 | Los 128 IMEI y números de serie del registro anterior (Excel "Catálogo maestro", órdenes de compra) se cargan como unidades "registradas antes del sistema" (sin producto). Al recibirlos en bodega se pasan solos a su producto | La garantía reconoce los equipos vendidos antes del sistema; el Excel no tenía el color de cada uno |
| 2026-10-15 | Open Box: ficha aparte en la categoría Open Box (`productos.condicion`, `producto_base_id`, `condicion_detalle`), sin claves de proveedor, con aviso "caja abierta, no sellado de fábrica", su condición por escrito y enlace al modelo nuevo; si no tiene fotos o características usa las del modelo nuevo; para Google es `UsedCondition` | Pedido de Gabriel. Una unidad devuelta abierta se pasa a Open Box conservando su costo |
| 2026-10-15 | Ninguna oferta ni precio especial por debajo del costo sin confirmarlo: se compara con el costo de lo que hay en bodega (el lote más caro con existencia) o, si no hay, con el del proveedor | Pedido de Gabriel: cuidado con las promociones |
| 2026-10-15 | Clientes del Excel (pestaña ORDENES) al CRM con la etiqueta "cliente anterior": uno por teléfono o correo y una nota por compra (qué, cuánto, cómo pagó, marca [Excel #N] para no repetir); no se crean pedidos (no inflan las ventas). Lista "Clientes Nera Tech" en Brevo con quienes tienen correo y aceptan publicidad; CSV para WhatsApp | Pedido de Gabriel: lo más importante son los correos y teléfonos para campañas |
| 2026-10-15 | Fase 9 Finanzas: una venta cuenta el mes en que se entrega; IVA = total × 13/113; costo de lo vendido = costo guardado en cada línea; envío y cobro = lo anotado en Gastos o, si no hay, el estimado de Analítica; gastos con crédito fiscal cuentan sin IVA. Flujo de caja por fechas reales de cobro y pago desde un saldo inicial | Criterios simples y explicados en pantalla; el IVA y los libros son un estimado para el contador |
| 2026-10-15 | Campañas de correo: el panel arma el correo con productos, precios y etiquetas reales («En bodega», «Oferta hasta…») y lo deja como borrador en Brevo; agendar y enviar se hace en Brevo | Nada sale a los clientes sin que Gabriel lo revise |

## Fase actual
Fase 1 — Proveedores, listas y mejor precio: terminada.
Fase 2 — Catálogo y tienda: terminada y en producción (14 oct 2026).
Fase 3 — Carrito, checkout sin cuenta, Wompi, Ver mi pedido, Mis pedidos y Mi cuenta con Google, Pedidos y Por facturar:
terminada y en producción (14 oct 2026). Primera compra real con tarjeta: pedido #1001, aprobada.
Fase 4 — Ofertas con fecha, combos, cupones, Puntos Nera (opción B), regalo de cumpleaños, avisos "ya hay stock",
baja de publicidad y correos con Brevo: terminada y en producción (14 oct 2026).
Fase 5 — Medición (eventos propios, GA4, Meta Pixel y API de conversiones), panel de Analítica, precios de mercado y
sugerencia con explicación: terminada (15 oct 2026). Requiere migración 0007 y las variables de GA4 y Meta en Vercel.
Fase 6 — Dominio propio, Search Console, Meta, Google Cloud y GA4 en www.neratechsv.com, datos del negocio, velocidad
en móvil y compras de prueba: terminada (15 oct 2026). Pendiente de Gabriel: cuentas bancarias en Configuración y
anular en Wompi los pagos de prueba.
Fase 7 — Roles (administrador y operador), Equipo en el panel, historial con nombre, pedidos manuales, Clientes (CRM),
descuento sin tarjeta editable, Editar → Guardar en todo el panel, Mi cuenta con pedidos primero y quitar fondo de
fotos gratis: terminada (15 oct 2026).
Fase 8 — Inventario por lotes, compras al proveedor (PDF/JSON o a mano, crédito y cuentas por pagar), IMEI y serie por
unidad, garantía, Open Box, bodega primero en la tienda, ofertas sin pérdida, clientes del Excel y lista de Brevo:
terminada (15 oct 2026).
Fase 9 — Finanzas (resultados, indicadores, flujo de caja, gastos, IVA y libros en CSV) y campañas de correo desde el
panel: en curso (15 oct 2026). Requiere la migración 0010.
