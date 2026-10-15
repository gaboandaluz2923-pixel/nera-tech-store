# Manual del panel (para el equipo de Nera Tech)

El panel vive en **tusitio.com/admin**. Se entra con correo y contraseña; solo el equipo tiene usuario.
Este manual crece con cada fase: cada pantalla nueva se documenta aquí con qué hace y cómo se usa.

## Entrar y salir
1. Abrí tusitio.com/admin en el teléfono o la computadora.
2. Escribí tu correo y contraseña y tocá **Entrar**.
3. Para salir, tocá **Salir** arriba a la derecha.

Si olvidaste la contraseña, pedile a Gabriel que la cambie desde Supabase (Authentication → Users).

## Inicio
Muestra el avance del proyecto por fases. Las secciones del menú en gris se activan cuando su fase termina.

## Configuración
Datos del negocio que ve el cliente. Cada recuadro tiene su botón **Guardar** y el cambio se ve en
la tienda al instante:
- **WhatsApp**: el número al que llegan todos los botones (8 dígitos; el 503 se agrega solo).
- **Envío**: costo, desde qué monto es gratis (vacío = nunca) y si es gratis al llevar un accesorio.
  Hoy: $5 fijo, sin envío gratis.
- **Contra entrega**: dónde y hasta qué monto se paga en efectivo al recibir.
  - **En todo el país** (marcado hoy): cualquier municipio puede pagar en efectivo, también "Otro municipio".
    Si lo desmarcás, solo los municipios de la lista.
  - **Monto máximo del pedido** (hoy $500): si el total pasa de ese monto, en el checkout la opción "Efectivo al
    recibir" aparece en gris con el aviso "Para pedidos de más de $500 lo coordinamos por WhatsApp". El cliente
    puede pagar con tarjeta, transferencia o escribirte. Vacío = sin tope.
  - **Municipios que aparecen primero**: los que salen arriba en la lista de direcciones del checkout (uno
    por línea).
  - Los textos de inicio, fichas, pie de página y Envíos y pagos se arman solos con esto ("Pagás al recibir en
    todo El Salvador en pedidos de hasta $500").
- **Tasa 0%**: hasta cuántos meses (con eso se calcula la cuota que ve el cliente) y con qué tarjetas.
- **Correos**: desde qué dirección salen los correos de pedidos (tiene que ser de tu dominio autenticado en
  Brevo, por ejemplo pedidos@neratechsv.com), a qué correo llegan las respuestas de los clientes y a cuál te
  avisamos de cada pedido nuevo. **Enviar correo de prueba** confirma que Brevo funciona.
- **Cuentas para transferencia**: una por línea, así: Banco | Tipo | Número | Titular. Solo las ve quien
  eligió pagar por transferencia, en la página de su pedido. Ejemplo:
  `Banco Agrícola | Cuenta corriente | 0000000000 | Nera Tech SV, S.A.S. de C.V.`
  Mientras esté vacío, el pedido le dice al cliente que le mandamos los datos por WhatsApp.
- **Puntos Nera**: encender o apagar el programa, cada cuántos dólares se gana 1 punto, cuánto vale cada
  punto, a los cuántos meses vencen y el mínimo para usarlos. Debajo dice qué porcentaje de la compra
  recupera el cliente.
- **Regalo de cumpleaños**: encender o apagar, monto del regalo y compra mínima para usarlo.
- **Datos para el pie de página**: nombre, NIT, dirección y correo. Hoy: "San Salvador, El Salvador ·
  NIT 0623-090426-116-2" (sin dirección exacta, a propósito).
- **Garantía**: meses, días de cambio inmediato y las listas de qué cubre, qué no y cómo reclamar
  (una cosa por línea). Hoy sigue la carta de garantía de Nera Tech: 12 meses, sin cambio inmediato (0 días),
  no cubre daños físicos, líquidos, maltrato, equipos manipulados por terceros ni reventa; para reclamar se
  presenta factura original, DUI y el equipo.

Si después de **Guardar** la página muestra "This page couldn't load", tocá **Reload**: lo guardado sí quedó
(pasó solo mientras Claude manejaba el navegador; si te pasa a vos, avisale a Claude).

Más abajo, **Conexiones** muestra con un punto verde qué claves ya están cargadas en Vercel, y
**Probar conexión con Wompi** confirma que las claves de Wompi funcionan.
## Proveedores
Una tarjeta por proveedor (Total Link, Maverik, Idecom, Intcomex ya vienen creados).
- **Días de crédito**: si dos proveedores tienen el mismo costo, gana el que te da más días.
- **Costos por lote**: para proveedores locales normalmente quedan en 0. Para importación (Miami)
  se llenan flete, seguro, transporte, DAI e IVA; el sistema los reparte entre las unidades del lote
  para calcular el **costo puesto**.
- Desmarcá **Activo** si dejás de trabajar con un proveedor: deja de aparecer al importar.

## Listas de precios → Importar lista
1. Elegí el proveedor y la fecha de la lista.
2. Subí el Excel (.xlsx) o CSV tal como te lo manda el proveedor. Si llega en PDF o imagen, abrilo,
   copiá la tabla y pegala en el cuadro de texto, y tocá **Leer lo pegado**.
3. Revisá las columnas que detectó el sistema (descripción, precio, existencia, código, precio
   sugerido). Si alguna está mal, cambiala en la lista desplegable.
4. Mirá la vista previa: la columna **Lo entendí como** muestra producto, memoria, color y categoría.
5. Tocá **Importar**. Lo que ya estaba vinculado se actualiza solo (precio y existencia). Lo que no
   vino en esta lista queda como no disponible con ese proveedor.

La última lista de cada proveedor es la **Vigente**; las anteriores quedan como historial.

## Listas de precios → Emparejar
Aparece cuando una lista trae equipos que todavía no están en tu catálogo.
- Las líneas vienen **marcadas**, salvo las de categoría "otros" (TV, consolas, etc.).
- **Crear los marcados en el catálogo**: crea el producto y la variante (ocultos, no se ven en la
  tienda) y los vincula al proveedor. Las próximas listas los actualizan solas.
- **Ignorar los marcados**: para lo que no vas a vender. Marcá esas líneas primero y luego tocá el
  botón. Quedan recordadas y no vuelven a aparecer.
- **Asociar**: si el sistema entendió mal un equipo y ya existe en tu catálogo con otro nombre,
  elegilo en la lista de la derecha y tocá **Asociar**.

## Precios
Una fila por configuración (modelo + memoria; los colores van juntos).
- **Proveedores**: en negrita el mejor (menor costo puesto con existencia). Entre paréntesis la
  existencia que informa el proveedor. Tachado = sin existencia. ▲▼ = cambio contra su lista anterior.
  "sug." = precio sugerido por el proveedor (Idecom lo manda).
- **Precio con margen objetivo**: lo que tendrías que cobrar para el margen de la categoría
  (celulares 10%, accesorios 15–25%), redondeado a precios terminados en 5 o 9.
- **Tu precio de venta**: escribilo y tocá **Guardar**. Se aplica a todos los colores de esa
  configuración y queda en el historial.
- **Margen** en rojo = debajo del objetivo de la categoría.
- **Contribución** = lo que te deja una venta enviada por paquetera antes de pauta. **ROAS mínimo** =
  cuánto tenés que vender por cada dólar de pauta para no perder.
- Filtros: buscar por modelo, por categoría, solo los que están en 2 o más proveedores, solo los que
  cambiaron de precio, o los que todavía no tienen precio de venta.

## Catálogo
Aquí se completa cómo se ve cada producto en la tienda.

**Actualizar la tienda ahora** (botón arriba a la derecha): la tienda guarda sus páginas en memoria
para cargar rápido y se refresca sola cada vez que guardás algo en el panel. Si cambiaste datos directo
en Supabase con un SQL, tocá este botón para que la tienda los muestre de inmediato.

**La lista** (Catálogo): arriba, cuántos productos están en la tienda y cuántos ocultos. Cada fila
muestra la foto principal, la categoría, cuántas variantes tienen precio y cuántas fotos hay, y unas
etiquetas grises con lo que falta ("Sin fotos", "Sin precio", "Sin descripción", "Sin características").
Primero salen los publicados. Usá los filtros para ver, por ejemplo, solo los celulares sin fotos.
La etiqueta de la derecha dice si está **Publicado**, **Agotado** u **Oculto**.

**La ficha de edición** (tocá un producto). De arriba hacia abajo:

1. **Publicación**: elegí *Publicado*, *Publicado como agotado* u *Oculto* y tocá **Cambiar**.
   Para publicar pide tres cosas: al menos una foto, categoría y precio de venta. Si falta algo,
   aparece un aviso rojo arriba diciendo qué. El enlace **Ver en la tienda** abre la ficha pública.
2. **Fotos**: tocá **Subir fotos** y elegí una o varias (desde el teléfono también sirve). El sistema
   las achica y las pone sobre fondo blanco antes de subirlas. Debajo de cada foto: flechas para
   cambiar el orden, la estrella para hacerla **Principal** (la que sale en listas y en Google) y el
   bote de basura para quitarla. Las fotos siempre se suben desde la computadora o el teléfono (no se pegan
   enlaces de otros sitios: la tienda solo muestra fotos guardadas en el sistema).
3. **Datos y textos**: nombre, marca, categoría, orden (número menor = sale primero), resumen (una
   línea bajo el nombre), descripción (separá párrafos con una línea en blanco; hablá de lo que le
   resuelve al cliente) y qué trae la caja (una cosa por línea). En "Google y dirección de la página"
   están la dirección (/producto/…) y los textos para Google; si los dejás vacíos se arman solos.
4. **Características**: los campos cambian según la categoría (celulares: pantalla, procesador,
   cámaras, batería, carga, red, sistema, NFC, resistencia, peso). Lo que dejes vacío no se muestra.
   Si falta alguna, usá "Otra característica".
5. **Variantes**: cada combinación de memoria y color. Podés corregir el color, poner cuántas
   unidades **propias** tenés en bodega (si es más de 0, la tienda dice "En stock · entrega hoy") y
   desmarcar **Mostrar** para esconder una variante. El precio se cambia en **Precios**.
6. **Preguntas frecuentes**: lo que más te preguntan por WhatsApp de ese producto. Siempre hay dos
   espacios vacíos para agregar. Para quitar una, borrá la pregunta y la respuesta. "¿Puedo pagar al
   recibir?" y "¿Es nuevo y original?" se agregan solas en todas las fichas.
7. **Colecciones**: *Los más pedidos* y *Recién llegado* salen en la página de inicio con su etiqueta
   naranja.

Cada sección tiene su propio botón **Guardar**; arriba aparece "Guardado" o el error. Los cambios se
ven en la tienda en el momento.

## Qué ve el cliente (para revisar tus cambios)
- **Inicio**: titular, botón "Ver celulares desde $…", botón de WhatsApp "Te ayudamos a elegir",
  las 4 razones de confianza, categorías, Los más pedidos, los 3 pasos para comprar y Recién llegados.
- **Categoría** (/celulares, /audifonos…): filtros por marca, presupuesto, memoria, 5G y "solo
  disponibles", orden por precio, y la casilla **Comparar** (hasta 3).
- **Ficha**: fotos (se deslizan con el dedo), precio, cuota de tasa 0%, envío, memoria y color,
  disponibilidad, **Comprar por WhatsApp** (el mensaje ya lleva modelo, memoria, color y precio) y
  **Quiero tasa 0%**. Si está agotado: "Avisame cuando haya" (guarda el correo en Suscriptores).
- **Garantía** y **Envíos y pagos**: salen de Configuración.
- **Descuento por efectivo o transferencia (6%)**: el precio publicado es el de tarjeta y tasa 0%.
  La ficha muestra debajo del precio "6% de descuento al pagar con efectivo o transferencia" con el
  precio rebajado; en el checkout, las opciones **Efectivo al recibir** y **Transferencia bancaria**
  llevan la etiqueta "6% de descuento" y, al elegirlas, el resumen resta el 6% de los productos (el
  envío no cambia) y el botón muestra el total a pagar. El porcentaje no se cambia desde el panel; si
  querés otro, pedilo (está en un solo lugar del código).

## Pedidos
Todos los pedidos de la tienda en línea. Arriba hay vistas con el número de pedidos en cada una:
- **Activos**: todo lo que no está entregado ni cancelado.
- **Por confirmar**: pedidos nuevos. Revisá que haya stock y escribile al cliente.
- **Esperando pago**: tarjeta, transferencia o tasa 0% que todavía no están pagados.
- **Por facturar**: los que ya tenés que facturar (ver abajo).
- **Entregados**, **Cancelados** y **Todos**.
El buscador encuentra por número de pedido, nombre o teléfono. Cada fila muestra el estado (Recibido,
Confirmado, En camino, Entregado), si está **Pagado** o **Sin pagar**, y si toca **Facturar**.

**Dentro de un pedido**, de arriba hacia abajo:
1. **Siguiente paso**: botones para pasar al siguiente estado (Confirmar pedido → Marcar en camino →
   Marcar entregado). Arriba de los botones hay tres cajas:
   - **Repartidor (nombre)** y **Teléfono del repartidor** (aparecen cuando el pedido puede salir o ya va en
     camino): llená antes de tocar **Marcar en camino**. El cliente los ve en el correo "Va en camino" (con el
     teléfono para tocar y llamar) y en la página de su pedido. El teléfono es de 8 dígitos.
   - **Mensaje para el cliente** (opcional): sale en el correo de ese cambio y en su pedido, en un recuadro
     "Mensaje de Nera Tech". Ej.: "Llegamos entre 2 y 4 pm". Vale solo para ese cambio de estado.
   - **Nota interna** (solo el equipo): queda en el Historial; el cliente **no** la ve. Es obligatoria para
     **Cancelar**. Si querés explicarle al cliente por qué se canceló, usá el mensaje para el cliente.
   Al confirmar, se descuentan solas las unidades propias en bodega. **Escribirle al cliente** abre WhatsApp
   con su número.
2. **Pago**: forma de pago y si ya está pagado. Los pagos con tarjeta se marcan solos cuando Wompi los
   aprueba. Para transferencia o tasa 0%, cuando confirmes el pago tocá **Marcar como pagado** (podés
   anotar la referencia). En contra entrega, al marcar **entregado** queda cobrado solo.
3. **Factura electrónica**: dice si es consumidor final o crédito fiscal (con NIT, NRC, razón social y
   giro que dio el cliente) y si ya toca emitirla. Emitila en tu sistema de facturación, escribí el
   código de generación o número de control, subí el PDF y tocá **Guardar factura**. Desde ese momento
   el cliente la descarga en su pedido. **Avisarle por WhatsApp** le manda el enlace. Si un pedido no
   lleva factura, tocá **No lleva factura**.
4. **Productos** (con la línea **Descuento** cuando el cliente pagó en efectivo o por transferencia),
   **Cliente y entrega** (dirección, referencia, nota del cliente).
   **Enlazar a otro correo de Google**: si el cliente quiere ver el pedido en su cuenta pero compró con
   otro correo, escribí aquí su correo de Google.
5. **Historial**: todo lo que pasó con el pedido, con fecha y quién lo hizo. Podés agregar notas internas
   (el cliente no las ve).

**¿Cuándo aparece en "Por facturar"?**
- Tarjeta, transferencia y tasa 0%: cuando está **pagado y confirmado**.
- Contra entrega: desde el **día siguiente** a la entrega.

**Lo que ve el cliente**: al comprar llega a la página privada de su pedido (enlace "Ver mi pedido"), con
el estado, cómo pagar (cuentas para transferencia, botón para reintentar la tarjeta, WhatsApp para tasa
0%), y la factura cuando la subís. Puede entrar con Google para ver todos sus pedidos en **Mis pedidos**;
aparecen solos los que hizo con el mismo correo, y puede agregar otros con número de pedido y teléfono.

## Mi cuenta (lo que ve el cliente con Google)
El ícono de persona arriba a la derecha de la tienda lleva a **Mi cuenta**. Ahí el cliente guarda su nombre,
teléfono, teléfono alterno, cumpleaños (solo día y mes), hasta 5 direcciones con punto de referencia, y si
quiere recibir ofertas por WhatsApp o correo. Si compra con la sesión abierta, el formulario de compra se
llena solo y puede elegir la dirección con un toque; si escribe una dirección nueva, se guarda en su cuenta.
En cada pedido del panel ves el **teléfono alterno**, el **cumpleaños** y la etiqueta **Frecuente** si ya
tiene más de un pedido.

## Equipo (quién entra al panel)
Solo entran al panel los correos de la lista de equipo (tabla `equipo` en Supabase). Los clientes que
entran con Google no pueden ver el panel. Para agregar a alguien del equipo: Supabase → SQL Editor →
`insert into equipo (correo) values ('correo@ejemplo.com');` y crearle su usuario en Authentication.

## Correos automáticos (Brevo)
La tienda manda estos correos sola, con tu logo y un botón "Ver mi pedido":
| Correo | Cuándo |
| --- | --- |
| Recibimos tu pedido | Apenas el cliente hace el pedido (con cómo pagar según la forma elegida) |
| Pedido nuevo (a vos) | Al mismo tiempo, al correo de avisos |
| Pago recibido | Cuando Wompi aprueba la tarjeta o marcás un pago a mano (no en contra entrega) |
| Confirmado / En camino / Entregado / Cancelado | Cuando cambiás el estado en el panel |
| Tu factura está lista | Cuando guardás la factura por primera vez o subís un PDF nuevo |
Los correos al cliente llevan el recuadro **Entrega** (nombre, dirección completa con referencia y teléfono)
y abajo un botón verde grande **Escribinos por WhatsApp**. El de "En camino" incluye el repartidor si lo
llenaste, y cualquier correo de cambio de estado incluye el **Mensaje para el cliente** si escribiste uno.
Cada correo enviado (o que no se pudo enviar, con el motivo) queda en el **Historial** del pedido.

## Precios: sugerencia y precios de mercado (fase 5)
La columna **Precio sugerido** ya no es solo "costo + margen". Combina:
- tu **costo puesto** y el **margen objetivo** de la categoría;
- los **precios de mercado** que anotaste en los últimos 30 días (mínimo, máximo y el más común);
- cuánto se **vendió** esa configuración en 30 días: con 5 o más es "se vende rápido" y la sugerencia se acerca
  al mercado; sin ventas, se queda en tu margen o baja un poco para moverlo.
Nunca baja del **mínimo sin pérdida** (aun pagando en efectivo con 6% y sin cobrar envío). Debajo dice cuánto
deja de contribución. **Por qué** abre la explicación en palabras y los precios anotados. **Usar** aplica el
sugerido a todos los colores de esa memoria y queda en el historial como "sugerido aprobado"; si dice "= tu
precio", ya está aplicado. El filtro **Sugerido distinto de tu precio** muestra solo lo que conviene revisar.

**Anotar un precio que viste** (dentro de "Por qué"): escribí el precio y dónde lo viste (ej. "Tienda X",
"Marketplace") y tocá **Anotar**. Si era usado o reacondicionado, marcalo: no cuenta para la sugerencia. Los precios
de Facebook o Marketplace se anotan a mano: la tienda nunca los lee sola.

## Analítica (fase 5)
Menú **Analítica**. Son datos propios de la tienda (no dependen de Google ni de Meta), de las últimas 8 semanas, de
lunes a domingo:
- **Esta semana**: visitas, pedidos, conversión, clics a WhatsApp, ventas, contribución, gasto en pauta y ganancia
  después de pauta, comparados con la semana pasada.
- **Embudo por semana**: cuántas personas vieron un producto, agregaron al carrito, fueron a pagar e hicieron el
  pedido. El porcentaje chico es contra el paso anterior: donde cae mucho, ahí se pierde la venta.
- **Ventas y pauta por semana**: ventas, contribución (con el costo guardado al vender), gasto en pauta, costo por
  pedido, ROAS (ventas ÷ pauta) y ganancia después de pauta (en rojo si la pauta cuesta más de lo que deja).
- **Gasto de pauta**: cada semana anotá lo que gastaste (lo ves en el Administrador de anuncios de Meta), el canal
  y, si querés, cuántas conversaciones de WhatsApp trajo. Si ya había un gasto para esa semana y canal, se corrige.
- **Productos (30 días)**: vistas, agregados al carrito, vendidos y "Mucho interés, pocas ventas" (para revisar
  precio, fotos o descripción).
- **Lo que más buscan**: lo que escriben en el buscador; **Buscaron y no encontraron nada** son ideas de productos
  para agregar al catálogo.
- **De dónde vienen** (Facebook, Google, directo…) y **Clics a WhatsApp** por parte de la tienda.

La tienda también avisa a **Google Analytics** y a **Meta** (Pixel + API de conversiones) de cada paso, y a Meta de
cada **compra pagada** desde el servidor, para que los anuncios aprendan de ventas reales. En la tienda aparece un
aviso pequeño de cookies con el botón **Entendido**.

## Promociones
Menú **Promociones**. Tiene tres recuadros. Nada se borra: las ofertas, combos y cupones se apagan.

**1. Ofertas con fecha** (precio rebajado por unos días)
1. Escribí el nombre (lo ve el cliente, ej. "Quincena de octubre"), cuándo empieza (vacío = ya) y cuándo
   termina, y tocá **Crear y poner precios**. Las horas son de El Salvador.
2. Se abre el editor: una tabla por producto con cada opción (memoria y color), su precio normal, el
   **costo puesto** y el **mínimo sin pérdida** (el precio más bajo que no pierde dinero aunque el cliente
   pague en efectivo con 6% y sin cobrar envío).
3. Escribí el precio de oferta solo en lo que entra; lo vacío no cambia. Para bajar un % a todas las opciones
   de un producto: escribí el % junto al nombre y tocá **Bajar % a todas** (redondea hacia abajo a .99 o a un
   entero terminado en 9 o 5, y avisa en rojo si alguna queda bajo el mínimo sin pérdida). **Quitar** las vacía.
4. Marcá **Oferta activa** y tocá **Guardar oferta** (abajo, siempre visible).
En la tienda: la ficha muestra "Oferta · ahorrás $X", el precio normal tachado y "Termina el sábado 18 de
octubre"; las tarjetas del listado dicen "Oferta −$X". Al terminar, el precio vuelve solo. En la lista, cada
oferta dice si está **activa**, **programada**, **terminada** o **apagada**.

**2. Combos "Completá tu equipo"**
Un combo es un celular (cualquier color o memoria) + 1 a 3 accesorios, con un ahorro en dólares. Elegí el
nombre, el producto principal, los accesorios (con cantidad) y el ahorro, y tocá **Crear combo**. El ahorro
tiene que ser menor que lo que cuestan los accesorios. En la ficha del celular aparece el recuadro "Completá
tu equipo y ahorrá" con **Agregar combo** (agrega el celular elegido y los accesorios). En el carrito, si el
cliente lleva el celular pero le falta un accesorio del combo, se le ofrece; el descuento aparece como
"Combo Kit audio Hot 70 −$5.00". Cada combo de la lista se puede cambiar de ahorro o apagar.

**3. Cupones**
Código (3 a 20 letras, números o guiones; se guarda en mayúsculas), tipo (% de descuento, monto fijo o envío
gratis), valor, **máximo a descontar** (para los de %), compra mínima, usos en total, usos por cliente (0 = sin
límite), fechas y **solo accesorios**. La tabla muestra cuántas veces se usó (no cuentan los pedidos
cancelados) y el botón **Apagar/Activar**.

**Reglas que aplica la tienda sola**
- El 6% de efectivo o transferencia siempre se suma; además el cliente usa **un** beneficio: un cupón **o**
  sus Puntos Nera, no los dos.
- **Nunca bajo costo**: si un cupón o los puntos dejarían el pedido por debajo del costo puesto más los costos
  de envío y comisión, el descuento se recorta solo hasta el máximo posible y el cliente ve "Se aplicó el
  máximo posible para este pedido". En celulares, con margen chico, el cupón suele quedar recortado.

## Puntos Nera
- Se ganan cuando un pedido queda **entregado y pagado**: 1 punto por cada $10 de productos (sin envío). El
  Historial del pedido dice "El cliente ganó N Puntos Nera" y el correo "Entregado" se lo cuenta.
- Se guardan por correo, aunque el cliente no tenga cuenta; cuando entra con Google con ese correo, los ve.
- En **Mi cuenta** el cliente ve su saldo, cuánto valen, los que vencen pronto y sus movimientos.
- Se usan en el checkout con la sesión de Google abierta ("Usar mis Puntos Nera"); se usan todos los que
  alcancen sin pasar del tope de costo. Los más viejos se gastan primero; vencen a los 12 meses.
- Si cancelás o marcás devuelto un pedido: se le **devuelven** los puntos que usó y se le **quitan** los que
  ganó con ese pedido (queda anotado en el Historial).
- Si reabrís un pedido cancelado que había usado puntos, esos puntos ya volvieron al cliente: cobrale el total
  sin descuento de puntos o anotalo.

## Correos (avisos automáticos)
Menú **Correos**:
- **Revisión diaria**: todos los días a las 7:00 a. m. la tienda (1) crea el regalo de cumpleaños a quienes
  cumplen años este mes y (2) avisa a quienes pidieron "Avisame cuando haya" si el producto ya volvió.
  **Revisar ahora** hace lo mismo al momento. Si aparece el aviso amarillo de **CRON_SECRET**, falta esa clave
  en Vercel (sin ella la revisión automática no corre; el botón sí).
- **"Avisame cuando haya"**: cuántas personas esperan, por producto, y los últimos avisos enviados. Además del
  horario diario, los avisos salen solos cuando guardás algo en Catálogo o importás una lista de precios.
- **Regalos de cumpleaños de este mes**: cliente, código, si le llegó el correo y si ya lo usó. El regalo es un
  cupón personal de $5 para compras desde $20, válido del 1 al último día de su mes de cumpleaños, que solo
  funciona con el correo del cliente. Le llega por correo si acepta publicidad y siempre lo ve en Mi cuenta.
- **Publicidad**: cuántos clientes hay y cuántos no quieren publicidad por correo o por WhatsApp.

**Publicidad (exclusión voluntaria)**: todos reciben ofertas salvo que digan que no. El cliente puede elegir
"No quiero recibir publicidad" al comprar, en Mi cuenta o con el enlace **No quiero recibir más publicidad**
del final de cada correo de ofertas (Gmail y Outlook además muestran su botón "Cancelar suscripción"). Los
correos de pedidos y facturas le llegan siempre. En cada pedido del panel, si el cliente no quiere publicidad,
aparece la línea **Publicidad**. Antes de mandarle ofertas por WhatsApp, revisá esa línea.

## Lanzamiento (fase 6): dónde quedó cada cosa
- **Dominio**: www.neratechsv.com (neratechsv.com y la dirección vieja de Vercel redirigen ahí). El DNS sigue en
  Hostgator → Domains → neratechsv.com → DNS. **No borres** los registros TXT `google-site-verification=…` ni
  `facebook-domain-verification=…`: con ellos Google y Meta saben que el dominio es tuyo.
- **Google Search Console** (search.google.com/search-console): propiedad de dominio `neratechsv.com`,
  verificada. Ahí se ve cómo te encuentra Google; el sitemap enviado es https://www.neratechsv.com/sitemap.xml.
  Google tarda unos días en leerlo y mostrar datos.
- **Meta Business** → Configuración → Seguridad de la marca → **Dominios**: `neratechsv.com` verificado.
- **Google Cloud** (inicio de sesión con Google para clientes) → Google Auth Platform → Información de la
  marca: página principal https://www.neratechsv.com, privacidad https://www.neratechsv.com/privacidad y
  dominio autorizado neratechsv.com.
- **Google Analytics 4**: propiedad "Nera Tech Tienda", flujo web "Tienda" con URL https://www.neratechsv.com
  (ID G-ETDPRN6LNF).
- **Velocidad**: medida en PageSpeed Insights (pagespeed.web.dev, Celulares). Meta: que "Largest Contentful
  Paint" quede bajo 2.5 s en inicio, una categoría, una ficha y el checkout. Volvé a medir después de cambios
  grandes (fotos nuevas pesadas, scripts nuevos).
