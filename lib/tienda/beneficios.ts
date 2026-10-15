import "server-only";
import { createServiceClient } from "@/lib/supabase/server";
import { calcularCarrito, type ResumenCarrito } from "@/lib/tienda/calculo";
import { costosDeVariantes, descuentoMaximo } from "@/lib/tienda/costos";
import { descuentoSinTarjeta, leerPorcentajeSinTarjeta } from "@/lib/tienda/formato";

// Beneficios de la fase 4: cupones y Puntos Nera, y el cálculo completo del pedido.
// Regla de Gabriel: el descuento sin tarjeta (efectivo o transferencia, % en Configuración) siempre aplica y además el cliente
// usa UN beneficio: un cupón o sus puntos. Ningún beneficio deja el pedido bajo costo.

const r2 = (n: number) => Math.round(n * 100) / 100;
const CATEGORIAS_EQUIPO = new Set(["celulares", "tablets"]);

// ---------------------------------------------------------------------------
// Reglas editables (Configuración)
// ---------------------------------------------------------------------------
export type ReglasPuntos = {
  activo: boolean;
  dolares_por_punto: number;
  valor_punto: number;
  vence_meses: number;
  minimo_canje: number;
};
export type ReglasRegalo = { activo: boolean; monto: number; minimo: number };

export async function reglasBeneficios(): Promise<{ puntos: ReglasPuntos; regalo: ReglasRegalo; descuentoSinTarjeta: number }> {
  const { data } = await createServiceClient()
    .from("configuracion")
    .select("clave, valor")
    .in("clave", ["puntos", "regalo_cumple", "descuento_sin_tarjeta"]);
  const c = new Map((data ?? []).map((f) => [f.clave as string, (f.valor ?? {}) as Record<string, unknown>]));
  const p = c.get("puntos") ?? {};
  const g = c.get("regalo_cumple") ?? {};
  return {
    puntos: {
      activo: p.activo === true,
      dolares_por_punto: Number(p.dolares_por_punto) > 0 ? Number(p.dolares_por_punto) : 10,
      valor_punto: Number(p.valor_punto) > 0 ? Number(p.valor_punto) : 0.1,
      vence_meses: Number(p.vence_meses) > 0 ? Number(p.vence_meses) : 12,
      minimo_canje: Number(p.minimo_canje) >= 0 ? Number(p.minimo_canje) : 0,
    },
    regalo: {
      activo: g.activo === true,
      monto: Number(g.monto) > 0 ? Number(g.monto) : 5,
      minimo: Number(g.minimo) >= 0 ? Number(g.minimo) : 20,
    },
    descuentoSinTarjeta: leerPorcentajeSinTarjeta(c.get("descuento_sin_tarjeta")),
  };
}

// ---------------------------------------------------------------------------
// Puntos Nera: saldo con vencimiento (los puntos más viejos se usan primero)
// ---------------------------------------------------------------------------
export type MovimientoPuntos = {
  id: string;
  pedido_id: string | null;
  tipo: "ganados" | "canje" | "reintegro" | "anulados" | "ajuste";
  puntos: number;
  vence_en: string | null;
  nota: string | null;
  created_at: string;
};

export type SaldoPuntos = {
  saldo: number;
  vencidos: number;
  porVencer: { puntos: number; fecha: string } | null;
  movimientos: (MovimientoPuntos & { numero: number | null })[];
};

export function calcularSaldo(movs: MovimientoPuntos[], ahora = new Date()): Omit<SaldoPuntos, "movimientos"> {
  type Lote = { pedido: string | null; restante: number; vence: number };
  const lotes: Lote[] = [];
  const orden = [...movs].sort((a, b) => a.created_at.localeCompare(b.created_at));
  for (const m of orden) {
    const t = new Date(m.created_at).getTime();
    if (m.puntos > 0) {
      lotes.push({ pedido: m.pedido_id, restante: m.puntos, vence: m.vence_en ? new Date(m.vence_en).getTime() : Infinity });
      continue;
    }
    let falta = -m.puntos;
    // Al anular los puntos de un pedido, se quitan primero los de ese mismo pedido
    const candidatos = [
      ...lotes.filter((l) => m.tipo === "anulados" && l.pedido === m.pedido_id),
      ...lotes.filter((l) => !(m.tipo === "anulados" && l.pedido === m.pedido_id)).sort((a, b) => a.vence - b.vence),
    ];
    for (const l of candidatos) {
      if (falta <= 0) break;
      if (l.restante <= 0 || l.vence <= t) continue;
      const usa = Math.min(falta, l.restante);
      l.restante -= usa;
      falta -= usa;
    }
  }
  const ya = ahora.getTime();
  const vivos = lotes.filter((l) => l.restante > 0 && l.vence > ya).sort((a, b) => a.vence - b.vence);
  const en60 = ya + 60 * 86_400_000;
  const proximo = vivos.find((l) => l.vence <= en60);
  return {
    saldo: vivos.reduce((s, l) => s + l.restante, 0),
    vencidos: lotes.filter((l) => l.restante > 0 && l.vence <= ya).reduce((s, l) => s + l.restante, 0),
    porVencer: proximo
      ? { puntos: vivos.filter((l) => l.vence === proximo.vence).reduce((s, l) => s + l.restante, 0), fecha: new Date(proximo.vence).toISOString() }
      : null,
  };
}

