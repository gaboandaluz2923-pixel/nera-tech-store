// Formato de precios y textos que se repiten en la tienda.

export const usd = (n: number) =>
  n.toLocaleString("en-US", { style: "currency", currency: "USD", minimumFractionDigits: n % 1 ? 2 : 0 });

export const usd2 = (n: number) => n.toLocaleString("en-US", { style: "currency", currency: "USD" });

/** Cuota mensual de tasa 0% (sin intereses), redondeada al centavo hacia arriba. */
export function cuota(precio: number, meses: number) {
  return Math.ceil((precio / Math.max(1, meses)) * 100) / 100;
}

/**
 * Descuento por pagar sin tarjeta: un % sobre los productos (no sobre el envío) al pagar
 * en efectivo contra entrega o por transferencia. El precio publicado es el de tarjeta y tasa 0%.
 * El % se edita en Panel → Configuración (clave `descuento_sin_tarjeta`) y llega con configTienda();
 * el mismo cálculo se usa en el navegador (checkout) y en el servidor (crear el pedido).
 */
export const DESCUENTO_SIN_TARJETA = {
  /** Si todavía no se guardó otro en Configuración */
  porcentajeInicial: 6,
  maximo: 30,
  formas: ["contra_entrega", "transferencia"] as const,
};

export const textoDescuento = (pct: number) => `${pct}% de descuento al pagar con efectivo o transferencia`;

/** Lee el % guardado en Configuración (o el inicial si falta o no es válido). */
export function leerPorcentajeSinTarjeta(v: unknown): number {
  const n = Number((v as { porcentaje?: unknown } | null)?.porcentaje);
  return Number.isFinite(n) && n >= 0 && n <= DESCUENTO_SIN_TARJETA.maximo ? n : DESCUENTO_SIN_TARJETA.porcentajeInicial;
}

/**
 * Dónde y hasta qué monto se puede pagar en efectivo al recibir (Configuración → Contra entrega).
 * `municipios` son los que aparecen primero en la lista de direcciones; con `todoElPais`
 * también vale "Otro municipio". Sobre `maximo` se coordina por WhatsApp.
 */
export type ReglaContraEntrega = { municipios: string[]; todoElPais: boolean; maximo: number | null };

/** null = se puede; si no, el motivo para mostrar al cliente. Igual en el navegador y en el servidor. */
export function motivoSinContraEntrega(regla: ReglaContraEntrega, zona: string, total: number): string | null {
  if (!regla.todoElPais && !regla.municipios.includes(zona)) {
    return `Solo en ${regla.municipios.join(", ")}.`;
  }
  if (regla.maximo !== null && total > regla.maximo + 0.009) {
    return `Para pedidos de más de ${usd(regla.maximo)} lo coordinamos por WhatsApp.`;
  }
  return null;
}

/** "en todo El Salvador (pedidos hasta $500)" o "en San Salvador, Soyapango". */
export function dondeContraEntrega(regla: ReglaContraEntrega) {
  const tope = regla.maximo !== null ? ` en pedidos de hasta ${usd(regla.maximo)}` : "";
  return regla.todoElPais ? `en todo El Salvador${tope}` : `en ${regla.municipios.join(", ")}${tope}`;
}

export const tieneDescuentoSinTarjeta = (formaPago: string) =>
  (DESCUENTO_SIN_TARJETA.formas as readonly string[]).includes(formaPago);

/** Monto del descuento, redondeado al centavo; 0 si la forma de pago no lo tiene. */
export function descuentoSinTarjeta(subtotal: number, formaPago: string, pct: number) {
  if (!tieneDescuentoSinTarjeta(formaPago)) return 0;
  return Math.round(subtotal * pct) / 100;
}

/** Precio de un producto con el descuento aplicado (para mostrarlo en la ficha). */
export const precioConDescuento = (precio: number, pct: number) => Math.round(precio * (100 - pct)) / 100;

// Open Box: el equipo no fue usado, pero la caja ya fue abierta (no viene sellado de fábrica)
export const TEXTO_CONDICION = {
  nuevo: { etiqueta: "Nuevo", largo: "Nuevo, sellado de fábrica" },
  open_box: { etiqueta: "Open Box", largo: "Open Box: caja abierta, no sellado de fábrica" },
  usado: { etiqueta: "Usado", largo: "Usado, revisado por Nera Tech" },
} as const;

// En bodega = unidades propias; proveedor = se pide al proveedor (Panel → Catálogo → variante → Disponibilidad)
export const TEXTO_DISPONIBILIDAD = {
  bodega: { corto: "Entrega en menos de 24 h", largo: "En bodega · Entrega en menos de 24 horas" },
  proveedor: { corto: "Recibilo en menos de 48 h", largo: "Disponible · Recibilo en menos de 48 horas" },
  agotado: { corto: "Agotado", largo: "Agotado por ahora" },
} as const;

