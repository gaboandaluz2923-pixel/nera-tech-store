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
## Fase actual
Fase 1 — Proveedores, listas y mejor precio: terminada.
Fase 2 — Catálogo y tienda: terminada y en producción (14 oct 2026).
Fase 3 — Carrito, checkout sin cuenta, Wompi, Ver mi pedido, Mis pedidos y Mi cuenta con Google, Pedidos y Por facturar:
terminada y en producción (14 oct 2026). Primera compra real con tarjeta: pedido #1001, aprobada.
Fase 4 — Ofertas con fecha, combos, cupones, Puntos Nera (opción B), regalo de cumpleaños, avisos "ya hay stock",
baja de publicidad y correos con Brevo: terminada y en producción (14 oct 2026).
Fase 5 — Medición (eventos propios, GA4, Meta Pixel y API de conversiones), panel de Analítica, precios de mercado y
sugerencia con explicación: terminada (15 oct 2026). Requiere migración 0007 y las variables de GA4 y Meta en Vercel.
