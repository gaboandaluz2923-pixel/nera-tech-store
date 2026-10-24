import "server-only";
import { createServiceClient } from "@/lib/supabase/server";
import { leerCostosCobro, pctTasaCero, type CostosCobro } from "@/lib/costos-cobro";
import { costoBodegaConIva } from "@/lib/precios";
import { costosDeVariantes } from "@/lib/tienda/costos";

// Cierre de un pedido (solo administradores): quién lo entregó, cuánto debería entrar al banco, cuánto entró y el
// margen neto real. Todo con IVA incluido (precio, costo y comisiones), como en Precios.

export type EstadoDinero = "por_cobrar" | "por_recibir" | "conciliado" | "no_aplica";

export const ESTADO_DINERO: Record<EstadoDinero, string> = {
  por_cobrar: "Por cobrar",
  por_recibir: "Cobrado, por recibir",
  conciliado: "Recibido y conciliado",
  no_aplica: "Sin cobro (cancelado)",
};

/** Opción para pedidos que no se enviaron */
export const RETIRO = "Lo recogió el cliente";

export type PedidoCierre = {
  id: string;
  estado: string;
  forma_pago: "contra_entrega" | "transferencia" | "wompi" | "tasa_cero";
  total: number;
  pagado_en: string | null;
  entrega_servicio: string | null;
  entrega_costo: number | null;
  tasa_cero_banco: string | null;
  tasa_cero_plazo: number | null;
  dinero_recibido: number | null;
  dinero_recibido_en: string | null;
  dinero_referencia: string | null;
  conciliado_por: string | null;
  conciliado_en: string | null;
};

export const COLUMNAS_CIERRE =
  "id, estado, forma_pago, total, pagado_en, entrega_servicio, entrega_costo, tasa_cero_banco, tasa_cero_plazo, dinero_recibido, dinero_recibido_en, dinero_referencia, conciliado_por, conciliado_en";

const r2 = (n: number) => Math.round(n * 100) / 100;

export function estadoDinero(p: Pick<PedidoCierre, "estado" | "pagado_en" | "dinero_recibido_en">): EstadoDinero {
  if (p.dinero_recibido_en) return "conciliado";
  if (["cancelado", "devuelto"].includes(p.estado)) return "no_aplica";
  if (p.pagado_en || p.estado === "entregado") return "por_recibir";
  return "por_cobrar";
}

/** Quién tiene el dinero mientras no llega al banco */
export function quienTieneElDinero(p: PedidoCierre): string {
  if (p.forma_pago === "contra_entrega") {
    if (p.entrega_servicio === RETIRO) return "Efectivo en tienda";
    return p.entrega_servicio ?? "Paquetera (sin anotar quién entregó)";
  }
  if (p.forma_pago === "wompi") return "Wompi";
  if (p.forma_pago === "tasa_cero") return p.tasa_cero_banco ? `Tasa 0% · ${p.tasa_cero_banco}` : "Tasa 0%";
  return "Transferencias por confirmar";
}

export type CuentaCierre = {
  /** Lo que pagó el cliente */
  cobrado: number;
  /** Comisión de quien cobró (paquetera, Wompi o banco) */
  comisionPct: number;
  comision: number;
  /** La paquetera descuenta su envío y su comisión del depósito */
  descontadoEnDeposito: boolean;
  /** Costo de entregarlo (paquetera, motorista); si lo descontó la paquetera, ya está dentro de `comision`/depósito */
  costoEntrega: number;
  costoEntregaEstimado: boolean;
  paqueteria: number;
  /** Lo que debería entrar al banco */
  esperado: number;
};

export function cuentaCierre(p: PedidoCierre, c: CostosCobro): CuentaCierre {
  const cobrado = Number(p.total);
  const rep = c.repartidores.find((r) => r.nombre === p.entrega_servicio);
  const retiro = p.entrega_servicio === RETIRO;
  // Sin dato de quién lo entregó, se asume la paquetera
  const esPaquetera = !retiro && (rep ? rep.tipo === "paquetera" : !p.entrega_servicio);
  const descontado = p.forma_pago === "contra_entrega" && esPaquetera;
  const comisionPct =
    p.forma_pago === "contra_entrega"
      ? descontado
        ? c.contra_entrega_pct
        : 0
      : p.forma_pago === "wompi"
        ? c.wompi_pct
        : p.forma_pago === "tasa_cero"
          ? pctTasaCero(c, p.tasa_cero_banco, p.tasa_cero_plazo)
          : 0;
  const comision = r2((cobrado * comisionPct) / 100);
  const tarifa = retiro ? 0 : (rep?.tarifa ?? (esPaquetera ? c.envio_paquetera : null));
  const costoEntrega = p.entrega_costo !== null && p.entrega_costo !== undefined ? Number(p.entrega_costo) : (tarifa ?? 0);
  const esperado = r2(cobrado - comision - (descontado ? costoEntrega : 0));
  return {
    cobrado,
    comisionPct,
    comision,
    descontadoEnDeposito: descontado,
    costoEntrega,
    costoEntregaEstimado: p.entrega_costo === null || p.entrega_costo === undefined,
    paqueteria: c.paqueteria,
    esperado,
  };
}

/** Costo de los productos del pedido con IVA incluido: lo que salió de bodega a su costo real (+13% si la compra fue
 *  con crédito fiscal) y lo demás al costo del proveedor; si no hay ninguno, el estimado de Precios. */
