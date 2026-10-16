import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { COMISION_PAQUETERA, COSTO_ENVIO_FIJO } from "@/lib/precios";

// Finanzas (solo administradores). Se lee con el cliente de servicio después de superAdmin(): el costo de
// cada venta (lineas_pedido.costo_unitario) no se puede leer con la sesión.
//
// Criterios (los mismos en todo el módulo):
// - Una venta cuenta el mes en que se ENTREGÓ (entregado_en). Los precios incluyen IVA: IVA = total × 13/113.
// - Costo de lo vendido = el costo que guardó cada línea al salir de bodega (o el del proveedor).
// - Envío y cobro: lo anotado en Gastos (envíos y comisiones); si ese mes no hay, se estima como en Analítica
//   ($1.75 por pedido + 2.5% de lo cobrado).
// - Un gasto con crédito fiscal cuesta su monto sin IVA (el IVA se recupera); sin crédito fiscal cuesta el total.
// - Flujo de caja: entra lo cobrado (pagado_en de cada pedido) y sale lo pagado (compras, gastos y pauta).

export const IVA = 0.13;
const r2 = (n: number) => Math.round(n * 100) / 100;

export const CATEGORIAS_GASTO = {
  alquiler: "Alquiler",
  sueldos: "Sueldos y comisiones del equipo",
  publicidad: "Publicidad (fuera de la pauta semanal)",
  envios: "Envíos y paquetería",
  comisiones: "Comisiones bancarias y de tarjeta",
  servicios: "Servicios (internet, luz, teléfono)",
  software: "Software y suscripciones",
  honorarios: "Contador, abogado y otros honorarios",
  impuestos: "Impuestos, tasas y permisos",
  transporte: "Transporte y combustible",
  empaque: "Empaque y papelería",
  garantias: "Garantías y reparaciones",
  otros: "Otros",
} as const;
export type CategoriaGasto = keyof typeof CATEGORIAS_GASTO;

export const DOCUMENTO_GASTO = {
  ccf: "Crédito fiscal",
  factura: "Factura consumidor final",
  recibo: "Recibo",
  sin: "Sin documento",
} as const;

/** "2026-10" del mes actual en El Salvador */
export const mesActual = () => new Date().toLocaleDateString("en-CA", { timeZone: "America/El_Salvador" }).slice(0, 7);

export function leerMes(v: string | undefined) {
  return v && /^\d{4}-(0[1-9]|1[0-2])$/.test(v) ? v : mesActual();
}

/** Primer día del mes y del siguiente (fechas) y sus límites en hora de El Salvador (UTC−6) */
export function rangoMes(mes: string) {
  const [a, m] = mes.split("-").map(Number);
  const desde = `${mes}-01`;
  const sig = m === 12 ? `${a + 1}-01-01` : `${a}-${String(m + 1).padStart(2, "0")}-01`;
  return { desde, hasta: sig, desdeTs: `${desde}T06:00:00Z`, hastaTs: `${sig}T06:00:00Z` };
}

export function mesesAtras(mes: string, n: number) {
  const [a, m] = mes.split("-").map(Number);
  const lista: string[] = [];
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(Date.UTC(a, m - 1 - i, 1));
    lista.push(`${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`);
  }
  return lista;
}

export const nombreMes = (mes: string) =>
  new Date(`${mes}-15T12:00:00Z`).toLocaleDateString("es-SV", { month: "long", year: "numeric", timeZone: "UTC" });

type PedidoFin = {
  id: string;
  numero: number;
  total: number;
  cliente_id: string | null;
  created_at: string;
  entregado_en: string | null;
  pagado_en: string | null;
  facturacion: { tipo?: string; nit?: string; nrc?: string; nombre?: string } | null;
  factura_numero: string | null;
  entrega: { nombre?: string } | null;
  lineas_pedido: { cantidad: number; costo_unitario: number | null }[];
};

export type Gasto = {
  id: string;
  fecha: string;
  categoria: CategoriaGasto;
  descripcion: string;
  beneficiario: string | null;
  documento: keyof typeof DOCUMENTO_GASTO;
  numero: string | null;
  nit: string | null;
  monto: number;
  iva: number;
  total: number;
  fijo: boolean;
  forma_pago: string | null;
  pagado_en: string | null;
  notas: string | null;
};

