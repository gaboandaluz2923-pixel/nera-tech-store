-- =====================================================================
-- Nera Tech — Fichas de producto (fichas-2026-10-15.json)
-- Generado con scripts/fichas-a-sql.mjs. Cómo usarlo: Supabase → SQL Editor → New query → pegar todo → Run.
-- Se puede correr más de una vez.
-- =====================================================================

-- 1. Textos, características, preguntas frecuentes (sin publicar: el estado no cambia)
update public.productos p
set nombre = d.nombre,
    resumen = d.resumen,
    descripcion = d.descripcion,
    caracteristicas = d.caracteristicas,
    incluye = d.incluye,
    faq = d.faq,
    meta_descripcion = d.meta_descripcion,
    orden = d.orden,
    updated_at = now()
from jsonb_to_recordset($fichas$[
 {
  "slug": "samsung-galaxy-a36",
  "nombre": "Samsung Galaxy A36 5G",
  "resumen": "Pantalla AMOLED de 120 Hz, carga rápida de 45 W, IP67 y 6 años de actualizaciones",
  "descripcion": "El Galaxy A36 5G te da una pantalla Super AMOLED de 6.7\" a 120 Hz que se ve fluida y con buen brillo, incluso afuera. Es delgado, con vidrio Gorilla Glass Victus+ y protección IP67 contra polvo y agua.\n\nLa cámara principal de 50 MP tiene estabilizador óptico, así que tus fotos y videos salen más nítidos. Su batería de 5000 mAh te dura el día y, con un cargador de 45 W, recarga rápido.\n\nSamsung le promete 6 actualizaciones de Android y 6 años de seguridad, así que te va a durar años al día.",
  "caracteristicas": {
   "pantalla": "6.7\" Super AMOLED Full HD+, 120 Hz",
   "procesador": "Snapdragon 6 Gen 3",
   "camara": "50 MP con estabilizador + 8 MP gran angular + 5 MP macro",
   "camara_frontal": "12 MP",
   "bateria": "5000 mAh",
   "carga": "Carga súper rápida 45 W",
   "red": "5G",
   "sistema_operativo": "Android con One UI (hasta 6 actualizaciones)",
   "proteccion": "IP67 (polvo y agua), Gorilla Glass Victus+",
   "peso": "195 g"
  },
  "faq": [
   {
    "pregunta": "¿Trae cargador?",
    "respuesta": "No. Samsung solo incluye el cable USB-C; el cargador de 45 W se vende por separado."
   },
   {
    "pregunta": "¿Se puede mojar?",
    "respuesta": "Tiene certificación IP67: aguanta salpicaduras y hasta 1 metro de agua dulce por 30 minutos. No es para playa ni piscina, y la garantía no cubre daños por líquidos."
   },
   {
    "pregunta": "¿Viene liberado?",
    "respuesta": "Sí, funciona con cualquier compañía de El Salvador."
   }
  ],
  "meta_descripcion": "Samsung Galaxy A36 5G nuevo y sellado: AMOLED 120 Hz, 50 MP con estabilizador, carga 45 W, IP67. Garantía de 12 meses y pago contra entrega.",
  "orden": 30
 },
 {
  "slug": "samsung-galaxy-a56",
  "nombre": "Samsung Galaxy A56 5G",
  "resumen": "Marco de metal, AMOLED de 120 Hz, cámara de 50 MP y carga rápida de 45 W",
  "descripcion": "El Galaxy A56 5G se siente premium: marco de metal y vidrio Gorilla Glass Victus+ adelante y atrás. Su pantalla Super AMOLED de 6.7\" a 120 Hz se ve nítida y fluida.\n\nLa cámara de 50 MP con estabilizador óptico, más gran angular de 12 MP, te deja fotos claras de día y de noche. El procesador Exynos 1580 con 5G mueve apps y juegos con soltura.\n\nLa batería de 5000 mAh te dura el día, carga a 45 W y resiste polvo y agua (IP67). Samsung le promete hasta 6 actualizaciones de Android.",
  "caracteristicas": {
   "pantalla": "6.7\" Super AMOLED Full HD+, 120 Hz",
   "procesador": "Exynos 1580",
   "camara": "50 MP con estabilizador + 12 MP gran angular + 5 MP macro",
   "camara_frontal": "12 MP",
   "bateria": "5000 mAh",
   "carga": "Carga súper rápida 45 W",
   "red": "5G",
   "sistema_operativo": "Android con One UI (hasta 6 actualizaciones)",
   "proteccion": "IP67 (polvo y agua), Gorilla Glass Victus+ adelante y atrás",
   "peso": "198 g"
  },
  "faq": [
   {
    "pregunta": "¿Se puede mojar?",
    "respuesta": "Tiene certificación IP67: aguanta salpicaduras y hasta 1 metro de agua dulce por 30 minutos. No es para playa ni piscina, y la garantía no cubre daños por líquidos."
   },
   {
    "pregunta": "¿Cuántos años de actualizaciones tiene?",
    "respuesta": "Samsung le promete hasta 6 actualizaciones de Android y hasta 6 años de actualizaciones de seguridad."
   },
   {
    "pregunta": "¿Viene liberado?",
    "respuesta": "Sí, funciona con cualquier compañía de El Salvador."
   }
  ],
  "meta_descripcion": "Samsung Galaxy A56 5G nuevo y sellado: marco de metal, AMOLED 120 Hz, 50 MP, carga 45 W, IP67. Garantía de 12 meses y pago contra entrega.",
  "orden": 31
 },
 {
  "slug": "samsung-galaxy-a57",
  "nombre": "Samsung Galaxy A57 5G",
  "resumen": "Más delgado que nunca: 6.9 mm, resistente al agua IP68 y carga de 45 W",
  "descripcion": "El Galaxy A57 5G es más delgado y liviano que el modelo anterior: 6.9 mm y 179 g. Aun así resiste agua y polvo con certificación IP68 y lleva vidrio Gorilla Glass Victus+.\n\nSu pantalla Super AMOLED Plus de 6.7\" a 120 Hz se ve brillante, y el procesador Exynos 1680 con 5G responde rápido. La cámara de 50 MP con estabilizador mejora las fotos de noche.\n\nLa batería de 5000 mAh te dura el día y con un cargador de 45 W llegás a 60% en unos 30 minutos. Samsung le promete 6 actualizaciones de Android.",
  "caracteristicas": {
   "pantalla": "6.7\" Super AMOLED Plus Full HD+, 120 Hz",
   "procesador": "Exynos 1680",
   "camara": "50 MP con estabilizador + 12 MP gran angular + 5 MP macro",
   "camara_frontal": "12 MP",
   "bateria": "5000 mAh",
   "carga": "Carga súper rápida 45 W",
   "red": "5G",
   "sistema_operativo": "Android con One UI 8.5 (hasta 6 actualizaciones)",
   "proteccion": "IP68 (agua y polvo), Gorilla Glass Victus+",
   "peso": "179 g"
  },
  "incluye": "Teléfono\nCable USB-C a USB-C\nHerramienta para la bandeja SIM\nGuía rápida",
  "faq": [
   {
    "pregunta": "¿Se puede mojar?",
    "respuesta": "Tiene certificación IP68: aguanta hasta 1.5 metros de agua dulce por 30 minutos. No es para playa ni piscina, y la garantía no cubre daños por líquidos."
   },
   {
    "pregunta": "¿Trae cargador?",
    "respuesta": "No, solo trae el cable USB-C. Para la carga de 45 W necesitás un cargador compatible que se vende por separado."
   },
   {
    "pregunta": "¿Viene liberado?",
    "respuesta": "Sí, funciona con cualquier compañía de El Salvador."
   }
  ],
  "meta_descripcion": "Samsung Galaxy A57 5G nuevo y sellado: 6.9 mm, IP68, AMOLED 120 Hz, Exynos 1680, carga 45 W. Garantía de 12 meses y pago contra entrega.",
  "orden": 32
 },
 {
  "slug": "samsung-galaxy-s24-fe",
  "nombre": "Samsung Galaxy S24 FE",
  "resumen": "Gama alta Galaxy S con zoom óptico 3x, IP68 y pantalla Dynamic AMOLED de 120 Hz",
  "descripcion": "El Galaxy S24 FE te da la experiencia de la serie S a mejor precio. Su pantalla Dynamic AMOLED 2X de 6.7\" a 120 Hz se ve fluida y con colores intensos.\n\nTrae tres cámaras: 50 MP con estabilizador, gran angular de 12 MP y teleobjetivo de 8 MP con zoom óptico 3x, para acercarte sin perder calidad. El procesador Exynos 2400e con 5G mueve todo rápido.\n\nResiste agua y polvo (IP68), tiene Gorilla Glass Victus+ adelante y atrás, NFC y batería de 4700 mAh.",
  "caracteristicas": {
   "pantalla": "6.7\" Dynamic AMOLED 2X Full HD+, 120 Hz",
   "procesador": "Exynos 2400e",
   "camara": "50 MP con estabilizador + 12 MP gran angular + 8 MP teleobjetivo (zoom óptico 3x)",
   "camara_frontal": "10 MP",
   "bateria": "4700 mAh",
   "carga": "Carga rápida 25 W",
   "red": "5G",
   "sistema_operativo": "Android con One UI (hasta 7 actualizaciones)",
   "nfc": "Sí",
   "proteccion": "IP68 (agua y polvo), Gorilla Glass Victus+",
   "peso": "213 g"
  },
  "faq": [
   {
    "pregunta": "¿Se puede mojar?",
    "respuesta": "Tiene certificación IP68: aguanta hasta 1.5 metros de agua dulce por 30 minutos. No es para playa ni piscina, y la garantía no cubre daños por líquidos."
   },
   {
    "pregunta": "¿Sirve para pagar con el teléfono?",
    "respuesta": "Sí, tiene NFC, así que podés pagar sin contacto con las apps de pago compatibles."
   },
   {
    "pregunta": "¿Viene liberado?",
    "respuesta": "Sí, funciona con cualquier compañía de El Salvador."
   }
  ],
  "meta_descripcion": "Samsung Galaxy S24 FE nuevo y sellado: zoom óptico 3x, AMOLED 120 Hz, Exynos 2400e, IP68. Garantía de 12 meses y pago contra entrega.",
  "orden": 33
 },
 {
  "slug": "samsung-galaxy-s25-ultra",
  "nombre": "Samsung Galaxy S25 Ultra",
  "resumen": "Cámara de 200 MP, zoom óptico 5x, S Pen integrado y marco de titanio",
  "descripcion": "El Galaxy S25 Ultra tiene una pantalla de 6.9\" con resolución QHD+ y marco de titanio con vidrio Corning Gorilla Armor 2, resistente a rayones y caídas del día a día.\n\nSu cámara principal de 200 MP, con teleobjetivos de zoom óptico 3x y 5x, te deja fotos con mucho detalle aunque estés lejos. El procesador Snapdragon 8 Elite para Galaxy mueve juegos y apps sin esfuerzo.\n\nTrae el S Pen guardado en el teléfono para tomar notas o dibujar, batería de 5000 mAh y resistencia IP68 al agua y polvo.",
  "caracteristicas": {
   "pantalla": "6.9\" QHD+",
   "procesador": "Snapdragon 8 Elite para Galaxy",
   "camara": "200 MP + 50 MP gran angular + teleobjetivos de 50 MP y 10 MP (zoom óptico 3x y 5x)",
   "camara_frontal": "12 MP",
   "bateria": "5000 mAh",
   "red": "5G",
   "sistema_operativo": "Android con One UI 7",
   "proteccion": "IP68 (agua y polvo), Gorilla Armor 2, marco de titanio",
   "peso": "218 g"
  },
  "incluye": "Teléfono con S Pen integrado\nCable de datos USB-C\nHerramienta para la bandeja SIM",
  "faq": [
   {
    "pregunta": "¿Trae el S Pen?",
    "respuesta": "Sí, el S Pen viene guardado dentro del teléfono."
   },
   {
    "pregunta": "¿Trae cargador?",
    "respuesta": "No. Samsung solo incluye el cable USB-C; el cargador se vende por separado."
   },
   {
    "pregunta": "¿Viene liberado?",
    "respuesta": "Sí, funciona con cualquier compañía de El Salvador."
   }
  ],
  "meta_descripcion": "Samsung Galaxy S25 Ultra nuevo y sellado: cámara de 200 MP, zoom óptico 5x, S Pen, titanio, IP68. Garantía de 12 meses y pago contra entrega.",
  "orden": 34
 },
 {
  "slug": "samsung-galaxy-s26-ultra",
  "nombre": "Samsung Galaxy S26 Ultra",
  "resumen": "Pantalla privada integrada, cámara de 200 MP, S Pen y carga súper rápida de 60 W",
  "descripcion": "El Galaxy S26 Ultra estrena la pantalla privada: con un toque, quien está a tu lado ya no puede ver lo que tenés en la pantalla, ideal en el bus o en la oficina. Su pantalla de 6.9\" QHD+ a 120 Hz es antirreflejo.\n\nLa cámara principal de 200 MP, con zoom óptico 3x y 5x, te deja fotos con mucho detalle. El procesador Snapdragon 8 Elite Gen 5 para Galaxy mueve todo con soltura y una cámara de vapor que disipa mejor el calor.\n\nCon carga de 60 W llegás a 75% en unos 30 minutos. Trae S Pen integrado, resistencia IP68 y soporte de software hasta 2033.",
  "caracteristicas": {
   "pantalla": "6.9\" Dynamic AMOLED 2X QHD+, 120 Hz, con pantalla privada",
   "procesador": "Snapdragon 8 Elite Gen 5 para Galaxy",
   "camara": "200 MP + 50 MP + 50 MP + 10 MP (zoom óptico 3x y 5x)",
   "camara_frontal": "12 MP",
   "bateria": "5000 mAh",
   "carga": "Carga súper rápida 60 W",
   "red": "5G",
   "sistema_operativo": "Android con One UI 8.5 (soporte hasta febrero de 2033)",
   "nfc": "Sí",
   "proteccion": "IP68 (agua y polvo), Gorilla Armor 2 adelante y Gorilla Glass Victus 2 atrás",
   "peso": "214 g"
  },
  "incluye": "Teléfono con S Pen integrado\nCable de datos USB-C\nHerramienta para la bandeja SIM",
  "faq": [
   {
    "pregunta": "¿Qué es la pantalla privada?",
    "respuesta": "Es una función de la pantalla: al activarla, se ve bien de frente pero se oscurece para quien mira de lado. Podés usarla en toda la pantalla, solo en notificaciones o en ciertas apps."
   },
   {
    "pregunta": "¿Trae cargador?",
    "respuesta": "No. Samsung solo incluye el cable USB-C; para la carga de 60 W necesitás un cargador compatible."
   },
   {
    "pregunta": "¿Viene liberado?",
    "respuesta": "Sí, funciona con cualquier compañía de El Salvador."
   }
  ],
  "meta_descripcion": "Samsung Galaxy S26 Ultra nuevo y sellado: pantalla privada, 200 MP, S Pen, carga 60 W, IP68. Garantía de 12 meses y pago contra entrega.",
  "orden": 35
 },
 {
  "slug": "samsung-galaxy-tab-a11",
  "nombre": "Samsung Galaxy Tab A11 LTE (4G con chip)",
  "resumen": "Tablet de 8.7\" con chip 4G para tener internet en cualquier lugar",
  "descripcion": "La Galaxy Tab A11 LTE lleva chip: le ponés una SIM con datos y tenés internet en la calle, sin depender del Wi-Fi. Es compacta, de 8.7\", y pesa 337 g, así que cabe en cualquier bolso.\n\nSu pantalla de 90 Hz se ve fluida para ver videos, leer o hacer tareas, y los dos parlantes con Dolby Atmos suenan bien. También tiene entrada para audífonos de cable.\n\nLa batería de 5100 mAh te acompaña el día, y podés ampliar la memoria con una tarjeta microSD de hasta 2 TB.",
  "caracteristicas": {
   "pantalla": "8.7\" TFT 1340 x 800, 90 Hz",
   "procesador": "MediaTek Helio G99",
   "camara": "8 MP trasera + 5 MP frontal",
   "bateria": "5100 mAh",
   "carga": "Carga rápida 15 W",
   "red": "4G LTE (una SIM) + Wi-Fi",
   "sistema_operativo": "Android con One UI (soporte hasta septiembre de 2032)",
   "peso": "337 g"
  },
  "incluye": "Tablet\nCable de datos USB-C\nHerramienta para la bandeja SIM/microSD\nGuía rápida",
  "faq": [
   {
    "pregunta": "¿Le puedo poner chip?",
    "respuesta": "Sí, esta versión LTE tiene ranura para una SIM, así que podés usar datos móviles de cualquier compañía."
   },
   {
    "pregunta": "¿Se le puede ampliar la memoria?",
    "respuesta": "Sí, acepta tarjeta microSD de hasta 2 TB (se vende por separado)."
   }
  ],
  "meta_descripcion": "Samsung Galaxy Tab A11 LTE con chip 4G: pantalla 8.7\" de 90 Hz, Dolby Atmos, 5100 mAh. Garantía de 12 meses y pago contra entrega.",
  "orden": 36
 },
 {
  "slug": "samsung-galaxy-tab-a11-wifi",
  "nombre": "Samsung Galaxy Tab A11 Wi-Fi",
  "resumen": "Tablet compacta de 8.7\" con pantalla de 90 Hz y sonido Dolby Atmos",
  "descripcion": "La Galaxy Tab A11 Wi-Fi es una tablet compacta y liviana, de 8.7\" y 335 g, ideal para ver series, estudiar o que los niños jueguen en casa. Se conecta por Wi-Fi; no lleva chip.\n\nSu pantalla de 90 Hz se ve fluida y los dos parlantes con Dolby Atmos suenan bien. También tiene entrada para audífonos de cable.\n\nLa batería de 5100 mAh te dura el día, y podés ampliar la memoria con una tarjeta microSD de hasta 2 TB.",
  "caracteristicas": {
   "pantalla": "8.7\" TFT 1340 x 800, 90 Hz",
   "procesador": "MediaTek Helio G99",
   "camara": "8 MP trasera + 5 MP frontal",
   "bateria": "5100 mAh",
   "carga": "Carga rápida 15 W",
   "red": "Solo Wi-Fi (sin chip)",
   "sistema_operativo": "Android con One UI (soporte hasta septiembre de 2032)",
   "peso": "335 g"
  },
  "incluye": "Tablet\nCable de datos USB-C\nHerramienta para la bandeja microSD\nGuía rápida",
  "faq": [
   {
    "pregunta": "¿Le puedo poner chip?",
    "respuesta": "No, esta versión es solo Wi-Fi. Si necesitás internet en la calle, pedí la versión LTE con chip."
   },
   {
    "pregunta": "¿Se le puede ampliar la memoria?",
    "respuesta": "Sí, acepta tarjeta microSD de hasta 2 TB (se vende por separado)."
   }
  ],
  "meta_descripcion": "Samsung Galaxy Tab A11 Wi-Fi nueva y sellada: pantalla 8.7\" de 90 Hz, Dolby Atmos, 5100 mAh. Garantía de 12 meses y pago contra entrega.",
  "orden": 37
 },
 {
  "slug": "samsung-galaxy-tab-s10-fe",
  "nombre": "Samsung Galaxy Tab S10 FE",
  "resumen": "Tablet de 10.9\" con S Pen incluido, resistente al agua IP68",
  "descripcion": "La Galaxy Tab S10 FE trae el S Pen en la caja, así que podés tomar apuntes, subrayar PDFs o dibujar desde el primer día. Su pantalla de 10.9\" a 90 Hz se ve nítida y con buen brillo, incluso afuera.\n\nEl procesador Exynos 1580 mueve bien las apps de estudio y trabajo, y la batería de 8000 mAh te dura la jornada. Con un cargador de 45 W recarga rápido.\n\nEs delgada (6 mm) y resiste agua y polvo con certificación IP68, algo poco común en tablets.",
  "caracteristicas": {
   "pantalla": "10.9\" TFT 2304 x 1440, 90 Hz",
   "procesador": "Exynos 1580",
   "camara": "13 MP trasera + 12 MP frontal",
   "bateria": "8000 mAh",
   "carga": "Carga súper rápida 45 W",
   "sistema_operativo": "Android con One UI (soporte hasta abril de 2032)",
   "peso": "497 g"
  },
  "faq": [
   {
    "pregunta": "¿Trae el S Pen?",
    "respuesta": "Sí, el S Pen viene incluido con la tablet."
   },
   {
    "pregunta": "¿Se puede mojar?",
    "respuesta": "Tiene certificación IP68 contra agua y polvo. Aun así, la garantía no cubre daños por líquidos."
   }
  ],
  "meta_descripcion": "Samsung Galaxy Tab S10 FE nueva y sellada: 10.9\" de 90 Hz, S Pen incluido, Exynos 1580, IP68. Garantía de 12 meses y pago contra entrega.",
  "orden": 38
 },
 {
  "slug": "samsung-galaxy-buds-3",
  "nombre": "Samsung Galaxy Buds3",
  "resumen": "Diseño abierto cómodo, cancelación de ruido y hasta 30 h con el estuche",
  "descripcion": "Los Galaxy Buds3 tienen un diseño abierto y en ángulo, pensado para que el sonido llegue más cerca de tu oído. Aun así traen cancelación activa de ruido para bajar el ruido del bus o la calle.\n\nTe duran hasta 6 horas por carga y hasta 30 horas con el estuche. Resisten sudor y agua (IP57) y cada audífono pesa solo 4.7 g. Con algunos Galaxy compatibles, el sonido llega con calidad de hasta 24 bits.",
  "caracteristicas": {
   "tipo": "Inalámbricos de diseño abierto (TWS)",
   "autonomia": "Hasta 6 h (5 h con cancelación); hasta 30 h con estuche",
   "cancelacion_ruido": "Sí, activa",
   "resistencia": "IP57",
   "conexion": "Bluetooth 5.4",
   "peso": "4.7 g cada audífono"
  },
  "faq": [
   {
    "pregunta": "¿Funcionan con iPhone u otros Android?",
    "respuesta": "Sí, se conectan por Bluetooth con cualquier teléfono. Funciones como 360 Audio, Galaxy AI y la calidad de 24 bits son exclusivas de los Samsung Galaxy compatibles."
   },
   {
    "pregunta": "¿Son resistentes al agua?",
    "respuesta": "Los audífonos son IP57: aguantan sudor y lluvia. La garantía no cubre daños por líquidos."
   }
  ],
  "meta_descripcion": "Samsung Galaxy Buds3 originales y sellados: diseño abierto, cancelación de ruido, 30 h con estuche, IP57. Garantía de 12 meses y pago contra entrega.",
  "orden": 40
 },
 {
  "slug": "xiaomi-12",
  "nombre": "Xiaomi 12",
  "resumen": "Gama alta compacta: Snapdragon 8 Gen 1, AMOLED 120 Hz y carga de 67 W",
  "descripcion": "El Xiaomi 12 es un teléfono de gama alta que cabe cómodo en una mano: pantalla AMOLED de 6.28\" a 120 Hz, con Dolby Vision y vidrio Gorilla Glass Victus, y apenas 180 g de peso.\n\nCon el Snapdragon 8 Gen 1 abre apps y juegos pesados sin trabarse. Su cámara principal de 50 MP tiene estabilizador óptico, así que tus fotos de noche y tus videos salen sin temblor.\n\nLa batería de 4500 mAh se recarga rápido con el cargador de 67 W que viene en la caja, y también acepta carga inalámbrica de 50 W. Suena con doble bocina afinada por Harman Kardon.",
  "caracteristicas": {
   "pantalla": "6.28\" AMOLED Full HD+, 120 Hz, Gorilla Glass Victus",
   "procesador": "Snapdragon 8 Gen 1",
   "camara": "50 MP con estabilizador + 13 MP gran angular + 5 MP telemacro",
   "camara_frontal": "32 MP",
   "bateria": "4500 mAh",
   "carga": "Carga rápida 67 W (cargador incluido); inalámbrica 50 W; inversa inalámbrica 10 W",
   "red": "5G",
   "sistema_operativo": "Android 12, MIUI 13",
   "nfc": "Sí",
   "peso": "180 g"
  },
  "incluye": "Teléfono\nCargador de 67 W\nCable USB-C\nFunda protectora\nHerramienta para la bandeja SIM\nGuía rápida\nTarjeta de garantía",
  "faq": [
   {
    "pregunta": "¿Trae cargador?",
    "respuesta": "Sí, según Xiaomi la caja trae el cargador de 67 W, el cable USB-C y una funda protectora."
   },
   {
    "pregunta": "¿Se puede cargar sin cable?",
    "respuesta": "Sí, acepta carga inalámbrica de hasta 50 W y puede cargar otros aparatos por inducción a 10 W."
   },
   {
    "pregunta": "¿Viene liberado?",
    "respuesta": "Sí, funciona con cualquier compañía de El Salvador."
   }
  ],
  "meta_descripcion": "Xiaomi 12 nuevo y sellado: Snapdragon 8 Gen 1, AMOLED 120 Hz, 50 MP con estabilizador, carga 67 W. Garantía de 12 meses y pago contra entrega.",
  "orden": 50
 },
 {
  "slug": "xiaomi-poco-f6",
  "nombre": "Xiaomi POCO F6",
  "resumen": "Snapdragon 8s Gen 3 para juegos, AMOLED 1.5K de 120 Hz y carga de 90 W",
  "descripcion": "El POCO F6 es para quien quiere potencia de gama alta sin pagar precio de gama alta. Su procesador Snapdragon 8s Gen 3 mueve juegos pesados con fluidez y abre todo al instante.\n\nLa pantalla AMOLED de 6.67\" en resolución 1.5K a 120 Hz se ve nítida y brillante, con Dolby Vision y vidrio Gorilla Glass Victus. La cámara de 50 MP con sensor Sony te da buenas fotos de día y de noche.\n\nSu batería de 5000 mAh se recarga muy rápido con el cargador de 90 W que viene en la caja.",
  "caracteristicas": {
   "pantalla": "6.67\" AMOLED 1.5K, 120 Hz, Gorilla Glass Victus",
   "procesador": "Snapdragon 8s Gen 3",
   "camara": "50 MP (Sony IMX882) + 8 MP gran angular",
   "camara_frontal": "20 MP",
   "bateria": "5000 mAh",
   "carga": "Carga rápida 90 W (cargador incluido)",
   "red": "5G",
   "sistema_operativo": "Xiaomi HyperOS",
   "nfc": "Sí",
   "peso": "179 g"
  },
  "incluye": "Teléfono\nCargador de 90 W\nCable USB-C\nFunda protectora\nHerramienta para la bandeja SIM\nInformación de seguridad\nGuía rápida y tarjeta de garantía",
  "faq": [
   {
    "pregunta": "¿Trae cargador?",
    "respuesta": "Sí, según Xiaomi la caja trae el cargador de 90 W, el cable USB-C y una funda protectora."
   },
   {
    "pregunta": "¿Sirve para jugar?",
    "respuesta": "Sí, el Snapdragon 8s Gen 3 y la pantalla de 120 Hz están pensados para juegos exigentes."
   },
   {
    "pregunta": "¿Viene liberado?",
    "respuesta": "Sí, funciona con cualquier compañía de El Salvador."
   }
  ],
  "meta_descripcion": "Xiaomi POCO F6 nuevo y sellado: Snapdragon 8s Gen 3, AMOLED 1.5K 120 Hz, 50 MP Sony, carga 90 W. Garantía de 12 meses y pago contra entrega.",
  "orden": 51
 },
 {
  "slug": "xiaomi-poco-x5",
  "nombre": "Xiaomi POCO X5 5G",
  "resumen": "5G, pantalla AMOLED de 120 Hz y batería de 5000 mAh con cargador de 33 W",
  "descripcion": "El POCO X5 5G te da pantalla AMOLED de 6.67\" a 120 Hz, algo que pocas veces ves en este precio: colores vivos, negros profundos y movimiento fluido al pasar el dedo.\n\nCon el Snapdragon 695 y 5G, navega y abre redes rápido. La cámara principal de 48 MP viene acompañada de gran angular de 8 MP y macro de 2 MP.\n\nSu batería de 5000 mAh te dura el día, y en la caja viene el cargador de 33 W. Además tiene NFC, entrada de audífonos de 3.5 mm y espacio para memoria microSD.",
  "caracteristicas": {
   "pantalla": "6.67\" AMOLED Full HD+, 120 Hz",
   "procesador": "Snapdragon 695 5G",
   "camara": "48 MP + 8 MP gran angular + 2 MP macro",
   "camara_frontal": "13 MP",
   "bateria": "5000 mAh",
   "carga": "Carga rápida 33 W (cargador incluido)",
   "red": "5G",
   "sistema_operativo": "MIUI 13 para POCO",
   "nfc": "Sí",
   "peso": "189 g"
  },
  "incluye": "Teléfono\nCargador de 33 W\nCable USB-C\nFunda protectora\nHerramienta para la bandeja SIM\nGuía rápida\nTarjeta de garantía",
  "faq": [
   {
    "pregunta": "¿Es la versión 4G o 5G?",
    "respuesta": "Es el POCO X5 5G, con procesador Snapdragon 695 5G."
   },
   {
    "pregunta": "¿Se le puede poner memoria?",
    "respuesta": "Sí, acepta tarjeta microSD de hasta 1 TB (usa el espacio de la segunda SIM)."
   },
   {
    "pregunta": "¿Viene liberado?",
    "respuesta": "Sí, funciona con cualquier compañía de El Salvador."
   }
  ],
  "meta_descripcion": "Xiaomi POCO X5 5G nuevo y sellado: AMOLED 120 Hz, Snapdragon 695, 5000 mAh con cargador 33 W, NFC. Garantía de 12 meses y pago contra entrega.",
  "orden": 52
 },
 {
  "slug": "xiaomi-poco-x8-pro",
  "nombre": "Xiaomi POCO X8 Pro",
  "resumen": "Batería de 6500 mAh, carga de 100 W, AMOLED 1.5K de 120 Hz y resistencia IP68",
  "descripcion": "El POCO X8 Pro junta potencia y aguante: el Dimensity 8500-Ultra mueve juegos y apps pesadas sin calentarse de más, y la batería de 6500 mAh te dura con holgura el día completo.\n\nCon carga de 100 W se recupera en poco tiempo, y hasta puede cargar otro teléfono o tus audífonos por cable a 27 W. Su pantalla AMOLED 1.5K de 6.59\" a 120 Hz es muy brillante, ideal para usar bajo el sol.\n\nLa cámara de 50 MP con estabilizador óptico graba en 4K, y el teléfono resiste polvo y agua con certificación IP68.",
  "caracteristicas": {
   "pantalla": "6.59\" AMOLED 1.5K, 120 Hz, Gorilla Glass 7i",
   "procesador": "MediaTek Dimensity 8500-Ultra",
   "camara": "50 MP con estabilizador (Sony IMX882) + 8 MP gran angular",
   "camara_frontal": "20 MP",
   "bateria": "6500 mAh",
   "carga": "HyperCharge 100 W; carga inversa por cable 27 W",
   "red": "5G",
   "sistema_operativo": "Xiaomi HyperOS 3",
   "nfc": "Sí",
   "proteccion": "IP68 (polvo y agua)",
   "peso": "201 g"
  },
  "faq": [
   {
    "pregunta": "¿Es resistente al agua?",
    "respuesta": "Tiene certificación IP68 contra polvo y agua, probada en laboratorio. Igual no conviene meterlo a la piscina ni al mar."
   },
   {
    "pregunta": "¿Puede cargar otros aparatos?",
    "respuesta": "Sí, por cable USB-C puede cargar otro teléfono o tus audífonos hasta a 27 W."
   },
   {
    "pregunta": "¿Viene liberado?",
    "respuesta": "Sí, funciona con cualquier compañía de El Salvador."
   }
  ],
  "meta_descripcion": "Xiaomi POCO X8 Pro nuevo y sellado: 6500 mAh, carga 100 W, AMOLED 1.5K 120 Hz, IP68, 5G. Garantía de 12 meses y pago contra entrega.",
  "orden": 53
 },
 {
  "slug": "xiaomi-redmi-17",
  "nombre": "Xiaomi Redmi 17",
  "resumen": "Batería de 7500 mAh, pantalla de 6.9\" a 120 Hz y resistencia IP64",
  "descripcion": "El Redmi 17 es para quien no quiere andar pendiente del cargador: su batería de 7500 mAh aguanta fácilmente más de un día, y con carga de 45 W se recupera rápido. Hasta puede cargar otro teléfono por cable.\n\nSu pantalla de 6.9\" a 120 Hz es grande y fluida para videos y redes, y está protegida con Gorilla Glass 7i. Resiste polvo y salpicaduras (IP64) y tiene NFC y entrada de audífonos de 3.5 mm.",
  "caracteristicas": {
   "pantalla": "6.9\" HD+, 120 Hz, Gorilla Glass 7i",
   "procesador": "MediaTek Helio G91-Ultra",
   "camara": "50 MP + lente auxiliar",
   "camara_frontal": "8 MP",
   "bateria": "7500 mAh",
   "carga": "Carga rápida 45 W (cargador no incluido); carga inversa por cable 22.5 W",
   "red": "4G",
   "sistema_operativo": "Xiaomi HyperOS 3",
   "nfc": "Sí",
   "proteccion": "IP64 (polvo y salpicaduras)",
   "peso": "232 g"
  },
  "incluye": "Teléfono\nCable USB-C\nHerramienta para la bandeja SIM\nInformación de seguridad\nGuía rápida y tarjeta de garantía",
  "faq": [
   {
    "pregunta": "¿Trae cargador?",
    "respuesta": "No, Xiaomi no incluye cargador en la caja; trae el cable USB-C. Para la carga más rápida necesitás un cargador de 45 W."
   },
   {
    "pregunta": "¿Es la versión 4G o 5G?",
    "respuesta": "Es el Redmi 17 4G, con procesador Helio G91-Ultra y NFC."
   },
   {
    "pregunta": "¿Viene liberado?",
    "respuesta": "Sí, funciona con cualquier compañía de El Salvador."
   }
  ],
  "meta_descripcion": "Xiaomi Redmi 17 nuevo y sellado: 7500 mAh, pantalla 6.9\" 120 Hz, carga 45 W, IP64 y NFC. Garantía de 12 meses y pago contra entrega.",
  "orden": 54
 },
 {
  "slug": "xiaomi-redmi-a7-pro",
  "nombre": "Xiaomi Redmi A7 Pro",
  "resumen": "Pantalla grande de 6.9\" a 120 Hz y batería de 6000 mAh a precio de entrada",
  "descripcion": "El Redmi A7 Pro es un teléfono sencillo y rendidor: pantalla de 6.9\" a 120 Hz para ver videos y redes en grande, y batería de 6000 mAh que te dura el día.\n\nViene con Xiaomi HyperOS 3, Google Gemini y Círculo para Buscar, lector de huella en el costado y entrada de audífonos de 3.5 mm. Ideal como primer teléfono o para quien solo quiere WhatsApp, llamadas y redes sin complicarse.",
  "caracteristicas": {
   "pantalla": "6.9\" LCD HD+, 120 Hz",
   "procesador": "UNISOC T7250",
   "camara": "13 MP + lente auxiliar",
   "camara_frontal": "8 MP",
   "bateria": "6000 mAh",
   "carga": "Carga rápida 15 W",
   "red": "4G",
   "sistema_operativo": "Xiaomi HyperOS 3",
   "peso": "208 g"
  },
  "faq": [
   {
    "pregunta": "¿Se le puede poner memoria?",
    "respuesta": "Sí, tiene espacio para dos SIM y una tarjeta microSD aparte."
   },
   {
    "pregunta": "¿Tiene entrada para audífonos?",
    "respuesta": "Sí, trae entrada de 3.5 mm para audífonos con cable."
   },
   {
    "pregunta": "¿Viene liberado?",
    "respuesta": "Sí, funciona con cualquier compañía de El Salvador."
   }
  ],
  "meta_descripcion": "Xiaomi Redmi A7 Pro nuevo y sellado: pantalla 6.9\" 120 Hz, 6000 mAh, HyperOS 3, entrada de audífonos. Garantía de 12 meses y pago contra entrega.",
  "orden": 55
 },
 {
  "slug": "xiaomi-redmi-note-15-pro",
  "nombre": "Xiaomi Redmi Note 15 Pro",
  "resumen": "Cámara de 200 MP con estabilizador, AMOLED de 120 Hz y batería de 6500 mAh",
  "descripcion": "El Redmi Note 15 Pro es para quien quiere fotos con mucho detalle: su cámara de 200 MP con estabilizador óptico saca fotos nítidas incluso de noche, y la frontal de 32 MP te deja selfies claros.\n\nLa pantalla AMOLED de 6.77\" a 120 Hz llega hasta 3200 nits, así que se ve bien bajo el sol. Su batería de 6500 mAh dura el día y en la caja viene el cargador de 45 W.\n\nResiste polvo y chorros de agua (IP65) y tiene NFC, doble bocina y control remoto infrarrojo.",
  "caracteristicas": {
   "pantalla": "6.77\" AMOLED Full HD+, 120 Hz",
   "procesador": "MediaTek Helio G200-Ultra",
   "camara": "200 MP con estabilizador + 8 MP gran angular",
   "camara_frontal": "32 MP",
   "bateria": "6500 mAh",
   "carga": "Carga rápida 45 W (cargador incluido)",
   "red": "4G",
   "sistema_operativo": "Xiaomi HyperOS 2",
   "nfc": "Sí",
   "proteccion": "IP65 (polvo y chorros de agua)",
   "peso": "195 g"
  },
  "incluye": "Teléfono\nCargador de 45 W\nCable USB-C\nFunda protectora\nHerramienta para la bandeja SIM\nInformación de seguridad\nGuía rápida y tarjeta de garantía",
  "faq": [
   {
    "pregunta": "¿Es la versión 4G o 5G?",
    "respuesta": "Es el Redmi Note 15 Pro 4G, con procesador Helio G200-Ultra y NFC."
   },
   {
    "pregunta": "¿Trae cargador?",
    "respuesta": "Sí, según Xiaomi la caja trae el cargador de 45 W, el cable USB-C y una funda protectora."
   },
   {
    "pregunta": "¿Viene liberado?",
    "respuesta": "Sí, funciona con cualquier compañía de El Salvador."
   }
  ],
  "meta_descripcion": "Xiaomi Redmi Note 15 Pro nuevo y sellado: 200 MP con estabilizador, AMOLED 120 Hz, 6500 mAh, IP65. Garantía de 12 meses y pago contra entrega.",
  "orden": 56
 },
 {
  "slug": "xiaomi-redmi-note-15-pro-plus",
  "nombre": "Xiaomi Redmi Note 15 Pro+ 5G",
  "resumen": "200 MP con estabilizador, carga de 100 W y resistencia al agua IP68/IP69",
  "descripcion": "El Redmi Note 15 Pro+ 5G está hecho para aguantar: resiste polvo, inmersión y chorros de agua a presión (IP68 e IP69), y su pantalla lleva vidrio Gorilla Glass Victus 2.\n\nLa cámara de 200 MP con estabilizador óptico graba en 4K, y la frontal de 32 MP saca selfies con buen detalle. La pantalla AMOLED 1.5K de 6.83\" a 120 Hz se ve brillante incluso bajo el sol.\n\nCon el Snapdragon 7s Gen 4 y 5G anda rápido, y su batería de 6500 mAh se recarga con el cargador de 100 W que viene en la caja.",
  "caracteristicas": {
   "pantalla": "6.83\" AMOLED 1.5K, 120 Hz, Gorilla Glass Victus 2",
   "procesador": "Snapdragon 7s Gen 4",
   "camara": "200 MP con estabilizador + 8 MP gran angular",
   "camara_frontal": "32 MP",
   "bateria": "6500 mAh",
   "carga": "HyperCharge 100 W (cargador incluido)",
   "red": "5G",
   "sistema_operativo": "Xiaomi HyperOS 2",
   "nfc": "Sí",
   "proteccion": "IP66, IP68, IP69 e IP69K (polvo y agua)",
   "peso": "207 g"
  },
  "incluye": "Teléfono\nCargador de 100 W\nCable USB-C\nFunda protectora\nHerramienta para la bandeja SIM\nGuía rápida\nTarjeta de garantía",
  "faq": [
   {
    "pregunta": "¿Es resistente al agua?",
    "respuesta": "Sí, tiene IP68 e IP69, probadas en laboratorio contra inmersión y chorros a presión. Igual no conviene usarlo en la piscina ni en el mar."
   },
   {
    "pregunta": "¿Trae cargador?",
    "respuesta": "Sí, según Xiaomi la caja trae el cargador de 100 W, el cable USB-C y una funda protectora."
   },
   {
    "pregunta": "¿Viene liberado?",
    "respuesta": "Sí, funciona con cualquier compañía de El Salvador."
   }
  ],
  "meta_descripcion": "Xiaomi Redmi Note 15 Pro+ 5G nuevo y sellado: 200 MP, carga 100 W, IP68/IP69, AMOLED 1.5K 120 Hz. Garantía de 12 meses y pago contra entrega.",
  "orden": 57
 },
 {
  "slug": "xiaomi-redmi-pad-2",
  "nombre": "Xiaomi Redmi Pad 2 9.7 4G",
  "resumen": "Tablet con chip para línea 4G, pantalla 2K de 9.7\" a 120 Hz y 7600 mAh",
  "descripcion": "La Redmi Pad 2 9.7 4G te deja tener internet en cualquier lado: le ponés tu chip y navegás con datos móviles, sin depender del Wi-Fi.\n\nSu pantalla 2K de 9.7\" a 120 Hz se ve nítida para clases, series y videollamadas, y pesa 401 g, liviana para llevarla en la mochila. La batería de 7600 mAh te dura la jornada.\n\nTrae bocinas estéreo, entrada de audífonos de 3.5 mm y el cargador en la caja.",
  "caracteristicas": {
   "pantalla": "9.7\" 2K (2048 x 1280), 120 Hz",
   "procesador": "Snapdragon 6s 4G Gen 2",
   "camara": "8 MP trasera + 5 MP frontal",
   "bateria": "7600 mAh",
   "carga": "Carga rápida 18 W (cargador de 15 W incluido)",
   "red": "4G LTE con chip + Wi-Fi 5",
   "sistema_operativo": "Xiaomi HyperOS 3",
   "peso": "401 g"
  },
  "incluye": "Tablet\nCargador\nCable USB-C\nHerramienta para la bandeja\nGuía rápida\nTarjeta de garantía",
  "faq": [
   {
    "pregunta": "¿Le puedo poner chip?",
    "respuesta": "Sí, es la versión 4G: acepta chip para navegar con datos móviles."
   },
   {
    "pregunta": "¿Trae cargador?",
    "respuesta": "Sí, según Xiaomi la caja trae un cargador de 15 W y el cable USB-C."
   }
  ],
  "meta_descripcion": "Xiaomi Redmi Pad 2 9.7 4G nueva y sellada: pantalla 2K 120 Hz, chip 4G, 7600 mAh, bocinas estéreo. Garantía de 12 meses y pago contra entrega.",
  "orden": 58
 },
 {
  "slug": "xiaomi-redmi-pad-se",
  "nombre": "Xiaomi Redmi Pad SE 8.7 4G",
  "resumen": "Tablet compacta de 8.7\" con chip 4G, batería de 6650 mAh y entrada de audífonos",
  "descripcion": "La Redmi Pad SE 8.7 4G es una tablet pequeña y práctica: le ponés tu chip y tenés internet con datos móviles donde estés, sin depender del Wi-Fi.\n\nSu pantalla de 8.7\" a 90 Hz es cómoda para clases, videos y juegos sencillos, y pesa 375 g o menos, ideal para llevarla a todos lados. La batería de 6650 mAh te dura el día.\n\nTrae dos bocinas con Dolby Atmos, entrada de audífonos de 3.5 mm y espacio para memoria microSD.",
  "caracteristicas": {
   "pantalla": "8.7\" LCD (1340 x 800), 90 Hz",
   "procesador": "MediaTek Helio G85",
   "camara": "8 MP trasera + 5 MP frontal",
   "bateria": "6650 mAh",
   "carga": "Admite carga rápida 18 W (cargador de 10 W incluido)",
   "red": "4G LTE con chip + Wi-Fi 5",
   "sistema_operativo": "Xiaomi HyperOS (Android 14)",
   "peso": "375 g o menos"
  },
  "incluye": "Tablet\nCargador de 10 W\nCable USB-C\nHerramienta para la bandeja SIM\nGuía rápida\nTarjeta de garantía",
  "faq": [
   {
    "pregunta": "¿Le puedo poner chip?",
    "respuesta": "Sí, es la versión 4G: acepta chip para navegar con datos móviles y llamar."
   },
   {
    "pregunta": "¿Se le puede poner memoria?",
    "respuesta": "Sí, acepta tarjeta microSD de hasta 2 TB para fotos, videos y música."
   }
  ],
  "meta_descripcion": "Xiaomi Redmi Pad SE 8.7 4G nueva y sellada: chip 4G, pantalla 90 Hz, 6650 mAh, Dolby Atmos. Garantía de 12 meses y pago contra entrega.",
  "orden": 59
 },
 {
  "slug": "infinix-gt-50-pro",
  "nombre": "Infinix GT 50 Pro",
  "resumen": "Para jugar: Dimensity 8400, pantalla AMOLED de 144 Hz y gatillos GT",
  "descripcion": "El Infinix GT 50 Pro está hecho para jugar. Su procesador Dimensity 8400 Ultimate y la pantalla AMOLED 1.5K de 6.78\" a 144 Hz mueven los juegos rápido y fluido, y los gatillos GT sensibles a la presión te dan controles como de consola.\n\nTiene enfriamiento líquido para que no se caliente en partidas largas, cámara de 50 MP con estabilizador y gran angular de 8 MP, 5G y NFC.\n\nSu batería de más de 6000 mAh carga a 45 W con cable y a 30 W sin cable. Resiste polvo y salpicaduras (IP64).",
  "caracteristicas": {
   "pantalla": "6.78\" AMOLED 1.5K, 144 Hz, Gorilla Glass 7i",
   "procesador": "MediaTek Dimensity 8400 Ultimate",
   "camara": "50 MP con estabilizador + 8 MP gran angular",
   "camara_frontal": "13 MP",
   "bateria": "6150 o 6500 mAh, según la versión",
   "carga": "Carga rápida 45 W, inalámbrica 30 W",
   "red": "5G",
   "sistema_operativo": "Android 16, XOS 16",
   "nfc": "Sí",
   "proteccion": "IP64 (polvo y salpicaduras)",
   "peso": "198 g"
  },
  "faq": [
   {
    "pregunta": "¿Tiene carga inalámbrica?",
    "respuesta": "Sí, carga sin cable hasta 30 W y con cable hasta 45 W."
   },
   {
    "pregunta": "¿Tiene entrada para audífonos?",
    "respuesta": "No tiene conector de 3.5 mm; los audífonos con cable se conectan por USB-C."
   },
   {
    "pregunta": "¿Viene liberado?",
    "respuesta": "Sí, funciona con cualquier compañía de El Salvador."
   }
  ],
  "meta_descripcion": "Infinix GT 50 Pro nuevo y sellado: Dimensity 8400, AMOLED 144 Hz, gatillos GT, 5G y NFC. Garantía de 12 meses y pago contra entrega.",
  "orden": 65
 },
 {
  "slug": "infinix-hot-60-pro",
  "nombre": "Infinix HOT 60 Pro",
  "resumen": "Delgado y liviano, pantalla AMOLED 1.5K de 144 Hz y carga rápida de 45 W",
  "descripcion": "El Infinix HOT 60 Pro es delgado (6.6 mm) y liviano (170 g), cómodo para llevar todo el día. Su pantalla AMOLED 1.5K de 6.78\" a 144 Hz se ve nítida y con buen brillo.\n\nTiene procesador Helio G200, cámara de 50 MP, NFC y resiste polvo y salpicaduras (IP64). Su batería de 5160 mAh carga rápido a 45 W y le podés poner memoria microSD.",
  "caracteristicas": {
   "pantalla": "6.78\" AMOLED 1.5K, 144 Hz, Gorilla Glass 7i",
   "procesador": "MediaTek Helio G200",
   "camara": "50 MP",
   "camara_frontal": "13 MP",
   "bateria": "5160 mAh",
   "carga": "Carga rápida 45 W",
   "red": "4G",
   "sistema_operativo": "Android 15, XOS 15",
   "nfc": "Sí",
   "proteccion": "IP64 (polvo y salpicaduras)",
   "peso": "170 g"
  },
  "faq": [
   {
    "pregunta": "¿Se le puede poner memoria?",
    "respuesta": "Sí, acepta tarjeta microSD de hasta 2 TB además de las dos SIM."
   },
   {
    "pregunta": "¿Es resistente al agua?",
    "respuesta": "Resiste polvo y salpicaduras (IP64), pero no se debe meter al agua."
   },
   {
    "pregunta": "¿Viene liberado?",
    "respuesta": "Sí, funciona con cualquier compañía de El Salvador."
   }
  ],
  "meta_descripcion": "Infinix HOT 60 Pro nuevo y sellado: AMOLED 1.5K 144 Hz, 6.6 mm, carga 45 W, NFC. Garantía de 12 meses y pago contra entrega.",
  "orden": 66
 },
 {
  "slug": "infinix-hot-60-pro-plus",
  "nombre": "Infinix HOT 60 Pro+",
  "resumen": "Solo 5.95 mm y 155 g, pantalla curva AMOLED de 144 Hz y cámara Sony de 50 MP",
  "descripcion": "El Infinix HOT 60 Pro+ mide solo 5.95 mm de grosor y pesa 155 g: casi no lo sentís en la bolsa. Su pantalla curva AMOLED 1.5K de 6.78\" a 144 Hz se ve elegante y fluida.\n\nLa cámara de 50 MP usa sensor Sony IMX882, tiene bocinas dobles con sonido JBL, NFC y resiste polvo y chorros de agua (IP65). Su batería de 5160 mAh carga rápido a 45 W.",
  "caracteristicas": {
   "pantalla": "6.78\" AMOLED 1.5K curva, 144 Hz, Gorilla Glass 7i",
   "procesador": "MediaTek Helio G200",
   "camara": "50 MP Sony IMX882",
   "camara_frontal": "13 MP",
   "bateria": "5160 mAh",
   "carga": "Carga rápida 45 W",
   "red": "4G",
   "sistema_operativo": "Android 15, XOS 15",
   "nfc": "Sí",
   "proteccion": "IP65 (polvo y chorros de agua)",
   "peso": "155 g"
  },
  "faq": [
   {
    "pregunta": "¿Es resistente al agua?",
    "respuesta": "Resiste polvo y chorros de agua (IP65), pero no se debe sumergir."
   },
   {
    "pregunta": "¿Se le puede poner memoria?",
    "respuesta": "No, tiene espacio para dos SIM pero no para tarjeta microSD."
   },
   {
    "pregunta": "¿Viene liberado?",
    "respuesta": "Sí, funciona con cualquier compañía de El Salvador."
   }
  ],
  "meta_descripcion": "Infinix HOT 60 Pro+ nuevo y sellado: 5.95 mm, AMOLED curva 144 Hz, cámara Sony 50 MP, NFC. Garantía de 12 meses y pago contra entrega.",
  "orden": 67
 },
 {
  "slug": "infinix-hot-70-pro",
  "nombre": "Infinix HOT 70 Pro 5G+",
  "resumen": "5G, resistencia IP68 al agua y polvo, pantalla de 144 Hz y cámara Sony de 50 MP",
  "descripcion": "El Infinix HOT 70 Pro 5G+ aguanta el día a día: tiene certificación IP68 contra polvo y agua, así que la lluvia o un derrame no lo detienen.\n\nSu pantalla de 6.76\" a 144 Hz es fluida, el procesador Dimensity 7100 con 5G abre apps rápido y la cámara de 50 MP usa sensor Sony IMX882. Tiene NFC y espacio para memoria microSD.\n\nLa batería de 5600 mAh carga rápido a 45 W.",
  "caracteristicas": {
   "pantalla": "6.76\" Full HD+ (LCD), 144 Hz",
   "procesador": "MediaTek Dimensity 7100",
   "camara": "50 MP Sony IMX882",
   "camara_frontal": "8 MP",
   "bateria": "5600 mAh",
   "carga": "Carga rápida 45 W",
   "red": "5G",
   "sistema_operativo": "Android 16, XOS 16",
   "nfc": "Sí",
   "proteccion": "IP68 (polvo y agua)",
   "peso": "204 g"
  },
  "faq": [
   {
    "pregunta": "¿Es resistente al agua?",
    "respuesta": "Sí, tiene IP68 contra polvo y agua. Aun así, Infinix aclara que los daños por líquidos no los cubre la garantía."
   },
   {
    "pregunta": "¿Se le puede poner memoria?",
    "respuesta": "Sí, acepta tarjeta microSD además de las dos SIM."
   },
   {
    "pregunta": "¿Viene liberado?",
    "respuesta": "Sí, funciona con cualquier compañía de El Salvador."
   }
  ],
  "meta_descripcion": "Infinix HOT 70 Pro 5G+ nuevo y sellado: IP68, 5G, pantalla 144 Hz, cámara Sony 50 MP, NFC. Garantía de 12 meses y pago contra entrega.",
  "orden": 68
 },
 {
  "slug": "infinix-note-60",
  "nombre": "Infinix NOTE 60",
  "resumen": "5G, AMOLED 1.5K de 144 Hz, cámara de 50 MP con estabilizador y carga inalámbrica",
  "descripcion": "El Infinix NOTE 60 tiene diseño de metal y una pantalla AMOLED 1.5K de 6.78\" a 144 Hz, con colores intensos para ver videos y series.\n\nLa cámara de 50 MP con estabilizador saca buenas fotos de noche y suma gran angular de 8 MP. Con el procesador Dimensity 7400 Ultimate y 5G, todo va rápido, y sus bocinas dobles tienen sonido JBL.\n\nLa batería de más de 6000 mAh carga a 45 W con cable y a 30 W sin cable. Tiene NFC y resiste polvo y salpicaduras (IP64).",
  "caracteristicas": {
   "pantalla": "6.78\" AMOLED 1.5K, 144 Hz, Gorilla Glass 7i",
   "procesador": "MediaTek Dimensity 7400 Ultimate",
   "camara": "50 MP con estabilizador + 8 MP gran angular",
   "camara_frontal": "13 MP",
   "bateria": "6150 o 6500 mAh, según la versión",
   "carga": "Carga rápida 45 W, inalámbrica 30 W",
   "red": "5G",
   "sistema_operativo": "Android 16, XOS 16",
   "nfc": "Sí",
   "proteccion": "IP64 (polvo y salpicaduras)",
   "peso": "199 g"
  },
  "faq": [
   {
    "pregunta": "¿Tiene carga inalámbrica?",
    "respuesta": "Sí, carga sin cable hasta 30 W y con cable hasta 45 W."
   },
   {
    "pregunta": "¿Tiene entrada para audífonos?",
    "respuesta": "No tiene conector de 3.5 mm; los audífonos con cable se conectan por USB-C."
   },
   {
    "pregunta": "¿Viene liberado?",
    "respuesta": "Sí, funciona con cualquier compañía de El Salvador."
   }
  ],
  "meta_descripcion": "Infinix NOTE 60 nuevo y sellado: 5G, AMOLED 144 Hz, 50 MP con estabilizador, carga inalámbrica. Garantía de 12 meses y pago contra entrega.",
  "orden": 69
 },
 {
  "slug": "infinix-note-60-pro",
  "nombre": "Infinix NOTE 60 Pro",
  "resumen": "Snapdragon 7s Gen 4, carga de 90 W, AMOLED de 144 Hz y pantalla trasera",
  "descripcion": "El Infinix NOTE 60 Pro carga a 90 W con cable, así que lo llenás en poco tiempo, y también carga sin cable a 30 W. Su batería es de 6000 mAh o más, según la versión.\n\nTiene procesador Snapdragon 7s Gen 4 con 5G, pantalla AMOLED 1.5K de 6.78\" a 144 Hz y una pequeña pantalla en la parte de atrás (Active Matrix) que muestra hora y avisos. La cámara de 50 MP tiene estabilizador y gran angular de 8 MP.\n\nDiseño de metal, bocinas dobles con sonido JBL, NFC y resistencia a polvo y salpicaduras (IP64).",
  "caracteristicas": {
   "pantalla": "6.78\" AMOLED 1.5K, 144 Hz, Gorilla Glass 7i",
   "procesador": "Snapdragon 7s Gen 4",
   "camara": "50 MP con estabilizador + 8 MP gran angular",
   "camara_frontal": "13 MP",
   "bateria": "6000 a 6500 mAh, según la versión",
   "carga": "Carga rápida 90 W, inalámbrica 30 W",
   "red": "5G",
   "sistema_operativo": "Android 16, XOS 16",
   "nfc": "Sí",
   "proteccion": "IP64 (polvo y salpicaduras)",
   "peso": "201.7 g"
  },
  "faq": [
   {
    "pregunta": "¿Tiene carga inalámbrica?",
    "respuesta": "Sí, carga sin cable hasta 30 W y con cable hasta 90 W."
   },
   {
    "pregunta": "¿Se le puede poner memoria?",
    "respuesta": "No, tiene espacio para dos SIM pero no para tarjeta microSD."
   },
   {
    "pregunta": "¿Viene liberado?",
    "respuesta": "Sí, funciona con cualquier compañía de El Salvador."
   }
  ],
  "meta_descripcion": "Infinix NOTE 60 Pro nuevo y sellado: Snapdragon 7s Gen 4, carga 90 W, AMOLED 144 Hz, 5G y NFC. Garantía de 12 meses y pago contra entrega.",
  "orden": 70
 },
 {
  "slug": "infinix-note-edge",
  "nombre": "Infinix NOTE Edge",
  "resumen": "Pantalla curva AMOLED 1.5K, 5G y batería de más de 6000 mAh en solo 7.2 mm",
  "descripcion": "El Infinix NOTE Edge es delgado (7.2 mm) y tiene pantalla curva AMOLED 1.5K de 6.78\" a 120 Hz, que se ve elegante y cuida tus ojos.\n\nCon el procesador Dimensity 7100 y 5G, tenés buena velocidad para apps y redes. La cámara es de 50 MP, las bocinas dobles tienen sonido JBL y trae NFC.\n\nSu batería de más de 6000 mAh carga rápido a 45 W y resiste polvo y chorros de agua (IP65).",
  "caracteristicas": {
   "pantalla": "6.78\" AMOLED 1.5K curva, 120 Hz, Gorilla Glass 7i",
   "procesador": "MediaTek Dimensity 7100",
   "camara": "50 MP",
   "camara_frontal": "13 MP",
   "bateria": "6150 o 6500 mAh, según la versión",
   "carga": "Carga rápida 45 W",
   "red": "5G",
   "sistema_operativo": "Android 16, XOS 16",
   "nfc": "Sí",
   "proteccion": "IP65 (polvo y chorros de agua)",
   "peso": "185 a 190 g, según el color"
  },
  "faq": [
   {
    "pregunta": "¿Es resistente al agua?",
    "respuesta": "Resiste polvo y chorros de agua (IP65), pero no se debe sumergir."
   },
   {
    "pregunta": "¿Tiene entrada para audífonos?",
    "respuesta": "No tiene conector de 3.5 mm; los audífonos con cable se conectan por USB-C."
   },
   {
    "pregunta": "¿Viene liberado?",
    "respuesta": "Sí, funciona con cualquier compañía de El Salvador."
   }
  ],
  "meta_descripcion": "Infinix NOTE Edge nuevo y sellado: pantalla curva AMOLED 1.5K, 5G, 7.2 mm, carga 45 W, NFC. Garantía de 12 meses y pago contra entrega.",
  "orden": 71
 },
 {
  "slug": "infinix-smart-10-ap1",
  "nombre": "Infinix Smart 10",
  "resumen": "Pantalla de 6.67\" a 120 Hz, batería de 5000 mAh y resistencia IP64",
  "descripcion": "El Infinix Smart 10 es un teléfono sencillo para el día a día: WhatsApp, llamadas, redes y videos en una pantalla de 6.67\" a 120 Hz que se ve fluida y se lee bien bajo el sol.\n\nSu batería de 5000 mAh te dura el día, tiene dos bocinas con volumen alto y resiste polvo y salpicaduras (IP64). Le podés poner memoria microSD si necesitás más espacio para fotos.",
  "caracteristicas": {
   "pantalla": "6.67\" HD+ (LCD), 120 Hz",
   "procesador": "T7250 de ocho núcleos",
   "camara": "8 MP",
   "camara_frontal": "8 MP",
   "bateria": "5000 mAh",
   "carga": "15 W",
   "red": "4G",
   "sistema_operativo": "Android 15, XOS 15.1",
   "proteccion": "IP64 (polvo y salpicaduras)",
   "peso": "187 g"
  },
  "faq": [
   {
    "pregunta": "¿Se le puede poner memoria?",
    "respuesta": "Sí, acepta tarjeta microSD de hasta 2 TB además de las dos SIM."
   },
   {
    "pregunta": "¿Tiene entrada para audífonos?",
    "respuesta": "Sí, tiene conector de 3.5 mm para audífonos con cable."
   },
   {
    "pregunta": "¿Viene liberado?",
    "respuesta": "Sí, funciona con cualquier compañía de El Salvador."
   }
  ],
  "meta_descripcion": "Infinix Smart 10 nuevo y sellado: pantalla 6.67\" a 120 Hz, 5000 mAh, dos bocinas, IP64. Garantía de 12 meses y pago contra entrega.",
  "orden": 72
 },
 {
  "slug": "infinix-smart-10-az1",
  "nombre": "Infinix Smart 10",
  "resumen": "Pantalla de 6.67\" a 120 Hz, batería de 5000 mAh y resistencia IP64",
  "descripcion": "El Infinix Smart 10 es un teléfono sencillo para el día a día: WhatsApp, llamadas, redes y videos en una pantalla de 6.67\" a 120 Hz que se ve fluida y se lee bien bajo el sol.\n\nSu batería de 5000 mAh te dura el día, tiene dos bocinas con volumen alto y resiste polvo y salpicaduras (IP64). Le podés poner memoria microSD si necesitás más espacio para fotos.",
  "caracteristicas": {
   "pantalla": "6.67\" HD+ (LCD), 120 Hz",
   "procesador": "T7250 de ocho núcleos",
   "camara": "8 MP",
   "camara_frontal": "8 MP",
   "bateria": "5000 mAh",
   "carga": "15 W",
   "red": "4G",
   "sistema_operativo": "Android 15, XOS 15.1",
   "proteccion": "IP64 (polvo y salpicaduras)",
   "peso": "187 g"
  },
  "faq": [
   {
    "pregunta": "¿Se le puede poner memoria?",
    "respuesta": "Sí, acepta tarjeta microSD de hasta 2 TB además de las dos SIM."
   },
   {
    "pregunta": "¿Tiene entrada para audífonos?",
    "respuesta": "Sí, tiene conector de 3.5 mm para audífonos con cable."
   },
   {
    "pregunta": "¿Viene liberado?",
    "respuesta": "Sí, funciona con cualquier compañía de El Salvador."
   }
  ],
  "meta_descripcion": "Infinix Smart 10 nuevo y sellado: pantalla 6.67\" a 120 Hz, 5000 mAh, dos bocinas, IP64. Garantía de 12 meses y pago contra entrega.",
  "orden": 73
 },
 {
  "slug": "infinix-xpad-30e",
  "nombre": "Infinix XPAD 30E",
  "resumen": "Tablet de 11\" Full HD+ con SIM 4G y batería de 7200 mAh",
  "descripcion": "La Infinix XPAD 30E es una tablet de 11\" Full HD+ para clases, tareas, videos y videollamadas en familia. Su pantalla grande cuida la vista y el sonido DTS se escucha bien.\n\nLe podés poner un chip para tener internet 4G donde no hay Wi-Fi, y una memoria microSD de hasta 1 TB. Su batería de 7200 mAh te dura largas jornadas y resiste salpicaduras (IP52).",
  "caracteristicas": {
   "pantalla": "11\" Full HD+ (IPS LCD), 60 Hz",
   "procesador": "MediaTek Helio G80",
   "camara": "8 MP trasera + 5 MP frontal",
   "bateria": "7200 mAh",
   "carga": "10 W",
   "red": "4G (1 nano SIM) y Wi-Fi",
   "sistema_operativo": "Android 15",
   "peso": "498 g"
  },
  "faq": [
   {
    "pregunta": "¿Se le puede poner chip?",
    "respuesta": "Sí, acepta una nano SIM para usar datos 4G, además de Wi-Fi."
   },
   {
    "pregunta": "¿Se le puede poner memoria?",
    "respuesta": "Sí, acepta tarjeta microSD de hasta 1 TB."
   },
   {
    "pregunta": "¿Tiene entrada para audífonos?",
    "respuesta": "Sí, tiene conector de 3.5 mm para audífonos con cable."
   }
  ],
  "meta_descripcion": "Infinix XPAD 30E nueva y sellada: tablet 11\" Full HD+, SIM 4G, 7200 mAh, microSD. Garantía de 12 meses y pago contra entrega.",
  "orden": 74
 },
 {
  "slug": "itel-a100c",
  "nombre": "itel A100C",
  "resumen": "Pantalla de 6.6\" a 90 Hz, batería de 5000 mAh y resistencia de grado militar",
  "descripcion": "El itel A100C es un celular sencillo y aguantador para el día a día. Su pantalla de 6.6\" a 90 Hz se ve fluida al pasar fotos, chats y videos.\n\nLa batería de 5000 mAh te dura el día completo, y está probado con pruebas de caídas MIL-STD-810H, así que aguanta mejor los golpes de todos los días.\n\nTrae desbloqueo con huella en el costado y con tu cara, sonido DTS y control remoto infrarrojo para manejar la tele o el aire acondicionado desde el teléfono.",
  "caracteristicas": {
   "pantalla": "6.6\" HD+ (720 x 1612), 90 Hz",
   "procesador": "Unisoc T7100 de 8 núcleos",
   "camara": "8 MP",
   "camara_frontal": "5 MP",
   "bateria": "5000 mAh",
   "carga": "USB-C",
   "sistema_operativo": "Android 15 (Go edition)",
   "proteccion": "Pruebas de resistencia MIL-STD-810H"
  },
  "faq": [
   {
    "pregunta": "¿Viene liberado?",
    "respuesta": "Sí, funciona con cualquier compañía de El Salvador."
   },
   {
    "pregunta": "¿Sirve como control remoto de la tele?",
    "respuesta": "Sí, tiene emisor infrarrojo para controlar la tele, el aire acondicionado y otros aparatos compatibles."
   },
   {
    "pregunta": "¿Cómo se desbloquea?",
    "respuesta": "Con el lector de huella del costado o con reconocimiento facial."
   }
  ],
  "meta_descripcion": "itel A100C nuevo: pantalla 6.6\" a 90 Hz, batería de 5000 mAh y resistencia MIL-STD-810H. Garantía de 12 meses y pago contra entrega.",
  "orden": 80
 },
 {
  "slug": "itel-a100cs",
  "nombre": "itel A100Cs",
  "resumen": "Pantalla de 6.6\" a 90 Hz, 5000 mAh y cuerpo probado contra golpes",
  "descripcion": "El itel A100Cs te da lo necesario para el día a día a buen precio. Su pantalla de 6.6\" a 90 Hz se mueve fluida en redes, chats y videos.\n\nCon batería de 5000 mAh te dura el día completo, y pasó pruebas de caídas MIL-STD-810H para aguantar mejor los golpes.\n\nSe desbloquea con la huella del costado o con tu cara, suena con DTS y tiene control remoto infrarrojo para la tele o el aire acondicionado.",
  "caracteristicas": {
   "pantalla": "6.6\" HD+ (720 x 1612), 90 Hz",
   "procesador": "Unisoc T7100 de 8 núcleos",
   "camara": "8 MP",
   "camara_frontal": "5 MP",
   "bateria": "5000 mAh",
   "carga": "USB-C",
   "sistema_operativo": "Android 15 (Go edition)",
   "proteccion": "Pruebas de resistencia MIL-STD-810H"
  },
  "faq": [
   {
    "pregunta": "¿Viene liberado?",
    "respuesta": "Sí, funciona con cualquier compañía de El Salvador."
   },
   {
    "pregunta": "¿Sirve como control remoto de la tele?",
    "respuesta": "Sí, tiene emisor infrarrojo para controlar la tele, el aire acondicionado y otros aparatos compatibles."
   },
   {
    "pregunta": "¿Cuánto dura la batería?",
    "respuesta": "Trae 5000 mAh; según itel da hasta 27.7 horas de llamadas o 11.5 horas de video corto."
   }
  ],
  "meta_descripcion": "itel A100Cs nuevo: pantalla 6.6\" a 90 Hz, batería de 5000 mAh y resistencia MIL-STD-810H. Garantía de 12 meses y pago contra entrega.",
  "orden": 81
 },
 {
  "slug": "itel-a200",
  "nombre": "itel A200",
  "resumen": "Pantalla de 6.75\" a 120 Hz, resistencia IP65 y batería de 5000 mAh",
  "descripcion": "El itel A200 tiene una pantalla grande de 6.75\" a 120 Hz, así que todo se ve más fluido al deslizar y ver videos.\n\nAguanta polvo y salpicaduras (IP65) y pasó pruebas de caídas MIL-STD-810H. Su batería de 5000 mAh te dura el día y se carga a 15 W por USB-C.\n\nLa cámara de 13 MP saca buenas fotos de día, y el sonido DTS con reducción de ruido en llamadas te ayuda a escuchar y que te escuchen claro.",
  "caracteristicas": {
   "pantalla": "6.75\" HD+ (720 x 1600), 120 Hz",
   "procesador": "Unisoc T7250 de 8 núcleos",
   "camara": "13 MP",
   "camara_frontal": "5 MP",
   "bateria": "5000 mAh",
   "carga": "15 W por USB-C",
   "red": "4G",
   "sistema_operativo": "Android 15 (Go edition)",
   "proteccion": "IP65 (polvo y salpicaduras) y pruebas MIL-STD-810H"
  },
  "faq": [
   {
    "pregunta": "¿Viene liberado?",
    "respuesta": "Sí, funciona con cualquier compañía de El Salvador."
   },
   {
    "pregunta": "¿Es resistente al agua?",
    "respuesta": "Resiste polvo y salpicaduras (IP65), pero no es para meterlo al agua, a la piscina ni a la playa."
   },
   {
    "pregunta": "¿Cuánto dura la batería?",
    "respuesta": "Trae 5000 mAh; según itel da hasta 28.8 horas de llamadas o 8.8 horas de video corto."
   }
  ],
  "meta_descripcion": "itel A200 nuevo: pantalla 6.75\" a 120 Hz, IP65, cámara de 13 MP y 5000 mAh. Garantía de 12 meses y pago contra entrega.",
  "orden": 82
 },
 {
  "slug": "itel-a50",
  "nombre": "itel A50",
  "resumen": "Pantalla de 6.6\", batería de 5000 mAh con USB-C y 4G",
  "descripcion": "El itel A50 es un celular básico y confiable para llamadas, WhatsApp y redes. Su pantalla de 6.6\" te deja ver todo cómodo.\n\nLa batería de 5000 mAh te dura de la mañana a la noche y se carga por USB-C. Tiene 4G para navegar y hacer videollamadas.\n\nSi te quedás sin espacio, le podés poner una tarjeta de memoria aparte, sin quitar los chips.",
  "caracteristicas": {
   "pantalla": "6.6\" HD+ (720 x 1612)",
   "procesador": "Unisoc T603 de 8 núcleos",
   "camara": "8 MP",
   "camara_frontal": "5 MP",
   "bateria": "5000 mAh",
   "carga": "USB-C",
   "red": "4G",
   "sistema_operativo": "Android 14 (Go edition)"
  },
  "faq": [
   {
    "pregunta": "¿Viene liberado?",
    "respuesta": "Sí, funciona con cualquier compañía de El Salvador."
   },
   {
    "pregunta": "¿Le puedo poner memoria?",
    "respuesta": "Sí, tiene ranura para tarjeta de memoria aparte de los chips; itel indica hasta 2 TB."
   }
  ],
  "meta_descripcion": "itel A50 nuevo: pantalla 6.6\", batería de 5000 mAh con USB-C y 4G. Garantía de 12 meses y pago contra entrega.",
  "orden": 83
 },
 {
  "slug": "apple-iphone-13",
  "nombre": "Apple iPhone 13",
  "resumen": "Pantalla OLED de 6.1\", chip A15 Bionic y doble cámara de 12 MP con modo Noche",
  "descripcion": "El iPhone 13 te da la experiencia iPhone completa en un tamaño cómodo para una mano. Su pantalla Super Retina XDR OLED de 6.1\" se ve nítida y con colores reales, y el chip A15 Bionic abre apps y juegos sin esperas.\n\nLa doble cámara de 12 MP tiene estabilizador en la principal y modo Noche, así que tus fotos salen bien aunque haya poca luz. También graba video en 4K con Dolby Vision y tiene modo Cine.\n\nResiste agua y polvo (IP68) y tiene Face ID, Apple Pay y carga inalámbrica MagSafe.",
  "caracteristicas": {
   "pantalla": "6.1\" Super Retina XDR OLED (2532 x 1170)",
   "procesador": "Chip A15 Bionic",
   "camara": "Doble 12 MP: principal con estabilizador + ultra gran angular",
   "camara_frontal": "12 MP",
   "bateria": "Hasta 19 horas de reproducción de video",
   "carga": "Carga rápida: 50% en 30 min con adaptador de 20 W; MagSafe hasta 15 W",
   "red": "5G",
   "sistema_operativo": "iOS",
   "nfc": "Sí (Apple Pay)",
   "proteccion": "IP68 (hasta 6 m por 30 min); frente Ceramic Shield",
   "peso": "174 g"
  },
  "incluye": "Teléfono\nCable USB-C a Lightning\nDocumentación",
  "faq": [
   {
    "pregunta": "¿Trae cargador?",
    "respuesta": "No. Apple ya no incluye cargador ni audífonos en la caja; solo trae el cable USB-C a Lightning. Carga rápido con un adaptador USB-C de 20 W o más."
   },
   {
    "pregunta": "¿Es resistente al agua?",
    "respuesta": "Sí, tiene certificación IP68: aguanta hasta 6 metros de profundidad por 30 minutos según Apple. La garantía no cubre daños por líquidos."
   },
   {
    "pregunta": "¿Viene liberado?",
    "respuesta": "Sí, funciona con cualquier compañía de El Salvador."
   }
  ],
  "meta_descripcion": "Apple iPhone 13: pantalla OLED de 6.1\", chip A15 Bionic, doble cámara de 12 MP y 5G. Garantía de 12 meses y pago contra entrega.",
  "orden": 90
 },
 {
  "slug": "apple-iphone-14",
  "nombre": "Apple iPhone 14",
  "resumen": "OLED de 6.1\", cámara de 12 MP con estabilizador y detección de choques",
  "descripcion": "El iPhone 14 es un iPhone rápido y confiable para el día a día. Su pantalla Super Retina XDR OLED de 6.1\" se ve clara y el chip A15 Bionic con GPU de 5 núcleos mueve todo con fluidez.\n\nLa cámara principal de 12 MP con apertura f/1.5 y estabilizador capta más luz, así que las fotos de noche salen mejor. El modo Acción graba video estable aunque vayás en movimiento.\n\nIncluye funciones de seguridad como Detección de Choques y SOS de emergencia, resiste agua y polvo (IP68) y es compatible con MagSafe.",
  "caracteristicas": {
   "pantalla": "6.1\" Super Retina XDR OLED (2532 x 1170)",
   "procesador": "Chip A15 Bionic (GPU de 5 núcleos)",
   "camara": "Doble 12 MP: principal f/1.5 con estabilizador + ultra gran angular",
   "camara_frontal": "12 MP con enfoque automático",
   "bateria": "Hasta 20 horas de reproducción de video",
   "carga": "Carga rápida: 50% en unos 30 min con adaptador de 20 W; MagSafe hasta 15 W",
   "red": "5G",
   "sistema_operativo": "iOS",
   "nfc": "Sí (Apple Pay)",
   "proteccion": "IP68 (hasta 6 m por 30 min); frente Ceramic Shield",
   "peso": "172 g"
  },
  "incluye": "Teléfono\nCable USB-C a Lightning\nDocumentación",
  "faq": [
   {
    "pregunta": "¿Trae cargador?",
    "respuesta": "No. Apple no incluye cargador ni audífonos; en la caja viene el cable USB-C a Lightning. Para carga rápida usá un adaptador USB-C de 20 W o más."
   },
   {
    "pregunta": "¿Qué conector usa?",
    "respuesta": "Usa conector Lightning, igual que el iPhone 13. Tus cables y accesorios Lightning le sirven."
   },
   {
    "pregunta": "¿Viene liberado?",
    "respuesta": "Sí, funciona con cualquier compañía de El Salvador."
   }
  ],
  "meta_descripcion": "Apple iPhone 14: OLED de 6.1\", chip A15 Bionic, cámara de 12 MP f/1.5 con estabilizador y 5G. Garantía de 12 meses y pago contra entrega.",
  "orden": 91
 },
 {
  "slug": "apple-iphone-15-plus",
  "nombre": "Apple iPhone 15 Plus",
  "resumen": "Pantalla de 6.7\" con Dynamic Island, cámara de 48 MP y conector USB-C",
  "descripcion": "El iPhone 15 Plus es para quien quiere pantalla grande y batería que dura. Su pantalla Super Retina XDR OLED de 6.7\" con Dynamic Island llega a 2000 nits al aire libre, así que la ves bien aunque estés bajo el sol.\n\nLa cámara principal de 48 MP saca fotos con mucho detalle y te da un zoom óptico de 2x sin perder calidad. El chip A16 Bionic hace que todo responda rápido.\n\nYa usa conector USB-C, el mismo de muchos cargadores y computadoras, y te da hasta 26 horas de video con una carga.",
  "caracteristicas": {
   "pantalla": "6.7\" Super Retina XDR OLED con Dynamic Island (2796 x 1290)",
   "procesador": "Chip A16 Bionic",
   "camara": "48 MP principal con estabilizador + 12 MP ultra gran angular; zoom óptico 2x",
   "camara_frontal": "12 MP con enfoque automático",
   "bateria": "Hasta 26 horas de reproducción de video",
   "carga": "USB-C; carga rápida: 50% en unos 30 min con adaptador de 20 W; MagSafe y Qi2 hasta 15 W",
   "red": "5G",
   "sistema_operativo": "iOS",
   "nfc": "Sí (Apple Pay)",
   "proteccion": "IP68 (hasta 6 m por 30 min); frente Ceramic Shield",
   "peso": "201 g"
  },
  "incluye": "Teléfono\nCable de carga USB-C (1 m)\nDocumentación",
  "faq": [
   {
    "pregunta": "¿Trae cargador?",
    "respuesta": "No. Apple no incluye cargador ni audífonos; trae el cable USB-C de 1 m. Le sirve cualquier adaptador USB-C; con uno de 20 W o más carga el 50% en unos 30 minutos."
   },
   {
    "pregunta": "¿Le sirven mis cables Lightning?",
    "respuesta": "No, el iPhone 15 Plus usa conector USB-C. Podés usar el mismo cable USB-C de un Android, una tablet o una computadora."
   },
   {
    "pregunta": "¿Viene liberado?",
    "respuesta": "Sí, funciona con cualquier compañía de El Salvador."
   }
  ],
  "meta_descripcion": "Apple iPhone 15 Plus: pantalla OLED de 6.7\" con Dynamic Island, cámara de 48 MP, chip A16 Bionic y USB-C. Garantía de 12 meses y pago contra entrega.",
  "orden": 92
 },
 {
  "slug": "apple-iphone-15-pro-max",
  "nombre": "Apple iPhone 15 Pro Max",
  "resumen": "Titanio, pantalla ProMotion de 6.7\" y teleobjetivo 5x para fotos de lejos",
  "descripcion": "El iPhone 15 Pro Max está hecho de titanio, así que es resistente y más liviano de lo que parece. Su pantalla Super Retina XDR OLED de 6.7\" con ProMotion a 120 Hz se siente muy fluida y tiene pantalla siempre activa.\n\nTiene tres cámaras: principal de 48 MP, ultra gran angular y teleobjetivo de 5x para acercarte a lo que está lejos sin perder detalle. El chip A17 Pro mueve juegos exigentes y edición de video sin problema.\n\nUsa USB-C con velocidad USB 3, tiene botón de Acción personalizable y te da hasta 29 horas de video con una carga.",
  "caracteristicas": {
   "pantalla": "6.7\" Super Retina XDR OLED, ProMotion hasta 120 Hz, siempre activa",
   "procesador": "Chip A17 Pro",
   "camara": "48 MP principal + 12 MP ultra gran angular + 12 MP teleobjetivo 5x",
   "camara_frontal": "12 MP con enfoque automático",
   "bateria": "Hasta 29 horas de reproducción de video",
   "carga": "USB-C (USB 3); carga rápida: 50% en unos 30 min con adaptador de 20 W; MagSafe y Qi2 hasta 15 W",
   "red": "5G",
   "sistema_operativo": "iOS",
   "nfc": "Sí (Apple Pay)",
   "proteccion": "IP68 (hasta 6 m por 30 min); diseño de titanio y frente Ceramic Shield",
   "peso": "221 g"
  },
  "incluye": "Teléfono\nCable de carga USB-C (1 m)\nDocumentación",
  "faq": [
   {
    "pregunta": "¿Trae cargador?",
    "respuesta": "No. Apple no incluye cargador ni audífonos; trae el cable USB-C de 1 m. Con un adaptador USB-C de 20 W o más carga el 50% en unos 30 minutos."
   },
   {
    "pregunta": "¿Cuánto zoom tiene la cámara?",
    "respuesta": "Tiene teleobjetivo de 5x óptico y un rango de zoom óptico de 10x en total, según Apple."
   },
   {
    "pregunta": "¿Viene liberado?",
    "respuesta": "Sí, funciona con cualquier compañía de El Salvador."
   }
  ],
  "meta_descripcion": "Apple iPhone 15 Pro Max: titanio, pantalla ProMotion de 6.7\", chip A17 Pro y teleobjetivo 5x. Garantía de 12 meses y pago contra entrega.",
  "orden": 93
 },
 {
  "slug": "apple-iphone-17-pro-max",
  "nombre": "Apple iPhone 17 Pro Max",
  "resumen": "Pantalla de 6.9\" a 120 Hz, tres cámaras de 48 MP y chip A19 Pro",
  "descripcion": "El iPhone 17 Pro Max tiene la pantalla más grande de su línea: Super Retina XDR OLED de 6.9\" con ProMotion a 120 Hz, capa antirreflejo y hasta 3000 nits al aire libre, para verla clara aunque estés bajo el sol.\n\nSus tres cámaras son de 48 MP: principal, ultra gran angular y teleobjetivo 4x, con calidad óptica de hasta 8x. La cámara frontal de 18 MP con Center Stage te mantiene en cuadro en videollamadas y selfies de grupo.\n\nEl chip A19 Pro rinde con lo más exigente y la batería te da hasta 39 horas de video. Carga el 50% en 20 minutos con un adaptador de 40 W.",
  "caracteristicas": {
   "pantalla": "6.9\" Super Retina XDR OLED, ProMotion hasta 120 Hz, siempre activa",
   "procesador": "Chip A19 Pro",
   "camara": "48 MP principal + 48 MP ultra gran angular + 48 MP teleobjetivo 4x (hasta 8x calidad óptica)",
   "camara_frontal": "18 MP Center Stage",
   "bateria": "Hasta 39 horas de reproducción de video",
   "carga": "USB-C; 50% en 20 min con adaptador de 40 W; MagSafe",
   "red": "5G",
   "sistema_operativo": "iOS",
   "nfc": "Sí (Apple Pay)",
   "proteccion": "IP68 (hasta 6 m por 30 min); frente Ceramic Shield 2",
   "peso": "233 g"
  },
  "incluye": "Teléfono\nCable de carga USB-C (1 m)\nDocumentación",
  "faq": [
   {
    "pregunta": "¿Trae cargador?",
    "respuesta": "No. Apple no incluye cargador ni audífonos; trae el cable USB-C de 1 m. Para cargar el 50% en 20 minutos necesitás un adaptador de 40 W o más."
   },
   {
    "pregunta": "¿Cuánto le dura la batería?",
    "respuesta": "Apple indica hasta 39 horas de reproducción de video y hasta 35 horas de video en streaming."
   },
   {
    "pregunta": "¿Viene liberado?",
    "respuesta": "Sí, funciona con cualquier compañía de El Salvador."
   }
  ],
  "meta_descripcion": "Apple iPhone 17 Pro Max: pantalla de 6.9\" a 120 Hz, chip A19 Pro, tres cámaras de 48 MP y hasta 39 h de video. Garantía de 12 meses y pago contra entrega.",
  "orden": 94
 },
 {
  "slug": "motorola-g15",
  "nombre": "Motorola Moto G15",
  "resumen": "512 GB de espacio, pantalla Full HD+ de 6.72\" y batería de 5200 mAh",
  "descripcion": "El moto g15 es para quien quiere mucho espacio sin pagar de más: con 512 GB guardás fotos, videos y apps sin estar borrando. Y si querés más, acepta memoria microSD de hasta 1 TB.\n\nSu pantalla Full HD+ de 6.72\" tiene modo de brillo alto para verla bien afuera, y los dos parlantes con Dolby Atmos suenan fuerte. La cámara de 50 MP con ultra gran angular de 5 MP te ayuda a meter más paisaje o más gente en la foto.\n\nLa batería de 5200 mAh te da hasta 40 horas por carga según Motorola, y trae NFC para pagar con el teléfono.",
  "caracteristicas": {
   "pantalla": "6.72\" LCD Full HD+ (2400 x 1080), 60 Hz",
   "procesador": "MediaTek Helio G81 Extreme",
   "camara": "50 MP principal + 5 MP ultra gran angular",
   "camara_frontal": "8 MP",
   "bateria": "5200 mAh",
   "carga": "TurboPower 18 W",
   "red": "4G",
   "sistema_operativo": "Android 15",
   "nfc": "Sí",
   "proteccion": "IP52 (repele salpicaduras); Corning Gorilla Glass 3",
   "peso": "190.5 g"
  },
  "incluye": "Teléfono\nCargador de viaje\nCable USB\nFunda protectora\nHerramienta para la bandeja SIM\nManual de usuario",
  "faq": [
   {
    "pregunta": "¿Trae cargador?",
    "respuesta": "Sí. Según Motorola, la caja trae cargador de viaje, cable y una funda protectora."
   },
   {
    "pregunta": "¿Se le puede meter memoria?",
    "respuesta": "Sí, acepta tarjeta microSD de hasta 1 TB (se vende aparte)."
   },
   {
    "pregunta": "¿Viene liberado?",
    "respuesta": "Sí, funciona con cualquier compañía de El Salvador."
   }
  ],
  "meta_descripcion": "Motorola Moto G15 de 512 GB: pantalla Full HD+ de 6.72\", cámara de 50 MP, 5200 mAh y NFC. Garantía de 12 meses y pago contra entrega.",
  "orden": 95
 },
 {
  "slug": "motorola-g17",
  "nombre": "Motorola Moto G17",
  "resumen": "Cámara Sony LYTIA 600 de 50 MP, selfie de 32 MP y resistencia IP64",
  "descripcion": "El moto g17 saca buenas fotos sin ser caro: su cámara principal de 50 MP usa un sensor Sony LYTIA 600 y la frontal de 32 MP deja tus selfies y videollamadas con buen detalle.\n\nLa pantalla Full HD+ de 6.72\" tiene modo de brillo alto y los dos parlantes con Dolby Atmos suenan fuerte para ver videos. Tiene acabado de cuero vegano, vidrio Gorilla Glass 3 y resiste agua y polvo (IP64).\n\nLa batería de 5200 mAh te acompaña todo el día y trae NFC para pagar con el teléfono.",
  "caracteristicas": {
   "pantalla": "6.72\" LCD Full HD+ (2400 x 1080), 60 Hz",
   "procesador": "MediaTek Helio G81 Extreme",
   "camara": "50 MP Sony LYTIA 600 + 5 MP ultra gran angular",
   "camara_frontal": "32 MP",
   "bateria": "5200 mAh",
   "carga": "TurboPower; cargador de 20 W en la caja",
   "red": "4G",
   "sistema_operativo": "Android 15",
   "nfc": "Sí",
   "proteccion": "IP64 (polvo y salpicaduras); Corning Gorilla Glass 3",
   "peso": "190.5 g"
  },
  "incluye": "Teléfono\nCargador de viaje\nCable USB\nFunda protectora\nHerramienta para la bandeja SIM\nManual de usuario",
  "faq": [
   {
    "pregunta": "¿Trae cargador?",
    "respuesta": "Sí. Según Motorola, la caja trae cargador de viaje de 20 W, cable y una funda protectora."
   },
   {
    "pregunta": "¿Es resistente al agua?",
    "respuesta": "Tiene certificación IP64: aguanta polvo y salpicaduras de agua, pero no está hecho para meterlo al agua."
   },
   {
    "pregunta": "¿Viene liberado?",
    "respuesta": "Sí, funciona con cualquier compañía de El Salvador."
   }
  ],
  "meta_descripcion": "Motorola Moto G17: cámara Sony LYTIA 600 de 50 MP, selfie de 32 MP, IP64, NFC y 5200 mAh. Garantía de 12 meses y pago contra entrega.",
  "orden": 96
 },
 {
  "slug": "realme-14",
  "nombre": "realme 14 5G",
  "resumen": "5G, Snapdragon 6 Gen 4, AMOLED de 120 Hz y batería de 6000 mAh",
  "descripcion": "El realme 14 5G está pensado para jugar y aguantar. Su procesador Snapdragon 6 Gen 4 con sistema de enfriamiento mueve juegos con fluidez, y la pantalla AMOLED de 6.67\" a 120 Hz se ve brillante, con hasta 2000 nits.\n\nLa batería de 6000 mAh te dura hasta 10.5 horas de juego según realme, y la carga rápida de 45 W viene con su cargador en la caja. La cámara de 50 MP con estabilizador óptico saca fotos y videos sin temblor.\n\nResiste agua y polvo con certificación IP66, IP68 e IP69, así que un derrame o la lluvia no lo paran.",
  "caracteristicas": {
   "pantalla": "6.67\" AMOLED Full HD+, 120 Hz, hasta 2000 nits",
   "procesador": "Snapdragon 6 Gen 4",
   "camara": "50 MP con estabilizador óptico + 2 MP bokeh",
   "camara_frontal": "16 MP",
   "bateria": "6000 mAh",
   "carga": "Carga rápida 45 W",
   "red": "5G",
   "sistema_operativo": "Android 15 (realme UI 6.0)",
   "proteccion": "IP66, IP68 e IP69 (agua y polvo)",
   "peso": "196 g"
  },
  "incluye": "Teléfono\nCargador\nCable USB-C\nFunda protectora\nHerramienta para la bandeja SIM\nGuía rápida",
  "faq": [
   {
    "pregunta": "¿Trae cargador?",
    "respuesta": "Sí, trae el cargador de 45 W, el cable USB-C y una funda protectora."
   },
   {
    "pregunta": "¿Es resistente al agua?",
    "respuesta": "Sí, tiene certificación IP66, IP68 e IP69; realme indica que aguanta 2.5 m de profundidad por 30 minutos."
   },
   {
    "pregunta": "¿Viene liberado?",
    "respuesta": "Sí, funciona con cualquier compañía de El Salvador."
   }
  ],
  "meta_descripcion": "realme 14 5G: Snapdragon 6 Gen 4, AMOLED de 120 Hz, 6000 mAh con carga de 45 W e IP69. Garantía de 12 meses y pago contra entrega.",
  "orden": 97
 },
 {
  "slug": "realme-c71",
  "nombre": "realme C71",
  "resumen": "Batería de 6000 mAh con carga de 45 W, pantalla de 120 Hz y resistencia militar",
  "descripcion": "El realme C71 es un teléfono delgado (7.79 mm) que aguanta el ritmo del día. Su batería de 6000 mAh con carga rápida de 45 W llega al 50% en unos 35 minutos según realme, y el cargador viene en la caja.\n\nPasó la prueba militar MIL-STD 810H contra golpes y caídas de hasta 1.5 m, y resiste salpicaduras del día a día. La pantalla de 6.67\" a 120 Hz se siente fluida al navegar.\n\nCon 8 GB de RAM y cámara de 50 MP te alcanza para redes, fotos y apps sin trabarse.",
  "caracteristicas": {
   "pantalla": "6.67\" HD+ (1604 x 720), 120 Hz",
   "procesador": "UNISOC T7250",
   "camara": "50 MP",
   "camara_frontal": "5 MP",
   "bateria": "6000 mAh",
   "carga": "Carga rápida SUPERVOOC 45 W",
   "red": "4G",
   "sistema_operativo": "Android 15 (realme UI)",
   "proteccion": "Prueba militar MIL-STD 810H contra golpes; resiste salpicaduras",
   "peso": "197 g"
  },
  "incluye": "Teléfono\nCargador de 45 W\nCable USB\nFunda protectora\nHerramienta para la bandeja SIM\nGuía de usuario",
  "faq": [
   {
    "pregunta": "¿Trae cargador?",
    "respuesta": "Sí, trae cargador de 45 W, cable USB y funda protectora."
   },
   {
    "pregunta": "¿Es resistente al agua?",
    "respuesta": "Resiste salpicaduras del día a día y la pantalla responde con las manos mojadas, pero no se debe meter al agua."
   },
   {
    "pregunta": "¿Viene liberado?",
    "respuesta": "Sí, funciona con cualquier compañía de El Salvador."
   }
  ],
  "meta_descripcion": "realme C71: batería de 6000 mAh con carga de 45 W, pantalla de 120 Hz, 50 MP y resistencia militar. Garantía de 12 meses y pago contra entrega.",
  "orden": 98
 },
 {
  "slug": "zte-blade-a75",
  "nombre": "ZTE Blade A75",
  "resumen": "Cámara de 50 MP, pantalla de 6.6\" a 90 Hz y batería de 5000 mAh con carga de 22.5 W",
  "descripcion": "El ZTE Blade A75 es un celular sencillo y confiable para el día a día. Su pantalla de 6.6\" a 90 Hz se siente fluida al pasar por redes sociales y videos.\n\nLa cámara principal de 50 MP con enfoque automático y el modo nocturno te ayudan a sacar fotos claras, y la frontal de 8 MP sirve para tus selfies y videollamadas.\n\nSu batería de 5000 mAh te dura el día completo y, cuando se te acaba, la carga rápida de 22.5 W te devuelve energía en poco tiempo. Se desbloquea con la huella del botón lateral o con tu cara.",
  "caracteristicas": {
   "pantalla": "6.6\" HD+ (1612 x 720), 90 Hz",
   "procesador": "Unisoc T606 (ocho núcleos)",
   "camara": "50 MP con enfoque automático + cámara de apoyo con IA",
   "camara_frontal": "8 MP",
   "bateria": "5000 mAh",
   "carga": "Carga rápida 22.5 W",
   "red": "4G",
   "sistema_operativo": "Android 13",
   "peso": "189 g"
  },
  "faq": [
   {
    "pregunta": "¿Viene liberado?",
    "respuesta": "Sí, funciona con cualquier compañía de El Salvador."
   },
   {
    "pregunta": "¿Puedo ponerle memoria o usar dos chips?",
    "respuesta": "Sí. Tiene bandeja para dos chips nano y una memoria microSD a la vez."
   },
   {
    "pregunta": "¿Tiene entrada para audífonos con cable?",
    "respuesta": "Sí, trae entrada de 3.5 mm además del puerto USB-C."
   }
  ],
  "meta_descripcion": "ZTE Blade A75 nuevo: cámara de 50 MP, pantalla de 6.6\" a 90 Hz y batería de 5000 mAh con carga de 22.5 W. Garantía de 12 meses y pago contra entrega.",
  "orden": 106
 },
 {
  "slug": "zte-nubia-neo-3",
  "nombre": "ZTE nubia Neo 3 5G",
  "resumen": "Celular gamer 5G con gatillos para juegos, pantalla de 120 Hz y batería de 6000 mAh",
  "descripcion": "El nubia Neo 3 5G está hecho para jugar. Trae dos gatillos en el borde, como un control, para que apuntés y dispares más rápido en Free Fire o Mobile Legends. Su pantalla de 6.8\" a 120 Hz se ve fluida en cada partida.\n\nEl procesador Unisoc T8300 con 5G mueve tus juegos y apps sin trabarse, y el sistema de enfriamiento ayuda a que no baje el rendimiento cuando jugás largo rato. Los parlantes estéreo con DTS:X Ultra y la vibración del motor lineal te meten en el juego.\n\nSu batería de 6000 mAh te dura el día y la carga rápida de 33 W la recupera pronto. Con la carga directa (bypass), el teléfono toma la energía del cargador mientras jugás y se calienta menos.",
  "caracteristicas": {
   "pantalla": "6.8\" AMOLED Full HD+ (2392 x 1080), 120 Hz",
   "procesador": "Unisoc T8300 5G",
   "camara": "50 MP + 2 MP de profundidad",
   "camara_frontal": "16 MP",
   "bateria": "6000 mAh",
   "carga": "Carga rápida 33 W con carga directa (bypass)",
   "red": "5G",
   "sistema_operativo": "Android 15"
  },
  "faq": [
   {
    "pregunta": "¿Viene liberado?",
    "respuesta": "Sí, funciona con cualquier compañía de El Salvador."
   },
   {
    "pregunta": "¿Para qué sirven los gatillos?",
    "respuesta": "Son dos zonas en el borde del teléfono que funcionan como botones extra, como los gatillos de un control, para tener más precisión en tus juegos."
   },
   {
    "pregunta": "¿Se calienta al jugar?",
    "respuesta": "Tiene un sistema de disipación de calor de varias capas y carga directa (bypass), que reduce el calor cuando jugás conectado al cargador."
   }
  ],
  "meta_descripcion": "nubia Neo 3 5G nuevo: gatillos para juegos, pantalla de 120 Hz, Unisoc T8300 y batería de 6000 mAh. Garantía de 12 meses y pago contra entrega.",
  "orden": 107
 },
 {
  "slug": "zte-nubia-neo-3-gt",
  "nombre": "ZTE nubia Neo 3 GT 5G",
  "resumen": "Celular gamer 5G con pantalla OLED de 120 Hz, gatillos y carga de 80 W",
  "descripcion": "El nubia Neo 3 GT 5G es para quien se toma en serio sus partidas. Su pantalla OLED de 6.8\" a 120 Hz llega a 1300 nits, así que se ve bien hasta bajo el sol, y los dos gatillos del borde te dan control como de consola.\n\nEl procesador Unisoc T9100 de hasta 2.7 GHz y el enfriamiento por cámara de vapor de 4083 mm² mantienen el rendimiento estable aunque jugués por horas. Los parlantes estéreo con DTS:X Ultra y la vibración del motor lineal completan la experiencia.\n\nLa batería de 6000 mAh te dura todo el día y la supercarga de 80 W la llena muy rápido. Se desbloquea con la huella debajo de la pantalla.",
  "caracteristicas": {
   "pantalla": "6.8\" OLED Full HD+ (2392 x 1080), 120 Hz, 1300 nits",
   "procesador": "Unisoc T9100 5G (6 nm, hasta 2.7 GHz)",
   "camara": "50 MP doble cámara",
   "camara_frontal": "16 MP",
   "bateria": "6000 mAh",
   "carga": "Supercarga 80 W con carga directa (bypass)",
   "red": "5G",
   "sistema_operativo": "Android 15"
  },
  "faq": [
   {
    "pregunta": "¿Viene liberado?",
    "respuesta": "Sí, funciona con cualquier compañía de El Salvador."
   },
   {
    "pregunta": "¿Cuánto tarda en cargar?",
    "respuesta": "Soporta supercarga de 80 W. El tiempo exacto depende del cargador que usés."
   },
   {
    "pregunta": "¿Qué diferencia tiene con el Neo 3 normal?",
    "respuesta": "El GT trae pantalla OLED más brillante (1300 nits), procesador T9100 más potente, enfriamiento por cámara de vapor y carga de 80 W en vez de 33 W."
   }
  ],
  "meta_descripcion": "nubia Neo 3 GT 5G nuevo: OLED de 120 Hz, Unisoc T9100, gatillos para juegos y carga de 80 W. Garantía de 12 meses y pago contra entrega.",
  "orden": 108
 },
 {
  "slug": "zte-nubia-v80-max",
  "nombre": "ZTE nubia V80 Max",
  "resumen": "Pantalla gigante de 6.9\" a 120 Hz, batería de 6000 mAh y resistencia IP64",
  "descripcion": "El nubia V80 Max es para quien quiere pantalla grande y batería que no se acaba. Su pantalla de 6.9\" a 120 Hz es ideal para videos, y con 780 nits se lee bien aunque estés en la calle.\n\nLa batería de 6000 mAh te aguanta el día completo, y la carga inteligente cuida su salud para que te dure años. Hasta podés usarlo como cargador portátil para otro teléfono (carga inversa de 10 W).\n\nEs resistente: aguanta polvo y salpicaduras (IP64) y caídas de hasta 1.8 m según la certificación TÜV. Trae triple cámara de 50 MP, cámara frontal de 16 MP y huella en el botón lateral.",
  "caracteristicas": {
   "pantalla": "6.9\" HD+ LCD, 120 Hz, 780 nits",
   "procesador": "Unisoc T7250 (ocho núcleos, 1.8 GHz)",
   "camara": "Triple cámara con IA, principal de 50 MP",
   "camara_frontal": "16 MP",
   "bateria": "6000 mAh",
   "carga": "22.5 W, carga directa (bypass) y carga inversa de 10 W",
   "red": "4G",
   "sistema_operativo": "Android 16",
   "proteccion": "IP64 (polvo y salpicaduras), resistente a caídas de hasta 1.8 m",
   "peso": "191 g"
  },
  "faq": [
   {
    "pregunta": "¿Viene liberado?",
    "respuesta": "Sí, funciona con cualquier compañía de El Salvador."
   },
   {
    "pregunta": "¿Es resistente al agua?",
    "respuesta": "Tiene certificación IP64: aguanta polvo y salpicaduras, pero no está hecho para meterlo al agua."
   },
   {
    "pregunta": "¿Puedo cargar otro teléfono con él?",
    "respuesta": "Sí. Tiene carga inversa de hasta 10 W por cable, para usarlo como cargador portátil."
   }
  ],
  "meta_descripcion": "nubia V80 Max nuevo: pantalla de 6.9\" a 120 Hz, batería de 6000 mAh, IP64 y resistencia a caídas de 1.8 m. Garantía de 12 meses y pago contra entrega.",
  "orden": 109
 },
 {
  "slug": "xiaomi-redmi-buds-8-active",
  "nombre": "Xiaomi Redmi Buds 8 Active",
  "resumen": "Hasta 37 horas de música, llamadas claras con 2 micrófonos y Bluetooth 5.4",
  "descripcion": "Los Redmi Buds 8 Active son audífonos inalámbricos livianos de diseño semi in-ear: se apoyan en la oreja sin meterse hasta el fondo, así que podés usarlos todo el día sin molestia.\n\nTe dan hasta 7 horas de música con una carga y hasta 37 horas usando el estuche. Si se te acaban, 10 minutos de carga te dan 2 horas más. Sus dos micrófonos con IA reducen el ruido del ambiente y del viento para que te escuchen bien en las llamadas.\n\nSe conectan a dos dispositivos a la vez, resisten polvo y salpicaduras (IP54) y con la app Xiaomi Earbuds ajustás el sonido a tu gusto.",
  "caracteristicas": {
   "tipo": "Inalámbricos semi in-ear (true wireless), driver de 14.2 mm",
   "autonomia": "Hasta 7 h por carga; hasta 37 h con el estuche",
   "cancelacion_ruido": "Reducción de ruido en llamadas con 2 micrófonos e IA",
   "resistencia": "IP54 (polvo y salpicaduras, solo los audífonos)",
   "conexion": "Bluetooth 5.4, conexión a 2 dispositivos, Google Fast Pair",
   "conector": "USB-C (estuche)",
   "peso": "3.8 g cada audífono; 35.6 g con el estuche"
  },
  "incluye": "Audífonos Redmi Buds 8 Active\nEstuche de carga\nManual de usuario",
  "faq": [
   {
    "pregunta": "¿Sirven con iPhone?",
    "respuesta": "Sí. Se conectan por Bluetooth a cualquier teléfono, y la app Xiaomi Earbuds está para iPhone (iOS 14 o superior) y Android (7.0 o superior)."
   },
   {
    "pregunta": "¿Puedo usarlos en la lluvia o para hacer ejercicio?",
    "respuesta": "Aguantan salpicaduras y polvo (IP54), pero no son para bañarse, nadar ni ejercicio muy intenso con mucho sudor."
   },
   {
    "pregunta": "¿Tienen cancelación activa de ruido?",
    "respuesta": "No. Lo que tienen es reducción de ruido en llamadas: sus dos micrófonos con IA limpian tu voz para que te escuchen claro."
   }
  ],
  "meta_descripcion": "Xiaomi Redmi Buds 8 Active: hasta 37 h de batería, Bluetooth 5.4 y llamadas claras con 2 micrófonos. Garantía de 12 meses y pago contra entrega.",
  "orden": 120
 },
 {
  "slug": "xiaomi-type-c-earphones",
  "nombre": "Audífonos Xiaomi Type-C (con cable)",
  "resumen": "Audífonos con cable USB-C, micrófono para llamadas y control de 3 botones",
  "descripcion": "Los audífonos Xiaomi Type-C se conectan directo al puerto USB-C de tu teléfono: los enchufás y ya funcionan, sin cargar batería ni emparejar nada.\n\nSu driver de 12.4 mm da un sonido claro y el micrófono con reducción de ruido hace que te escuchen bien aunque estés en la calle. Con el control de 3 botones contestás llamadas, pausás la música y subís o bajás el volumen.\n\nEl cable de 1.25 m es resistente y no se enreda fácil, y aguantan polvo y salpicaduras (IP54).",
  "caracteristicas": {
   "tipo": "In-ear con cable, driver de 12.4 mm",
   "cancelacion_ruido": "Micrófono con reducción de ruido para llamadas",
   "resistencia": "IP54 (polvo y salpicaduras)",
   "conexion": "Con cable (1.25 m), control de 3 botones",
   "conector": "USB-C",
   "peso": "13.5 g"
  },
  "incluye": "Audífonos Xiaomi Type-C\nManual de usuario",
  "faq": [
   {
    "pregunta": "¿Sirven en un teléfono sin puerto USB-C?",
    "respuesta": "No. Su conector es USB-C; no traen entrada de 3.5 mm. Tu teléfono tiene que tener puerto USB-C."
   },
   {
    "pregunta": "¿Necesitan batería o Bluetooth?",
    "respuesta": "No. Funcionan por cable: los conectás al teléfono y listo, sin cargarlos ni emparejarlos."
   },
   {
    "pregunta": "¿Puedo contestar llamadas con ellos?",
    "respuesta": "Sí. Traen micrófono y control de 3 botones: un toque contesta, mantener presionado cuelga o rechaza la llamada."
   }
  ],
  "meta_descripcion": "Audífonos Xiaomi Type-C con cable USB-C, micrófono con reducción de ruido, control de 3 botones e IP54. Garantía de 12 meses y pago contra entrega.",
  "orden": 121
 },
 {
  "slug": "xiaomi-3a-usb-a-to-usb-c-cable-1m",
  "nombre": "Cable Xiaomi 3A USB-A a USB-C (1 m)",
  "resumen": "Cable USB-A a USB-C de 1 m, carga de hasta 3 A y probado para durar",
  "descripcion": "El cable Xiaomi 3A conecta tu cargador USB-A con tu celular, tablet o reloj que tenga puerto USB-C. Soporta hasta 3 A y es compatible con carga rápida QC, así que no te frena la carga.\n\nMide 1 m: alcanza para usar el teléfono mientras carga y se guarda fácil. También sirve para pasar fotos y archivos a la computadora (480 Mbps).\n\nXiaomi lo prueba con más de 10,000 conexiones del lado del teléfono y más de 10,000 dobleces, para que no se te arruine a los pocos meses.",
  "caracteristicas": {
   "potencia": "Hasta 3 A; compatible con QC y BC1.2",
   "conector": "USB-A a USB-C (USB 2.0, datos a 480 Mbps)",
   "largo": "1 m",
   "compatible_con": "Celulares, tablets y wearables con puerto USB-C"
  },
  "faq": [
   {
    "pregunta": "¿Sirve con un cargador que tiene puerto USB-C?",
    "respuesta": "No. Un extremo es USB-A (el rectangular), así que necesitás un cargador o computadora con puerto USB-A."
   },
   {
    "pregunta": "¿Sirve para pasar archivos a la computadora?",
    "respuesta": "Sí. Además de cargar, transfiere datos a 480 Mbps (USB 2.0)."
   },
   {
    "pregunta": "¿Sirve con iPhone?",
    "respuesta": "Solo con iPhone que tenga puerto USB-C. No sirve con iPhone de conector Lightning."
   }
  ],
  "meta_descripcion": "Cable Xiaomi 3A USB-A a USB-C de 1 m: carga de hasta 3 A, compatible con QC y datos a 480 Mbps. Garantía de 12 meses y pago contra entrega.",
  "orden": 122
 },
 {
  "slug": "xiaomi-45w-nano-turbo-charging-power-adapter-2-port",
  "nombre": "Cargador Xiaomi 45W Nano de 2 puertos USB-C",
  "resumen": "Cargador compacto de 45 W con dos puertos USB-C para cargar dos equipos a la vez",
  "descripcion": "Con el cargador Xiaomi 45W Nano cargás rápido tu celular, tablet o accesorios. Con un solo puerto entrega hasta 45 W, y con sus dos puertos USB-C cargás dos equipos al mismo tiempo (25 W + 20 W).\n\nEs compatible con los protocolos más usados (PD 3.0, PPS, QC 3.0 y QC 2.0), así que funciona con teléfonos Android, productos Apple y otros equipos USB-C. Usa tecnología GaN, por eso es pequeño y liviano (72.5 g) para llevarlo en la mochila.\n\nTrae protección contra sobrecalentamiento, cortocircuito, sobrevoltaje y otras fallas para que cargues con tranquilidad.",
  "caracteristicas": {
   "potencia": "45 W máx. con un puerto; 25 W + 20 W usando los dos",
   "conector": "2 puertos USB-C",
   "compatible_con": "Celulares, tablets y productos Apple con USB-C (PD 3.0, PPS, QC 3.0/2.0)"
  },
  "incluye": "Cargador Xiaomi 45W Nano (2 puertos)\nManual de usuario",
  "faq": [
   {
    "pregunta": "¿Trae cable?",
    "respuesta": "No. El cable se vende por separado; necesitás un cable con extremo USB-C."
   },
   {
    "pregunta": "¿Carga iPhone?",
    "respuesta": "Sí. Es compatible con productos Apple y con el protocolo PD; solo necesitás el cable adecuado para tu iPhone."
   },
   {
    "pregunta": "¿Puedo cargar dos teléfonos a la vez?",
    "respuesta": "Sí. Con los dos puertos en uso reparte hasta 25 W en uno y 20 W en el otro."
   }
  ],
  "meta_descripcion": "Cargador Xiaomi 45W Nano con 2 puertos USB-C, GaN compacto, PD y QC para Android y Apple. Garantía de 12 meses y pago contra entrega.",
  "orden": 123
 },
 {
  "slug": "xiaomi-redmi-watch-5-lite",
  "nombre": "Xiaomi Redmi Watch 5 Lite",
  "resumen": "Pantalla AMOLED de 1.96\", GPS integrado, llamadas Bluetooth y hasta 18 días de batería",
  "descripcion": "El Redmi Watch 5 Lite tiene una pantalla AMOLED grande de 1.96\" que se ve clara y con buenos colores, con opción de pantalla siempre encendida.\n\nContestás llamadas desde la muñeca gracias a su altavoz y sus dos micrófonos. Trae GPS integrado, así que registrás tus caminatas o carreras sin cargar el teléfono, y más de 150 modos de ejercicio.\n\nLa batería te dura hasta 18 días en uso normal y resiste el agua (5ATM), así que podés nadar en piscina con él.",
  "caracteristicas": {
   "pantalla": "1.96\" AMOLED, 410 x 502",
   "autonomia": "Hasta 18 días en uso típico; 12 en uso intenso; 7 con pantalla siempre encendida",
   "resistencia": "5ATM (sirve para piscina)",
   "conexion": "Bluetooth 5.3, llamadas Bluetooth, GPS integrado (5 sistemas)",
   "compatibilidad": "Android 8.0 o superior, iOS 12.0 o superior",
   "peso": "29.2 g (sin correa)"
  },
  "incluye": "Reloj Redmi Watch 5 Lite\nCable de carga magnético\nManual de usuario",
  "faq": [
   {
    "pregunta": "¿Sirve con iPhone?",
    "respuesta": "Sí. Funciona con iPhone con iOS 12.0 o superior y con Android 8.0 o superior."
   },
   {
    "pregunta": "¿Puedo nadar con él?",
    "respuesta": "Sí, en piscina o en la orilla del mar (5ATM). No sirve para bucear, duchas calientes ni sauna."
   },
   {
    "pregunta": "¿Puedo contestar llamadas desde el reloj?",
    "respuesta": "Sí, mientras esté conectado por Bluetooth a tu teléfono. Las llamadas de apps como WhatsApp no se pueden contestar en el reloj."
   }
  ],
  "meta_descripcion": "Xiaomi Redmi Watch 5 Lite: AMOLED de 1.96\", GPS integrado, llamadas Bluetooth y hasta 18 días de batería. Garantía de 12 meses y pago contra entrega.",
  "orden": 124
 },
 {
  "slug": "xiaomi-redmi-watch-6-active",
  "nombre": "Xiaomi Redmi Watch 6 Active",
  "resumen": "Reloj delgado con pantalla AMOLED de 1.85\", llamadas Bluetooth y hasta 18 días de batería",
  "descripcion": "El Redmi Watch 6 Active es delgado (9.9 mm) y liviano (26 g), con una pantalla AMOLED de 1.85\" que llega a 1200 nits, así que la leés bien aunque estés bajo el sol. También tiene pantalla siempre encendida.\n\nContestás llamadas desde la muñeca, y mide tu ritmo cardíaco, oxígeno en sangre, estrés y sueño todo el día. Trae más de 140 modos de ejercicio.\n\nLa batería te dura hasta 18 días en uso ligero y resiste agua y polvo (IP68) para el sudor o la lluvia. Las correas se cambian con un solo botón.",
  "caracteristicas": {
   "pantalla": "1.85\" AMOLED, 390 x 450, hasta 1200 nits",
   "autonomia": "Hasta 18 días en uso ligero; 12 en uso normal; 6 en uso intenso",
   "resistencia": "IP68 (polvo, sudor y lluvia; no para nadar)",
   "conexion": "Bluetooth 5.3, llamadas Bluetooth",
   "compatibilidad": "Android 8.0 o superior, iOS 14.0 o superior",
   "peso": "26 g (sin correa)"
  },
  "incluye": "Reloj Redmi Watch 6 Active\nCable de carga magnético\nManual de usuario",
  "faq": [
   {
    "pregunta": "¿Puedo nadar con él?",
    "respuesta": "No. Es IP68: aguanta sudor, lluvia y salpicaduras, pero Xiaomi indica que no se use en piscina, en el mar ni en la ducha."
   },
   {
    "pregunta": "¿Sirve con iPhone?",
    "respuesta": "Sí. Funciona con iPhone con iOS 14.0 o superior y con Android 8.0 o superior."
   },
   {
    "pregunta": "¿Puedo contestar llamadas desde el reloj?",
    "respuesta": "Sí, mientras esté conectado por Bluetooth a tu teléfono. Las llamadas de apps como WhatsApp no se pueden contestar en el reloj."
   }
  ],
  "meta_descripcion": "Xiaomi Redmi Watch 6 Active: AMOLED de 1.85\" con 1200 nits, llamadas Bluetooth, IP68 y hasta 18 días de batería. Garantía de 12 meses y pago contra entrega.",
  "orden": 125
 },
 {
  "slug": "xiaomi-redmi-watch-6-lite",
  "nombre": "Xiaomi Redmi Watch 6 Lite",
  "resumen": "AMOLED de 1.96\", GPS integrado, modo natación y hasta 18 días de batería",
  "descripcion": "El Redmi Watch 6 Lite tiene una pantalla AMOLED de 1.96\" que llega a 1500 nits y ajusta el brillo sola según la luz, así que se ve bien de día y no te encandila de noche.\n\nTrae GPS integrado para registrar tus rutas sin el teléfono, más de 150 modos de ejercicio y un modo de natación que cuenta brazadas y largos. Resiste el agua (5ATM), así que podés nadar en piscina con él.\n\nContestás llamadas desde la muñeca y la batería te dura hasta 18 días en uso ligero. Mide 9.9 mm de grosor y las correas se cambian con un botón.",
  "caracteristicas": {
   "pantalla": "1.96\" AMOLED, 410 x 502, hasta 1500 nits",
   "autonomia": "Hasta 18 días en uso ligero; 12 en uso normal; 6 en uso intenso",
   "resistencia": "5ATM (sirve para piscina)",
   "conexion": "Bluetooth 5.3, llamadas Bluetooth, GPS integrado (5 sistemas)",
   "compatibilidad": "Android 8.0 o superior, iOS 14.0 o superior",
   "peso": "27.8 g (sin correa)"
  },
  "incluye": "Reloj Redmi Watch 6 Lite\nCable de carga magnético\nManual de usuario",
  "faq": [
   {
    "pregunta": "¿Puedo nadar con él?",
    "respuesta": "Sí, en piscina (5ATM), y tiene modo de natación que registra brazadas, largos y ritmo cardíaco."
   },
   {
    "pregunta": "¿Necesito llevar el teléfono para medir mis rutas?",
    "respuesta": "No. Trae GPS integrado, así que registra tus caminatas o carreras aunque dejés el teléfono en casa."
   },
   {
    "pregunta": "¿Sirve con iPhone?",
    "respuesta": "Sí. Funciona con iPhone con iOS 14.0 o superior y con Android 8.0 o superior."
   }
  ],
  "meta_descripcion": "Xiaomi Redmi Watch 6 Lite: AMOLED de 1.96\" con 1500 nits, GPS integrado, natación 5ATM y hasta 18 días de batería. Garantía de 12 meses y pago contra entrega.",
  "orden": 126
 },
 {
  "slug": "xiaomi-smart-band-11-active",
  "nombre": "Xiaomi Smart Band 11 Active",
  "resumen": "Pulsera liviana con hasta 21 días de batería, ritmo cardíaco, oxígeno y sueño",
  "descripcion": "La Xiaomi Smart Band 11 Active es una pulsera liviana (18 g) con pantalla de 1.47\" a 60 Hz y marco con acabado metálico, cómoda para usarla todo el día y toda la noche.\n\nMide tu ritmo cardíaco, oxígeno en sangre, estrés y sueño, y registra 50 tipos de ejercicio. Te avisa de mensajes, te deja controlar la música y ver el clima desde la muñeca.\n\nLa batería te dura hasta 21 días en uso ligero (8 en uso normal) y resiste el agua (5ATM), así que no te la tenés que quitar para lavarte las manos o si te agarra la lluvia.",
  "caracteristicas": {
   "pantalla": "1.47\" TFT, 172 x 320, 60 Hz",
   "autonomia": "Hasta 21 días en uso ligero; 8 en uso normal",
   "resistencia": "5ATM",
   "conexion": "Bluetooth 5.3 BLE",
   "compatibilidad": "Android 8.0 o superior, iOS 14.0 o superior",
   "peso": "18 g (sin correa)"
  },
  "incluye": "Pulsera Smart Band 11 Active\nCorrea\nCable de carga magnético\nManual de usuario",
  "faq": [
   {
    "pregunta": "¿Sirve con iPhone?",
    "respuesta": "Sí. Funciona con iPhone con iOS 14.0 o superior y con Android 8.0 o superior, usando la app Mi Fitness."
   },
   {
    "pregunta": "¿Cuánto tarda en cargar?",
    "respuesta": "Menos de 2 horas con su cable magnético, y luego te dura hasta 21 días en uso ligero."
   },
   {
    "pregunta": "¿Es resistente al agua?",
    "respuesta": "Sí, 5ATM: aguanta lluvia, lavarte las manos y nadar en piscina. No sirve para bucear, clavados, duchas calientes ni sauna, y no tiene modo de natación."
   }
  ],
  "meta_descripcion": "Xiaomi Smart Band 11 Active: hasta 21 días de batería, ritmo cardíaco, oxígeno, sueño y 5ATM. Garantía de 12 meses y pago contra entrega.",
  "orden": 127
 },
 {
  "slug": "itel-smart-watch-isw-o20b",
  "nombre": "itel Smart Watch Fit O20",
  "resumen": "Pantalla de 2.04\", llamadas por Bluetooth y resistencia IP68",
  "descripcion": "El itel Smart Watch Fit O20 te deja contestar llamadas y ver tus notificaciones desde la muñeca, sin sacar el teléfono.\n\nSu pantalla de 2.04\" se lee fácil, y en la pantalla de inicio tenés a un toque el ritmo cardíaco, el clima y tus actividades. Tiene más de 100 modos deportivos y registro del ciclo menstrual.\n\nEs resistente al agua y al polvo (IP68), con sistema que saca el agua solo. Con la app iPulse podés crear carátulas con inteligencia artificial.",
  "caracteristicas": {
   "pantalla": "2.04\" HD",
   "resistencia": "IP68 (polvo y agua dulce), con expulsión automática de agua",
   "conexion": "Bluetooth, con llamadas y notificaciones",
   "compatibilidad": "App iPulse"
  },
  "faq": [
   {
    "pregunta": "¿Puedo contestar llamadas desde el reloj?",
    "respuesta": "Sí, tiene llamadas por Bluetooth: contestás y hablás desde el reloj con el teléfono cerca."
   },
   {
    "pregunta": "¿Me puedo bañar o nadar con él?",
    "respuesta": "Es IP68 para agua dulce; itel no recomienda usarlo en el mar, la playa ni la piscina."
   }
  ],
  "meta_descripcion": "itel Smart Watch Fit O20: pantalla de 2.04\", llamadas por Bluetooth, IP68 y más de 100 deportes. Garantía de 12 meses y pago contra entrega.",
  "orden": 140
 },
 {
  "slug": "itel-smart-watch-isw-o23p-pink-mauve",
  "nombre": "itel Smart Watch Fit O23 Plus Pink Mauve",
  "resumen": "Pantalla de 2.04\", llamadas por Bluetooth, IP68 y hasta 7 días de batería",
  "descripcion": "El itel Smart Watch Fit O23 Plus en color rosado mauve combina un marco de aleación de zinc y corona giratoria de acero con correa texturizada.\n\nEn su pantalla de 2.04\" contestás llamadas, ves tus notificaciones y respondés WhatsApp con mensajes rápidos o emojis. También mide ritmo cardíaco, sueño y estrés, y tiene más de 100 modos deportivos.\n\nResiste polvo y agua (IP68) y su batería te dura hasta 7 días de uso normal.",
  "caracteristicas": {
   "pantalla": "2.04\" HD táctil",
   "autonomia": "Hasta 7 días de uso normal (3 días de uso intenso); carga completa en 2.5 h",
   "resistencia": "IP68 (polvo y agua)",
   "conexion": "Bluetooth, con llamadas y notificaciones",
   "compatibilidad": "Android y iPhone con la app iPulse (respuestas rápidas de WhatsApp solo en Android)"
  },
  "faq": [
   {
    "pregunta": "¿Sirve con iPhone?",
    "respuesta": "Sí, la app iPulse funciona en Android y iPhone. Las respuestas rápidas de WhatsApp por ahora solo funcionan con Android."
   },
   {
    "pregunta": "¿Cuánto dura la batería?",
    "respuesta": "Según itel, hasta 7 días de uso normal o 3 días de uso intenso, y se carga completo en unas 2.5 horas."
   },
   {
    "pregunta": "¿Es resistente al agua?",
    "respuesta": "Sí, tiene certificación IP68 contra polvo y agua."
   }
  ],
  "meta_descripcion": "itel Smart Watch Fit O23 Plus rosado mauve: pantalla 2.04\", llamadas Bluetooth, IP68 y hasta 7 días de batería. Garantía de 12 meses y pago contra entrega.",
  "orden": 141
 },
 {
  "slug": "itel-vista-tablet-11",
  "nombre": "itel VistaTab 11",
  "resumen": "Pantalla de 10.1\", batería de 6000 mAh y herramientas de estudio con IA",
  "descripcion": "La itel VistaTab 11 está pensada para estudiar y entretenerse. Su pantalla de 10.1\" con modo lectura y nocturno cuida la vista en clases en línea y tareas.\n\nLa batería de 6000 mAh aguanta hasta 16 horas de clases en línea, según itel. Pesa 425 g y mide 7.9 mm, así que la llevás fácil en la mochila.\n\nTrae Kids Park, una zona solo para niños de la que se sale con la contraseña de papá o mamá, y herramientas con IA para resolver y corregir tareas con una foto.",
  "caracteristicas": {
   "pantalla": "10.1\" HD (1280 x 800), 400 nits",
   "procesador": "Unisoc T615",
   "camara": "8 MP trasera y 5 MP frontal",
   "bateria": "6000 mAh",
   "sistema_operativo": "Android 14",
   "peso": "425 g"
  },
  "incluye": "Tablet\nFunda tipo folio\nCargador\nCable USB\nDocumentación",
  "faq": [
   {
    "pregunta": "¿Sirve para que estudien los niños?",
    "respuesta": "Sí, trae Kids Park con control parental por contraseña, centro de aprendizaje y herramientas con IA para tareas."
   },
   {
    "pregunta": "¿Trae cargador?",
    "respuesta": "Sí, según itel la caja incluye cargador, cable y funda."
   },
   {
    "pregunta": "¿Le puedo poner más memoria?",
    "respuesta": "Sí, itel indica que acepta expansión de hasta 2 TB."
   }
  ],
  "meta_descripcion": "itel VistaTab 11: pantalla de 10.1\", batería de 6000 mAh, funda incluida y control parental. Garantía de 12 meses y pago contra entrega.",
  "orden": 142
 },
 {
  "slug": "itel-vista-tablet-go",
  "nombre": "itel VistaTab Go",
  "resumen": "Tablet de 8.68\" con 4G, batería de 7000 mAh y pantalla que cuida la vista",
  "descripcion": "La itel VistaTab Go es una tablet compacta para que los niños estudien sin cansar la vista. Su pantalla de 8.68\" tiene certificación TÜV Rheinland de luz azul baja y sin parpadeo.\n\nLa batería de 7000 mAh aguanta horas de clases y juegos. Tiene 4G para usarla con chip, además de Wi-Fi de 2.4 y 5 GHz.\n\nTrae bloqueo de control parental y un centro de aprendizaje con lecciones gratis. Si necesitás más espacio, le ponés una tarjeta de hasta 512 GB.",
  "caracteristicas": {
   "pantalla": "8.68\" HD IPS (800 x 1340), 400 nits",
   "procesador": "Unisoc T615 de 8 núcleos",
   "camara": "8 MP trasera y 5 MP frontal",
   "bateria": "7000 mAh",
   "carga": "USB-C",
   "red": "4G LTE, Wi-Fi 2.4/5 GHz, Bluetooth 5.0",
   "sistema_operativo": "Android 15 (Go edition)"
  },
  "faq": [
   {
    "pregunta": "¿Se le puede poner chip?",
    "respuesta": "Sí, tiene 4G LTE para usarla con chip, además de Wi-Fi."
   },
   {
    "pregunta": "¿Le puedo poner más memoria?",
    "respuesta": "Sí, acepta tarjeta de memoria de hasta 512 GB."
   },
   {
    "pregunta": "¿Cuida la vista de los niños?",
    "respuesta": "Su pantalla tiene certificación TÜV Rheinland de luz azul baja y sin parpadeo."
   }
  ],
  "meta_descripcion": "itel VistaTab Go: tablet de 8.68\" con 4G, batería de 7000 mAh y pantalla TÜV de luz azul baja. Garantía de 12 meses y pago contra entrega.",
  "orden": 143
 },
 {
  "slug": "apple-cable-usb-a-to-lightning-1m",
  "nombre": "Cable Apple de Lightning a USB (1 m)",
  "resumen": "Cable original Apple para cargar y sincronizar tu iPhone con conector Lightning",
  "descripcion": "Este es el cable original de Apple para cargar y pasar datos a tu iPhone, iPad o AirPods con conector Lightning. Lo conectás a un cargador USB de pared o al puerto USB de tu computadora.\n\nEl conector Lightning es reversible, así que entra de cualquier lado. Mide 1 metro, un largo cómodo para usarlo en la mesa de noche o en el carro.",
  "caracteristicas": {
   "conector": "Lightning a USB-A (USB 2)",
   "largo": "1 m",
   "compatible_con": "iPhone con conector Lightning (del iPhone 5 al iPhone 14), iPad y AirPods con Lightning"
  },
  "incluye": "Cable de Lightning a USB",
  "faq": [
   {
    "pregunta": "¿Sirve con el iPhone 15 o más nuevo?",
    "respuesta": "No. Del iPhone 15 en adelante los iPhone usan conector USB-C; este cable es para equipos con conector Lightning."
   },
   {
    "pregunta": "¿Trae el cubo de cargar?",
    "respuesta": "No, solo es el cable. Va en un cargador con puerto USB-A (el rectangular de siempre) o en el puerto USB de una computadora."
   }
  ],
  "meta_descripcion": "Cable Apple de Lightning a USB de 1 m para cargar y sincronizar iPhone, iPad y AirPods con Lightning. Garantía de 12 meses y pago contra entrega.",
  "orden": 150
 },
 {
  "slug": "honor-choice-earbuds-clip",
  "nombre": "HONOR CHOICE Earbuds Clip",
  "resumen": "Audífonos de clip abiertos, 5.1 g por audífono y hasta 36 horas de batería",
  "descripcion": "Los HONOR CHOICE Earbuds Clip se sujetan a la oreja como un arete, sin meterse en el oído. Podés escuchar tu música y al mismo tiempo oír lo que pasa a tu alrededor, ideal para la calle, el gym o la oficina.\n\nCada audífono pesa solo 5.1 g y tiene un arco con núcleo de titanio, así que se sienten firmes y livianos todo el día. El driver de 10.8 mm da agudos claros y bajos con cuerpo.\n\nTe duran 7 horas por carga y hasta 36 horas con el estuche; con 10 minutos de carga tenés 2 horas de música. Aguantan sudor y salpicaduras (IP54) y se conectan a dos equipos a la vez.",
  "caracteristicas": {
   "tipo": "Inalámbricos de clip, diseño abierto",
   "autonomia": "7 h por carga, hasta 36 h con el estuche",
   "cancelacion_ruido": "En llamadas (doble micrófono con IA)",
   "resistencia": "IP54 (audífonos)",
   "conexion": "Bluetooth 5.3, conexión a dos equipos",
   "conector": "USB-C",
   "peso": "5.1 g cada audífono"
  },
  "faq": [
   {
    "pregunta": "¿Trae cable de carga?",
    "respuesta": "No. HONOR indica que el cable USB-C no viene en la caja; podés usar el de tu teléfono."
   },
   {
    "pregunta": "¿Se meten en el oído?",
    "respuesta": "No. Son de clip abierto: se sujetan a la oreja y dejan el oído libre, así seguís oyendo lo que pasa alrededor."
   },
   {
    "pregunta": "¿Aguantan el sudor?",
    "respuesta": "Sí, los audífonos tienen protección IP54 contra polvo y salpicaduras. El estuche no es resistente al agua."
   }
  ],
  "meta_descripcion": "HONOR CHOICE Earbuds Clip: audífonos de clip abiertos, 36 h de batería, IP54 y Bluetooth 5.3. Garantía de 12 meses y pago contra entrega.",
  "orden": 160
 },
 {
  "slug": "honor-choice-earbuds-s8",
  "nombre": "HONOR CHOICE Earbuds S8",
  "resumen": "Cancelación de ruido de hasta 50 dB, doble driver y 38 horas de batería",
  "descripcion": "Los HONOR CHOICE Earbuds S8 te aíslan del ruido de la calle, el bus o la oficina con cancelación activa de hasta 50 dB. Si necesitás oír a alguien, el modo de escucha te deja hablar sin quitártelos.\n\nCada audífono tiene doble driver (dinámico de 11 mm y cerámico de 10.5 mm) y soporta LDAC con certificación Hi-Res, para un sonido con más detalle. Para llamadas usan tres micrófonos por lado.\n\nTe duran 8 horas por carga y hasta 38 horas con el estuche; con 10 minutos de carga tenés 2 horas. Pesan 4.8 g cada uno, resisten sudor (IP54) y se pausan solos cuando te los quitás.",
  "caracteristicas": {
   "tipo": "Inalámbricos in-ear (TWS)",
   "autonomia": "8 h por carga, hasta 38 h con el estuche (ANC apagado)",
   "cancelacion_ruido": "Activa, hasta 50 dB",
   "resistencia": "IP54 (audífonos)",
   "conexion": "Bluetooth 5.4, LDAC, AAC y SBC, conexión a dos equipos",
   "conector": "USB-C",
   "peso": "4.8 g cada audífono"
  },
  "faq": [
   {
    "pregunta": "¿Trae cable de carga?",
    "respuesta": "No. HONOR indica que el cable USB-C no viene en la caja."
   },
   {
    "pregunta": "¿Tienen cancelación de ruido?",
    "respuesta": "Sí, cancelación activa de hasta 50 dB en modo Ultra, con modos Moderado, Cómodo e Inteligente."
   },
   {
    "pregunta": "¿Sirven para hacer ejercicio?",
    "respuesta": "Sí, los audífonos tienen protección IP54 contra sudor, polvo y salpicaduras."
   }
  ],
  "meta_descripcion": "HONOR CHOICE Earbuds S8: cancelación de ruido de 50 dB, LDAC Hi-Res, 38 h de batería e IP54. Garantía de 12 meses y pago contra entrega.",
  "orden": 161
 },
 {
  "slug": "honor-choice-earbuds-x7-lite",
  "nombre": "HONOR CHOICE Earbuds X7 Lite",
  "resumen": "Cancelación de ruido, Bluetooth 5.4 y hasta 38 horas de batería",
  "descripcion": "Los HONOR CHOICE Earbuds X7 Lite te dan cancelación activa de ruido a precio accesible. Bajan el ruido de fondo del bus o la calle y tienen un algoritmo contra el ruido del viento.\n\nEl driver de 10 mm da agudos suaves y bajos con fuerza. Para llamadas, la IA filtra el ruido para que te escuchen claro. Se conectan a dos equipos a la vez y tienen modo de baja latencia para juegos.\n\nTe duran 7 horas por carga y hasta 38 horas con el estuche. Pesan 4.2 g cada uno y resisten sudor y lluvia ligera (IP54).",
  "caracteristicas": {
   "tipo": "Inalámbricos in-ear (TWS)",
   "autonomia": "7 h por carga, hasta 38 h con el estuche",
   "cancelacion_ruido": "Activa (ANC) y en llamadas con IA",
   "resistencia": "IP54 (audífonos)",
   "conexion": "Bluetooth 5.4, AAC y SBC, conexión a dos equipos",
   "conector": "USB-C",
   "peso": "4.2 g cada audífono"
  },
  "faq": [
   {
    "pregunta": "¿Trae cable de carga?",
    "respuesta": "No. HONOR indica que el cable USB-C no viene en la caja."
   },
   {
    "pregunta": "¿Tienen cancelación de ruido?",
    "respuesta": "Sí, tienen cancelación activa que reduce sobre todo el ruido grave, como el de motores y tráfico."
   },
   {
    "pregunta": "¿Cuánto dura la batería?",
    "respuesta": "Hasta 7 horas de música por carga y 38 horas en total con el estuche."
   }
  ],
  "meta_descripcion": "HONOR CHOICE Earbuds X7 Lite: cancelación de ruido, Bluetooth 5.4, 38 h de batería e IP54. Garantía de 12 meses y pago contra entrega.",
  "orden": 162
 },
 {
  "slug": "honor-choice-earbuds-x7e-active",
  "nombre": "HONOR CHOICE Earbuds X7e Active",
  "resumen": "Driver de 12.4 mm con bajos potentes y hasta 38 horas de batería",
  "descripcion": "Los HONOR CHOICE Earbuds X7e Active tienen un driver grande de 12.4 mm que da bajos con fuerza. Desde la app podés elegir entre sonido normal, más bajos o más agudos.\n\nPesan 4.3 g cada uno y se controlan con toques. En llamadas, la IA filtra el ruido de fondo y del viento para que te escuchen bien. Se conectan a dos equipos y cambian solos al que esté sonando.\n\nTe duran 7 horas por carga y hasta 38 horas con el estuche. Aguantan sudor y salpicaduras (IP54), así que los podés usar para hacer ejercicio.",
  "caracteristicas": {
   "tipo": "Inalámbricos (TWS)",
   "autonomia": "7 h por carga, hasta 38 h con el estuche",
   "cancelacion_ruido": "En llamadas (IA)",
   "resistencia": "IP54 (audífonos)",
   "conexion": "Bluetooth 5.4, AAC y SBC, conexión a dos equipos",
   "conector": "USB-C",
   "peso": "4.3 g cada audífono"
  },
  "faq": [
   {
    "pregunta": "¿Trae cable de carga?",
    "respuesta": "No. HONOR indica que el cable USB-C no viene en la caja."
   },
   {
    "pregunta": "¿Tienen cancelación de ruido?",
    "respuesta": "Solo en llamadas: la IA filtra el ruido para tu voz. No tienen cancelación activa para la música."
   },
   {
    "pregunta": "¿Sirven para hacer ejercicio?",
    "respuesta": "Sí, los audífonos tienen protección IP54 contra sudor, polvo y salpicaduras."
   }
  ],
  "meta_descripcion": "HONOR CHOICE Earbuds X7e Active: driver de 12.4 mm, 38 h de batería, Bluetooth 5.4 e IP54. Garantía de 12 meses y pago contra entrega.",
  "orden": 163
 },
 {
  "slug": "honor-choice-headphone",
  "nombre": "HONOR CHOICE Headphones",
  "resumen": "Audífonos de diadema con hasta 80 horas de batería y cable de 3.5 mm incluido",
  "descripcion": "Los HONOR CHOICE Headphones son audífonos de diadema para escuchar música horas y horas sin cargar: hasta 80 horas con una carga completa.\n\nTienen drivers de 40 mm para un sonido amplio, aislamiento pasivo y dos micrófonos con reducción de ruido para tus llamadas. Pesan 230 g.\n\nSi se te acaba la batería o querés usarlos con una computadora o consola, traen un cable de 3.5 mm para conectarlos con cable.",
  "caracteristicas": {
   "tipo": "De diadema, inalámbricos",
   "autonomia": "Hasta 80 h",
   "cancelacion_ruido": "Aislamiento pasivo; reducción de ruido en llamadas (ENC)",
   "conexion": "Bluetooth y cable de 3.5 mm",
   "conector": "USB-C para carga, 3.5 mm para audio",
   "peso": "230 g"
  },
  "incluye": "Audífonos HONOR CHOICE Headphones\nCable USB-A a USB-C\nCable de audio 3.5 mm\nInstructivo y tarjeta de garantía",
  "faq": [
   {
    "pregunta": "¿Tienen cancelación activa de ruido?",
    "respuesta": "No. Este modelo aísla de forma pasiva y usa reducción de ruido (ENC) en las llamadas. La cancelación activa es del modelo Headphones Pro."
   },
   {
    "pregunta": "¿Se pueden usar con cable?",
    "respuesta": "Sí, traen un cable de 3.5 mm en la caja para conectarlos a computadora, consola u otros equipos."
   },
   {
    "pregunta": "¿Cuánto dura la batería?",
    "respuesta": "Hasta 80 horas con una carga completa, según HONOR."
   }
  ],
  "meta_descripcion": "HONOR CHOICE Headphones: audífonos de diadema con 80 h de batería, drivers de 40 mm y cable de 3.5 mm. Garantía de 12 meses y pago contra entrega.",
  "orden": 164
 },
 {
  "slug": "honor-choice-musicbox",
  "nombre": "HONOR CHOICE Portable Bluetooth Speaker (MusicBox M1)",
  "resumen": "Bocina portátil de 5 W, sumergible IP67 y 10 horas de música",
  "descripcion": "La HONOR CHOICE MusicBox M1 es una bocina pequeña con correa ajustable para llevarla colgada a la playa, al río o de paseo. Resiste polvo y agua (IP67), así que la lluvia no es problema.\n\nTiene 5 W de potencia y radiador pasivo para bajos más profundos. Te dura 10 horas de música con una carga y se carga por USB-C.\n\nPodés contestar llamadas con un toque y llamar al asistente de voz de tu teléfono. Si tenés dos, las enlazás para sonido estéreo.",
  "caracteristicas": {
   "potencia": "5 W",
   "autonomia": "10 h de música",
   "resistencia": "IP67 (polvo y agua)",
   "conexion": "Bluetooth 5.3, modo estéreo con dos bocinas",
   "peso": "225 g"
  },
  "faq": [
   {
    "pregunta": "¿Es resistente al agua?",
    "respuesta": "Sí, tiene protección IP67 contra polvo y agua, según la norma GB/T 4208-2017."
   },
   {
    "pregunta": "¿Se pueden conectar dos?",
    "respuesta": "Sí, podés enlazar dos bocinas para que suenen juntas en estéreo."
   },
   {
    "pregunta": "¿Sirve para llamadas?",
    "respuesta": "Sí, contestás llamadas con un toque y hablás manos libres."
   }
  ],
  "meta_descripcion": "HONOR CHOICE MusicBox M1: bocina Bluetooth de 5 W, IP67, 10 h de batería y correa para colgar. Garantía de 12 meses y pago contra entrega.",
  "orden": 165
 },
 {
  "slug": "honor-choice-speaker-mini-bluetooth",
  "nombre": "HONOR CHOICE Bluetooth Speaker mini",
  "resumen": "Bocina mini de aluminio, 4 W, 8 horas de batería y Bluetooth 5.4",
  "descripcion": "La HONOR CHOICE Bluetooth Speaker mini cabe en la palma de tu mano y tiene cuerpo de aluminio. Es ideal para el cuarto, el escritorio o para llevarla en la mochila.\n\nSu bocina de 4 W da sonido claro con bajos marcados, y podés elegir entre sonido estándar, más bajos o más agudos. El Bluetooth 5.4 llega hasta 50 m en espacio abierto.\n\nTe dura 8 horas de música, resiste salpicaduras (IPX5) y se carga por USB-C. Si tenés dos, las enlazás para sonido estéreo.",
  "caracteristicas": {
   "potencia": "4 W",
   "autonomia": "8 h de música",
   "resistencia": "IPX5 (salpicaduras)",
   "conexion": "Bluetooth 5.4, modo estéreo con dos bocinas",
   "peso": "161 g"
  },
  "faq": [
   {
    "pregunta": "¿Trae cable de carga?",
    "respuesta": "No. HONOR indica que el cable USB-C no viene en la caja."
   },
   {
    "pregunta": "¿Es resistente al agua?",
    "respuesta": "Resiste salpicaduras y lluvia (IPX5), pero no se puede sumergir."
   },
   {
    "pregunta": "¿Sirve para llamadas?",
    "respuesta": "Sí, contestás con un botón y hablás manos libres."
   }
  ],
  "meta_descripcion": "HONOR CHOICE Speaker mini: bocina Bluetooth 5.4 de aluminio, 4 W, 8 h de batería e IPX5. Garantía de 12 meses y pago contra entrega.",
  "orden": 166
 },
 {
  "slug": "honor-choice-speaker-pro-bluetooth",
  "nombre": "HONOR CHOICE Portable Bluetooth Speaker Pro",
  "resumen": "Bocina de 30 W con luces RGB, sumergible IP67 y 12 horas de batería",
  "descripcion": "La HONOR CHOICE Portable Bluetooth Speaker Pro tiene 30 W de potencia con una bocina de 20 W, un tweeter de 10 W y dos radiadores pasivos. Suena fuerte y con bajos para reuniones, la playa o la piscina.\n\nResiste polvo y agua (IP67) y trae un anillo de luz RGB arriba. Su batería de 5200 mAh te da 12 horas de música.\n\nPodés enlazar dos para sonido estéreo, tiene micrófono para llamadas manos libres y un botón directo al asistente de voz de tu teléfono.",
  "caracteristicas": {
   "potencia": "30 W (20 W + tweeter de 10 W)",
   "autonomia": "12 h de música (luces apagadas)",
   "resistencia": "IP67 (polvo y agua)",
   "conexion": "Bluetooth 5.3, AAC y SBC, modo estéreo"
  },
  "faq": [
   {
    "pregunta": "¿Es resistente al agua?",
    "respuesta": "Sí, tiene protección IP67 contra polvo y agua. No la cargués mojada."
   },
   {
    "pregunta": "¿Cuánto dura la batería?",
    "respuesta": "Hasta 12 horas de música al 50% de volumen y con las luces apagadas."
   },
   {
    "pregunta": "¿Se pueden conectar dos?",
    "respuesta": "Sí, podés enlazar dos para sonido estéreo."
   }
  ],
  "meta_descripcion": "HONOR CHOICE Speaker Pro: bocina Bluetooth de 30 W, IP67, luces RGB y 12 h de batería. Garantía de 12 meses y pago contra entrega.",
  "orden": 167
 },
 {
  "slug": "honor-choice-infowear-watch-2-pro",
  "nombre": "HONOR CHOICE Watch 2 Pro",
  "resumen": "Pantalla AMOLED de 1.97\", GPS propio, llamadas y 14 días de batería",
  "descripcion": "El HONOR CHOICE Watch 2 Pro tiene una pantalla AMOLED de 1.97\" con bordes de solo 1.8 mm y cuerpo de metal de 9.99 mm. Pesa 29 g sin la correa, así que casi no lo sentís.\n\nTrae GPS propio, barómetro y brújula para salir a caminar o a la montaña, y 120 modos de deporte. Mide tu ritmo cardíaco, oxígeno en sangre y sueño las 24 horas.\n\nPodés contestar y hacer llamadas desde el reloj por Bluetooth. Resiste agua para nadar (5 ATM e IP68) y la batería te dura hasta 14 días con uso típico.",
  "caracteristicas": {
   "pantalla": "1.97\" AMOLED, 390 x 450, 60 Hz",
   "autonomia": "Hasta 14 días (uso típico), 5 días con pantalla siempre encendida",
   "resistencia": "5 ATM + IP68",
   "conexion": "Bluetooth con llamadas desde el reloj; GPS integrado",
   "peso": "29 g (sin correa)"
  },
  "incluye": "Reloj\nCable de carga\nManual de instrucciones",
  "faq": [
   {
    "pregunta": "¿Puedo nadar con él?",
    "respuesta": "Sí, tiene 5 ATM e IP68: sirve para piscina o mar poco profundo. No es para buceo."
   },
   {
    "pregunta": "¿Se pueden hacer llamadas?",
    "respuesta": "Sí, contestás y marcás desde el reloj mientras esté conectado por Bluetooth a tu teléfono."
   },
   {
    "pregunta": "¿Cuánto dura la batería?",
    "respuesta": "Hasta 14 días con uso típico, 12 con uso intenso y 5 con pantalla siempre encendida."
   }
  ],
  "meta_descripcion": "HONOR CHOICE Watch 2 Pro: AMOLED de 1.97\", GPS, llamadas Bluetooth, 5 ATM y 14 días de batería. Garantía de 12 meses y pago contra entrega.",
  "orden": 168
 },
 {
  "slug": "honor-choice-infowear-watch-2i",
  "nombre": "HONOR CHOICE Watch 2i",
  "resumen": "Pantalla AMOLED de 1.85\", llamadas desde el reloj y 14 días de batería",
  "descripcion": "El HONOR CHOICE Watch 2i tiene una pantalla AMOLED de 1.85\" nítida y marco con acabado metálico. Pesa 26 g sin correa y la correa se cambia con un clic.\n\nPodés contestar y hacer llamadas desde el reloj por Bluetooth. Mide tu ritmo cardíaco, oxígeno en sangre, estrés y sueño, y registra 109 tipos de deporte.\n\nLa batería te dura hasta 14 días con uso típico. Aguanta sudor, lluvia y salpicaduras del día a día (IP68 y 1 ATM).",
  "caracteristicas": {
   "pantalla": "1.85\" AMOLED, 390 x 450",
   "autonomia": "Hasta 14 días (uso típico), 5 días con pantalla siempre encendida",
   "resistencia": "IP68 y 1 ATM",
   "conexion": "Bluetooth con llamadas desde el reloj",
   "peso": "26 g (sin correa)"
  },
  "incluye": "Reloj\nCable de carga\nManual de usuario",
  "faq": [
   {
    "pregunta": "¿Puedo nadar con él?",
    "respuesta": "No. Aguanta sudor, lluvia y salpicaduras (IP68 y 1 ATM), pero HONOR indica que no es para natación."
   },
   {
    "pregunta": "¿Se pueden hacer llamadas?",
    "respuesta": "Sí, contestás y marcás desde el reloj mientras esté conectado por Bluetooth a tu teléfono."
   },
   {
    "pregunta": "¿Cuánto dura la batería?",
    "respuesta": "Hasta 14 días con uso típico, 10 con uso intenso y 5 con pantalla siempre encendida."
   }
  ],
  "meta_descripcion": "HONOR CHOICE Watch 2i: AMOLED de 1.85\", llamadas Bluetooth, monitoreo de salud y 14 días de batería. Garantía de 12 meses y pago contra entrega.",
  "orden": 169
 },
 {
  "slug": "honor-choice-watch-2-epic",
  "nombre": "HONOR CHOICE Watch 2 Epic",
  "resumen": "Reloj redondo de 46 mm con doble bisel, GPS y 15 días de batería",
  "descripcion": "El HONOR CHOICE Watch 2 Epic es un reloj redondo de 46 mm con doble bisel intercambiable: uno de acero inoxidable para vestir y uno deportivo para entrenar. Lo cambiás sin herramientas.\n\nSu pantalla AMOLED de 1.32\" se ve nítida. Trae GPS propio, barómetro, más de 120 modos de deporte y monitoreo de ritmo cardíaco, oxígeno, estrés y sueño.\n\nPodés hacer llamadas desde el reloj por Bluetooth, resiste agua para nadar (5 ATM) y la batería te dura hasta 15 días con uso típico.",
  "caracteristicas": {
   "pantalla": "1.32\" AMOLED, 466 x 466",
   "autonomia": "Hasta 15 días (uso típico), 8 días (uso intenso)",
   "resistencia": "5 ATM",
   "conexion": "Bluetooth con llamadas desde el reloj; GPS integrado",
   "peso": "55 g (con correa)"
  },
  "faq": [
   {
    "pregunta": "¿Puedo nadar con él?",
    "respuesta": "Sí, tiene 5 ATM: sirve para piscina o mar poco profundo. No es para buceo ni agua caliente."
   },
   {
    "pregunta": "¿Qué es el doble bisel?",
    "respuesta": "Trae dos diseños de bisel, uno metálico y uno deportivo, que cambiás sin herramientas según la ocasión."
   },
   {
    "pregunta": "¿Cuánto dura la batería?",
    "respuesta": "Hasta 15 días con uso típico y 8 con uso intenso."
   }
  ],
  "meta_descripcion": "HONOR CHOICE Watch 2 Epic: 46 mm, AMOLED, doble bisel, GPS, llamadas, 5 ATM y 15 días de batería. Garantía de 12 meses y pago contra entrega.",
  "orden": 170
 },
 {
  "slug": "huawei-freebuds-se2",
  "nombre": "HUAWEI FreeBuds SE 2",
  "resumen": "Hasta 40 horas de batería, 3.8 g por audífono y carga rápida",
  "descripcion": "Los HUAWEI FreeBuds SE 2 son livianos (3.8 g cada uno) y cómodos para usarlos todo el día. Su driver de 10 mm da un sonido claro para música, videos y llamadas.\n\nTe duran 9 horas por carga y hasta 40 horas con el estuche. ¿Se te olvidó cargarlos? Con 10 minutos tenés hasta 3 horas de música.\n\nResisten sudor y salpicaduras (IP54), tienen reducción de ruido en llamadas y se controlan con dos toques. El cable USB-C viene en la caja.",
  "caracteristicas": {
   "tipo": "Inalámbricos (TWS)",
   "autonomia": "9 h por carga, hasta 40 h con el estuche",
   "cancelacion_ruido": "En llamadas",
   "resistencia": "IP54 (audífonos)",
   "conexion": "Bluetooth 5.3, AAC y SBC",
   "conector": "USB-C",
   "peso": "3.8 g cada audífono"
  },
  "incluye": "Audífonos (par izquierdo y derecho)\nEstuche de carga\nCable USB-C\nGuía rápida e información de seguridad\nTarjeta de garantía",
  "faq": [
   {
    "pregunta": "¿Trae cable de carga?",
    "respuesta": "Sí, la caja trae un cable USB-C."
   },
   {
    "pregunta": "¿Tienen cancelación de ruido?",
    "respuesta": "Tienen reducción de ruido en llamadas, para que te escuchen mejor. No tienen cancelación activa para la música."
   },
   {
    "pregunta": "¿Aguantan el sudor?",
    "respuesta": "Sí, los audífonos tienen protección IP54. El estuche no es resistente al agua."
   }
  ],
  "meta_descripcion": "HUAWEI FreeBuds SE 2: 40 h de batería, 3 h con 10 min de carga, IP54 y Bluetooth 5.3. Garantía de 12 meses y pago contra entrega.",
  "orden": 171
 },
 {
  "slug": "huawei-band-10",
  "nombre": "HUAWEI Band 10",
  "resumen": "Pantalla AMOLED de 1.47\", 100 modos de deporte y hasta 14 días de batería",
  "descripcion": "La HUAWEI Band 10 es una pulsera inteligente delgada (8.99 mm) y liviana, de 14 a 15 g sin correa según el color. Su pantalla es AMOLED de 1.47\".\n\nMide tu ritmo cardíaco, oxígeno en sangre, estrés y sueño, con análisis del sueño y consejos personalizados. Tiene 100 modos de deporte y sirve para nadar (5 ATM).\n\nLa batería te dura hasta 14 días, y con 5 minutos de carga tenés para unos 2 días. Funciona con Android y con iPhone.",
  "caracteristicas": {
   "pantalla": "1.47\" AMOLED, 194 x 368",
   "autonomia": "Hasta 14 días; 8 días con uso típico",
   "resistencia": "5 ATM",
   "conexion": "Bluetooth 5.0 (BLE)",
   "compatibilidad": "Android 9.0 o superior, iOS 13.0 o superior",
   "peso": "14–15 g (sin correa, según el color)"
  },
  "incluye": "HUAWEI Band 10\nCable de carga\nGuía de usuario, información de seguridad y tarjeta de garantía",
  "faq": [
   {
    "pregunta": "¿Sirve con iPhone?",
    "respuesta": "Sí, funciona con iPhone con iOS 13.0 o superior y con Android 9.0 o superior."
   },
   {
    "pregunta": "¿Puedo nadar con ella?",
    "respuesta": "Sí, tiene 5 ATM: sirve para piscina o mar poco profundo. No es para buceo ni agua caliente."
   },
   {
    "pregunta": "¿Cuánto dura la batería?",
    "respuesta": "Hasta 14 días según Huawei y 8 días con uso típico. Con 5 minutos de carga tenés para unos 2 días."
   }
  ],
  "meta_descripcion": "HUAWEI Band 10: AMOLED de 1.47\", 100 modos de deporte, 5 ATM, hasta 14 días de batería, Android e iPhone. Garantía de 12 meses y pago contra entrega.",
  "orden": 172
 },
 {
  "slug": "jbl-earphone-tune-110",
  "nombre": "JBL Tune 110",
  "resumen": "Audífonos de cable con bajos JBL Pure Bass, micrófono y cable que no se enreda",
  "descripcion": "Los JBL Tune 110 son audífonos de cable sencillos y livianos, con el sonido Pure Bass de JBL: bajos marcados para la música que escuchás todos los días.\n\nEl cable es plano, así que no se enreda en la bolsa. El control de un botón con micrófono te deja contestar llamadas sin sacar el teléfono.\n\nPesan solo 12.7 g y traen almohadillas de tres tamaños para que te queden cómodos.",
  "caracteristicas": {
   "tipo": "De cable, in-ear",
   "conexion": "Cable plano antienredos de 1.11 m con control de 1 botón y micrófono",
   "conector": "Auxiliar",
   "peso": "12.7 g"
  },
  "incluye": "Audífonos\nAlmohadillas de 3 tamaños (S, M, L)\nTarjeta de advertencias\nTarjeta de garantía",
  "faq": [
   {
    "pregunta": "¿Sirven para mi celular?",
    "respuesta": "Se conectan por la entrada auxiliar de audio. Si tu celular no tiene esa entrada, necesitás un adaptador."
   },
   {
    "pregunta": "¿Tienen micrófono?",
    "respuesta": "Sí, el control de un botón trae micrófono para hacer y contestar llamadas."
   }
  ],
  "meta_descripcion": "JBL Tune 110: audífonos de cable con sonido Pure Bass, micrófono y cable plano antienredos. Garantía de 12 meses y pago contra entrega.",
  "orden": 180
 },
 {
  "slug": "jbl-headphone-bt-tune-520",
  "nombre": "JBL Tune 520BT",
  "resumen": "Inalámbricos con hasta 57 horas de batería, carga rápida y conexión a 2 equipos",
  "descripcion": "Los JBL Tune 520BT son audífonos inalámbricos sobre la oreja con el sonido Pure Bass de JBL. Te duran hasta 57 horas, así que los cargás pocas veces a la semana.\n\nSi se te olvida cargarlos, 5 minutos te dan 3 horas de música. Se conectan a dos equipos a la vez (por ejemplo, celular y computadora) y tienen micrófono para llamadas.\n\nSon livianos (157 g), se doblan para guardarlos y con la app JBL Headphones podés ajustar el sonido a tu gusto.",
  "caracteristicas": {
   "tipo": "Inalámbricos on-ear (sobre la oreja), plegables",
   "autonomia": "Hasta 57 horas; 5 min de carga = 3 horas",
   "conexion": "Bluetooth 5.3 multipunto, micrófono integrado",
   "conector": "USB-C (carga)",
   "peso": "157 g"
  },
  "incluye": "Audífonos\nCable de carga USB-C\nGuía de inicio rápido\nDocumento de garantía y advertencias",
  "faq": [
   {
    "pregunta": "¿Cuánto dura la batería?",
    "respuesta": "Hasta 57 horas de música. Una carga completa tarda unas 2 horas y con 5 minutos tenés 3 horas de uso."
   },
   {
    "pregunta": "¿Sirven con iPhone?",
    "respuesta": "Sí, se conectan por Bluetooth con iPhone y con Android, y pueden estar conectados a dos equipos a la vez."
   }
  ],
  "meta_descripcion": "JBL Tune 520BT inalámbricos: hasta 57 horas de batería, carga rápida, multipunto y plegables. Garantía de 12 meses y pago contra entrega.",
  "orden": 181
 },
 {
  "slug": "jbl-tune-720-bt-wireless-over-ear-headphones",
  "nombre": "JBL Tune 720BT",
  "resumen": "Over-ear inalámbricos con hasta 76 horas de batería y cable de audio incluido",
  "descripcion": "Los JBL Tune 720BT cubren toda la oreja y tienen el sonido Pure Bass de JBL con bocinas de 40 mm. Su batería te dura hasta 76 horas, ideal si los usás todo el día.\n\nSe conectan a dos equipos a la vez y tienen micrófono para llamadas. Si se te acaba la batería, traen un cable de audio desmontable para seguir escuchando.\n\nSe doblan para guardarlos y con la app JBL Headphones ajustás el sonido a tu gusto.",
  "caracteristicas": {
   "tipo": "Inalámbricos over-ear (sobre toda la oreja), plegables",
   "autonomia": "Hasta 76 horas; con carga rápida",
   "resistencia": "Resistentes al agua (sin clasificación IP publicada)",
   "conexion": "Bluetooth 5.3 multipunto; cable de audio desmontable",
   "conector": "USB-C (carga)",
   "peso": "220 g"
  },
  "incluye": "Audífonos\nCable de carga USB-C\nCable de audio desmontable\nGarantía y advertencias\nGuía de inicio rápido",
  "faq": [
   {
    "pregunta": "¿Cuánto dura la batería?",
    "respuesta": "Hasta 76 horas de música. Una carga completa tarda unas 2 horas."
   },
   {
    "pregunta": "¿Se pueden usar con cable?",
    "respuesta": "Sí, traen un cable de audio desmontable en la caja."
   },
   {
    "pregunta": "¿Tienen cancelación de ruido?",
    "respuesta": "No. JBL no los anuncia con cancelación activa de ruido; su fuerte es la batería larga y el sonido Pure Bass."
   }
  ],
  "meta_descripcion": "JBL Tune 720BT over-ear inalámbricos: hasta 76 horas de batería, multipunto, plegables y cable de audio. Garantía de 12 meses y pago contra entrega.",
  "orden": 183
 },
 {
  "slug": "jbl-go4-speaker",
  "nombre": "JBL Go 4",
  "resumen": "Bocina de bolsillo resistente al agua (IP67) con correa y sonido JBL",
  "descripcion": "La JBL Go 4 cabe en la mano y suena fuerte para su tamaño. Su correa integrada te deja colgarla de la mochila o llevarla a donde vayás.\n\nAguanta agua y polvo (IP67), así que la podés llevar a la piscina o a la playa. Te dura hasta 7 horas y con Playtime Boost le sumás hasta 2 horas más.\n\nPodés juntar dos Go 4 para sonido estéreo con Auracast y controlarla desde la app JBL Portable.",
  "caracteristicas": {
   "potencia": "4.2 W",
   "autonomia": "Hasta 7 horas + 2 horas con Playtime Boost",
   "resistencia": "IP67 (agua y polvo)",
   "conexion": "Bluetooth 5.3, multipunto y Auracast",
   "peso": "190 g"
  },
  "incluye": "Bocina JBL Go 4\nCable USB-C\nGuía de inicio rápido\nTarjeta de garantía y hoja de seguridad",
  "faq": [
   {
    "pregunta": "¿Es resistente al agua?",
    "respuesta": "Sí, tiene certificación IP67: resiste agua y polvo."
   },
   {
    "pregunta": "¿Puedo conectar dos bocinas?",
    "respuesta": "Sí, con Auracast juntás dos Go 4 para sonido estéreo o varias bocinas JBL compatibles."
   },
   {
    "pregunta": "¿Cuánto tarda en cargar?",
    "respuesta": "Unas 3 horas. Trae su cable USB-C en la caja."
   }
  ],
  "meta_descripcion": "JBL Go 4 roja: bocina Bluetooth portátil IP67, hasta 7 h + 2 h con Playtime Boost y Auracast. Garantía de 12 meses y pago contra entrega.",
  "orden": 184
 },
 {
  "slug": "jbl-speaker-bt-grip",
  "nombre": "JBL Grip",
  "resumen": "Bocina de 16 W a prueba de agua, polvo y caídas, con luz ambiental",
  "descripcion": "La JBL Grip cabe en una mano y suena con el JBL Pro Sound: 16 W que se ajustan solos a tu música con AI Sound Boost.\n\nEs a prueba de agua, polvo (IP68) y caídas, así que la podés llevar a la playa o al río sin miedo. Te dura hasta 12 horas y con Playtime Boost le sumás 2 horas más.\n\nAtrás tiene una luz ambiental con varios colores, y con Auracast la juntás con otra Grip para sonido estéreo.",
  "caracteristicas": {
   "potencia": "16 W",
   "autonomia": "Hasta 12 horas + 2 horas con Playtime Boost",
   "resistencia": "IP68 (agua y polvo) y a prueba de caídas",
   "conexion": "Bluetooth 5.4 y Auracast",
   "peso": "385 g"
  },
  "incluye": "Bocina JBL Grip\nGuía de inicio rápido\nTarjeta de garantía y hoja de seguridad",
  "faq": [
   {
    "pregunta": "¿Es resistente al agua?",
    "respuesta": "Sí, tiene certificación IP68 contra agua y polvo, y JBL la anuncia a prueba de caídas."
   },
   {
    "pregunta": "¿Puedo conectar dos bocinas?",
    "respuesta": "Sí, con Auracast juntás dos Grip para sonido estéreo."
   },
   {
    "pregunta": "¿Cuánto tarda en cargar?",
    "respuesta": "Unas 3 horas para la carga completa."
   }
  ],
  "meta_descripcion": "JBL Grip rosada: bocina Bluetooth de 16 W, IP68, a prueba de caídas, hasta 14 h y luz ambiental. Garantía de 12 meses y pago contra entrega.",
  "orden": 185
 },
 {
  "slug": "anker-audifonos-bluetooth-h30i",
  "nombre": "soundcore H30i de Anker",
  "resumen": "Inalámbricos livianos con 70 horas de batería y carga rápida de 5 minutos",
  "descripcion": "Los soundcore H30i de Anker son audífonos inalámbricos sobre la oreja con bocinas de 40 mm y bajos reforzados. Su batería te dura hasta 70 horas con una sola carga.\n\nCon 5 minutos de carga tenés 4 horas de música. Pesan 183 g, tienen almohadillas suaves y se doblan para guardarlos.\n\nSe conectan por Bluetooth 5.3 a dos equipos y también por cable. Con la app soundcore ajustás el ecualizador a tu gusto.",
  "caracteristicas": {
   "tipo": "Inalámbricos on-ear (sobre la oreja), plegables",
   "autonomia": "Hasta 70 horas; 5 min de carga = 4 horas",
   "cancelacion_ruido": "No tiene cancelación activa",
   "conexion": "Bluetooth 5.3 multipunto; también por cable (AUX)",
   "peso": "183 g"
  },
  "faq": [
   {
    "pregunta": "¿Cuánto dura la batería?",
    "respuesta": "Hasta 70 horas con una carga, y 5 minutos de carga rápida te dan 4 horas."
   },
   {
    "pregunta": "¿Tienen cancelación de ruido?",
    "respuesta": "No, este modelo no tiene cancelación activa de ruido."
   },
   {
    "pregunta": "¿Se pueden usar con cable?",
    "respuesta": "Sí, soundcore los anuncia para usar de forma inalámbrica o por cable (AUX)."
   }
  ],
  "meta_descripcion": "soundcore H30i de Anker: audífonos inalámbricos de 183 g, hasta 70 h de batería, carga rápida y multipunto. Garantía de 12 meses y pago contra entrega.",
  "orden": 186
 },
 {
  "slug": "klip-xtreme-tune-x-buds-wireless-touch-26-hrs",
  "nombre": "Klip Xtreme TuneXbuds",
  "resumen": "Audífonos inalámbricos con control táctil, 20 horas con estuche y resistencia IPX4",
  "descripcion": "Los Klip Xtreme TuneXbuds son audífonos inalámbricos pequeños y livianos que se quedan firmes en el oído. Con un toque manejás la música, las llamadas y el asistente de voz.\n\nCada carga te da hasta 6.5 horas, y el estuche los recarga tres veces: unas 20 horas en total. El estuche tiene una luz que te avisa cuánta batería queda.\n\nAguantan sudor y salpicaduras (IPX4), así que los podés usar en el gimnasio o bajo la lluvia.",
  "caracteristicas": {
   "tipo": "Inalámbricos in-ear (TWS) con estuche de carga",
   "autonomia": "Hasta 6.5 horas por carga; 20 horas en total con el estuche",
   "resistencia": "IPX4 (sudor y salpicaduras)",
   "conexion": "Bluetooth 5.3, control táctil, micrófono HD",
   "conector": "USB-C (carga del estuche)",
   "peso": "30.2 g"
  },
  "incluye": "Audífonos\nEstuche de carga\nCable de carga USB-C\nGuía de uso\nHoja con instrucciones de limpieza",
  "faq": [
   {
    "pregunta": "¿Cuánto dura la batería?",
    "respuesta": "Hasta 6.5 horas por carga y unas 20 horas en total con el estuche, según Klip Xtreme."
   },
   {
    "pregunta": "¿Son resistentes al agua?",
    "respuesta": "Resisten sudor y salpicaduras (IPX4). No son para sumergir."
   },
   {
    "pregunta": "¿Sirven con iPhone?",
    "respuesta": "Sí, se conectan por Bluetooth con iPhone y Android y funcionan con Siri y Google."
   }
  ],
  "meta_descripcion": "Klip Xtreme TuneXbuds blancos: inalámbricos con control táctil, 20 h con estuche e IPX4. Garantía de 12 meses y pago contra entrega.",
  "orden": 187
 },
 {
  "slug": "klip-xtreme-zound-buds-wireless-touch-21-hrs",
  "nombre": "Klip Xtreme ZoundBuds",
  "resumen": "Inalámbricos con estuche de carga inalámbrica, 21 horas en total e IPX4",
  "descripcion": "Los Klip Xtreme ZoundBuds son audífonos inalámbricos con un plus: su estuche se carga sin cable si lo ponés sobre una base de carga inalámbrica. También cargan por USB-C.\n\nCada carga te da hasta 7 horas, y con el estuche llegás a 21 horas en total. Con un toque manejás la música, las llamadas y el asistente de voz.\n\nEl micrófono reduce el ruido de fondo para que te escuchen claro, y aguantan sudor y salpicaduras (IPX4).",
  "caracteristicas": {
   "tipo": "Inalámbricos in-ear (TWS) con estuche de carga inalámbrica",
   "autonomia": "Hasta 7 horas por carga; 21 horas en total con el estuche",
   "cancelacion_ruido": "Reducción de ruido en llamadas (ENC); sin cancelación activa (ANC)",
   "resistencia": "IPX4 (sudor y salpicaduras)",
   "conexion": "Bluetooth 5.3, control táctil",
   "conector": "USB-C y carga inalámbrica",
   "peso": "40 g aprox. (1.4 oz)"
  },
  "incluye": "Audífonos\nEstuche de carga\nCable de carga USB-C\nGuía rápida de instalación",
  "faq": [
   {
    "pregunta": "¿Trae base de carga inalámbrica?",
    "respuesta": "No. El estuche es compatible con bases de carga inalámbrica, pero la base no viene incluida. Trae cable USB-C."
   },
   {
    "pregunta": "¿Tienen cancelación de ruido?",
    "respuesta": "Tienen reducción de ruido en el micrófono para llamadas (ENC), no cancelación activa de ruido."
   },
   {
    "pregunta": "¿Son resistentes al agua?",
    "respuesta": "Resisten sudor y salpicaduras (IPX4). No son para sumergir."
   }
  ],
  "meta_descripcion": "Klip Xtreme ZoundBuds negros: inalámbricos con estuche de carga inalámbrica, 21 h en total e IPX4. Garantía de 12 meses y pago contra entrega.",
  "orden": 188
 },
 {
  "slug": "zizo-cargador-de-pared-powervault-30w-doble-puerto-usb-c-y-usb-a",
  "nombre": "ZIZO PowerVault 30W cargador de pared 2 USB-C + USB-A con pantalla",
  "resumen": "Cargador de 30 W con 3 puertos (2 USB-C y 1 USB-A) y pantalla de potencia",
  "descripcion": "El ZIZO PowerVault 30W carga hasta tres equipos a la vez: tiene dos puertos USB-C y uno USB-A, con 30 W en total para cargar rápido tu celular, tablet u otros equipos.\n\nSu pantalla digital te muestra en tiempo real la potencia que está entregando, así sabés que está cargando bien.\n\nEs compacto para llevarlo de viaje y tiene protección contra sobrecarga y sobrecalentamiento.",
  "caracteristicas": {
   "potencia": "30 W en total",
   "conector": "2 USB-C + 1 USB-A",
   "compatible_con": "Celulares, tablets y otros equipos que cargan por USB"
  },
  "faq": [
   {
    "pregunta": "¿Puedo cargar varios equipos a la vez?",
    "respuesta": "Sí, hasta tres al mismo tiempo: dos por USB-C y uno por USB-A, con 30 W en total."
   },
   {
    "pregunta": "¿Qué muestra la pantalla?",
    "respuesta": "La potencia que está entregando en tiempo real, para que veás que el equipo está cargando."
   }
  ],
  "meta_descripcion": "Cargador ZIZO PowerVault 30W: 2 USB-C + 1 USB-A, pantalla de potencia y protección contra sobrecarga. Garantía de 12 meses y pago contra entrega.",
  "orden": 191
 }
]$fichas$::jsonb) as d(
  slug text, nombre text, resumen text, descripcion text, caracteristicas jsonb,
  incluye text, faq jsonb, meta_descripcion text, orden int
)
where p.slug = d.slug;

