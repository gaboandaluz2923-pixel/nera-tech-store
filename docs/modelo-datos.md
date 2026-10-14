# Modelo de datos de Nera Tech Store

Base de datos PostgreSQL en Supabase. Cada tabla tiene `id` (uuid) y `created_at`; las que se
editan tienen `updated_at` (se actualiza solo). Los precios son `numeric(10,2)` en USD.

## Cómo se relacionan (en una frase cada una)

- Un **proveedor** manda **listas de precios** con fecha; cada lista tiene **líneas** (una por SKU del proveedor).
- Una línea se empareja con una **variante** de **producto** mediante **producto_proveedor**; ese emparejamiento se recuerda para la siguiente lista.
- Un **producto** (Galaxy A27) tiene **variantes** (128 GB negro, 256 GB azul), **imágenes** y pertenece a una **categoría**; puede estar en varias **colecciones**.
- Cada variante tiene un **precio de venta** vigente y un historial (**precios_venta**); los **precios observados** en el mercado alimentan la sugerencia.
- Una **promoción** es de uno de cuatro tipos; los **bundles** y **cupones** son promociones con sus propias tablas.
- Un **cliente** hace **pedidos** con **líneas** y **pagos**; cada cambio de estado queda en **pedido_eventos**.
- Los **suscriptores** son correos capturados (con origen y, si aplica, el producto del que esperan aviso).
- Los **eventos** registran lo que hace cada visitante; **gasto_pauta** permite calcular costo por conversación.
- **configuracion** guarda WhatsApp, envíos, municipios, cuentas bancarias y meses de tasa 0%.

## Tablas

### proveedores
| Columna | Tipo | Nota |
| --- | --- | --- |
| nombre | text | Total Link, Maverik, Idecom, Intcomex, Miami |
| tipo | `local` \| `importacion` | Define qué costos fijos aplican |
| contacto, telefono, correo | text | |
| plazo_credito_dias | int | 0 = de contado; desempata entre proveedores |
| transporte_lote, flete_lote, seguro_lote | numeric | USD por lote (importación) |
| dai_pct, iva_pct | numeric | % sobre CIF; IVA 13% en El Salvador |
| unidades_lote | int | Para prorratear los costos fijos |
| activo | bool | |

### listas_precios
| Columna | Tipo | Nota |
| --- | --- | --- |
| proveedor_id | → proveedores | |
| fecha | date | Fecha de la lista, no de la carga |
| archivo_url, nombre_archivo | text | Original guardado en Storage |
| mapeo_columnas | jsonb | Cómo se leyeron las columnas; se reutiliza |
| notas | text | |

### lineas_lista
| Columna | Tipo | Nota |
| --- | --- | --- |
| lista_id | → listas_precios | |
| sku_proveedor | text | Código del proveedor |
| descripcion | text | Tal como viene en la lista |
| precio | numeric | |
| stock | int | null si la lista no lo trae |
| variante_id | → variantes (null) | Se llena al emparejar |

### categorias
| Columna | Tipo | Nota |
| --- | --- | --- |
| slug, nombre | text | celulares, audifonos, cargadores, proteccion, bocinas |
| plantilla_caracteristicas | jsonb | Lista de campos que pide la ficha (pantalla, RAM…) |
| margen_objetivo_pct | numeric | 8–12 celulares, 10–30 accesorios |
| orden | int | |

### productos
| Columna | Tipo | Nota |
| --- | --- | --- |
| slug | text único | samsung-galaxy-a27 |
| nombre, marca, modelo | text | |
| categoria_id | → categorias | |
| descripcion | text | Propia, 150–250 palabras (SEO) |
| caracteristicas | jsonb | Según la plantilla de la categoría |
| incluye | text | Qué trae la caja |
| garantia | text | Plazo y cobertura |
| faq | jsonb | [{pregunta, respuesta}] |
| estado | `activo` \| `agotado` \| `oculto` | Oculto no se muestra ni se indexa |
| orden | int | Orden dentro de la categoría |
| meta_titulo, meta_descripcion | text | SEO; si están vacíos se generan |

### variantes
| Columna | Tipo | Nota |
| --- | --- | --- |
| producto_id | → productos | |
| nombre | text | "128 GB · Negro" |
| memoria, color | text | |
| sku | text único | Interno |
| stock | int | Stock real; la ficha lo muestra |
| precio | numeric | Precio de venta vigente |
| activo | bool | |

### imagenes
| Columna | Tipo | Nota |
| --- | --- | --- |
| producto_id | → productos | |
| url, alt | text | alt generado del nombre si está vacío |
| orden | int | |
| principal | bool | La que va en listados y anuncios |

### producto_proveedor
| Columna | Tipo | Nota |
| --- | --- | --- |
| variante_id | → variantes | |
| proveedor_id | → proveedores | |
| sku_proveedor | text | Único por (proveedor, sku_proveedor) |
| ultimo_precio, ultimo_stock, ultima_fecha | | Copia de la última lista |
| activo | bool | |

### precios_venta (historial)
| Columna | Tipo | Nota |
| --- | --- | --- |
| variante_id | → variantes | |
| precio, precio_anterior | numeric | |
| razon | text | "sugerencia aceptada", "promoción", "manual" |
| usuario | text | Correo de quien lo cambió |

### precios_observados
| Columna | Tipo | Nota |
| --- | --- | --- |
| producto_id | → productos | |
| precio | numeric | |
| fuente | text | marketplace, tienda_fisica, encuentra24, competidor_web |
| nuevo_sellado | bool | Solo se usan los `true` para comparar |
| url, notas | text | |
| fecha | date | |

