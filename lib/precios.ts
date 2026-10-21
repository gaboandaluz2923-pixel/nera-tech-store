// Fórmulas de negocio de Nera Tech (ver CLAUDE.md → Reglas de negocio).
// Puras y sin dependencias: se usan en el panel y, más adelante, en la tienda.

export type CostosProveedor = {
  tipo: "local" | "importacion";
  transporte_lote: number;
  flete_lote: number;
  seguro_lote: number;
  dai_pct: number;
  iva_pct: number;
  unidades_lote: number;
};

// Costos fijos por envío que paga Nera Tech (paquetería $0.75 + seguro $1)
export const COSTO_ENVIO_FIJO = 1.75;
// Comisión de la paquetera sobre lo cobrado al cliente
export const COMISION_PAQUETERA = 0.025;
// Envío que se cobra al cliente por defecto
export const ENVIO_COBRADO = 5;

const r2 = (n: number) => Math.round(n * 100) / 100;

/**
 * Costo puesto en bodega de una unidad.
 * Local: precio de lista + costos fijos del lote prorrateados.
 * Importación: además DAI e IVA sobre el valor CIF (precio + flete + seguro por unidad).
 */
export function costoPuesto(precioLista: number, p: CostosProveedor): number {
  const unidades = Math.max(1, p.unidades_lote || 1);
  const transporte = (p.transporte_lote || 0) / unidades;
  const flete = (p.flete_lote || 0) / unidades;
  const seguro = (p.seguro_lote || 0) / unidades;
  if (p.tipo === "importacion") {
    const cif = precioLista + flete + seguro;
    const dai = cif * ((p.dai_pct || 0) / 100);
    const iva = (cif + dai) * ((p.iva_pct || 0) / 100);
    return r2(cif + dai + iva + transporte);
  }
  return r2(precioLista + transporte + flete + seguro);
}

/** Contribución por unidad enviada por paquetera (antes de pauta). */
export function contribucion(
  precioVenta: number,
  costo: number,
  envioCobrado = ENVIO_COBRADO
): number {
  const cobrado = precioVenta + envioCobrado;
  return r2(cobrado - costo - COSTO_ENVIO_FIJO - COMISION_PAQUETERA * cobrado);
}

/** Margen bruto sobre el precio de venta (0.10 = 10%). */
export function margen(precioVenta: number, costo: number): number | null {
  if (!precioVenta) return null;
  return (precioVenta - costo) / precioVenta;
}

/**
 * Margen sobre lo que entra si el cliente paga sin tarjeta (efectivo o transferencia):
 * (precio − descuento − costo) ÷ (precio − descuento). 0.10 = 10%.
 */
export function margenEfectivo(precioVenta: number, costo: number, descuentoPct: number): number | null {
  const cobrado = precioVenta * (1 - descuentoPct / 100);
  if (!(cobrado > 0)) return null;
  return (cobrado - costo) / cobrado;
}

/** Precio publicado (con tarjeta) que deja ese margen pagando sin tarjeta; exacto, a dos decimales. */
export function precioParaMargenEfectivo(costo: number, margenPct: number, descuentoPct: number): number | null {
  const m = margenPct / 100;
  const d = descuentoPct / 100;
  if (!(costo > 0) || m >= 1 || d >= 1) return null;
  return Math.ceil((costo / (1 - m) / (1 - d)) * 100 - 1e-6) / 100;
}

/** Precio que deja el margen objetivo, redondeado hacia arriba al dólar terminado en 9 o 5. */
export function precioConMargen(costo: number, margenObjetivoPct: number): number {
  const m = Math.min(Math.max(margenObjetivoPct, 0), 90) / 100;
  const bruto = costo / (1 - m);
  return redondeoComercial(bruto);
}

/**
 * Nunca por debajo del bruto.
 * Menos de $30: al .99 siguiente (9.6 → 9.99; 10 → 10.99).
 * Desde $30: al entero terminado en 5 o 9 (211.3 → 215; 216.2 → 219).
 */
export function redondeoComercial(n: number): number {
  if (n < 30) return r2(Math.ceil(n + 0.01) - 0.01);
  const entero = Math.ceil(n - 1e-9);
  const decena = Math.floor(entero / 10) * 10;
  return entero % 10 <= 5 ? decena + 5 : decena + 9;
}

/** ROAS mínimo para no perder dinero con pauta (precio ÷ contribución). */
export function roasMinimo(precioVenta: number, contrib: number): number | null {
  if (contrib <= 0) return null;
  return Math.round((precioVenta / contrib) * 10) / 10;
}

export const usd = (n: number | null | undefined) =>
  n === null || n === undefined || Number.isNaN(n)
    ? "—"
    : n.toLocaleString("en-US", { style: "currency", currency: "USD" });

export const pct = (n: number | null | undefined) =>
  n === null || n === undefined || Number.isNaN(n) ? "—" : `${(n * 100).toFixed(1)}%`;