/** Categorías públicas: orden y nombre en el menú. Las que no tienen productos publicados no se muestran. */
export const CATEGORIAS = [
  { slug: "celulares", nombre: "Celulares" },
  { slug: "celulares-basicos", nombre: "Celulares básicos" },
  { slug: "open-box", nombre: "Open Box" },
  { slug: "audifonos", nombre: "Audífonos" },
  { slug: "relojes", nombre: "Relojes inteligentes" },
  { slug: "tablets", nombre: "Tablets" },
  { slug: "bocinas", nombre: "Bocinas" },
  { slug: "cargadores", nombre: "Powerbanks y cargadores" },
  { slug: "proteccion", nombre: "Protección" },
  { slug: "camaras", nombre: "Cámaras" },
  { slug: "energia", nombre: "Estaciones de energía" },
  { slug: "televisores", nombre: "Televisores" },
  { slug: "consolas", nombre: "Consolas" },
] as const;

export type SlugCategoria = (typeof CATEGORIAS)[number]["slug"];

export const NOMBRE_CARACTERISTICA: Record<string, string> = {
  pantalla: "Pantalla",
  procesador: "Procesador",
  ram: "Memoria RAM",
  almacenamiento: "Almacenamiento",
  camara: "Cámara principal",
  camara_frontal: "Cámara frontal",
  bateria: "Batería",
  carga: "Carga",
  red: "Red",
  sistema_operativo: "Sistema operativo",
  nfc: "NFC",
  proteccion: "Resistencia",
  peso: "Peso",
  tipo: "Tipo",
  autonomia: "Autonomía",
  cancelacion_ruido: "Cancelación de ruido",
  resistencia: "Resistencia",
  conexion: "Conexión",
  potencia: "Potencia",
  conector: "Conector",
  largo: "Largo",
  compatible_con: "Compatible con",
  material: "Material",
  compatibilidad: "Compatibilidad",
  capacidad: "Capacidad",
  resolucion: "Resolución",
  puertos: "Puertos",
};

/** Las 4 características que deciden la compra de un celular (se muestran primero y en el comparador). */
export const CLAVES_DECISIVAS = ["pantalla", "camara", "bateria", "procesador"];

/** Cómo se le muestra al cliente (y al equipo) cada estado del pedido. */
export const ESTADO_PEDIDO: Record<string, { texto: string; clase: string }> = {
  pendiente_confirmar: { texto: "Recibido", clase: "bg-amber-100 text-amber-900" },
  confirmado: { texto: "Confirmado", clase: "bg-blue-100 text-blue-900" },
  pagado: { texto: "Confirmado", clase: "bg-blue-100 text-blue-900" },
  en_camino: { texto: "En camino", clase: "bg-violet-100 text-violet-900" },
  entregado: { texto: "Entregado", clase: "bg-green-100 text-green-800" },
  cancelado: { texto: "Cancelado", clase: "bg-muted text-muted-foreground" },
  devuelto: { texto: "Devuelto", clase: "bg-muted text-muted-foreground" },
};

export const FORMA_PAGO: Record<string, string> = {
  contra_entrega: "Efectivo al recibir",
  transferencia: "Transferencia bancaria",
  wompi: "Tarjeta (Wompi)",
  tasa_cero: "Tasa 0% (por WhatsApp)",
};

export const fechaCorta = (iso: string) =>
  new Date(iso).toLocaleDateString("es-SV", { day: "numeric", month: "short", year: "numeric", timeZone: "America/El_Salvador" });

export const fechaHora = (iso: string) =>
  new Date(iso).toLocaleString("es-SV", {
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
    timeZone: "America/El_Salvador",
  });

/** "Termina el sábado 18 de octubre" (hora de El Salvador); "Termina hoy" / "Termina mañana". */
export function finDeOferta(fin: string, ahora: Date | null): string {
  const zona = "America/El_Salvador";
  const dia = (d: Date) => d.toLocaleDateString("en-CA", { timeZone: zona });
  const f = new Date(fin);
  // Sin hora del navegador (página guardada en el servidor), solo la fecha
  if (!ahora) return `Termina el ${f.toLocaleDateString("es-SV", { timeZone: zona, weekday: "long", day: "numeric", month: "long" })}`;
  const manana = new Date(ahora.getTime() + 86_400_000);
  if (dia(f) === dia(ahora)) return `Termina hoy a las ${f.toLocaleTimeString("es-SV", { timeZone: zona, hour: "numeric", minute: "2-digit" })}`;
  if (dia(f) === dia(manana)) return "Termina mañana";
  return `Termina el ${f.toLocaleDateString("es-SV", { timeZone: zona, weekday: "long", day: "numeric", month: "long" })}`;
}