-- 2. Fotos (las que ya estén cargadas no se repiten)
insert into public.imagenes (producto_id, url, alt, orden, principal)
select p.id, i.url, i.alt, i.orden, i.orden = 0
from jsonb_to_recordset($fichas$[
 {
  "slug": "samsung-galaxy-a36",
  "url": "/productos/samsung-galaxy-a36/1.webp",
  "alt": "Samsung Galaxy A36 5G, vista frontal",
  "orden": 0
 },
 {
  "slug": "samsung-galaxy-a36",
  "url": "/productos/samsung-galaxy-a36/2.webp",
  "alt": "Samsung Galaxy A36 5G, reverso",
  "orden": 1
 },
 {
  "slug": "samsung-galaxy-a36",
  "url": "/productos/samsung-galaxy-a36/3.webp",
  "alt": "Samsung Galaxy A36 5G, reverso de lado",
  "orden": 2
 },
 {
  "slug": "samsung-galaxy-a56",
  "url": "/productos/samsung-galaxy-a56/1.webp",
  "alt": "Samsung Galaxy A56 5G, vista frontal",
  "orden": 0
 },
 {
  "slug": "samsung-galaxy-a56",
  "url": "/productos/samsung-galaxy-a56/2.webp",
  "alt": "Samsung Galaxy A56 5G, reverso",
  "orden": 1
 },
 {
  "slug": "samsung-galaxy-a56",
  "url": "/productos/samsung-galaxy-a56/3.webp",
  "alt": "Samsung Galaxy A56 5G, reverso de lado",
  "orden": 2
 },
 {
  "slug": "samsung-galaxy-a57",
  "url": "/productos/samsung-galaxy-a57/1.webp",
  "alt": "Samsung Galaxy A57 5G, vista frontal",
  "orden": 0
 },
 {
  "slug": "samsung-galaxy-a57",
  "url": "/productos/samsung-galaxy-a57/2.webp",
  "alt": "Samsung Galaxy A57 5G, reverso",
  "orden": 1
 },
 {
  "slug": "samsung-galaxy-a57",
  "url": "/productos/samsung-galaxy-a57/3.webp",
  "alt": "Samsung Galaxy A57 5G, reverso de lado",
  "orden": 2
 },
 {
  "slug": "samsung-galaxy-s24-fe",
  "url": "/productos/samsung-galaxy-s24-fe/1.webp",
  "alt": "Samsung Galaxy S24 FE, vista frontal",
  "orden": 0
 },
 {
  "slug": "samsung-galaxy-s24-fe",
  "url": "/productos/samsung-galaxy-s24-fe/2.webp",
  "alt": "Samsung Galaxy S24 FE, reverso",
  "orden": 1
 },
 {
  "slug": "samsung-galaxy-s24-fe",
  "url": "/productos/samsung-galaxy-s24-fe/3.webp",
  "alt": "Samsung Galaxy S24 FE, reverso de lado",
  "orden": 2
 },
 {
  "slug": "samsung-galaxy-s25-ultra",
  "url": "/productos/samsung-galaxy-s25-ultra/1.webp",
  "alt": "Samsung Galaxy S25 Ultra, vista frontal",
  "orden": 0
 },
 {
  "slug": "samsung-galaxy-s25-ultra",
  "url": "/productos/samsung-galaxy-s25-ultra/2.webp",
  "alt": "Samsung Galaxy S25 Ultra, reverso",
  "orden": 1
 },
 {
  "slug": "samsung-galaxy-s25-ultra",
  "url": "/productos/samsung-galaxy-s25-ultra/3.webp",
  "alt": "Samsung Galaxy S25 Ultra, reverso de lado",
  "orden": 2
 },
 {
  "slug": "samsung-galaxy-s26-ultra",
  "url": "/productos/samsung-galaxy-s26-ultra/1.webp",
  "alt": "Samsung Galaxy S26 Ultra, vista frontal",
  "orden": 0
 },
 {
  "slug": "samsung-galaxy-s26-ultra",
  "url": "/productos/samsung-galaxy-s26-ultra/2.webp",
  "alt": "Samsung Galaxy S26 Ultra, reverso",
  "orden": 1
 },
 {
  "slug": "samsung-galaxy-s26-ultra",
  "url": "/productos/samsung-galaxy-s26-ultra/3.webp",
  "alt": "Samsung Galaxy S26 Ultra, reverso de lado",
  "orden": 2
 },
 {
  "slug": "samsung-galaxy-tab-a11",
  "url": "/productos/samsung-galaxy-tab-a11/1.webp",
  "alt": "Samsung Galaxy Tab A11 LTE (4G con chip), vista frontal",
  "orden": 0
 },
 {
  "slug": "samsung-galaxy-tab-a11",
  "url": "/productos/samsung-galaxy-tab-a11/2.webp",
  "alt": "Samsung Galaxy Tab A11 LTE (4G con chip), reverso",
  "orden": 1
 },
 {
  "slug": "samsung-galaxy-tab-a11",
  "url": "/productos/samsung-galaxy-tab-a11/3.webp",
  "alt": "Samsung Galaxy Tab A11 LTE (4G con chip), vista de lado",
  "orden": 2
 },
 {
  "slug": "samsung-galaxy-tab-a11-wifi",
  "url": "/productos/samsung-galaxy-tab-a11-wifi/1.webp",
  "alt": "Samsung Galaxy Tab A11 Wi-Fi, vista frontal",
  "orden": 0
 },
 {
  "slug": "samsung-galaxy-tab-a11-wifi",
  "url": "/productos/samsung-galaxy-tab-a11-wifi/2.webp",
  "alt": "Samsung Galaxy Tab A11 Wi-Fi, reverso",
  "orden": 1
 },
 {
  "slug": "samsung-galaxy-tab-a11-wifi",
  "url": "/productos/samsung-galaxy-tab-a11-wifi/3.webp",
  "alt": "Samsung Galaxy Tab A11 Wi-Fi, vista de lado",
  "orden": 2
 },
 {
  "slug": "samsung-galaxy-tab-s10-fe",
  "url": "/productos/samsung-galaxy-tab-s10-fe/1.webp",
  "alt": "Samsung Galaxy Tab S10 FE, vista frontal con S Pen",
  "orden": 0
 },
 {
  "slug": "samsung-galaxy-tab-s10-fe",
  "url": "/productos/samsung-galaxy-tab-s10-fe/2.webp",
  "alt": "Samsung Galaxy Tab S10 FE, reverso",
  "orden": 1
 },
 {
  "slug": "samsung-galaxy-tab-s10-fe",
  "url": "/productos/samsung-galaxy-tab-s10-fe/3.webp",
  "alt": "Samsung Galaxy Tab S10 FE, vista de lado",
  "orden": 2
 },
 {
  "slug": "samsung-galaxy-buds-3",
  "url": "/productos/samsung-galaxy-buds-3/1.webp",
  "alt": "Samsung Galaxy Buds3, estuche abierto",
  "orden": 0
 },
 {
  "slug": "samsung-galaxy-buds-3",
  "url": "/productos/samsung-galaxy-buds-3/2.webp",
  "alt": "Samsung Galaxy Buds3, audífonos",
  "orden": 1
 },
 {
  "slug": "samsung-galaxy-buds-3",
  "url": "/productos/samsung-galaxy-buds-3/3.webp",
  "alt": "Samsung Galaxy Buds3, estuche cerrado",
  "orden": 2
 },
 {
  "slug": "xiaomi-12",
  "url": "/productos/xiaomi-12/1.webp",
  "alt": "Xiaomi 12, reverso violeta",
  "orden": 0
 },
 {
  "slug": "xiaomi-12",
  "url": "/productos/xiaomi-12/2.webp",
  "alt": "Xiaomi 12, frente y reverso",
  "orden": 1
 },
 {
  "slug": "xiaomi-12",
  "url": "/productos/xiaomi-12/3.webp",
  "alt": "Xiaomi 12, de lado",
  "orden": 2
 },
 {
  "slug": "xiaomi-poco-f6",
  "url": "/productos/xiaomi-poco-f6/1.webp",
  "alt": "Xiaomi POCO F6, colores, frente y reverso",
  "orden": 0
 },
 {
  "slug": "xiaomi-poco-x5",
  "url": "/productos/xiaomi-poco-x5/1.webp",
  "alt": "Xiaomi POCO X5 5G, frente y reverso",
  "orden": 0
 },
 {
  "slug": "xiaomi-poco-x5",
  "url": "/productos/xiaomi-poco-x5/2.webp",
  "alt": "Xiaomi POCO X5 5G, colores disponibles",
  "orden": 1
 },
 {
  "slug": "xiaomi-poco-x8-pro",
  "url": "/productos/xiaomi-poco-x8-pro/1.webp",
  "alt": "Xiaomi POCO X8 Pro, frente y reverso",
  "orden": 0
 },
 {
  "slug": "xiaomi-poco-x8-pro",
  "url": "/productos/xiaomi-poco-x8-pro/2.webp",
  "alt": "Xiaomi POCO X8 Pro, colores, reverso de lado",
  "orden": 1
 },
 {
  "slug": "xiaomi-redmi-17",
  "url": "/productos/xiaomi-redmi-17/1.webp",
  "alt": "Xiaomi Redmi 17, reverso violeta y frente",
  "orden": 0
 },
 {
  "slug": "xiaomi-redmi-17",
  "url": "/productos/xiaomi-redmi-17/2.webp",
  "alt": "Xiaomi Redmi 17, reverso azul y frente",
  "orden": 1
 },
 {
  "slug": "xiaomi-redmi-17",
  "url": "/productos/xiaomi-redmi-17/3.webp",
  "alt": "Xiaomi Redmi 17, todos los colores",
  "orden": 2
 },
 {
  "slug": "xiaomi-redmi-a7-pro",
  "url": "/productos/xiaomi-redmi-a7-pro/1.webp",
  "alt": "Xiaomi Redmi A7 Pro, colores, frente y reverso",
  "orden": 0
 },
 {
  "slug": "xiaomi-redmi-a7-pro",
  "url": "/productos/xiaomi-redmi-a7-pro/2.webp",
  "alt": "Xiaomi Redmi A7 Pro, frente y reverso azul",
  "orden": 1
 },
 {
  "slug": "xiaomi-redmi-note-15-pro",
  "url": "/productos/xiaomi-redmi-note-15-pro/1.webp",
  "alt": "Xiaomi Redmi Note 15 Pro, frente y reverso",
  "orden": 0
 },
 {
  "slug": "xiaomi-redmi-note-15-pro-plus",
  "url": "/productos/xiaomi-redmi-note-15-pro-plus/1.webp",
  "alt": "Xiaomi Redmi Note 15 Pro+ 5G, colores, frente y reverso",
  "orden": 0
 },
 {
  "slug": "xiaomi-redmi-pad-2",
  "url": "/productos/xiaomi-redmi-pad-2/1.webp",
  "alt": "Xiaomi Redmi Pad 2 9.7 4G, frente y reverso plateado",
  "orden": 0
 },
 {
  "slug": "xiaomi-redmi-pad-2",
  "url": "/productos/xiaomi-redmi-pad-2/2.webp",
  "alt": "Xiaomi Redmi Pad 2 9.7 4G, colores, de lado",
  "orden": 1
 },
 {
  "slug": "xiaomi-redmi-pad-se",
  "url": "/productos/xiaomi-redmi-pad-se/1.webp",
  "alt": "Xiaomi Redmi Pad SE 8.7 4G, frente y reverso",
  "orden": 0
 },
 {
  "slug": "infinix-gt-50-pro",
  "url": "/productos/infinix-gt-50-pro/1.webp",
  "alt": "Infinix GT 50 Pro, reverso y frente",
  "orden": 0
 },
 {
  "slug": "infinix-gt-50-pro",
  "url": "/productos/infinix-gt-50-pro/2.webp",
  "alt": "Infinix GT 50 Pro, reverso de lado",
  "orden": 1
 },
 {
  "slug": "infinix-gt-50-pro",
  "url": "/productos/infinix-gt-50-pro/3.webp",
  "alt": "Infinix GT 50 Pro, frente de lado",
  "orden": 2
 },
 {
  "slug": "infinix-hot-60-pro",
  "url": "/productos/infinix-hot-60-pro/1.webp",
  "alt": "Infinix HOT 60 Pro, reverso y frente, azul",
  "orden": 0
 },
 {
  "slug": "infinix-hot-60-pro",
  "url": "/productos/infinix-hot-60-pro/2.webp",
  "alt": "Infinix HOT 60 Pro, reverso y frente, rosado",
  "orden": 1
 },
 {
  "slug": "infinix-hot-60-pro",
  "url": "/productos/infinix-hot-60-pro/3.webp",
  "alt": "Infinix HOT 60 Pro, reverso y frente, naranja",
  "orden": 2
 },
 {
  "slug": "infinix-hot-60-pro-plus",
  "url": "/productos/infinix-hot-60-pro-plus/1.webp",
  "alt": "Infinix HOT 60 Pro+, reverso y frente",
  "orden": 0
 },
 {
  "slug": "infinix-hot-70-pro",
  "url": "/productos/infinix-hot-70-pro/1.webp",
  "alt": "Infinix HOT 70 Pro 5G+, reverso y frente, verde",
  "orden": 0
 },
 {
  "slug": "infinix-hot-70-pro",
  "url": "/productos/infinix-hot-70-pro/2.webp",
  "alt": "Infinix HOT 70 Pro 5G+, reverso y frente, violeta",
  "orden": 1
 },
 {
  "slug": "infinix-hot-70-pro",
  "url": "/productos/infinix-hot-70-pro/3.webp",
  "alt": "Infinix HOT 70 Pro 5G+, reverso y frente, naranja",
  "orden": 2
 },
 {
  "slug": "infinix-note-60",
  "url": "/productos/infinix-note-60/1.webp",
  "alt": "Infinix NOTE 60, reverso y frente, negro",
  "orden": 0
 },
 {
  "slug": "infinix-note-60",
  "url": "/productos/infinix-note-60/2.webp",
  "alt": "Infinix NOTE 60, reverso y frente, rosado",
  "orden": 1
 },
 {
  "slug": "infinix-note-60",
  "url": "/productos/infinix-note-60/3.webp",
  "alt": "Infinix NOTE 60, reverso y frente, titanio",
  "orden": 2
 },
 {
  "slug": "infinix-note-60-pro",
  "url": "/productos/infinix-note-60-pro/1.webp",
  "alt": "Infinix NOTE 60 Pro, reverso y frente, café",
  "orden": 0
 },
 {
  "slug": "infinix-note-60-pro",
  "url": "/productos/infinix-note-60-pro/2.webp",
  "alt": "Infinix NOTE 60 Pro, reverso y frente, naranja",
  "orden": 1
 },
 {
  "slug": "infinix-note-60-pro",
  "url": "/productos/infinix-note-60-pro/3.webp",
  "alt": "Infinix NOTE 60 Pro, reverso y frente, azul",
  "orden": 2
 },
 {
  "slug": "infinix-note-edge",
  "url": "/productos/infinix-note-edge/1.webp",
  "alt": "Infinix NOTE Edge, reverso y frente, azul",
  "orden": 0
 },
 {
  "slug": "infinix-note-edge",
  "url": "/productos/infinix-note-edge/2.webp",
  "alt": "Infinix NOTE Edge, reverso y frente, titanio",
  "orden": 1
 },
 {
  "slug": "infinix-note-edge",
  "url": "/productos/infinix-note-edge/3.webp",
  "alt": "Infinix NOTE Edge, reverso y frente, negro",
  "orden": 2
 },
 {
  "slug": "infinix-smart-10-ap1",
  "url": "/productos/infinix-smart-10-ap1/1.webp",
  "alt": "Infinix Smart 10, reverso y frente, azul",
  "orden": 0
 },
 {
  "slug": "infinix-smart-10-ap1",
  "url": "/productos/infinix-smart-10-ap1/2.webp",
  "alt": "Infinix Smart 10, reverso y frente, dorado",
  "orden": 1
 },
 {
  "slug": "infinix-smart-10-ap1",
  "url": "/productos/infinix-smart-10-ap1/3.webp",
  "alt": "Infinix Smart 10, reverso y frente, negro",
  "orden": 2
 },
 {
  "slug": "infinix-smart-10-az1",
  "url": "/productos/infinix-smart-10-az1/1.webp",
  "alt": "Infinix Smart 10, reverso y frente, negro",
  "orden": 0
 },
 {
  "slug": "infinix-smart-10-az1",
  "url": "/productos/infinix-smart-10-az1/2.webp",
  "alt": "Infinix Smart 10, reverso y frente, dorado",
  "orden": 1
 },
 {
  "slug": "infinix-smart-10-az1",
  "url": "/productos/infinix-smart-10-az1/3.webp",
  "alt": "Infinix Smart 10, reverso y frente, azul",
  "orden": 2
 },
 {
  "slug": "infinix-xpad-30e",
  "url": "/productos/infinix-xpad-30e/1.webp",
  "alt": "Infinix XPAD 30E, reverso y frente",
  "orden": 0
 },
 {
  "slug": "infinix-xpad-30e",
  "url": "/productos/infinix-xpad-30e/2.webp",
  "alt": "Infinix XPAD 30E, reverso de lado",
  "orden": 1
 },
 {
  "slug": "infinix-xpad-30e",
  "url": "/productos/infinix-xpad-30e/3.webp",
  "alt": "Infinix XPAD 30E, frente de lado",
  "orden": 2
 },
 {
  "slug": "itel-a100c",
  "url": "/productos/itel-a100c/1.webp",
  "alt": "itel A100C, vista frontal y reverso dorado",
  "orden": 0
 },
 {
  "slug": "itel-a100c",
  "url": "/productos/itel-a100c/2.webp",
  "alt": "itel A100C, vista frontal y reverso negro",
  "orden": 1
 },
 {
  "slug": "itel-a100c",
  "url": "/productos/itel-a100c/3.webp",
  "alt": "itel A100C, vista frontal y reverso azul",
  "orden": 2
 },
 {
  "slug": "itel-a100cs",
  "url": "/productos/itel-a100cs/1.webp",
  "alt": "itel A100Cs, vista frontal y reverso verde",
  "orden": 0
 },
 {
  "slug": "itel-a100cs",
  "url": "/productos/itel-a100cs/2.webp",
  "alt": "itel A100Cs, vista frontal y reverso blanco",
  "orden": 1
 },
 {
  "slug": "itel-a100cs",
  "url": "/productos/itel-a100cs/3.webp",
  "alt": "itel A100Cs, vista frontal y reverso negro",
  "orden": 2
 },
 {
  "slug": "itel-a200",
  "url": "/productos/itel-a200/1.webp",
  "alt": "itel A200, vista frontal y reverso azul",
  "orden": 0
 },
 {
  "slug": "itel-a200",
  "url": "/productos/itel-a200/2.webp",
  "alt": "itel A200, vista frontal y reverso naranja",
  "orden": 1
 },
 {
  "slug": "itel-a200",
  "url": "/productos/itel-a200/3.webp",
  "alt": "itel A200, vista frontal y reverso titanio",
  "orden": 2
 },
 {
  "slug": "itel-a50",
  "url": "/productos/itel-a50/1.webp",
  "alt": "itel A50, vista frontal y reverso negro",
  "orden": 0
 },
 {
  "slug": "apple-iphone-13",
  "url": "/productos/apple-iphone-13/1.webp",
  "alt": "Apple iPhone 13, frente y reverso",
  "orden": 0
 },
 {
  "slug": "apple-iphone-13",
  "url": "/productos/apple-iphone-13/2.webp",
  "alt": "Apple iPhone 13, reverso y lateral",
  "orden": 1
 },
 {
  "slug": "apple-iphone-13",
  "url": "/productos/apple-iphone-13/3.webp",
  "alt": "Apple iPhone 13, reverso y frente",
  "orden": 2
 },
 {
  "slug": "apple-iphone-14",
  "url": "/productos/apple-iphone-14/1.webp",
  "alt": "Apple iPhone 14, frente y reverso",
  "orden": 0
 },
 {
  "slug": "apple-iphone-14",
  "url": "/productos/apple-iphone-14/2.webp",
  "alt": "Apple iPhone 14, reverso y lateral",
  "orden": 1
 },
 {
  "slug": "apple-iphone-15-plus",
  "url": "/productos/apple-iphone-15-plus/1.webp",
  "alt": "Apple iPhone 15 Plus, frente y reverso",
  "orden": 0
 },
 {
  "slug": "apple-iphone-15-plus",
  "url": "/productos/apple-iphone-15-plus/2.webp",
  "alt": "Apple iPhone 15 Plus, reverso y lateral",
  "orden": 1
 },
 {
  "slug": "apple-iphone-15-pro-max",
  "url": "/productos/apple-iphone-15-pro-max/1.webp",
  "alt": "Apple iPhone 15 Pro Max, frente y reverso",
  "orden": 0
 },
 {
  "slug": "apple-iphone-15-pro-max",
  "url": "/productos/apple-iphone-15-pro-max/2.webp",
  "alt": "Apple iPhone 15 Pro Max, reverso y lateral",
  "orden": 1
 },
 {
  "slug": "apple-iphone-15-pro-max",
  "url": "/productos/apple-iphone-15-pro-max/3.webp",
  "alt": "Apple iPhone 15 Pro Max, frente y reverso en azul",
  "orden": 2
 },
 {
  "slug": "apple-iphone-17-pro-max",
  "url": "/productos/apple-iphone-17-pro-max/1.webp",
  "alt": "Apple iPhone 17 Pro Max, frente y reverso",
  "orden": 0
 },
 {
  "slug": "apple-iphone-17-pro-max",
  "url": "/productos/apple-iphone-17-pro-max/2.webp",
  "alt": "Apple iPhone 17 Pro Max, reverso y lateral",
  "orden": 1
 },
 {
  "slug": "apple-iphone-17-pro-max",
  "url": "/productos/apple-iphone-17-pro-max/3.webp",
  "alt": "Apple iPhone 17 Pro Max, frente y reverso en plateado",
  "orden": 2
 },
 {
  "slug": "motorola-g15",
  "url": "/productos/motorola-g15/1.webp",
  "alt": "Motorola Moto G15, vista frontal",
  "orden": 0
 },
 {
  "slug": "motorola-g15",
  "url": "/productos/motorola-g15/2.webp",
  "alt": "Motorola Moto G15, reverso",
  "orden": 1
 },
 {
  "slug": "motorola-g15",
  "url": "/productos/motorola-g15/3.webp",
  "alt": "Motorola Moto G15, lateral",
  "orden": 2
 },
 {
  "slug": "motorola-g17",
  "url": "/productos/motorola-g17/1.webp",
  "alt": "Motorola Moto G17, vista frontal",
  "orden": 0
 },
 {
  "slug": "motorola-g17",
  "url": "/productos/motorola-g17/2.webp",
  "alt": "Motorola Moto G17, reverso",
  "orden": 1
 },
 {
  "slug": "motorola-g17",
  "url": "/productos/motorola-g17/3.webp",
  "alt": "Motorola Moto G17, lateral",
  "orden": 2
 },
 {
  "slug": "realme-14",
  "url": "/productos/realme-14/1.webp",
  "alt": "realme 14 5G, frente y reverso en plateado",
  "orden": 0
 },
 {
  "slug": "realme-14",
  "url": "/productos/realme-14/2.webp",
  "alt": "realme 14 5G, frente y reverso en titanio",
  "orden": 1
 },
 {
  "slug": "realme-c71",
  "url": "/productos/realme-c71/1.webp",
  "alt": "realme C71, frente y reverso en verde",
  "orden": 0
 },
 {
  "slug": "realme-c71",
  "url": "/productos/realme-c71/2.webp",
  "alt": "realme C71, frente y reverso en blanco",
  "orden": 1
 },
 {
  "slug": "zte-blade-a75",
  "url": "/productos/zte-blade-a75/1.webp",
  "alt": "ZTE Blade A75, frente y reverso",
  "orden": 0
 },
 {
  "slug": "zte-nubia-neo-3",
  "url": "/productos/zte-nubia-neo-3/1.webp",
  "alt": "ZTE nubia Neo 3 5G, frente y reverso",
  "orden": 0
 },
 {
  "slug": "zte-nubia-neo-3-gt",
  "url": "/productos/zte-nubia-neo-3-gt/1.webp",
  "alt": "ZTE nubia Neo 3 GT 5G, frente y reverso",
  "orden": 0
 },
 {
  "slug": "zte-nubia-v80-max",
  "url": "/productos/zte-nubia-v80-max/1.webp",
  "alt": "ZTE nubia V80 Max, frente y reverso",
  "orden": 0
 },
 {
  "slug": "xiaomi-redmi-buds-8-active",
  "url": "/productos/xiaomi-redmi-buds-8-active/1.webp",
  "alt": "Xiaomi Redmi Buds 8 Active, blanco, estuche abierto",
  "orden": 0
 },
 {
  "slug": "xiaomi-redmi-buds-8-active",
  "url": "/productos/xiaomi-redmi-buds-8-active/2.webp",
  "alt": "Xiaomi Redmi Buds 8 Active, blanco, estuche cerrado",
  "orden": 1
 },
 {
  "slug": "xiaomi-redmi-buds-8-active",
  "url": "/productos/xiaomi-redmi-buds-8-active/3.webp",
  "alt": "Xiaomi Redmi Buds 8 Active, azul, estuche abierto",
  "orden": 2
 },
 {
  "slug": "xiaomi-type-c-earphones",
  "url": "/productos/xiaomi-type-c-earphones/1.webp",
  "alt": "Audífonos Xiaomi Type-C (con cable), blanco, vista frontal",
  "orden": 0
 },
 {
  "slug": "xiaomi-type-c-earphones",
  "url": "/productos/xiaomi-type-c-earphones/2.webp",
  "alt": "Audífonos Xiaomi Type-C (con cable), negro, vista frontal",
  "orden": 1
 },
 {
  "slug": "xiaomi-type-c-earphones",
  "url": "/productos/xiaomi-type-c-earphones/3.webp",
  "alt": "Audífonos Xiaomi Type-C (con cable), negro y blanco",
  "orden": 2
 },
 {
  "slug": "xiaomi-3a-usb-a-to-usb-c-cable-1m",
  "url": "/productos/xiaomi-3a-usb-a-to-usb-c-cable-1m/1.webp",
  "alt": "Cable Xiaomi 3A USB-A a USB-C (1 m), vista frontal",
  "orden": 0
 },
 {
  "slug": "xiaomi-45w-nano-turbo-charging-power-adapter-2-port",
  "url": "/productos/xiaomi-45w-nano-turbo-charging-power-adapter-2-port/1.webp",
  "alt": "Cargador Xiaomi 45W Nano de 2 puertos USB-C, vista frontal",
  "orden": 0
 },
 {
  "slug": "xiaomi-redmi-watch-5-lite",
  "url": "/productos/xiaomi-redmi-watch-5-lite/1.webp",
  "alt": "Xiaomi Redmi Watch 5 Lite, negro, vista frontal",
  "orden": 0
 },
 {
  "slug": "xiaomi-redmi-watch-5-lite",
  "url": "/productos/xiaomi-redmi-watch-5-lite/2.webp",
  "alt": "Xiaomi Redmi Watch 5 Lite, negro, de lado",
  "orden": 1
 },
 {
  "slug": "xiaomi-redmi-watch-5-lite",
  "url": "/productos/xiaomi-redmi-watch-5-lite/3.webp",
  "alt": "Xiaomi Redmi Watch 5 Lite, negro, otro ángulo",
  "orden": 2
 },
 {
  "slug": "xiaomi-redmi-watch-6-active",
  "url": "/productos/xiaomi-redmi-watch-6-active/1.webp",
  "alt": "Xiaomi Redmi Watch 6 Active, naranja, vista frontal",
  "orden": 0
 },
 {
  "slug": "xiaomi-redmi-watch-6-active",
  "url": "/productos/xiaomi-redmi-watch-6-active/2.webp",
  "alt": "Xiaomi Redmi Watch 6 Active, negro, de lado",
  "orden": 1
 },
 {
  "slug": "xiaomi-redmi-watch-6-active",
  "url": "/productos/xiaomi-redmi-watch-6-active/3.webp",
  "alt": "Xiaomi Redmi Watch 6 Active, negro, vista frontal",
  "orden": 2
 },
 {
  "slug": "xiaomi-redmi-watch-6-lite",
  "url": "/productos/xiaomi-redmi-watch-6-lite/1.webp",
  "alt": "Xiaomi Redmi Watch 6 Lite, gris, vista frontal",
  "orden": 0
 },
 {
  "slug": "xiaomi-redmi-watch-6-lite",
  "url": "/productos/xiaomi-redmi-watch-6-lite/2.webp",
  "alt": "Xiaomi Redmi Watch 6 Lite, negro, vista frontal",
  "orden": 1
 },
 {
  "slug": "xiaomi-redmi-watch-6-lite",
  "url": "/productos/xiaomi-redmi-watch-6-lite/3.webp",
  "alt": "Xiaomi Redmi Watch 6 Lite, negro y gris, de lado",
  "orden": 2
 },
 {
  "slug": "xiaomi-smart-band-11-active",
  "url": "/productos/xiaomi-smart-band-11-active/1.webp",
  "alt": "Xiaomi Smart Band 11 Active, rosado, vista frontal",
  "orden": 0
 },
 {
  "slug": "xiaomi-smart-band-11-active",
  "url": "/productos/xiaomi-smart-band-11-active/2.webp",
  "alt": "Xiaomi Smart Band 11 Active, negro, vista frontal",
  "orden": 1
 },
 {
  "slug": "xiaomi-smart-band-11-active",
  "url": "/productos/xiaomi-smart-band-11-active/3.webp",
  "alt": "Xiaomi Smart Band 11 Active, gris, vista frontal",
  "orden": 2
 },
 {
  "slug": "itel-smart-watch-isw-o20b",
  "url": "/productos/itel-smart-watch-isw-o20b/1.webp",
  "alt": "itel Smart Watch Fit O20, vista frontal",
  "orden": 0
 },
 {
  "slug": "itel-smart-watch-isw-o23p-pink-mauve",
  "url": "/productos/itel-smart-watch-isw-o23p-pink-mauve/1.webp",
  "alt": "itel Smart Watch Fit O23 Plus Pink Mauve, vista frontal",
  "orden": 0
 },
 {
  "slug": "itel-vista-tablet-11",
  "url": "/productos/itel-vista-tablet-11/1.webp",
  "alt": "itel VistaTab 11, vista frontal y reverso gris",
  "orden": 0
 },
 {
  "slug": "itel-vista-tablet-11",
  "url": "/productos/itel-vista-tablet-11/2.webp",
  "alt": "itel VistaTab 11, vista frontal y reverso azul",
  "orden": 1
 },
 {
  "slug": "itel-vista-tablet-go",
  "url": "/productos/itel-vista-tablet-go/1.webp",
  "alt": "itel VistaTab Go, vista frontal y reverso gris",
  "orden": 0
 },
 {
  "slug": "apple-cable-usb-a-to-lightning-1m",
  "url": "/productos/apple-cable-usb-a-to-lightning-1m/1.webp",
  "alt": "Cable Apple de Lightning a USB (1 m), cable enrollado",
  "orden": 0
 },
 {
  "slug": "apple-cable-usb-a-to-lightning-1m",
  "url": "/productos/apple-cable-usb-a-to-lightning-1m/2.webp",
  "alt": "Cable Apple de Lightning a USB (1 m), conector Lightning",
  "orden": 1
 },
 {
  "slug": "apple-cable-usb-a-to-lightning-1m",
  "url": "/productos/apple-cable-usb-a-to-lightning-1m/3.webp",
  "alt": "Cable Apple de Lightning a USB (1 m), conector USB-A",
  "orden": 2
 },
 {
  "slug": "honor-choice-earbuds-clip",
  "url": "/productos/honor-choice-earbuds-clip/1.webp",
  "alt": "HONOR CHOICE Earbuds Clip, estuche abierto de frente",
  "orden": 0
 },
 {
  "slug": "honor-choice-earbuds-clip",
  "url": "/productos/honor-choice-earbuds-clip/2.webp",
  "alt": "HONOR CHOICE Earbuds Clip, estuche cerrado",
  "orden": 1
 },
 {
  "slug": "honor-choice-earbuds-clip",
  "url": "/productos/honor-choice-earbuds-clip/3.webp",
  "alt": "HONOR CHOICE Earbuds Clip, estuche abierto con audífono",
  "orden": 2
 },
 {
  "slug": "honor-choice-earbuds-s8",
  "url": "/productos/honor-choice-earbuds-s8/1.webp",
  "alt": "HONOR CHOICE Earbuds S8, estuche abierto",
  "orden": 0
 },
 {
  "slug": "honor-choice-earbuds-s8",
  "url": "/productos/honor-choice-earbuds-s8/2.webp",
  "alt": "HONOR CHOICE Earbuds S8, estuche y audífonos",
  "orden": 1
 },
 {
  "slug": "honor-choice-earbuds-s8",
  "url": "/productos/honor-choice-earbuds-s8/3.webp",
  "alt": "HONOR CHOICE Earbuds S8, estuche abierto de frente",
  "orden": 2
 },
 {
  "slug": "honor-choice-earbuds-x7-lite",
  "url": "/productos/honor-choice-earbuds-x7-lite/1.webp",
  "alt": "HONOR CHOICE Earbuds X7 Lite, estuche abierto",
  "orden": 0
 },
 {
  "slug": "honor-choice-earbuds-x7-lite",
  "url": "/productos/honor-choice-earbuds-x7-lite/2.webp",
  "alt": "HONOR CHOICE Earbuds X7 Lite, estuche cerrado",
  "orden": 1
 },
 {
  "slug": "honor-choice-earbuds-x7-lite",
  "url": "/productos/honor-choice-earbuds-x7-lite/3.webp",
  "alt": "HONOR CHOICE Earbuds X7 Lite, audífonos",
  "orden": 2
 },
 {
  "slug": "honor-choice-earbuds-x7e-active",
  "url": "/productos/honor-choice-earbuds-x7e-active/1.webp",
  "alt": "HONOR CHOICE Earbuds X7e Active, estuche abierto",
  "orden": 0
 },
 {
  "slug": "honor-choice-earbuds-x7e-active",
  "url": "/productos/honor-choice-earbuds-x7e-active/2.webp",
  "alt": "HONOR CHOICE Earbuds X7e Active, estuche cerrado",
  "orden": 1
 },
 {
  "slug": "honor-choice-earbuds-x7e-active",
  "url": "/productos/honor-choice-earbuds-x7e-active/3.webp",
  "alt": "HONOR CHOICE Earbuds X7e Active, audífono de frente",
  "orden": 2
 },
 {
  "slug": "honor-choice-musicbox",
  "url": "/productos/honor-choice-musicbox/1.webp",
  "alt": "HONOR CHOICE Portable Bluetooth Speaker (MusicBox M1), vista frontal",
  "orden": 0
 },
 {
  "slug": "honor-choice-musicbox",
  "url": "/productos/honor-choice-musicbox/2.webp",
  "alt": "HONOR CHOICE Portable Bluetooth Speaker (MusicBox M1), reverso en ángulo",
  "orden": 1
 },
 {
  "slug": "honor-choice-musicbox",
  "url": "/productos/honor-choice-musicbox/3.webp",
  "alt": "HONOR CHOICE Portable Bluetooth Speaker (MusicBox M1), lateral con botones",
  "orden": 2
 },
 {
  "slug": "honor-choice-speaker-mini-bluetooth",
  "url": "/productos/honor-choice-speaker-mini-bluetooth/1.webp",
  "alt": "HONOR CHOICE Bluetooth Speaker mini, vista frontal",
  "orden": 0
 },
 {
  "slug": "honor-choice-speaker-mini-bluetooth",
  "url": "/productos/honor-choice-speaker-mini-bluetooth/2.webp",
  "alt": "HONOR CHOICE Bluetooth Speaker mini, reverso con puerto USB-C",
  "orden": 1
 },
 {
  "slug": "honor-choice-speaker-mini-bluetooth",
  "url": "/productos/honor-choice-speaker-mini-bluetooth/3.webp",
  "alt": "HONOR CHOICE Bluetooth Speaker mini, vista superior",
  "orden": 2
 },
 {
  "slug": "honor-choice-speaker-pro-bluetooth",
  "url": "/productos/honor-choice-speaker-pro-bluetooth/1.webp",
  "alt": "HONOR CHOICE Portable Bluetooth Speaker Pro, vista frontal",
  "orden": 0
 },
 {
  "slug": "honor-choice-speaker-pro-bluetooth",
  "url": "/productos/honor-choice-speaker-pro-bluetooth/2.webp",
  "alt": "HONOR CHOICE Portable Bluetooth Speaker Pro, reverso con correa",
  "orden": 1
 },
 {
  "slug": "honor-choice-speaker-pro-bluetooth",
  "url": "/productos/honor-choice-speaker-pro-bluetooth/3.webp",
  "alt": "HONOR CHOICE Portable Bluetooth Speaker Pro, vista en ángulo",
  "orden": 2
 },
 {
  "slug": "honor-choice-infowear-watch-2-pro",
  "url": "/productos/honor-choice-infowear-watch-2-pro/1.webp",
  "alt": "HONOR CHOICE Watch 2 Pro, vista frontal",
  "orden": 0
 },
 {
  "slug": "honor-choice-infowear-watch-2-pro",
  "url": "/productos/honor-choice-infowear-watch-2-pro/2.webp",
  "alt": "HONOR CHOICE Watch 2 Pro, reverso",
  "orden": 1
 },
 {
  "slug": "honor-choice-infowear-watch-2-pro",
  "url": "/productos/honor-choice-infowear-watch-2-pro/3.webp",
  "alt": "HONOR CHOICE Watch 2 Pro, vista en ángulo",
  "orden": 2
 },
 {
  "slug": "honor-choice-infowear-watch-2i",
  "url": "/productos/honor-choice-infowear-watch-2i/1.webp",
  "alt": "HONOR CHOICE Watch 2i, vista frontal",
  "orden": 0
 },
 {
  "slug": "honor-choice-infowear-watch-2i",
  "url": "/productos/honor-choice-infowear-watch-2i/2.webp",
  "alt": "HONOR CHOICE Watch 2i, reverso",
  "orden": 1
 },
 {
  "slug": "honor-choice-infowear-watch-2i",
  "url": "/productos/honor-choice-infowear-watch-2i/3.webp",
  "alt": "HONOR CHOICE Watch 2i, vista en ángulo",
  "orden": 2
 },
 {
  "slug": "honor-choice-watch-2-epic",
  "url": "/productos/honor-choice-watch-2-epic/1.webp",
  "alt": "HONOR CHOICE Watch 2 Epic, vista frontal",
  "orden": 0
 },
 {
  "slug": "honor-choice-watch-2-epic",
  "url": "/productos/honor-choice-watch-2-epic/2.webp",
  "alt": "HONOR CHOICE Watch 2 Epic, reverso",
  "orden": 1
 },
 {
  "slug": "honor-choice-watch-2-epic",
  "url": "/productos/honor-choice-watch-2-epic/3.webp",
  "alt": "HONOR CHOICE Watch 2 Epic, vista lateral en ángulo",
  "orden": 2
 },
 {
  "slug": "huawei-freebuds-se2",
  "url": "/productos/huawei-freebuds-se2/1.webp",
  "alt": "HUAWEI FreeBuds SE 2, estuche abierto de frente",
  "orden": 0
 },
 {
  "slug": "huawei-freebuds-se2",
  "url": "/productos/huawei-freebuds-se2/2.webp",
  "alt": "HUAWEI FreeBuds SE 2, estuche cerrado",
  "orden": 1
 },
 {
  "slug": "huawei-freebuds-se2",
  "url": "/productos/huawei-freebuds-se2/3.webp",
  "alt": "HUAWEI FreeBuds SE 2, estuche con audífonos",
  "orden": 2
 },
 {
  "slug": "huawei-band-10",
  "url": "/productos/huawei-band-10/1.webp",
  "alt": "HUAWEI Band 10, vista frontal",
  "orden": 0
 },
 {
  "slug": "huawei-band-10",
  "url": "/productos/huawei-band-10/2.webp",
  "alt": "HUAWEI Band 10, reverso",
  "orden": 1
 },
 {
  "slug": "huawei-band-10",
  "url": "/productos/huawei-band-10/3.webp",
  "alt": "HUAWEI Band 10, vista en ángulo",
  "orden": 2
 },
 {
  "slug": "jbl-earphone-tune-110",
  "url": "/productos/jbl-earphone-tune-110/1.webp",
  "alt": "JBL Tune 110, audífonos con control",
  "orden": 0
 },
 {
  "slug": "jbl-earphone-tune-110",
  "url": "/productos/jbl-earphone-tune-110/2.webp",
  "alt": "JBL Tune 110, detalle del audífono",
  "orden": 1
 },
 {
  "slug": "jbl-earphone-tune-110",
  "url": "/productos/jbl-earphone-tune-110/3.webp",
  "alt": "JBL Tune 110, color blanco",
  "orden": 2
 },
 {
  "slug": "jbl-headphone-bt-tune-520",
  "url": "/productos/jbl-headphone-bt-tune-520/1.webp",
  "alt": "JBL Tune 520BT, vista frontal",
  "orden": 0
 },
 {
  "slug": "jbl-headphone-bt-tune-520",
  "url": "/productos/jbl-headphone-bt-tune-520/2.webp",
  "alt": "JBL Tune 520BT, vista lateral",
  "orden": 1
 },
 {
  "slug": "jbl-headphone-bt-tune-520",
  "url": "/productos/jbl-headphone-bt-tune-520/3.webp",
  "alt": "JBL Tune 520BT, plegados",
  "orden": 2
 },
 {
  "slug": "jbl-tune-720-bt-wireless-over-ear-headphones",
  "url": "/productos/jbl-tune-720-bt-wireless-over-ear-headphones/1.webp",
  "alt": "JBL Tune 720BT, vista frontal",
  "orden": 0
 },
 {
  "slug": "jbl-tune-720-bt-wireless-over-ear-headphones",
  "url": "/productos/jbl-tune-720-bt-wireless-over-ear-headphones/2.webp",
  "alt": "JBL Tune 720BT, vista lateral",
  "orden": 1
 },
 {
  "slug": "jbl-tune-720-bt-wireless-over-ear-headphones",
  "url": "/productos/jbl-tune-720-bt-wireless-over-ear-headphones/3.webp",
  "alt": "JBL Tune 720BT, plegados",
  "orden": 2
 },
 {
  "slug": "jbl-go4-speaker",
  "url": "/productos/jbl-go4-speaker/1.webp",
  "alt": "JBL Go 4, vista frontal",
  "orden": 0
 },
 {
  "slug": "jbl-go4-speaker",
  "url": "/productos/jbl-go4-speaker/2.webp",
  "alt": "JBL Go 4, reverso",
  "orden": 1
 },
 {
  "slug": "jbl-go4-speaker",
  "url": "/productos/jbl-go4-speaker/3.webp",
  "alt": "JBL Go 4, vista de lado",
  "orden": 2
 },
 {
  "slug": "jbl-speaker-bt-grip",
  "url": "/productos/jbl-speaker-bt-grip/1.webp",
  "alt": "JBL Grip, vista frontal",
  "orden": 0
 },
 {
  "slug": "jbl-speaker-bt-grip",
  "url": "/productos/jbl-speaker-bt-grip/2.webp",
  "alt": "JBL Grip, reverso",
  "orden": 1
 },
 {
  "slug": "jbl-speaker-bt-grip",
  "url": "/productos/jbl-speaker-bt-grip/3.webp",
  "alt": "JBL Grip, vista superior",
  "orden": 2
 },
 {
  "slug": "anker-audifonos-bluetooth-h30i",
  "url": "/productos/anker-audifonos-bluetooth-h30i/1.webp",
  "alt": "soundcore H30i de Anker, vista de lado",
  "orden": 0
 },
 {
  "slug": "anker-audifonos-bluetooth-h30i",
  "url": "/productos/anker-audifonos-bluetooth-h30i/2.webp",
  "alt": "soundcore H30i de Anker, vista lateral",
  "orden": 1
 },
 {
  "slug": "klip-xtreme-tune-x-buds-wireless-touch-26-hrs",
  "url": "/productos/klip-xtreme-tune-x-buds-wireless-touch-26-hrs/1.webp",
  "alt": "Klip Xtreme TuneXbuds, con estuche abierto",
  "orden": 0
 },
 {
  "slug": "klip-xtreme-zound-buds-wireless-touch-21-hrs",
  "url": "/productos/klip-xtreme-zound-buds-wireless-touch-21-hrs/1.webp",
  "alt": "Klip Xtreme ZoundBuds, con estuche abierto",
  "orden": 0
 },
 {
  "slug": "klip-xtreme-zound-buds-wireless-touch-21-hrs",
  "url": "/productos/klip-xtreme-zound-buds-wireless-touch-21-hrs/2.webp",
  "alt": "Klip Xtreme ZoundBuds, estuche cerrado",
  "orden": 1
 },
 {
  "slug": "klip-xtreme-zound-buds-wireless-touch-21-hrs",
  "url": "/productos/klip-xtreme-zound-buds-wireless-touch-21-hrs/3.webp",
  "alt": "Klip Xtreme ZoundBuds, vista de lado",
  "orden": 2
 },
 {
  "slug": "zizo-cargador-de-pared-powervault-30w-doble-puerto-usb-c-y-usb-a",
  "url": "/productos/zizo-cargador-de-pared-powervault-30w-doble-puerto-usb-c-y-usb-a/1.webp",
  "alt": "ZIZO PowerVault 30W cargador de pared 2 USB-C + USB-A con pantalla, puertos",
  "orden": 0
 },
 {
  "slug": "zizo-cargador-de-pared-powervault-30w-doble-puerto-usb-c-y-usb-a",
  "url": "/productos/zizo-cargador-de-pared-powervault-30w-doble-puerto-usb-c-y-usb-a/2.webp",
  "alt": "ZIZO PowerVault 30W cargador de pared 2 USB-C + USB-A con pantalla, vista de lado",
  "orden": 1
 },
 {
  "slug": "zizo-cargador-de-pared-powervault-30w-doble-puerto-usb-c-y-usb-a",
  "url": "/productos/zizo-cargador-de-pared-powervault-30w-doble-puerto-usb-c-y-usb-a/3.webp",
  "alt": "ZIZO PowerVault 30W cargador de pared 2 USB-C + USB-A con pantalla, otro lado",
  "orden": 2
 }
]$fichas$::jsonb) as i(slug text, url text, alt text, orden int)
join public.productos p on p.slug = i.slug
where not exists (select 1 from public.imagenes x where x.producto_id = p.id and x.url = i.url);

