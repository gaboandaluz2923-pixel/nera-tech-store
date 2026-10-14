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
Muestra qué conexiones están listas (verde) y cuáles faltan (gris). No muestra claves. Los valores se cargan en Vercel.

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
   bote de basura para quitarla. También podés pegar la dirección de una foto de internet.
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
