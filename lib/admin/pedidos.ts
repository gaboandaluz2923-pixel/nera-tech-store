// Reglas de los pedidos que usa el panel.

export type EstadoPedido =
  | "pendiente_confirmar"
  | "confirmado"
  | "pagado"
  | "en_camino"
  | "entregado"
  | "cancelado"
  | "devuelto";

export type PedidoBase = {
  estado: EstadoPedido;
  forma_pago: string;
  pagado_en: string | null;
  confirmado_en: string | null;
  entregado_en: string | null;
  factura_estado: string;
};

/** A qué estados se puede pasar desde cada uno (con el texto del botón). */
export const SIGUIENTES: Record<EstadoPedido, { estado: EstadoPedido; texto: string; peligro?: boolean }[]> = {
  pendiente_confirmar: [
    { estado: "confirmado", texto: "Confirmar pedido" },
    { estado: "cancelado", texto: "Cancelar", peligro: true },
  ],
  confirmado: [
    { estado: "en_camino", texto: "Marcar en camino" },
    { estado: "entregado", texto: "Marcar entregado" },
    { estado: "cancelado", texto: "Cancelar", peligro: true },
  ],
  pagado: [
    { estado: "en_camino", texto: "Marcar en camino" },
    { estado: "entregado", texto: "Marcar entregado" },
    { estado: "cancelado", texto: "Cancelar", peligro: true },
  ],
  en_camino: [
    { estado: "entregado", texto: "Marcar entregado" },
    { estado: "cancelado", texto: "Cancelar", peligro: true },
  ],
  entregado: [{ estado: "devuelto", texto: "Registrar devolución", peligro: true }],
  cancelado: [{ estado: "pendiente_confirmar", texto: "Reabrir pedido" }],
  devuelto: [],
};

/** Inicio del día de hoy en El Salvador (UTC-6, sin horario de verano). */
export function inicioDeHoySV(ahora = new Date()) {
  const sv = new Date(ahora.getTime() - 6 * 3600_000);
  return new Date(Date.UTC(sv.getUTCFullYear(), sv.getUTCMonth(), sv.getUTCDate()) + 6 * 3600_000);
}

/**
 * ¿Toca emitir la factura?
 *  - Pagado por adelantado (tarjeta, transferencia, tasa 0%): en cuanto está confirmado y pagado.
 *  - Contra entrega: desde el día siguiente a la entrega (ya cobrado).
 */
export function porFacturar(p: PedidoBase, ahora = new Date()) {
  if (p.factura_estado !== "pendiente") return false;
  if (p.estado === "cancelado" || p.estado === "devuelto") return false;
  if (!p.pagado_en || !p.confirmado_en) return false;
  if (p.forma_pago === "contra_entrega") {
    return Boolean(p.entregado_en) && new Date(p.entregado_en!) < inicioDeHoySV(ahora);
  }
  return true;
}

export const esperandoPago = (p: PedidoBase) =>
  !p.pagado_en && p.forma_pago !== "contra_entrega" && p.estado !== "cancelado" && p.estado !== "devuelto";