export async function saldoPuntos(clienteId: string): Promise<SaldoPuntos> {
  const { data } = await createServiceClient()
    .from("puntos_movimientos")
    .select("id, pedido_id, tipo, puntos, vence_en, nota, created_at, pedidos(numero)")
    .eq("cliente_id", clienteId)
    .order("created_at", { ascending: false })
    .limit(10000);
  const movs = ((data ?? []) as unknown as (MovimientoPuntos & { pedidos: { numero: number } | null })[]).map((m) => ({
    ...m,
    numero: m.pedidos?.numero ?? null,
  }));
  return { ...calcularSaldo(movs), movimientos: movs };
}

// ---------------------------------------------------------------------------
// Cupones
// ---------------------------------------------------------------------------
export type Cupon = {
  id: string;
  codigo: string;
  tipo: "porcentaje" | "monto" | "envio_gratis";
  valor: number;
  min_pedido: number;
  usos_max: number | null;
  por_cliente: number | null;
  inicio: string | null;
  fin: string | null;
  activo: boolean;
  solo_accesorios: boolean;
  tope: number | null;
  cliente_id: string | null;
  descripcion: string | null;
};

export const normalizarCodigo = (c: string) => c.trim().toUpperCase().replace(/\s+/g, "");

/** Revisa un cupón. Con correo vacío no revisa los límites por cliente (se revisan al confirmar). */
async function buscarCupon(
  codigo: string,
  correo: string
): Promise<{ ok: true; cupon: Cupon } | { ok: false; mensaje: string }> {
  const sb = createServiceClient();
  const { data } = await sb
    .from("cupones")
    .select("id, codigo, tipo, valor, min_pedido, usos_max, por_cliente, inicio, fin, activo, solo_accesorios, tope, cliente_id, descripcion")
    .eq("codigo", normalizarCodigo(codigo))
    .maybeSingle();
  const c = data as Cupon | null;
  const ahora = Date.now();
  if (!c || !c.activo) return { ok: false, mensaje: "Ese cupón no existe o ya no está activo." };
  if (c.inicio && new Date(c.inicio).getTime() > ahora) return { ok: false, mensaje: "Ese cupón todavía no empieza." };
  if (c.fin && new Date(c.fin).getTime() < ahora) return { ok: false, mensaje: "Ese cupón ya venció." };

  const vigentes = () =>
    sb.from("pedidos").select("id", { count: "exact", head: true }).eq("cupon_id", c.id).not("estado", "in", "(cancelado,devuelto)");
  if (c.usos_max !== null) {
    const { count } = await vigentes();
    if ((count ?? 0) >= c.usos_max) return { ok: false, mensaje: "Ese cupón ya se agotó." };
  }
  const correoOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correo);
  if (c.cliente_id) {
    if (!correoOk) return { ok: false, mensaje: "Escribí tu correo arriba para usar este cupón personal." };
    const { data: dueño } = await sb.from("clientes").select("correo").eq("id", c.cliente_id).maybeSingle();
    if ((dueño?.correo ?? "").toLowerCase() !== correo) return { ok: false, mensaje: "Este cupón es personal: usalo con el correo al que te lo enviamos." };
  }
  if (c.por_cliente !== null && correoOk) {
    const { count } = await vigentes().eq("entrega->>correo", correo);
    if ((count ?? 0) >= c.por_cliente) return { ok: false, mensaje: "Ya usaste este cupón." };
  }
  return { ok: true, cupon: c };
}

/** Usos vigentes de un cupón (sin cancelados ni devueltos), en total y por correo */
export async function usosDeCupon(cuponId: string, correo: string) {
  const sb = createServiceClient();
  const base = () =>
    sb.from("pedidos").select("id", { count: "exact", head: true }).eq("cupon_id", cuponId).not("estado", "in", "(cancelado,devuelto)");
  const [{ data: c }, { count: total }, { count: delCliente }] = await Promise.all([
    sb.from("cupones").select("usos_max, por_cliente").eq("id", cuponId).single(),
    base(),
    base().eq("entrega->>correo", correo.trim().toLowerCase()),
  ]);
  return { max: c?.usos_max ?? null, porCliente: c?.por_cliente ?? null, total: total ?? 0, delCliente: delCliente ?? 0 };
}

