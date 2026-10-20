import "server-only";
import { createServiceClient } from "@/lib/supabase/server";
import { formatoAlmacenamiento } from "@/lib/listas/normalizar";
import { COMISION_PAQUETERA, COSTO_ENVIO_FIJO } from "@/lib/precios";
import { campanasEnvioGratis, preciosDeOferta } from "@/lib/tienda/calculo";
import { costosDeVariantes } from "@/lib/tienda/costos";
import { configTienda } from "@/lib/tienda/datos";
import { descuentoSinTarjeta, usd2 } from "@/lib/tienda/formato";

// Corregir un pedido desde el panel (solo administradores): productos, envío y un descuento extra.
// El total se recalcula igual que en la tienda (descuento sin tarjeta sobre los productos); el cupón y los
// Puntos Nera que el cliente ya usó se mantienen. La pantalla pide la cotización y el guardado vuelve a
// cotizar en el servidor, así lo que se guarda es exactamente lo que se vio.

export const r2 = (n: number) => Math.round(n * 100) / 100;

/** Estados en los que se pueden cambiar los productos (todavía no salió de bodega hacia el cliente) */
export const ESTADOS_PRODUCTOS = ["pendiente_confirmar", "confirmado", "pagado"] as const;
/** Estados en los que se pueden cambiar montos (envío, precios, descuento) */
export const ESTADOS_MONTOS = [...ESTADOS_PRODUCTOS, "en_camino"] as const;

export type LineaEdicion = {
  /** id de la línea que ya estaba en el pedido; vacío = producto nuevo */
  id?: string | null;
  v: string; // variante
  c: number; // cantidad
  precio?: number | null; // precio unitario (null = el que tenía o el vigente)
};

export type EntradaEdicion = {
  pedidoId: string;
  lineas: LineaEdicion[];
  envio: { modo: "normal" | "gratis" | "monto"; monto?: number | null; motivo?: string | null };
  extra: { tipo: "monto" | "pct"; valor: number; motivo?: string | null };
  quitarCombos: boolean;
};

export type CotizacionEdicion = {
  lineas: { id: string | null; varianteId: string | null; nombre: string; cantidad: number; precio: number; nueva: boolean; costo: number | null }[];
  subtotal: number;
  envio: number;
  envioMotivo: string | null;
  descuentoPago: number;
  descuentoCombos: number;
  descuentoCupon: number;
  descuentoPuntos: number;
  descuentoExtra: number;
  descuentoExtraMotivo: string | null;
  total: number;
  totalAnterior: number;
  pagado: number;
  /** total − pagado (positivo: le falta pagar; negativo: hay que devolverle) */
  saldo: number;
  costo: number;
  contribucion: number;
  bajoCosto: boolean;
  cambianProductos: boolean;
  /** Qué cambió, en palabras (para el historial y el correo) */
  cambios: string[];
  /** Campaña con envío gratis que aplica a algún producto (para sugerirla) */
  campana: string | null;
};

type PedidoActual = {
  id: string;
  numero: number;
  estado: string;
  forma_pago: string;
  subtotal: number;
  envio: number;
  envio_motivo: string | null;
  descuento: number;
  descuento_combos: number;
  descuento_cupon: number;
  descuento_puntos: number;
  descuento_extra: number;
  descuento_extra_motivo: string | null;
  total: number;
  pagado_en: string | null;
  factura_estado: string;
  inventario_descontado: boolean;
  lineas_pedido: { id: string; variante_id: string | null; nombre: string; cantidad: number; precio_unitario: number }[];
  pagos: { monto: number; estado: string }[];
};

type FilaVar = {
  id: string;
  color: string | null;
  ram_gb: number | null;
  almacenamiento_gb: number | null;
  precio: number;
  activo: boolean;
  productos: { id: string; nombre: string } | null;
};

const nombreDe = (f: FilaVar) => {
  const memoria =
    f.almacenamiento_gb == null
      ? null
      : f.ram_gb == null
        ? formatoAlmacenamiento(f.almacenamiento_gb)
        : `${f.ram_gb} GB + ${formatoAlmacenamiento(f.almacenamiento_gb)}`;
  return [f.productos?.nombre, memoria, f.color].filter(Boolean).join(" ");
};

