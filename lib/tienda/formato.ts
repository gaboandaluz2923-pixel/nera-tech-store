// Formato de precios y textos que se repiten en la tienda.

export const usd = (n: number) =>
  n.toLocaleString("en-US", { style: "currency", currency: "USD", minimumFractionDigits: n % 1 ? 2 : 0 });

export const usd2 = (n: number) => n.toLocaleString("en-US", { style: "currency", currency: "USD" });

/** Cuota mensual de tasa 0% (sin intereses), redondeada al centavo hacia arriba. */
export function cuota(precio: number, meses: number) {
  return Math.ceil((precio / Math.max(1, meses)) * 100) / 100;
}

/**
 * Descuento por pagar sin tarjeta: 6% sobre los productos (no sobre el envío) al pagar
 * en efectivo contra entrega o por transferencia. El precio publicado es el de tarjeta y tasa 0%.
 * El mismo cálculo se usa en el navegador (checkout) y en el servidor (crear el pedido).
 */
export const DESCUENTO_SIN_TARJETA = {
  porcentaje: 6,
  formas: ["contra_entrega", "transferencia"] as const,
  texto: "6% de descuento al pagar con efectivo o transferencia",
};

export const tieneDescuentoSinTarjeta = (formaPago: string) =>
  (DESCUENTO_SIN_TARJETA.formas as readonly string[]).includes(formaPago);

/** Monto del descuento, redondeado al centavo; 0 si la forma de pago no lo tiene. */
export function descuentoSinTarjeta(subtotal: number, formaPago: string) {
  if (!tieneDescuentoSinTarjeta(formaPago)) return 0;
  return Math.round(subtotal * DESCUENTO_SIN_TARJETA.porcentaje) / 100;
}

/** Precio de un producto con el descuento aplicado (para mostrarlo en la ficha). */
export const precioConDescuento = (precio: number) =>
  Math.round(precio * (100 - DESCUENTO_SIN_TARJETA.porcentaje)) / 100;

export const TEXTO_DISPONIBILIDAD = {
  bodega: { corto: "En stock", largo: "En stock · entrega hoy en San Salvador" },
  proveedor: { corto: "Disponible", largo: "Disponible · entrega en 24 a 48 horas" },
  agotado: { corto: "Agotado", largo: "Agotado por ahora" },
} as const;

/** Categorías públicas: orden y nombre en el menú. Las que no tienen productos publicados no se muestran. */
export const CATEGORIAS = [
  { slug: "celulares", nombre: "Celulares" },
  { slug: "audifonos", nombre: "Audífonos" },
  { slug: "relojes", nombre: "Relojes" },
  { slug: "tablets", nombre: "Tablets" },
  { slug: "bocinas", nombre: "Bocinas" },
  { slug: "cargadores", nombre: "Cargadores" },
  { slug: "proteccion", nombre: "Protección" },
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