// ---------------------------------------------------------------------------
// Cálculo completo del pedido (checkout y creación del pedido usan exactamente esto)
// ---------------------------------------------------------------------------
export type Cotizacion = {
  resumen: ResumenCarrito;
  /** Descuento por efectivo o transferencia (% en Configuración) */
  descuentoPago: number;
  /** % de descuento sin tarjeta con el que se calculó */
  porcentajeSinTarjeta: number;
  /** Lo que ahorraría con efectivo o transferencia (para el aviso al elegir tarjeta) */
  descuentoPagoPosible: number;
  cupon: { id: string; codigo: string; monto: number; recortado: boolean; envioGratis: boolean } | null;
  cuponError: string | null;
  puntos: { usados: number; monto: number; recortado: boolean } | null;
  /** Saldo de puntos del cliente con sesión (null sin sesión o programa apagado) */
  saldoPuntos: number | null;
  valorPunto: number;
  total: number;
};

export async function cotizarPedido(e: {
  lineas: unknown;
  formaPago: string;
  cupon?: string;
  usarPuntos?: boolean;
  correo?: string;
  /** Cliente de la sesión de Google (los puntos solo se usan con sesión) */
  clientePuntos?: string | null;
}): Promise<Cotizacion> {
  const [resumen, reglas] = await Promise.all([calcularCarrito(e.lineas), reglasBeneficios()]);
  const correo = (e.correo ?? "").trim().toLowerCase();
  const pct = reglas.descuentoSinTarjeta;
  const descuentoPago = descuentoSinTarjeta(resumen.productos, e.formaPago, pct);
  const descuentoPagoPosible = descuentoSinTarjeta(resumen.productos, "transferencia", pct);
  const cobradoSinBeneficio = r2(resumen.productos - descuentoPago + resumen.envio);

  const saldo =
    e.clientePuntos && reglas.puntos.activo ? (await saldoPuntos(e.clientePuntos)).saldo : null;
  const base: Cotizacion = {
    resumen,
    descuentoPago,
    porcentajeSinTarjeta: pct,
    descuentoPagoPosible,
    cupon: null,
    cuponError: null,
    puntos: null,
    saldoPuntos: saldo,
    valorPunto: reglas.puntos.valor_punto,
    total: cobradoSinBeneficio,
  };
  if (!resumen.lineas.length) return base;

  const codigo = normalizarCodigo(e.cupon ?? "");
  const quierePuntos = !codigo && e.usarPuntos && saldo !== null && saldo > 0;
  if (!codigo && !quierePuntos) return base;

  // Tope para no vender bajo costo
  const costos = await costosDeVariantes(resumen.lineas.map((l) => l.varianteId));
  const costoTotal = resumen.lineas.reduce((s, l) => s + (costos.get(l.varianteId) ?? 0) * l.cantidad, 0);
  const maximo = Math.min(descuentoMaximo(cobradoSinBeneficio, costoTotal), r2(resumen.productos - descuentoPago));

  if (codigo) {
    const r = await buscarCupon(codigo, correo);
    if (!r.ok) return { ...base, cuponError: r.mensaje };
    const c = r.cupon;
    if (resumen.productos < Number(c.min_pedido)) {
      return { ...base, cuponError: `Este cupón es para compras desde $${Number(c.min_pedido).toFixed(2)}.` };
    }
    const baseCupon = c.solo_accesorios
      ? r2(resumen.lineas.filter((l) => !CATEGORIAS_EQUIPO.has(l.categoria)).reduce((s, l) => s + l.total, 0))
      : resumen.productos;
    if (c.solo_accesorios && baseCupon <= 0) return { ...base, cuponError: "Este cupón es solo para accesorios." };
    let pedido =
      c.tipo === "porcentaje"
        ? r2((baseCupon * Number(c.valor)) / 100)
        : c.tipo === "monto"
          ? Math.min(Number(c.valor), baseCupon)
          : resumen.envio;
    if (c.tipo === "porcentaje" && c.tope !== null) pedido = Math.min(pedido, Number(c.tope));
    if (c.tipo === "envio_gratis" && resumen.envio === 0) return { ...base, cuponError: "Tu pedido ya tiene envío gratis." };
    // Si hay que recortar, a dólares enteros: así no se puede deducir el costo exacto
    const monto = pedido <= maximo ? r2(pedido) : Math.floor(maximo);
    if (monto <= 0) return { ...base, cuponError: "Este pedido ya tiene el mejor precio posible: el cupón no se puede usar en él." };
    return {
      ...base,
      cupon: { id: c.id, codigo: c.codigo, monto, recortado: monto < pedido, envioGratis: c.tipo === "envio_gratis" },
      total: r2(cobradoSinBeneficio - monto),
    };
  }

  // Puntos: se usan todos los que alcancen, sin pasar del tope
  if (saldo! < reglas.puntos.minimo_canje) return base;
  const valor = reglas.puntos.valor_punto;
  const pedidoMonto = r2(saldo! * valor);
  const tope = pedidoMonto <= maximo ? pedidoMonto : Math.floor(maximo);
  const usados = Math.floor((tope + 1e-9) / valor);
  if (usados <= 0) return base;
  const monto = r2(usados * valor);
  return {
    ...base,
    puntos: { usados, monto, recortado: usados < saldo! },
    total: r2(cobradoSinBeneficio - monto),
  };
}