export async function leerPedidoParaEditar(pedidoId: string): Promise<PedidoActual> {
  const sb = createServiceClient();
  const { data, error } = await sb
    .from("pedidos")
    .select(
      `id, numero, estado, forma_pago, subtotal, envio, envio_motivo, descuento, descuento_combos, descuento_cupon, descuento_puntos,
       descuento_extra, descuento_extra_motivo, total, pagado_en, factura_estado, inventario_descontado,
       lineas_pedido(id, variante_id, nombre, cantidad, precio_unitario), pagos(monto, estado)`
    )
    .eq("id", pedidoId)
    .single();
  if (error || !data) throw new Error("No se encontró el pedido.");
  return data as unknown as PedidoActual;
}

/** Por qué no se puede editar (o null si se puede) */
export async function bloqueoEdicion(p: Pick<PedidoActual, "id" | "estado" | "factura_estado">): Promise<string | null> {
  if (!(ESTADOS_MONTOS as readonly string[]).includes(p.estado)) {
    return p.estado === "entregado"
      ? "El pedido ya se entregó: los cambios se hacen como devolución o nota de crédito."
      : "Un pedido cancelado o devuelto no se puede editar.";
  }
  if (p.factura_estado === "emitida") return "Ya tiene factura emitida: para cambiar montos hay que anularla o hacer una nota de crédito.";
  const { count } = await createServiceClient()
    .from("dte_documentos")
    .select("id", { count: "exact", head: true })
    .eq("pedido_id", p.id)
    .in("tipo_dte", ["01", "03"])
    .in("estado", ["pendiente", "procesado", "contingencia"])
    .eq("prueba", false);
  if (count) return "Ya tiene factura electrónica: para cambiar montos hay que anularla o hacer una nota de crédito.";
  return null;
}

const texto = (s: string | null | undefined, max = 120) => (s ?? "").replace(/\s+/g, " ").trim().slice(0, max);