-- 3. Colecciones de la página de inicio
insert into public.coleccion_producto (coleccion_id, producto_id, orden)
select c.id, p.id, p.orden
from jsonb_to_recordset($fichas$[]$fichas$::jsonb) as k(slug text, coleccion text)
join public.productos p on p.slug = k.slug
join public.colecciones c on c.slug = k.coleccion
on conflict do nothing;

-- Revisión: qué quedó publicado y cuántas fotos tiene cada uno
select p.nombre, p.estado, count(distinct i.id) as fotos,
       count(distinct v.id) filter (where v.precio > 0) as variantes_con_precio
from public.productos p
left join public.imagenes i on i.producto_id = p.id
left join public.variantes v on v.producto_id = p.id and v.activo
where p.slug in ('samsung-galaxy-a36', 'samsung-galaxy-a56', 'samsung-galaxy-a57', 'samsung-galaxy-s24-fe', 'samsung-galaxy-s25-ultra', 'samsung-galaxy-s26-ultra', 'samsung-galaxy-tab-a11', 'samsung-galaxy-tab-a11-wifi', 'samsung-galaxy-tab-s10-fe', 'samsung-galaxy-buds-3', 'xiaomi-12', 'xiaomi-poco-f6', 'xiaomi-poco-x5', 'xiaomi-poco-x8-pro', 'xiaomi-redmi-17', 'xiaomi-redmi-a7-pro', 'xiaomi-redmi-note-15-pro', 'xiaomi-redmi-note-15-pro-plus', 'xiaomi-redmi-pad-2', 'xiaomi-redmi-pad-se', 'infinix-gt-50-pro', 'infinix-hot-60-pro', 'infinix-hot-60-pro-plus', 'infinix-hot-70-pro', 'infinix-note-60', 'infinix-note-60-pro', 'infinix-note-edge', 'infinix-smart-10-ap1', 'infinix-smart-10-az1', 'infinix-xpad-30e', 'itel-a100c', 'itel-a100cs', 'itel-a200', 'itel-a50', 'apple-iphone-13', 'apple-iphone-14', 'apple-iphone-15-plus', 'apple-iphone-15-pro-max', 'apple-iphone-17-pro-max', 'motorola-g15', 'motorola-g17', 'realme-14', 'realme-c71', 'zte-blade-a75', 'zte-nubia-neo-3', 'zte-nubia-neo-3-gt', 'zte-nubia-v80-max', 'xiaomi-redmi-buds-8-active', 'xiaomi-type-c-earphones', 'xiaomi-3a-usb-a-to-usb-c-cable-1m', 'xiaomi-45w-nano-turbo-charging-power-adapter-2-port', 'xiaomi-redmi-watch-5-lite', 'xiaomi-redmi-watch-6-active', 'xiaomi-redmi-watch-6-lite', 'xiaomi-smart-band-11-active', 'itel-smart-watch-isw-o20b', 'itel-smart-watch-isw-o23p-pink-mauve', 'itel-vista-tablet-11', 'itel-vista-tablet-go', 'apple-cable-usb-a-to-lightning-1m', 'honor-choice-earbuds-clip', 'honor-choice-earbuds-s8', 'honor-choice-earbuds-x7-lite', 'honor-choice-earbuds-x7e-active', 'honor-choice-headphone', 'honor-choice-musicbox', 'honor-choice-speaker-mini-bluetooth', 'honor-choice-speaker-pro-bluetooth', 'honor-choice-infowear-watch-2-pro', 'honor-choice-infowear-watch-2i', 'honor-choice-watch-2-epic', 'huawei-freebuds-se2', 'huawei-band-10', 'jbl-earphone-tune-110', 'jbl-headphone-bt-tune-520', 'jbl-tune-720-bt-wireless-over-ear-headphones', 'jbl-go4-speaker', 'jbl-speaker-bt-grip', 'anker-audifonos-bluetooth-h30i', 'klip-xtreme-tune-x-buds-wireless-touch-26-hrs', 'klip-xtreme-zound-buds-wireless-touch-21-hrs', 'zizo-cargador-de-pared-powervault-30w-doble-puerto-usb-c-y-usb-a')
group by p.nombre, p.estado, p.orden
order by p.orden;