/** Lo que cuesta un gasto en resultados: sin IVA si es crédito fiscal (se recupera), total si no */
export const costoGasto = (g: Pick<Gasto, "documento" | "monto" | "total">) => Number(g.documento === "ccf" ? g.monto : g.total);

async function pedidosEntregados(sb: SupabaseClient, desdeTs: string, hastaTs: string) {
  const { data, error } = await sb
    .from("pedidos")
    .select("id, numero, total, cliente_id, created_at, entregado_en, pagado_en, facturacion, factura_numero, entrega, lineas_pedido(cantidad, costo_unitario)")
    .eq("estado", "entregado")
    .gte("entregado_en", desdeTs)
    .lt("entregado_en", hastaTs)
    .limit(10000);
  if (error) throw error;
  return (data ?? []) as unknown as PedidoFin[];
}

async function pautaEntre(sb: SupabaseClient, desde: string, hasta: string) {
  const { data } = await sb.from("gasto_pauta").select("semana, monto").gte("semana", desde).lt("semana", hasta);
  return (data ?? []).reduce((s, g) => s + Number(g.monto), 0);
}

export type EstadoResultados = {
  mes: string;
  pedidos: number;
  ventasBrutas: number;
  ivaDebito: number;
  ventasNetas: number;
  costoVentas: number;
  lineasSinCosto: number;
  utilidadBruta: number;
  envioCobro: number;
  envioCobroEstimado: boolean;
  pauta: number;
  gastosPorCategoria: { categoria: CategoriaGasto; monto: number }[];
  gastosOperativos: number;
  gastosFijos: number;
  utilidadOperativa: number;
};

export async function estadoResultados(sb: SupabaseClient, mes: string): Promise<EstadoResultados> {
  const { desde, hasta, desdeTs, hastaTs } = rangoMes(mes);
  const [pedidos, { data: gastosData }, pauta] = await Promise.all([
    pedidosEntregados(sb, desdeTs, hastaTs),
    sb.from("gastos").select("categoria, documento, monto, total, fijo").gte("fecha", desde).lt("fecha", hasta),
    pautaEntre(sb, desde, hasta),
  ]);
  const ventasBrutas = pedidos.reduce((s, p) => s + Number(p.total), 0);
  const ivaDebito = (ventasBrutas * IVA) / (1 + IVA);
  const ventasNetas = ventasBrutas - ivaDebito;
  let costoVentas = 0;
  let lineasSinCosto = 0;
  for (const p of pedidos)
    for (const l of p.lineas_pedido) {
      if (l.costo_unitario === null) lineasSinCosto++;
      else costoVentas += Number(l.costo_unitario) * l.cantidad;
    }
  const gastos = (gastosData ?? []) as Pick<Gasto, "categoria" | "documento" | "monto" | "total" | "fijo">[];
  const porCat = new Map<CategoriaGasto, number>();
  for (const g of gastos) porCat.set(g.categoria, (porCat.get(g.categoria) ?? 0) + costoGasto(g));
  const anotadoEnvioCobro = (porCat.get("envios") ?? 0) + (porCat.get("comisiones") ?? 0);
  const envioCobroEstimado = anotadoEnvioCobro === 0;
  const envioCobro = envioCobroEstimado ? pedidos.length * COSTO_ENVIO_FIJO + COMISION_PAQUETERA * ventasBrutas : anotadoEnvioCobro;
  porCat.delete("envios");
  porCat.delete("comisiones");
  const gastosPorCategoria = [...porCat.entries()]
    .map(([categoria, monto]) => ({ categoria, monto: r2(monto) }))
    .sort((a, b) => b.monto - a.monto);
  const gastosOperativos = gastosPorCategoria.reduce((s, g) => s + g.monto, 0);
  const gastosFijos = gastos.filter((g) => g.fijo).reduce((s, g) => s + costoGasto(g), 0);
  const utilidadBruta = ventasNetas - costoVentas;
  return {
    mes,
    pedidos: pedidos.length,
    ventasBrutas: r2(ventasBrutas),
    ivaDebito: r2(ivaDebito),
    ventasNetas: r2(ventasNetas),
    costoVentas: r2(costoVentas),
    lineasSinCosto,
    utilidadBruta: r2(utilidadBruta),
    envioCobro: r2(envioCobro),
    envioCobroEstimado,
    pauta: r2(pauta),
    gastosPorCategoria,
    gastosOperativos: r2(gastosOperativos),
    gastosFijos: r2(gastosFijos),
    utilidadOperativa: r2(utilidadBruta - envioCobro - pauta - gastosOperativos),
  };
}

