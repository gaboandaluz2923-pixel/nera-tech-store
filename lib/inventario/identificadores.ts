// Identificadores de cada unidad: IMEI (celulares) o número de serie / código Nera (lo demás).
// Se usa en el navegador (para avisar mientras se digita) y en el servidor; la base vuelve a revisar todo.

export type Condicion = "nuevo" | "open_box" | "usado";
export type EstadoUnidad = "en_bodega" | "vendida" | "garantia" | "baja" | "historial";
export type TipoIdentificador = "imei" | "serie";

export const CONDICION: Record<Condicion, string> = {
  nuevo: "Nuevo sellado",
  open_box: "Open Box",
  usado: "Usado",
};

export const ESTADO_UNIDAD: Record<EstadoUnidad, string> = {
  en_bodega: "En bodega",
  vendida: "Vendida",
  garantia: "En garantía",
  baja: "De baja",
  historial: "Registrada antes del sistema",
};

export const TIPO_MOVIMIENTO: Record<string, string> = {
  compra: "Compra",
  inicial: "Stock inicial",
  venta: "Venta",
  devolucion: "Devolución",
  ajuste: "Ajuste",
};

/** Igual que inv_normalizar() en la base: sin espacios, guiones, puntos ni barras; en mayúsculas */
export const normalizar = (s: string) => s.replace(/[\s\-./]/g, "").toUpperCase();

/** 15 dígitos con dígito verificador correcto (Luhn) */
export function imeiValido(s: string) {
  if (!/^\d{15}$/.test(s)) return false;
  let suma = 0;
  for (let i = 0; i < 15; i++) {
    let d = Number(s[i]);
    if (i % 2 === 1) {
      d *= 2;
      if (d > 9) d -= 9;
    }
    suma += d;
  }
  return suma % 10 === 0;
}

export type Item = { identificador: string; identificador2?: string };

/**
 * Lee lo que se pegó o escaneó: una unidad por línea. Si la unidad tiene dos IMEI van en la misma línea
 * separados por coma, punto y coma, tabulador o barra vertical ("356… , 356…").
 */
export function leerIdentificadores(texto: string): Item[] {
  return texto
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean)
    .map((l) => {
      const [a, b] = l.split(/[,;\t|]+/).map((x) => normalizar(x)).filter(Boolean);
      return b ? { identificador: a, identificador2: b } : { identificador: a };
    })
    .filter((x) => x.identificador);
}

/** Problemas a la vista antes de guardar (la base revisa además que no estén repetidos con lo ya registrado) */
export function revisarIdentificadores(items: Item[], tipo: TipoIdentificador, cantidad: number): string[] {
  const avisos: string[] = [];
  if (items.length > cantidad) avisos.push(`Hay ${items.length} identificadores para ${cantidad} unidades.`);
  if (tipo === "imei" && items.length < cantidad) avisos.push(`Faltan ${cantidad - items.length} IMEI.`);
  const vistos = new Set<string>();
  for (const it of items) {
    for (const id of [it.identificador, it.identificador2].filter((x): x is string => Boolean(x))) {
      if (vistos.has(id)) avisos.push(`${id} está repetido.`);
      vistos.add(id);
      if (tipo === "imei" && !imeiValido(id)) avisos.push(`${id} no es un IMEI válido.`);
    }
  }
  return avisos;
}
