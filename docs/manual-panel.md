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