export type Indicador = { nombre: string; valor: string; explicacion: string; alerta?: boolean };

const usd = (n: number) => n.toLocaleString("en-US", { style: "currency", currency: "USD" });
const pct = (n: number) => (Number.isFinite(n) ? `${(n * 100).toFixed(1)}%` : "—");
const dias = (n: number) => (Number.isFinite(n) && n >= 0 ? `${Math.round(n)} días` : "—");

/** Indicadores del mes, cada uno con su explicación en texto */
export async function indicadores(sb: SupabaseClient, mes: string, er: EstadoResultados): Promise<Indicador[]> {
  const { desdeTs, hastaTs } = rangoMes(mes);
  const hace30 = new Date(Date.now() - 30 * 86_400_000).toISOString();
  const [pedidosMes, { data: lotes }, { data: porCobrar }, { data: porPagar }, { data: compras30 }, ventas30, todos] =
    await Promise.all([
      pedidosEntregados(sb, desdeTs, hastaTs),
      sb.from("lotes").select("cantidad, costo_unitario").gt("cantidad", 0).not("costo_unitario", "is", null),
      sb.from("pedidos").select("total").eq("estado", "entregado").is("pagado_en", null),
      sb.from("compras").select("total").neq("estado", "anulada").is("pagada_en", null),
      sb.from("compras").select("total").neq("estado", "anulada").gte("fecha", hace30.slice(0, 10)),
      pedidosEntregados(sb, hace30, new Date().toISOString()),
      sb
        .from("pedidos")
        .select("cliente_id, created_at")
        .not("estado", "in", "(cancelado,devuelto)")
        .not("cliente_id", "is", null)
        .order("created_at")
        .limit(20000),
    ]);
  // Clientes: primera compra de cada uno (en todo el historial del sistema)
  const primera = new Map<string, string>();
  const compras = new Map<string, number>();
  for (const p of (todos.data ?? []) as { cliente_id: string; created_at: string }[]) {
    if (!primera.has(p.cliente_id)) primera.set(p.cliente_id, p.created_at);
    compras.set(p.cliente_id, (compras.get(p.cliente_id) ?? 0) + 1);
  }
  const clientesMes = new Set(pedidosMes.map((p) => p.cliente_id).filter((x): x is string => Boolean(x)));
  const nuevos = [...clientesMes].filter((c) => {
    const f = primera.get(c);
    return f && f >= desdeTs && f < hastaTs;
  }).length;
  const recurrentes = clientesMes.size - nuevos;
  const conCompra = [...compras.values()];
  const comprasPorCliente = conCompra.length ? conCompra.reduce((s, n) => s + n, 0) / conCompra.length : 0;
  const repiten = conCompra.filter((n) => n >= 2).length;

  const ticket = er.pedidos ? er.ventasBrutas / er.pedidos : NaN;
  const margenBruto = er.ventasNetas ? er.utilidadBruta / er.ventasNetas : NaN;
  const contribucion = er.utilidadBruta - er.envioCobro;
  const margenContribucion = er.ventasNetas ? contribucion / er.ventasNetas : NaN;
  const margenNeto = er.ventasNetas ? er.utilidadOperativa / er.ventasNetas : NaN;
  const puntoEquilibrio = margenContribucion > 0 ? (er.gastosFijos + er.pauta) / margenContribucion : NaN;
  const valorInventario = ((lotes ?? []) as { cantidad: number; costo_unitario: number }[]).reduce(
    (s, l) => s + l.cantidad * Number(l.costo_unitario),
    0
  );
  let costo30 = 0;
  let ventasBrutas30 = 0;
  for (const p of ventas30) {
    ventasBrutas30 += Number(p.total);
    for (const l of p.lineas_pedido) if (l.costo_unitario !== null) costo30 += Number(l.costo_unitario) * l.cantidad;
  }
  const dio = costo30 > 0 ? valorInventario / (costo30 / 30) : NaN;
  const cobrar = ((porCobrar ?? []) as { total: number }[]).reduce((s, x) => s + Number(x.total), 0);
  const pagar = ((porPagar ?? []) as { total: number }[]).reduce((s, x) => s + Number(x.total), 0);
  const comprado30 = ((compras30 ?? []) as { total: number }[]).reduce((s, x) => s + Number(x.total), 0);
  const dso = ventasBrutas30 > 0 ? cobrar / (ventasBrutas30 / 30) : NaN;
  const dpo = comprado30 > 0 ? pagar / (comprado30 / 30) : NaN;
  const ciclo = [dio, dso, dpo].every(Number.isFinite) ? dio + dso - dpo : NaN;
  const cac = nuevos ? er.pauta / nuevos : NaN;
  const ltv = Number.isFinite(ticket) && Number.isFinite(margenBruto) ? ticket * comprasPorCliente * margenBruto : NaN;
  const roas = er.pauta > 0 ? er.ventasBrutas / er.pauta : NaN;

  return [
    { nombre: "Pedidos entregados", valor: String(er.pedidos), explicacion: "Pedidos que se entregaron este mes." },
    { nombre: "Ticket promedio", valor: Number.isFinite(ticket) ? usd(ticket) : "—", explicacion: "Lo que paga en promedio cada pedido (con IVA y envío)." },
    {
      nombre: "Margen bruto",
      valor: pct(margenBruto),
      explicacion: "De cada dólar vendido (sin IVA), lo que queda después de pagar el producto.",
      alerta: margenBruto < 0.05,
    },
    {
      nombre: "Margen de contribución",
      valor: pct(margenContribucion),
      explicacion: "Lo que queda después del producto, el envío y el cobro: con esto se pagan los gastos fijos y la pauta.",
    },
    {
      nombre: "Margen neto",
      valor: pct(margenNeto),
      explicacion: "Lo que queda de cada dólar vendido después de todo (antes del impuesto sobre la renta).",
      alerta: margenNeto < 0,
    },
    {
      nombre: "Punto de equilibrio",
      valor: Number.isFinite(puntoEquilibrio) ? `${usd(puntoEquilibrio * (1 + IVA))} al mes` : "—",
      explicacion: `Ventas (con IVA) que necesitás en el mes para cubrir los gastos fijos (${usd(er.gastosFijos)}) y la pauta (${usd(er.pauta)}). Marcá como "fijo" los gastos que se repiten.`,
      alerta: Number.isFinite(puntoEquilibrio) && er.ventasNetas < puntoEquilibrio,
    },
    {
      nombre: "Clientes nuevos / que repiten",
      valor: `${nuevos} / ${recurrentes}`,
      explicacion: "Clientes de este mes que compraron por primera vez en el sistema y los que ya habían comprado.",
    },
    {
      nombre: "Recompra",
      valor: conCompra.length ? pct(repiten / conCompra.length) : "—",
      explicacion: "De todos los clientes con pedidos en el sistema, cuántos compraron 2 veces o más.",
    },
    {
      nombre: "Costo por cliente nuevo (CAC)",
      valor: Number.isFinite(cac) ? usd(cac) : "—",
      explicacion: "Pauta del mes ÷ clientes nuevos. Debe ser bastante menor que lo que deja cada cliente.",
    },
    {
      nombre: "Valor de un cliente (LTV)",
      valor: Number.isFinite(ltv) ? usd(ltv) : "—",
      explicacion: "Ticket promedio × compras por cliente × margen bruto: lo que deja un cliente en todas sus compras.",
      alerta: Number.isFinite(ltv) && Number.isFinite(cac) && ltv < cac,
    },
    {
      nombre: "Retorno de la pauta (ROAS)",
      valor: Number.isFinite(roas) ? `${roas.toFixed(1)}×` : "—",
      explicacion: "Ventas ÷ pauta: cuántos dólares vendiste por cada dólar de anuncios.",
    },
    {
      nombre: "Días de inventario",
      valor: dias(dio),
      explicacion: `Cuántos días duraría lo que hay en bodega (${usd(valorInventario)} al costo) al ritmo de venta de los últimos 30 días.`,
      alerta: dio > 45,
    },
    {
      nombre: "Ciclo de caja",
      valor: dias(ciclo),
      explicacion: `Días de inventario + días para cobrar (${dias(dso)}) − días que te da el proveedor (${dias(dpo)}). Menos es mejor: es lo que tu dinero pasa amarrado.`,
    },
    {
      nombre: "Por cobrar / por pagar",
      valor: `${usd(cobrar)} / ${usd(pagar)}`,
      explicacion: "Pedidos entregados sin cobrar y facturas de proveedor sin pagar (todas, no solo este mes).",
    },
  ];
}

