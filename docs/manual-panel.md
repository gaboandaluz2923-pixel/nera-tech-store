# Manual del panel (para el equipo de Nera Tech)

El panel vive en **tusitio.com/admin**. Se entra con correo y contraseña; solo el equipo tiene usuario.
Este manual crece con cada fase: cada pantalla nueva se documenta aquí con qué hace y cómo se usa.

## Entrar y salir
1. Abrí tusitio.com/admin en el teléfono o la computadora.
2. Escribí tu correo y contraseña y tocá **Entrar**.
3. Para salir, tocá **Salir** arriba a la derecha.

Si olvidaste la contraseña, pedile a un administrador: en **Equipo** toca **Olvidó su contraseña** junto a tu
nombre y te pasa una contraseña temporal. Para cambiarla por una tuya: **Mi contraseña** (arriba a la derecha),
escribila dos veces y **Cambiar contraseña**.

## Cómo se edita (en todo el panel)
La información se ve como texto. Para cambiar algo:
1. Tocá **Editar** (el lápiz) en el recuadro o la fila.
2. Cambiá lo que necesités.
3. Tocá **Guardar**. Sale el aviso "Guardado" y el recuadro vuelve a verse como texto. **Cancelar** cierra sin
   cambiar nada.

Lo que se crea nuevo (ofertas, combos, cupones, gasto de pauta) tiene su botón **+ Nuevo…**. Los botones de un
solo paso (confirmar un pedido, marcar pagado, mover o quitar fotos) actúan al tocarlos, como antes.

## Roles: administrador y operador
Cada persona del equipo tiene un rol (lo ves arriba a la derecha, junto a tu nombre):
| | Administrador | Operador |
| --- | --- | --- |
| Inicio: pedidos y ventas de hoy, la semana y el mes | Sí | Sí |
| Pedidos (confirmar, enviar, cobrar, facturar) y **Nuevo pedido** | Sí | Sí |
| Clientes | Sí | Sí |
| Catálogo: fotos, textos, características, color, stock en bodega (con motivo), publicar | Sí | Sí |
| Garantía: buscar un IMEI o número de serie; en un pedido, el IMEI del equipo que sale | Sí | Sí |
| Inventario: compras al proveedor, costos, cuentas por pagar, kardex, Open Box | Sí | No |
| Cambiar precios (también precio especial en un pedido manual) | Sí | No |
| Proveedores, listas, Precios, costos, ganancia, Promociones, Correos, Analítica, Configuración, Equipo | Sí | No |

El operador no ve esas secciones en el menú, y aunque escriba la dirección, el panel lo regresa al inicio con el
aviso "Esa sección es solo para administradores". El bloqueo también está en la base de datos: con una cuenta de
operador no se pueden leer costos ni cambiar precios por ningún lado.

## Inicio
- **Pedidos y ventas**: lo vendido hoy, esta semana (desde el lunes) y este mes, con cuántos pedidos, comparado
  con ayer, con la semana pasada y el mes pasado a la misma hora. Suma el total de los pedidos (con envío) sin
  cancelados ni devueltos, de la tienda y de los manuales. No muestra costos ni ganancia (esos están en Analítica).
- **Por confirmar** y **Por entregar**: los pedidos que hay que atender; tocá uno para abrirlo.
- **+ Nuevo pedido**: para una venta que entró por WhatsApp, redes, llamada o en persona.
- Los administradores ven abajo **Avance del proyecto** (las fases).

## Configuración
Datos del negocio que ve el cliente. Cada recuadro muestra lo que está guardado; tocá **Editar**, cambiá y
**Guardar**. El cambio se ve en la tienda al instante:
- **WhatsApp**: el número al que llegan todos los botones (8 dígitos; el 503 se agrega solo).
- **Descuento sin tarjeta**: el % que se descuenta sobre los productos (no sobre el envío) al pagar en efectivo
  contra entrega o por transferencia. Hoy 6%. Si lo cambiás (por ejemplo a 8 o 9), la tienda lo muestra solo en
  las fichas ("8% de descuento al pagar con efectivo o transferencia"), el checkout, Envíos y pagos, y lo usan
  la sugerencia de precios y el "mínimo sin pérdida" de las ofertas. Los pedidos ya hechos no cambian. Máximo 30%.
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
- **Tu precio de venta**: se ve el precio (o "Sin precio" en naranja). Tocá el lápiz, escribilo y **Guardar**.
  Se aplica a todos los colores de esa configuración y queda en el historial. **Usar** aplica el sugerido.
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