### colecciones y coleccion_producto
Colecciones con slug y nombre (mas-pedidos, recien-llegado, quincena); la tabla puente lleva `orden`.

### promociones
| Columna | Tipo | Nota |
| --- | --- | --- |
| tipo | `bundle` \| `descuento_fecha` \| `cupon` \| `envio_gratis` | |
| nombre, descripcion | text | |
| inicio, fin | timestamptz | La web la muestra solo si está vigente |
| config | jsonb | Según tipo: % o monto, productos, umbral de envío |
| activa | bool | |

Las ofertas con fecha usan `tipo = descuento_fecha` y sus precios van en `promocion_precios`.

### promocion_precios (fase 4)
promocion_id, variante_id, precio (precio de oferta). La tienda (anon) solo ve las filas de promociones activas
y dentro de sus fechas. La vista `promociones_proximas` dice cuándo empieza la próxima (para refrescar la caché).

### bundles y bundle_items
`bundles`: producto_principal_id, nombre, **descuento** (ahorro en dólares por cada combo completo), activo;
precio_bundle y promocion_id ya no se usan. `bundle_items`: bundle_id, variante_id, cantidad.

### cupones
codigo único (mayúsculas), tipo (`porcentaje` | `monto` | `envio_gratis`), valor, tope (máximo en $ para %),
min_pedido, usos_max, por_cliente (null = sin límite), inicio, fin, activo, solo_accesorios, descripcion,
cliente_id (cupón personal, ej. cumpleaños), origen (`panel` | `cumple`). Los usos se cuentan con
`pedidos.cupon_id` (sin cancelados ni devueltos).

### puntos_movimientos (fase 4)
cliente_id, pedido_id, tipo (`ganados` | `canje` | `reintegro` | `anulados` | `ajuste`), puntos (+/−), vence_en,
nota, usuario. Un movimiento de cada tipo por pedido. El saldo se calcula gastando primero los puntos más
viejos (`lib/tienda/beneficios.ts`).

### clientes
nombre, telefono, correo, direccion (jsonb: departamento, municipio, direccion, referencia), auth_user_id (null; se llena si inicia sesión con Google), origen,
telefono_alterno, cumple_dia, cumple_mes, acepta_whatsapp y acepta_correo (publicidad; **true por defecto**,
el cliente elige no recibir), ofertas_elegido_en (cuándo eligió), baja_token (enlace "No quiero recibir más publicidad").

### pedidos
| Columna | Tipo | Nota |
| --- | --- | --- |
| numero | int único | Empieza en 1001; es el que ve el cliente |
| cliente_id | → clientes | |
| estado | `pendiente_confirmar` \| `confirmado` \| `pagado` \| `en_camino` \| `entregado` \| `cancelado` \| `devuelto` | |
| forma_pago | `contra_entrega` \| `transferencia` \| `wompi` \| `tasa_cero` | |
| subtotal | numeric | Suma de las líneas (con precio de oferta) |
| descuento_combos | numeric | Ahorro de combos; `combos` (jsonb) tiene el detalle |
| descuento | numeric | 6% por efectivo o transferencia |
| descuento_cupon, puntos_usados, descuento_puntos | numeric / int | Un solo beneficio: cupón o puntos |
| envio, total | numeric | total = subtotal − combos − descuento − cupón − puntos + envío |
| cupon_id | → cupones (null) | |
| entrega | jsonb | Copia de la dirección al momento del pedido |
| origen | text | Código de página / campaña |
| notas | text | |

### lineas_pedido
pedido_id, variante_id, nombre (copia), cantidad, precio_unitario (el cobrado), precio_regular (si fue de oferta), bundle_id (null).

### pagos
pedido_id, metodo, monto, estado (`pendiente` | `aprobado` | `rechazado`), referencia_externa (id de Wompi), comprobante_url (captura de transferencia), payload (jsonb, respuesta de Wompi).

### pedido_eventos
pedido_id, estado_anterior, estado_nuevo, nota, usuario.

### suscriptores
correo, telefono, origen (`pedido` | `aviso_precio` | `aviso_stock` | `checklist` | `cupon` | `whatsapp`), producto_id (null), brevo_id, activo, avisado_en (cuándo se le avisó que hay stock).

### eventos
| Columna | Tipo | Nota |
| --- | --- | --- |
| tipo | text | vista_producto, scroll_ficha, clic_foto, clic_specs, clic_bundle, clic_whatsapp, agregar_carrito, inicio_checkout, pago_elegido, compra, correo_capturado, busqueda |
| producto_id, variante_id, pedido_id | null | Según el evento |
| sesion_id | text | Anónimo, por visitante |
| origen, dispositivo, pagina | text | |
| datos | jsonb | Detalle (tipo de botón, porcentaje de scroll, término buscado…) |

### gasto_pauta
semana (date, lunes), canal (meta, google, otro), monto, conversaciones (int, opcional). Se carga a mano cada lunes.

### configuracion
clave (pk) y valor (jsonb). Claves iniciales: whatsapp, envio (costo, umbral gratis), municipios_contra_entrega, cuentas_bancarias, tasa_cero (meses), negocio (NIT, dirección, correo), garantia_texto.

## Seguridad (RLS)
- **anon** (visitantes): SELECT en categorias, productos (estado ≠ oculto), variantes (activo), imagenes, colecciones, coleccion_producto, promociones (activa y vigente), bundles, bundle_items, y la vista `configuracion_publica`.
- **authenticated** (equipo, entra por /admin): todo en todas las tablas.
- **service_role** (solo el servidor de Next.js): escribe pedidos, pagos, clientes, eventos y suscriptores desde Server Actions. El navegador nunca escribe directo.
