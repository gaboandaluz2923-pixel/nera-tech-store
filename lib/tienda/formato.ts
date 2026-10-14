// Formato de precios y textos que se repiten en la tienda.

export const usd = (n: number) =>
  n.toLocaleString("en-US", { style: "currency", currency: "USD", minimumFractionDigits: n % 1 ? 2 : 0 });

export const usd2 = (n: number) => n.toLocaleString("en-US", { style: "currency", currency: "USD" });

/** Cuota mensual de tasa 0% (sin intereses), redondeada al centavo hacia arriba. */
export function cuota(precio: number, meses: number) {
  return Math.ceil((precio / Math.max(1, meses)) * 100) / 100;
}

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