**La ficha de edición** (tocá un producto). Cada recuadro se ve como texto; tocá **Editar** (o **Cambiar** en
Publicación), cambiá y **Guardar**. De arriba hacia abajo:

1. **Publicación**: dice si está Publicado, Agotado u Oculto. **Cambiar** → elegí y **Guardar**.
   Para publicar pide tres cosas: al menos una foto, categoría y precio de venta. Si falta algo,
   aparece un aviso rojo arriba diciendo qué. El enlace **Ver en la tienda** abre la ficha pública.
2. **Fotos**: tocá **Subir fotos** y elegí una o varias (desde el teléfono también sirve). Antes de subirlas,
   el sistema recorta los bordes vacíos, centra el producto con un poco de aire, lo pone sobre fondo blanco y
   la deja cuadrada (igual que las fotos que cargó Claude). Si la foto la tomaste con el teléfono (producto
   sobre una mesa o un fondo de color), marcá **Quitar el fondo** antes de elegir: borra lo que hay detrás
   del producto. Es gratis y corre en tu computadora; la primera vez tarda unos segundos (descarga el
   programa, unos 16 MB) y luego 2 a 3 segundos por foto. Revisá cada foto: si quedó un borde raro o se comió
   una parte del producto, quitala con el bote de basura y subila sin **Quitar el fondo**. Si la foto es muy
   chica (menos de 500 px) avisa que puede verse borrosa. Debajo de cada foto: flechas para
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
5. **Variantes**: cada combinación de memoria y color (cada fila tiene su **Editar**):
   - **Color** y **Mostrar** (desmarcalo para esconder una variante).
   - **En bodega**: las unidades propias. Normalmente no se toca: las compras (Inventario) las suben y los pedidos
     las bajan solos. Si al contar hay diferencia, cambiá el número y escribí el **motivo** (conteo, dañado…);
     queda en el kardex con tu nombre. Con unidades en bodega la tienda dice **"Entrega en menos de 24 horas"**.
   - **Si no hay en bodega**: *Según la lista del proveedor* (lo normal: si un proveedor lo tiene, la tienda dice
     **"Recibilo en menos de 48 horas"**), *Bajo pedido* (siempre "Recibilo en menos de 48 horas") o *Agotado*.
   - El precio lo cambia un administrador en **Precios**.
6. **Preguntas frecuentes**: lo que más te preguntan por WhatsApp de ese producto. Siempre hay dos
   espacios vacíos para agregar. Para quitar una, borrá la pregunta y la respuesta. "¿Puedo pagar al
   recibir?" y "¿Es nuevo y original?" se agregan solas en todas las fichas (en un Open Box: "¿Qué significa
   Open Box?").
7. **Colecciones**: *Los más pedidos* y *Recién llegado* salen en la página de inicio con su etiqueta
   naranja.