export async function costoProductosConIva(pedidoId: string): Promise<{ costo: number; estimado: boolean }> {
  const sb = createServiceClient();
  const { data: lineas } = await sb.from("lineas_pedido").select("id, variante_id, cantidad, costo_proveedor").eq("pedido_id", pedidoId);
  const ls = (lineas ?? []) as { id: string; variante_id: string | null; cantidad: number; costo_proveedor: number | null }[];
  if (!ls.length) return { costo: 0, estimado: false };
  const { data: movs } = await sb
    .from("movimientos_inventario")
    .select("linea_pedido_id, cantidad, costo_unitario, lotes(compra_lineas(compras(documento)))")
    .in(
      "linea_pedido_id",
      ls.map((l) => l.id)
    )
    .in("tipo", ["venta", "devolucion"]);
  const porLinea = new Map<string, { n: number; costo: number }>();
  for (const m of (movs ?? []) as unknown as {
    linea_pedido_id: string;
    cantidad: number;
    costo_unitario: number | null;
    lotes: { compra_lineas: { compras: { documento: string } | null } | null } | null;
  }[]) {
    if (m.costo_unitario === null) continue;
    const x = porLinea.get(m.linea_pedido_id) ?? { n: 0, costo: 0 };
    const unidades = -Number(m.cantidad); // la venta sale en negativo; la devolución entra en positivo
    x.n += unidades;
    x.costo += unidades * costoBodegaConIva(Number(m.costo_unitario), m.lotes?.compra_lineas?.compras?.documento);
    porLinea.set(m.linea_pedido_id, x);
  }
  let total = 0;
  let estimado = false;
  const faltan: { variante: string; cantidad: number }[] = [];
  for (const l of ls) {
    const b = porLinea.get(l.id) ?? { n: 0, costo: 0 };
    total += b.costo;
    const resto = Math.max(0, l.cantidad - b.n);
    if (!resto) continue;
    if (l.costo_proveedor !== null) total += resto * Number(l.costo_proveedor);
    else if (l.variante_id) faltan.push({ variante: l.variante_id, cantidad: resto });
  }
  if (faltan.length) {
    estimado = true;
    const costos = await costosDeVariantes([...new Set(faltan.map((f) => f.variante))]).catch(() => new Map<string, number>());
    for (const f of faltan) total += f.cantidad * (costos.get(f.variante) ?? 0);
  }
  return { costo: r2(total), estimado };
}

export async function costosCobro(): Promise<CostosCobro> {
  const { data } = await createServiceClient().from("configuracion").select("valor").eq("clave", "costos_cobro").maybeSingle();
  return leerCostosCobro(data?.valor);
}

export type CierreCompleto = CuentaCierre & {
  estado: EstadoDinero;
  costoProductos: number;
  costoProductosEstimado: boolean;
  /** Lo que entró (o lo que debería entrar, si todavía no se concilió) */
  ingreso: number;
  neto: number;
  netoPct: number | null;
  /** Diferencia entre lo que entró y lo esperado (solo si ya se concilió) */
  diferencia: number | null;
};

export async function cierrePedido(p: PedidoCierre): Promise<CierreCompleto> {
  const [c, prod] = await Promise.all([costosCobro(), costoProductosConIva(p.id)]);
  const cuenta = cuentaCierre(p, c);
  const estado = estadoDinero(p);
  const recibido = p.dinero_recibido !== null && p.dinero_recibido !== undefined ? Number(p.dinero_recibido) : null;
  const ingreso = estado === "conciliado" && recibido !== null ? recibido : cuenta.esperado;
  const neto = r2(ingreso - prod.costo - cuenta.paqueteria - (cuenta.descontadoEnDeposito ? 0 : cuenta.costoEntrega));
  return {
    ...cuenta,
    estado,
    costoProductos: prod.costo,
    costoProductosEstimado: prod.estimado,
    ingreso,
    neto,
    netoPct: cuenta.cobrado > 0 ? neto / cuenta.cobrado : null,
    diferencia: estado === "conciliado" && recibido !== null ? r2(recibido - cuenta.esperado) : null,
  };
}

/** Dinero cobrado que todavía no llega al banco, por quién lo tiene (para Inicio) */
export async function dineroPorRecibir(): Promise<{ quien: string; pedidos: number; esperado: number }[]> {
  const sb = createServiceClient();
  const [c, { data }] = await Promise.all([
    costosCobro(),
    sb
      .from("pedidos")
      .select(COLUMNAS_CIERRE)
      .is("dinero_recibido_en", null)
      .not("estado", "in", "(cancelado,devuelto)")
      .or("pagado_en.not.is.null,estado.eq.entregado")
      .limit(1000),
  ]);
  const grupos = new Map<string, { quien: string; pedidos: number; esperado: number }>();
  for (const p of (data ?? []) as unknown as PedidoCierre[]) {
    const quien = quienTieneElDinero(p);
    const g = grupos.get(quien) ?? { quien, pedidos: 0, esperado: 0 };
    g.pedidos += 1;
    g.esperado = r2(g.esperado + cuentaCierre(p, c).esperado);
    grupos.set(quien, g);
  }
  return [...grupos.values()].sort((a, b) => b.esperado - a.esperado);
}
