// Líneas de descuento de un pedido guardado, en el mismo orden y con el mismo texto en la
// página del pedido, el panel y los correos.

export type DescuentosPedido = {
  forma_pago: string;
  descuento: number | string | null; // descuento por efectivo o transferencia (% en Configuración)
  descuento_combos?: number | string | null;
  descuento_cupon?: number | string | null;
  puntos_usados?: number | null;
  descuento_puntos?: number | string | null;
  combos?: { nombre: string; veces: number; descuento: number }[] | null;
  cupones?: { codigo: string } | null;
};

/** Columnas que hay que pedir a la base para armar las líneas */
export const COLUMNAS_DESCUENTOS =
  "descuento, descuento_combos, descuento_cupon, puntos_usados, descuento_puntos, combos, cupones(codigo)";

export function lineasDescuento(p: DescuentosPedido): { texto: string; monto: number }[] {
  const n = (x: number | string | null | undefined) => Number(x ?? 0) || 0;
  const lineas: { texto: string; monto: number }[] = [];
  const combos = p.combos ?? [];
  if (combos.length) {
    for (const c of combos) lineas.push({ texto: `Combo ${c.nombre}${c.veces > 1 ? ` ×${c.veces}` : ""}`, monto: n(c.descuento) });
  } else if (n(p.descuento_combos) > 0) {
    lineas.push({ texto: "Combos", monto: n(p.descuento_combos) });
  }
  if (n(p.descuento) > 0) {
    lineas.push({
      texto: `Descuento por ${p.forma_pago === "contra_entrega" ? "pago en efectivo" : "transferencia"}`,
      monto: n(p.descuento),
    });
  }
  if (n(p.descuento_cupon) > 0) lineas.push({ texto: `Cupón ${p.cupones?.codigo ?? ""}`.trim(), monto: n(p.descuento_cupon) });
  if (n(p.descuento_puntos) > 0) lineas.push({ texto: `${p.puntos_usados ?? 0} Puntos Nera`, monto: n(p.descuento_puntos) });
  return lineas;
}