8. **Historial de cambios**: quién cambió qué y cuándo en ese producto.
9. **Open Box o usado** (en los productos nuevos, debajo de Publicación): **+ Crear ficha Open Box** → elegí la
   memoria y el color de la unidad, la condición (Open Box o usado) y escribí **cómo viene** (lo ve el cliente: "Sin
   uso, caja abierta para revisión. Trae cargador y cable."). Se crea una ficha aparte, oculta, en la categoría
   **Open Box**, con las características de este modelo y sin precio. Ponele precio en Precios, recibí la unidad en
   Inventario (con su IMEI) y publicala. En la tienda dice "Open Box: caja abierta, no sellado de fábrica", muestra
   cómo viene y enlaza al modelo nuevo. Si no le subís fotos, usa las del modelo nuevo (mejor subí fotos reales de la
   unidad). En la ficha Open Box, **Condición** (Editar) cambia el texto o el modelo nuevo enlazado.

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

En cada pedido, **Cliente y entrega** se ve como texto; **Editar** permite corregir nombre, teléfonos, municipio,
dirección y referencia (queda en el historial). **Ver cliente** abre su ficha en Clientes. La factura se carga
con **Editar** en el recuadro de factura (código y PDF).

**Lo que ve el cliente**: al comprar llega a la página privada de su pedido (enlace "Ver mi pedido"), con
el estado, cómo pagar (cuentas para transferencia, botón para reintentar la tarjeta, WhatsApp para tasa
0%), y la factura cuando la subís. Puede entrar con Google para ver todos sus pedidos en **Mis pedidos**;
aparecen solos los que hizo con el mismo correo, y puede agregar otros con número de pedido y teléfono.

## Mi cuenta (lo que ve el cliente con Google)
El ícono de persona arriba a la derecha de la tienda lleva a **Mi cuenta**. Lo primero que ve son **sus pedidos**
(tocá uno para ver su estado y factura); abajo, en chico, sus **Puntos Nera** (se abren para ver el detalle), y
el botón **Datos de mi cuenta**, que abre sus datos (con Editar → Guardar), direcciones y preferencias de
ofertas. Ahí el cliente guarda su nombre,
teléfono, teléfono alterno, cumpleaños (solo día y mes), hasta 5 direcciones con punto de referencia, y si
quiere recibir ofertas por WhatsApp o correo. Si compra con la sesión abierta, el formulario de compra se
llena solo y puede elegir la dirección con un toque; si escribe una dirección nueva, se guarda en su cuenta.
En cada pedido del panel ves el **teléfono alterno**, el **cumpleaños** y la etiqueta **Frecuente** si ya
tiene más de un pedido.

## Equipo (quién entra al panel; solo administradores)
Menú **Equipo**. Una fila por persona con su nombre, correo y rol (Administrador u Operador).
- **+ Agregar persona**: nombre, correo y rol → **Agregar**. Aparece un recuadro amarillo con su **contraseña
  temporal**: copiala y pasásela (en persona o por WhatsApp); no se vuelve a mostrar. La persona entra en
  www.neratechsv.com/admin/login y la cambia en **Mi contraseña**. Si ese correo ya tenía usuario (por ejemplo
  porque compró con Google), entra con la contraseña que ya usa.
- **Editar** en una fila: cambiar el nombre (así aparece en el historial) o el rol. Ahí mismo está **Quitar
  acceso al panel**: deja de poder entrar al instante; lo que hizo queda en el historial con su nombre.
- **Olvidó su contraseña**: genera una contraseña temporal nueva para esa persona (recuadro amarillo).
- No podés quitarte el acceso ni el rol de administrador a vos mismo, y siempre queda al menos un administrador.
Los clientes que entran con Google nunca pueden ver el panel.

## Pedido manual (Nuevo pedido)
Para que TODAS las ventas queden en el sistema, también las que entran por WhatsApp, Instagram, Facebook o
Marketplace, TikTok, llamada o en persona. Botón **+ Nuevo pedido** en Inicio, Pedidos o la ficha del cliente.
1. **¿Por dónde entró?**: tocá el canal. "En persona" pone la entrega sin envío.
2. **Cliente**: escribí el teléfono y tocá **Buscar**. Si ya compró antes, se llenan su nombre, correo y
   dirección ("Ya es cliente · 3 pedidos"). Si no, escribí el nombre. El correo es opcional: sirve para mandarle
   la confirmación y para que vea el pedido si entra con Google.
3. **Productos**: buscá por nombre, memoria o color (ej. "a27 256 negro") y tocá el resultado. Salen todos los
   que tienen precio, aunque estén ocultos en la tienda; dice cuántos hay en bodega. Cambiá la cantidad con
   − y +. El precio es el de la tienda (el de oferta si hay una vigente). Un administrador puede cambiar el
   precio de una línea (precio especial); queda anotado en el historial del pedido.
4. **Entrega**: a domicilio (cobra el envío de Configuración) o en persona (sin envío). Para domicilio:
   municipio, dirección y referencia.
5. **Pago y estado**: la forma de pago (efectivo y transferencia llevan el descuento sin tarjeta), **Ya pagó**
   si ya cobraste, y el estado: **Por confirmar**, **Confirmado** (descuenta el stock en bodega) o **Ya
   entregado** (venta en persona cerrada: queda entregado y pagado). Para tarjeta, el cliente paga desde el
   enlace de su pedido ("Ver como el cliente" en el pedido → copialo y mandáselo por WhatsApp).
6. Revisá el **Resumen** (lo calcula el sistema con los precios guardados) y tocá **Crear pedido**. Te lleva al
   pedido, que sigue igual que los de la tienda: confirmar, en camino, entregado, factura.
En la lista de Pedidos y en el pedido se ve el canal y quién lo creó.

## Clientes
Menú **Clientes**: todos los que compraron, por la tienda, a mano o antes de la tienda (etiqueta "cliente anterior"). Buscá por nombre, teléfono o correo;
ordená por compra más reciente, por los que más compran o por los recién agregados; filtrá por etiqueta.
Cada fila dice cuánto ha comprado en total, cuántos pedidos y por dónde compra. Se muestran 25 por página
(**Anterior / Siguiente** abajo). Filtros: contacto (con correo, sin correo, con teléfono), pedidos (con pedidos,
sin pedidos, 2 o más), origen (tienda, panel, Excel, Google) y canal; elegí y tocá **Buscar**. **Quitar filtros**
vuelve a la lista completa.
En la ficha del cliente:
- Arriba: total comprado, pedidos, compra promedio, última compra, Puntos Nera; botones **WhatsApp** y
  **+ Nuevo pedido** (ya con su teléfono).
- **Etiquetas** (Editar): frecuente, mayorista, revendedor, reclamo, garantía, vip, no contestar, u otras
  separadas por coma. Sirven para filtrar la lista.
- **Datos** (Editar): nombre, teléfonos, correo, dirección, cumpleaños y si acepta publicidad.
- **Pedidos**: todos sus pedidos; tocá uno para abrirlo.
- **Notas internas**: lo que el equipo debe saber de ese cliente (solo lo ve el equipo), con quién la escribió.
- **Historial de cambios**: quién cambió sus datos y cuándo.
Si alguien compró por WhatsApp sin correo y después compra en la tienda con el mismo teléfono, queda como el
mismo cliente.

**Importar del Excel · Brevo** (botón arriba a la derecha, solo administradores):
1. **Clientes del Excel**: elegí el archivo «Pedidos e Inventario». El panel lee la pestaña ORDENES y dice cuántos
   clientes hay, cuántos son nuevos y cuántos ya estaban. Tocá **Importar**. Cada cliente entra una sola vez (por
   teléfono o correo) con la etiqueta **cliente anterior**, y cada compra queda como nota: qué compró, cuánto pagó,
   cómo pagó, el envío y el estado. No se crean pedidos (no cambian las ventas de Inicio ni Analítica). Si lo
   importás otra vez con filas nuevas, solo agrega lo que falta.
2. **Mandar clientes a Brevo**: sube a la lista **Clientes Nera Tech** de Brevo a todos los que tienen correo y
   aceptan publicidad (quien se dio de baja no va). En Brevo → Campañas → crear campaña → elegí esa lista. Brevo
   agrega solo el enlace para darse de baja.
3. **Descargar todos los clientes (CSV)**: nombre, teléfonos (también con +503 para WhatsApp), correo, si acepta
   publicidad y etiquetas. Sirve para listas de difusión de WhatsApp o para abrir en Excel.

## Inventario (solo administradores)
Menú **Inventario**. Arriba: unidades en bodega, cuánto valen al costo, cuánto se debe a proveedores y cuántas
unidades se mueven lento (más de 30 días en bodega sin ventas en 30 días).
- **Avisos**: cuántos IMEI o números de serie faltan por registrar, y los productos que se venden **bajo el costo**
  de lo que hay en bodega (con el enlace para revisar el precio).
- **Facturas por pagar**: de la que vence primero a la última, con "Vence en 3 días", "Vence hoy" o "Vencida hace…".
  También salen en **Inicio** cuando faltan 3 días o menos.
- **En bodega**: cada variante con sus unidades, días en bodega, última venta y costo; lo más viejo arriba (es lo que
  conviene vender antes), 25 por página. Filtros: Todo, Lento, Faltan IMEI / serie, Sin costo, Se vende con pérdida,
  Open Box y usados (cada uno dice cuántos hay); además buscar por nombre, categoría y orden (más días, más
  unidades, más valor, nombre). Tocá una para ver su detalle.

**Detalle de una variante** (Inventario → tocá una fila):
- Arriba: en bodega, valor al costo, precio, condición y cuántas unidades no tienen identificador.
- **Registrar IMEI** (si faltan): pegá o escaneá un IMEI por línea (doble SIM: los dos en la misma línea separados
  por coma). Para accesorios sin número de serie, poné cuántos **códigos Nera** querés: el sistema crea NT-000123,
  NT-000124… para escribir o pegar en cada caja.
- **Ajuste por conteo**: unidades contadas, costo de las que sobran (si sube) y motivo.
- **Lotes**: cada entrada con su fecha, cuánto queda y su costo (lo más viejo sale primero).
- **Unidades**: cada IMEI o serie con su estado (en bodega, vendida, en garantía, de baja) y el pedido. **Mover**
  pasa una unidad en bodega a su ficha Open Box (por ejemplo, un equipo devuelto con la caja abierta), con el mismo
  costo.
- **Kardex**: todo lo que entró y salió, con quién y por qué.

**Compras al proveedor** (Inventario → **+ Nueva compra**):
1. **La factura**: subí el **.json** de la factura electrónica (llega en el mismo correo que el PDF) y el sistema
   llena todo exacto: proveedor (por su NIT, guardalo en Proveedores), número, fecha, crédito y días, productos,
   cantidades y costos. Si solo tenés el **PDF**, subilo: se lee como texto y casi siempre reconoce las filas; revisá
   cada una. Si no tenés archivo, dejalo vacío.
2. **Datos**: lo que dejes vacío sale de la factura. **Tipo de documento**: *Crédito fiscal* (precios sin IVA; el
   IVA se recupera), *Factura de consumidor final* (precios con IVA) o *Sin IVA* (Miami, recibos). **Pago**: contado
   o crédito con sus días (10, 14…; si el proveedor tiene días de crédito en Proveedores, se usan esos).
   **Otros costos**: flete, envío, aduana, seguro; se reparten en el costo de cada unidad (no se suman a lo que se
   le debe al proveedor).
3. Tocá **Crear compra**. Se abre la compra **Sin recibir**: revisá cada producto (**Editar**): el producto del
   catálogo (el sistema sugiere uno; si no está, crealo en Catálogo), la cantidad, el costo como sale en la factura,
   la **condición** (Nuevo sellado / Open Box / Usado: revisá cada caja al recibir) y los **IMEI o números de serie**
   (uno por línea; con un lector de código de barras se escanean directo). Los celulares necesitan el IMEI de cada
   unidad; si falta uno o un número está mal digitado, avisa antes de recibir.
4. **Recibir en bodega**: las unidades entran con su costo, la tienda las muestra como "Entrega en menos de 24 horas"
   y cada IMEI queda registrado. Una unidad Open Box o usada no puede entrar a un producto nuevo: va en su ficha Open
   Box.
5. **Marcar pagada** con la fecha cuando le pagués al proveedor. **Anular** solo si ninguna unidad de esa compra se
   vendió (marcá la casilla de confirmación).
La lista **Compras** filtra **Por pagar** y **Sin recibir**. Los archivos de la factura quedan guardados (privados).

**Ventas y bodega**: al **confirmar** un pedido salen de bodega las unidades más viejas con su IMEI, y la venta
guarda su costo real. Si se cancela, se devuelve o vuelve a "por confirmar", las unidades regresan a bodega. Si un
cliente devuelve un equipo con la caja abierta, pasalo a Open Box desde el detalle de la variante.

**Ofertas sin pérdida**: en Promociones, el "Costo puesto" de cada opción es el de lo que hay **en bodega** (si hay).
Si un precio de oferta queda bajo el mínimo sin pérdida, no se guarda salvo que marqués **Acepto vender con pérdida**.
Lo mismo con un precio especial en un pedido manual («Sí, venderlo así»).

## Garantía (buscar IMEI o serie)
Menú **Garantía (IMEI)** (todo el equipo). Escribí o escaneá el IMEI (está en la caja o marcando \*#06# en el
teléfono) o el número de serie. Dice si el equipo **es nuestro**, su condición, en qué pedido y a qué cliente se
vendió, de qué proveedor y factura vino, y si la garantía está **vigente** (12 meses desde la entrega) o **vencida**.
- **Entra a garantía**: anotá la falla que reporta el cliente; la unidad queda "En garantía".
- **Sale de garantía**: anotá qué se hizo (reparado, cambiado…).
- Si dice que **no está registrado**, pedile la factura y buscalo en Clientes por nombre o teléfono.
Los 128 equipos del registro anterior (Excel de órdenes de compra) aparecen como "Registrada antes del sistema".

**En un pedido** (Productos): debajo de cada celular o accesorio sale el IMEI o serie que el sistema apartó al
confirmar. Si sale otro equipo, tocá **Cambiar** y escaneá el que sale. Si dice "Sin identificar", tocá
**+ IMEI / serie** y escanealo (tiene que estar registrado en bodega).

## Historial con nombre
Cada cambio queda con el nombre de quien lo hizo (el de Equipo):
- **Pedidos**: el historial del pedido dice quién lo confirmó, lo marcó en camino, registró el pago o corrigió
  la entrega ("Angel · 15 oct 3:40 p. m.").
- **Catálogo**: al final de cada producto, **Historial de cambios**: quién cambió el nombre, los textos, el
  stock, la publicación, o subió y quitó fotos.
- **Clientes**: lo mismo en la ficha del cliente.
"Tienda (automático)" = lo hizo el sistema (por ejemplo, el stock al confirmar un pedido de la tienda).

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

**Campañas de correo (Brevo)**, arriba: las campañas **agendadas** con su fecha y hora, los **borradores** sin agendar
y las 5 **últimas enviadas** con cuántos correos se entregaron y qué porcentaje abrió y dio clic. Las campañas se
arman y agendan en Brevo (botón **Abrir Brevo**); aquí solo se ven.
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