export type FilaFlujo = { mes: string; cobrado: number; compras: number; gastos: number; pauta: number; neto: number; saldo: number | null };

/** Flujo de caja por mes: lo que entró y salió de verdad, y el saldo desde el saldo inicial de Finanzas */
export async function flujoCaja(sb: SupabaseClient, mes: string, n = 6): Promise<{ filas: FilaFlujo[]; saldoInicial: number; saldoFecha: string }> {
  const meses = mesesAtras(mes, n);
  const { data: cfg } = await sb.from("configuracion").select("valor").eq("clave", "finanzas").maybeSingle();
  const v = (cfg?.valor ?? {}) as { saldo_inicial?: number; saldo_fecha?: string };
  const saldoInicial = Number(v.saldo_inicial ?? 0);
  const saldoFecha = v.saldo_fecha && /^\d{4}-\d{2}-\d{2}$/.test(v.saldo_fecha) ? v.saldo_fecha : `${meses[0]}-01`;
  const inicio = saldoFecha < `${meses[0]}-01` ? saldoFecha : `${meses[0]}-01`;
  const fin = rangoMes(meses[meses.length - 1]).hasta;
  const [cobros, compras, gastos, pauta] = await Promise.all([
    sb.from("pedidos").select("total, pagado_en").gte("pagado_en", `${inicio}T06:00:00Z`).lt("pagado_en", `${fin}T06:00:00Z`).limit(20000),
    sb.from("compras").select("total, pagada_en").neq("estado", "anulada").gte("pagada_en", inicio).lt("pagada_en", fin),
    sb.from("gastos").select("total, pagado_en").gte("pagado_en", inicio).lt("pagado_en", fin),
    sb.from("gasto_pauta").select("monto, semana").gte("semana", inicio).lt("semana", fin),
  ]);
  // Cada movimiento con su fecha (día de El Salvador) y monto (+ entra, − sale)
  const diaSV = (iso: string) => new Date(new Date(iso).getTime() - 6 * 3_600_000).toISOString().slice(0, 10);
  type Mov = { dia: string; tipo: "cobrado" | "compras" | "gastos" | "pauta"; monto: number };
  const movs: Mov[] = [
    ...(cobros.data ?? []).map((x) => ({ dia: diaSV(String(x.pagado_en)), tipo: "cobrado" as const, monto: Number(x.total) })),
    ...(compras.data ?? []).map((x) => ({ dia: String(x.pagada_en), tipo: "compras" as const, monto: Number(x.total) })),
    ...(gastos.data ?? []).map((x) => ({ dia: String(x.pagado_en), tipo: "gastos" as const, monto: Number(x.total) })),
    ...(pauta.data ?? []).map((x) => ({ dia: String(x.semana), tipo: "pauta" as const, monto: Number(x.monto) })),
  ];
  const signo = (m: Mov) => (m.tipo === "cobrado" ? m.monto : -m.monto);
  // Saldo al empezar el primer mes de la tabla
  let saldo = saldoInicial + movs.filter((m) => m.dia >= saldoFecha && m.dia < `${meses[0]}-01`).reduce((s, m) => s + signo(m), 0);
  const filas: FilaFlujo[] = meses.map((mesI) => {
    const delMes = movs.filter((m) => m.dia.slice(0, 7) === mesI);
    const total = (t: Mov["tipo"]) => delMes.filter((m) => m.tipo === t).reduce((s, m) => s + m.monto, 0);
    const cobrado = total("cobrado");
    const neto = cobrado - total("compras") - total("gastos") - total("pauta");
    const finDelMes = rangoMes(mesI).hasta;
    let saldoMes: number | null = null;
    if (finDelMes > saldoFecha) {
      saldo += delMes.filter((m) => m.dia >= saldoFecha).reduce((s, m) => s + signo(m), 0);
      saldoMes = r2(saldo);
    }
    return {
      mes: mesI,
      cobrado: r2(cobrado),
      compras: r2(total("compras")),
      gastos: r2(total("gastos")),
      pauta: r2(total("pauta")),
      neto: r2(neto),
      saldo: saldoMes,
    };
  });
  return { filas, saldoInicial, saldoFecha };
}

