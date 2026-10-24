// Costos de envío y de cobro de cada pedido (pedido de Gabriel, 24 oct 2026). Se editan en Panel → Configuración →
// "Costos de envío y cobro" (clave privada `costos_cobro`). Funciones puras: se usan en Precios, en el pedido y en Inicio.
//
// Por forma de cobro (todo con IVA incluido, como el precio de venta):
//   - Efectivo contra entrega (paquetera): la paquetera se queda con su envío ($3.75) y un % de lo que cobró (2.5%)
//     y deposita el resto. El cliente pagó el precio con el descuento sin tarjeta, más el envío.
//   - Transferencia: precio con descuento + envío; sin comisión. El envío lo hace la paquetera (se le paga el envío).
//   - Tarjeta en la web (Wompi): precio completo + envío; Wompi cobra su % sobre todo.
//   - Tasa 0%: precio completo + envío; el banco cobra su % (depende del banco y del plazo).
// En todas: más la paquetería (empaque) por pedido.

export type Repartidor = { nombre: string; tipo: "paquetera" | "motorista"; tarifa: number | null };
export type TasaBanco = { banco: string; plazos: Record<string, number> };

export type CostosCobro = {
  envio_paquetera: number;
  paqueteria: number;
  contra_entrega_pct: number;
  wompi_pct: number;
  tasa_cero_pct: number;
  tasa_cero_bancos: TasaBanco[];
  repartidores: Repartidor[];
};

export const COSTOS_COBRO_INICIALES: CostosCobro = {
  envio_paquetera: 3.75,
  paqueteria: 1.5,
  contra_entrega_pct: 2.5,
  wompi_pct: 5.5,
  tasa_cero_pct: 9,
  tasa_cero_bancos: [
    { banco: "Banco Agrícola", plazos: { "3": 9, "6": 9, "12": 9 } },
    { banco: "BAC", plazos: { "3": 9, "6": 9, "12": 9 } },
    { banco: "Cuscatlán", plazos: { "3": 9, "6": 9, "12": 9 } },
  ],
  repartidores: [
    { nombre: "Paquetera", tipo: "paquetera", tarifa: 3.75 },
    { nombre: "Motorista San Salvador", tipo: "motorista", tarifa: null },
  ],
};

const num = (v: unknown, def: number) => {
  const n = Number(v);
  return Number.isFinite(n) && n >= 0 ? n : def;
};

/** Lee lo guardado en Configuración y completa lo que falte con los valores iniciales */
export function leerCostosCobro(v: unknown): CostosCobro {
  const o = (v && typeof v === "object" ? v : {}) as Partial<CostosCobro>;
  const d = COSTOS_COBRO_INICIALES;
  return {
    envio_paquetera: num(o.envio_paquetera, d.envio_paquetera),
    paqueteria: num(o.paqueteria, d.paqueteria),
    contra_entrega_pct: num(o.contra_entrega_pct, d.contra_entrega_pct),
    wompi_pct: num(o.wompi_pct, d.wompi_pct),
    tasa_cero_pct: num(o.tasa_cero_pct, d.tasa_cero_pct),
    tasa_cero_bancos: Array.isArray(o.tasa_cero_bancos) ? o.tasa_cero_bancos : d.tasa_cero_bancos,
    repartidores: Array.isArray(o.repartidores) && o.repartidores.length ? o.repartidores : d.repartidores,
  };
}

/** % de tasa 0% de un banco y plazo; sin dato, el general */
export function pctTasaCero(c: CostosCobro, banco?: string | null, plazo?: number | string | null): number {
  const b = c.tasa_cero_bancos.find((x) => x.banco === banco);
  const p = b && plazo != null ? b.plazos[String(plazo)] : undefined;
  return Number.isFinite(Number(p)) ? Number(p) : c.tasa_cero_pct;
}

/** La tasa 0% más cara que hay (para que el margen de Precios nunca sorprenda) */
export function pctTasaCeroMaxima(c: CostosCobro): number {
  const todas = c.tasa_cero_bancos.flatMap((b) => Object.values(b.plazos).map(Number)).filter(Number.isFinite);
  return Math.max(c.tasa_cero_pct, ...todas);
}