export async function cotizarEdicion(e: EntradaEdicion, p?: PedidoActual): Promise<CotizacionEdicion> {
  const pedido = p ?? (await leerPedidoParaEditar(e.pedidoId));
  const config = await configTienda();
  const puedeProductos = (ESTADOS_PRODUCTOS as readonly string[]).includes(pedido.estado);

  // 1) Líneas: las que ya estaban (por id) y las nuevas
  const actuales = new Map(pedido.lineas_pedido.map((l) => [l.id, l]));
  const pedidas = e.lineas.filter((l) => Number(l.c) > 0);
  if (!pedidas.length) throw new Error("El pedido tiene que llevar al menos un producto. Para anularlo, cancelalo.");
  if (pedidas.length > 30) throw new Error("Máximo 30 productos distintos por pedido.");
  const idsVar = [...new Set(pedidas.filter((l) => !l.id || !actuales.has(l.id)).map((l) => l.v))];
  const sb = createServiceClient();
  const [{ data: vs }, ofertas, campanas] = await Promise.all([
    idsVar.length
      ? sb.from("variantes").select("id, color, ram_gb, almacenamiento_gb, precio, activo, productos(id, nombre)").in("id", idsVar)
      : Promise.resolve({ data: [] as unknown[] }),
    idsVar.length ? preciosDeOferta(idsVar) : Promise.resolve(new Map<string, { precio: number; nombre: string; fin: string | null }>()),
    campanasEnvioGratis(),
  ]);
  const varPorId = new Map(((vs ?? []) as FilaVar[]).map((v) => [v.id, v]));

  const lineas: CotizacionEdicion["lineas"] = [];
  for (const l of pedidas) {
    const cantidad = Math.floor(Number(l.c));
    if (!(cantidad >= 1 && cantidad <= 50)) throw new Error("La cantidad debe estar entre 1 y 50.");
    const pedirPrecio = l.precio === null || l.precio === undefined || String(l.precio) === "" ? null : r2(Number(l.precio));
    if (pedirPrecio !== null && !(pedirPrecio > 0)) throw new Error("El precio de cada producto debe ser mayor que cero.");
    const actual = l.id ? actuales.get(l.id) : undefined;
    if (actual) {
      lineas.push({
        id: actual.id,
        varianteId: actual.variante_id,
        nombre: actual.nombre,
        cantidad,
        precio: pedirPrecio ?? Number(actual.precio_unitario),
        nueva: false,
        costo: null,
      });
    } else {
      const f = varPorId.get(l.v);
      if (!f || !f.activo || !(Number(f.precio) > 0) || !f.productos) throw new Error("Uno de los productos nuevos ya no está disponible o no tiene precio.");
      const normal = Number(f.precio);
      const o = ofertas.get(f.id);
      lineas.push({
        id: null,
        varianteId: f.id,
        nombre: nombreDe(f),
        cantidad,
        precio: pedirPrecio ?? (o && o.precio < normal ? o.precio : normal),
        nueva: true,
        costo: null,
      });
    }
  }
  // ¿Cambian los productos o las cantidades? (los precios solos no tocan la bodega)
  const firma = (xs: { varianteId: string | null; id: string | null; cantidad: number }[]) =>
    xs.map((x) => `${x.id ?? x.varianteId}:${x.cantidad}`).sort().join(",");
  const cambianProductos = firma(lineas) !== firma(pedido.lineas_pedido.map((l) => ({ id: l.id, varianteId: l.variante_id, cantidad: l.cantidad })));
  if (cambianProductos && !puedeProductos) {
    throw new Error("El pedido ya va en camino: se pueden cambiar montos (envío, precios, descuento), no los productos.");
  }

  // 2) Montos
  const subtotal = r2(lineas.reduce((s, l) => s + l.precio * l.cantidad, 0));
  const descuentoPago = descuentoSinTarjeta(subtotal, pedido.forma_pago, config.descuentoSinTarjeta);
  const campana = await campanaDeVariantes(lineas.map((l) => l.varianteId).filter(Boolean) as string[], campanas);
  let envio: number;
  let envioMotivo: string | null;
  if (e.envio.modo === "gratis") {
    envio = 0;
    envioMotivo = texto(e.envio.motivo, 60) || null;
    if (!envioMotivo) throw new Error("Escribí por qué el envío es gratis (ej. Octubre Naranja o Cortesía).");
  } else if (e.envio.modo === "monto") {
    envio = r2(Number(e.envio.monto));
    if (!(envio >= 0 && envio <= 100)) throw new Error("El envío debe estar entre $0 y $100.");
    envioMotivo = texto(e.envio.motivo, 60) || null;
  } else {
    envio = Number(config.envio.costo) || 0;
    envioMotivo = null;
  }
  const descuentoCombos = e.quitarCombos ? 0 : Number(pedido.descuento_combos) || 0;
  const descuentoCupon = Number(pedido.descuento_cupon) || 0;
  const descuentoPuntos = Number(pedido.descuento_puntos) || 0;
  const valor = Number(e.extra.valor) || 0;
  if (valor < 0) throw new Error("El descuento extra no puede ser negativo.");
  if (e.extra.tipo === "pct" && valor > 100) throw new Error("El descuento extra no puede pasar de 100%.");
  const descuentoExtra = r2(e.extra.tipo === "pct" ? (subtotal * valor) / 100 : valor);
  const descuentoExtraMotivo = descuentoExtra > 0 ? texto(e.extra.motivo, 80) || null : null;
  if (descuentoExtra > 0 && !descuentoExtraMotivo) throw new Error("Escribí el motivo del descuento extra (lo ve el cliente).");
  const total = r2(subtotal + envio - descuentoPago - descuentoCombos - descuentoCupon - descuentoPuntos - descuentoExtra);
  if (total < 0) throw new Error("Los descuentos superan el valor del pedido.");

  // 3) Pagos, costo y contribución
  const pagado = r2(pedido.pagos.filter((x) => x.estado === "aprobado").reduce((s, x) => s + Number(x.monto), 0));
  const costos = await costosDeLineas(pedido.id, lineas);
  for (const l of lineas) l.costo = costos.get(l.id ?? `v:${l.varianteId}`) ?? null;
  const costo = r2(lineas.reduce((s, l) => s + (l.costo ?? 0) * l.cantidad, 0));
  const contribucion = r2(total - costo - COSTO_ENVIO_FIJO - COMISION_PAQUETERA * total);

  // 4) Qué cambió, en palabras
  const cambios: string[] = [];
  const antes = new Map(pedido.lineas_pedido.map((l) => [l.id, l]));
  for (const l of lineas) {
    const a = l.id ? antes.get(l.id) : undefined;
    if (!a) cambios.push(`Se agregó ${l.cantidad} × ${l.nombre} (${usd2(l.precio)} c/u)`);
    else {
      if (a.cantidad !== l.cantidad) cambios.push(`${l.nombre}: cantidad ${a.cantidad} → ${l.cantidad}`);
      if (Math.abs(Number(a.precio_unitario) - l.precio) > 0.004) cambios.push(`${l.nombre}: precio ${usd2(Number(a.precio_unitario))} → ${usd2(l.precio)}`);
    }
  }
  for (const a of pedido.lineas_pedido) if (!lineas.some((l) => l.id === a.id)) cambios.push(`Se quitó ${a.cantidad} × ${a.nombre}`);
  if (Math.abs(Number(pedido.envio) - envio) > 0.004 || (pedido.envio_motivo ?? null) !== envioMotivo) {
    const t = (n: number, m: string | null) => `${n ? usd2(n) : "Gratis"}${m ? ` (${m})` : ""}`;
    cambios.push(`Envío: ${t(Number(pedido.envio), pedido.envio_motivo)} → ${t(envio, envioMotivo)}`);
  }
  if (Math.abs(Number(pedido.descuento_extra) - descuentoExtra) > 0.004 || (pedido.descuento_extra_motivo ?? null) !== descuentoExtraMotivo) {
    cambios.push(
      descuentoExtra > 0
        ? `Descuento ${descuentoExtraMotivo ? `«${descuentoExtraMotivo}» ` : ""}de ${usd2(descuentoExtra)}${Number(pedido.descuento_extra) > 0 ? ` (antes ${usd2(Number(pedido.descuento_extra))})` : ""}`
        : `Se quitó el descuento de ${usd2(Number(pedido.descuento_extra))}`
    );
  }
  if (descuentoCombos !== (Number(pedido.descuento_combos) || 0)) cambios.push(`Se quitó el descuento de combos (${usd2(Number(pedido.descuento_combos))})`);
  if (Math.abs(Number(pedido.descuento) - descuentoPago) > 0.004 && !cambios.length) {
    cambios.push(`Descuento por ${pedido.forma_pago === "contra_entrega" ? "efectivo" : "transferencia"}: ${usd2(Number(pedido.descuento))} → ${usd2(descuentoPago)}`);
  }

  return {
    lineas,
    subtotal,
    envio,
    envioMotivo,
    descuentoPago,
    descuentoCombos,
    descuentoCupon,
    descuentoPuntos,
    descuentoExtra,
    descuentoExtraMotivo,
    total,
    totalAnterior: Number(pedido.total),
    pagado,
    saldo: r2(total - pagado),
    costo,
    contribucion,
    bajoCosto: contribucion < 0,
    cambianProductos,
    cambios,
    campana,
  };
}