export type LineaIva = {
  fecha: string;
  documento: string;
  numero: string;
  nombre: string;
  nit: string;
  gravado: number;
  iva: number;
  total: number;
};

/** IVA del mes: débito (ventas entregadas), crédito (compras y gastos con crédito fiscal) y el detalle para los libros */
export async function ivaDelMes(sb: SupabaseClient, mes: string) {
  const { desde, hasta, desdeTs, hastaTs } = rangoMes(mes);
  const [pedidos, { data: compras }, { data: gastos }] = await Promise.all([
    pedidosEntregados(sb, desdeTs, hastaTs),
    sb
      .from("compras")
      .select("fecha, numero, documento, subtotal, iva, total, proveedores(nombre, nit)")
      .eq("estado", "recibida")
      .gte("fecha", desde)
      .lt("fecha", hasta)
      .order("fecha"),
    sb.from("gastos").select("fecha, numero, documento, beneficiario, nit, monto, iva, total, descripcion").gte("fecha", desde).lt("fecha", hasta).order("fecha"),
  ]);
  const fechaSV = (iso: string) => new Date(new Date(iso).getTime() - 6 * 3_600_000).toISOString().slice(0, 10);
  const ventas: LineaIva[] = pedidos
    .sort((a, b) => (a.entregado_en ?? "").localeCompare(b.entregado_en ?? ""))
    .map((p) => {
      const total = Number(p.total);
      const iva = (total * IVA) / (1 + IVA);
      const ccf = p.facturacion?.tipo === "credito_fiscal";
      return {
        fecha: fechaSV(p.entregado_en ?? p.created_at),
        documento: ccf ? "Crédito fiscal" : "Consumidor final",
        numero: p.factura_numero ? `${p.factura_numero} (pedido #${p.numero})` : `Pedido #${p.numero} (sin factura anotada)`,
        nombre: ccf ? (p.facturacion?.nombre ?? "") : (p.entrega?.nombre ?? "Consumidor final"),
        nit: ccf ? [p.facturacion?.nit, p.facturacion?.nrc ? `NRC ${p.facturacion.nrc}` : ""].filter(Boolean).join(" · ") : "",
        gravado: r2(total - iva),
        iva: r2(iva),
        total: r2(total),
      };
    });
  const comprasIva: LineaIva[] = (
    (compras ?? []) as unknown as {
      fecha: string;
      numero: string | null;
      documento: string;
      subtotal: number;
      iva: number;
      total: number;
      proveedores: { nombre: string; nit: string | null } | null;
    }[]
  )
    .filter((c) => c.documento === "ccf")
    .map((c) => ({
      fecha: c.fecha,
      documento: "Crédito fiscal (compra)",
      numero: c.numero ?? "",
      nombre: c.proveedores?.nombre ?? "",
      nit: c.proveedores?.nit ?? "",
      gravado: Number(c.subtotal),
      iva: Number(c.iva),
      total: Number(c.total),
    }));
  const gastosIva: LineaIva[] = ((gastos ?? []) as (Pick<Gasto, "fecha" | "numero" | "documento" | "beneficiario" | "nit" | "monto" | "iva" | "total" | "descripcion">)[])
    .filter((g) => g.documento === "ccf" && Number(g.iva) > 0)
    .map((g) => ({
      fecha: g.fecha,
      documento: "Crédito fiscal (gasto)",
      numero: g.numero ?? "",
      nombre: g.beneficiario ?? g.descripcion,
      nit: g.nit ?? "",
      gravado: Number(g.monto),
      iva: Number(g.iva),
      total: Number(g.total),
    }));
  const libroCompras = [...comprasIva, ...gastosIva].sort((a, b) => a.fecha.localeCompare(b.fecha));
  const debito = r2(ventas.reduce((s, v) => s + v.iva, 0));
  const credito = r2(libroCompras.reduce((s, v) => s + v.iva, 0));
  return { ventas, libroCompras, debito, credito, aPagar: r2(debito - credito) };
}