export type FormaCobro = "efectivo" | "transferencia" | "tarjeta" | "tasa_cero";

export const NOMBRE_COBRO: Record<FormaCobro, string> = {
  efectivo: "Efectivo (paquetera)",
  transferencia: "Transferencia",
  tarjeta: "Tarjeta en la web",
  tasa_cero: "Tasa 0%",
};

export type Neto = {
  /** Lo que paga el cliente (productos + envío) */
  cobrado: number;
  /** Comisión de quien cobra (paquetera, Wompi o banco) */
  comision: number;
  /** Envío de la paquetera + paquetería */
  envio: number;
  costo: number;
  /** Lo que queda */
  neto: number;
  /** neto ÷ cobrado */
  pct: number | null;
};

const r2 = (n: number) => Math.round(n * 100) / 100;

/**
 * Margen neto de vender una unidad a `precio` (publicado, con IVA) con cada forma de cobro.
 * `costo` con IVA incluido. `envioCobrado` = lo que paga el cliente por el envío. `descuentoPct` = descuento sin tarjeta.
 */
export function margenNeto(
  forma: FormaCobro,
  p: { precio: number; costo: number; envioCobrado: number; descuentoPct: number; tasaCeroPct?: number },
  c: CostosCobro
): Neto {
  const conDescuento = forma === "efectivo" || forma === "transferencia";
  const productos = conDescuento ? r2(p.precio * (1 - p.descuentoPct / 100)) : p.precio;
  const cobrado = r2(productos + p.envioCobrado);
  const pct =
    forma === "efectivo"
      ? c.contra_entrega_pct
      : forma === "tarjeta"
        ? c.wompi_pct
        : forma === "tasa_cero"
          ? (p.tasaCeroPct ?? pctTasaCeroMaxima(c))
          : 0;
  const comision = r2((cobrado * pct) / 100);
  const envio = r2(c.envio_paquetera + c.paqueteria);
  const neto = r2(cobrado - comision - envio - p.costo);
  return { cobrado, comision, envio, costo: p.costo, neto, pct: cobrado > 0 ? neto / cobrado : null };
}

/** Lo que la paquetera debería depositar de un pedido contra entrega: lo cobrado menos su envío y su comisión */
export function depositoEsperadoPaquetera(cobrado: number, c: CostosCobro): number {
  return r2(cobrado - c.envio_paquetera - (cobrado * c.contra_entrega_pct) / 100);
}

/** Lo que el banco o Wompi debería depositar: lo cobrado menos su comisión */
export function depositoEsperado(cobrado: number, pctComision: number): number {
  return r2(cobrado - (cobrado * pctComision) / 100);
}

/**
 * Precio publicado que deja `margenPct` de margen neto con esa forma de cobro (exacto, a dos decimales, hacia arriba).
 * Inverso de margenNeto: cobrado = (envío + costo) ÷ (1 − comisión − margen); precio = (cobrado − envío cobrado) ÷ (1 − descuento).
 */
export function precioParaMargenNeto(
  forma: FormaCobro,
  margenPct: number,
  p: { costo: number; envioCobrado: number; descuentoPct: number; tasaCeroPct?: number },
  c: CostosCobro
): number | null {
  const k =
    (forma === "efectivo"
      ? c.contra_entrega_pct
      : forma === "tarjeta"
        ? c.wompi_pct
        : forma === "tasa_cero"
          ? (p.tasaCeroPct ?? pctTasaCeroMaxima(c))
          : 0) / 100;
  const m = margenPct / 100;
  if (!(p.costo > 0) || k + m >= 1) return null;
  const cobrado = (c.envio_paquetera + c.paqueteria + p.costo) / (1 - k - m);
  const d = forma === "efectivo" || forma === "transferencia" ? p.descuentoPct / 100 : 0;
  const precio = (cobrado - p.envioCobrado) / (1 - d);
  return precio > 0 ? Math.ceil(precio * 100 - 1e-6) / 100 : null;
}