async function campanaDeVariantes(ids: string[], campanas: Map<string, string>) {
  if (!ids.length || !campanas.size) return null;
  const { data } = await createServiceClient().from("variantes").select("producto_id").in("id", ids);
  for (const v of data ?? []) {
    const c = campanas.get(v.producto_id as string);
    if (c) return c;
  }
  return null;
}

/** Costo de cada línea: el guardado al vender (si hay) o el costo actual de la variante */
async function costosDeLineas(pedidoId: string, lineas: CotizacionEdicion["lineas"]) {
  const r = new Map<string, number>();
  const ids = lineas.map((l) => l.id).filter(Boolean) as string[];
  if (ids.length) {
    const { data } = await createServiceClient().from("lineas_pedido").select("id, costo_unitario").eq("pedido_id", pedidoId).in("id", ids);
    for (const x of data ?? []) if (x.costo_unitario !== null) r.set(x.id as string, Number(x.costo_unitario));
  }
  const faltan = lineas.filter((l) => l.varianteId && !(l.id && r.has(l.id))).map((l) => l.varianteId!);
  if (faltan.length) {
    const c = await costosDeVariantes([...new Set(faltan)]).catch(() => new Map<string, number>());
    for (const l of lineas) {
      if (l.id && r.has(l.id)) continue;
      const v = l.varianteId ? c.get(l.varianteId) : undefined;
      if (v !== undefined) r.set(l.id ?? `v:${l.varianteId}`, v);
    }
  }
  return r;
}