// ---------------------------------------------------------------------------
// Ganar y devolver puntos
// ---------------------------------------------------------------------------

/** Da los puntos de un pedido entregado y pagado (una sola vez). Devuelve los puntos dados. */
export async function otorgarPuntos(pedidoId: string): Promise<number> {
  const sb = createServiceClient();
  const [{ data: p }, reglas] = await Promise.all([
    sb.from("pedidos").select("id, cliente_id, estado, pagado_en, total, envio, descuento_cupon, cupones(tipo)").eq("id", pedidoId).single(),
    reglasBeneficios(),
  ]);
  if (!p || !p.cliente_id || p.estado !== "entregado" || !p.pagado_en || !reglas.puntos.activo) return 0;
  // Lo pagado por productos: sin envío (si un cupón regaló el envío, ese descuento no cuenta)
  const envioGratisCupon = (p.cupones as unknown as { tipo: string } | null)?.tipo === "envio_gratis" ? Number(p.descuento_cupon) : 0;
  const puntos = Math.floor((Number(p.total) - Number(p.envio) + envioGratisCupon) / reglas.puntos.dolares_por_punto);
  if (puntos <= 0) return 0;
  const vence = new Date();
  vence.setMonth(vence.getMonth() + reglas.puntos.vence_meses);
  const { error } = await sb.from("puntos_movimientos").insert({
    cliente_id: p.cliente_id,
    pedido_id: p.id,
    tipo: "ganados",
    puntos,
    vence_en: vence.toISOString(),
    nota: "Pedido entregado y pagado",
    usuario: "sistema",
  });
  if (error) {
    if (error.code !== "23505") console.error("otorgarPuntos", error.message);
    return 0;
  }
  await sb.from("pedido_eventos").insert({
    pedido_id: p.id,
    estado_anterior: p.estado,
    estado_nuevo: p.estado,
    nota: `El cliente ganó ${puntos} Puntos Nera`,
    usuario: "sistema",
  });
  return puntos;
}

/** Al cancelar o devolver: le regresa los puntos que usó y le quita los que ganó con ese pedido. */
export async function revertirPuntos(pedidoId: string, usuario: string) {
  const sb = createServiceClient();
  const [{ data: movs }, reglas, { data: p }] = await Promise.all([
    sb.from("puntos_movimientos").select("tipo, puntos, cliente_id").eq("pedido_id", pedidoId),
    reglasBeneficios(),
    sb.from("pedidos").select("estado").eq("id", pedidoId).single(),
  ]);
  const de = (t: string) => (movs ?? []).find((m) => m.tipo === t);
  const notas: string[] = [];
  const canje = de("canje");
  if (canje && !de("reintegro")) {
    const vence = new Date();
    vence.setMonth(vence.getMonth() + reglas.puntos.vence_meses);
    const { error } = await sb.from("puntos_movimientos").insert({
      cliente_id: canje.cliente_id,
      pedido_id: pedidoId,
      tipo: "reintegro",
      puntos: -canje.puntos,
      vence_en: vence.toISOString(),
      nota: "Pedido cancelado: se devuelven los puntos usados",
      usuario,
    });
    if (!error) notas.push(`se le devolvieron ${-canje.puntos} puntos que había usado`);
  }
  const ganados = de("ganados");
  if (ganados && !de("anulados")) {
    const { error } = await sb.from("puntos_movimientos").insert({
      cliente_id: ganados.cliente_id,
      pedido_id: pedidoId,
      tipo: "anulados",
      puntos: -ganados.puntos,
      nota: "Pedido cancelado o devuelto: se quitan los puntos ganados",
      usuario,
    });
    if (!error) notas.push(`se le quitaron ${ganados.puntos} puntos que había ganado`);
  }
  if (notas.length && p) {
    await sb.from("pedido_eventos").insert({
      pedido_id: pedidoId,
      estado_anterior: p.estado,
      estado_nuevo: p.estado,
      nota: `Puntos Nera: ${notas.join(" y ")}`,
      usuario: "sistema",
    });
  }
}
