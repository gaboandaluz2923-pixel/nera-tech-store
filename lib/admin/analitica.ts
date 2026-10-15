import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { todo } from "@/lib/admin/catalogo";
import { COMISION_PAQUETERA, COSTO_ENVIO_FIJO } from "@/lib/precios";
import { costosDeVariantes } from "@/lib/tienda/costos";

// Números del panel de Analítica. Semanas de lunes a domingo en hora de El Salvador (UTC−6).

const r2 = (n: number) => Math.round(n * 100) / 100;

/** Lunes (YYYY-MM-DD) de la semana de una fecha, en hora de El Salvador */
export function lunesSV(fecha: Date): string {
  const sv = new Date(fecha.getTime() - 6 * 3_600_000);
  const dia = (sv.getUTCDay() + 6) % 7; // 0 = lunes
  sv.setUTCDate(sv.getUTCDate() - dia);
  return sv.toISOString().slice(0, 10);
}

export function ultimasSemanas(n: number, ahora = new Date()): string[] {
  const lista: string[] = [];
  const lunes = new Date(`${lunesSV(ahora)}T12:00:00Z`);
  for (let i = 0; i < n; i++) {
    const d = new Date(lunes.getTime() - i * 7 * 86_400_000);
    lista.push(d.toISOString().slice(0, 10));
  }
  return lista;
}

export type FilaSemana = {
  semana: string;
  sesiones: number;
  vieronProducto: number;
  agregaron: number;
  checkout: number;
  whatsapp: number;
  pedidos: number;
  ventas: number;
  contribucion: number;
  gasto: number;
  conversaciones: number;
};

type PedidoFila = {
  id: string;
  total: number;
  created_at: string;
  origen: string | null;
  lineas_pedido: { variante_id: string | null; cantidad: number; costo_unitario: number | null }[];
};

export async function datosAnalitica(sb: SupabaseClient, semanas = 8) {
  const lista = ultimasSemanas(semanas);
  const desde = new Date(`${lista[lista.length - 1]}T06:00:00Z`).toISOString(); // lunes 00:00 SV
  const hace30 = new Date(Date.now() - 30 * 86_400_000).toISOString();

  const [embudo, productosEv, origenes, whatsapp, gastos, pedidos, ventas30, productos, busquedas] = await Promise.all([
    sb.rpc("analitica_embudo", { desde }),
    sb.rpc("analitica_productos", { desde: hace30 }),
    sb.rpc("analitica_origenes", { desde: hace30 }),
    sb.rpc("analitica_whatsapp", { desde: hace30 }),
    sb.from("gasto_pauta").select("id, semana, canal, monto, conversaciones, notas").gte("semana", lista[lista.length - 1]).order("semana", { ascending: false }),
    todo<PedidoFila>((a, b) =>
      sb
        .from("pedidos")
        .select("id, total, created_at, origen, lineas_pedido(variante_id, cantidad, costo_unitario)")
        .gte("created_at", desde)
        .not("estado", "in", "(cancelado,devuelto)")
        .order("created_at")
        .range(a, b)
    ),
    sb.rpc("ventas_por_producto", { desde: hace30 }),
    sb.from("productos").select("id, nombre, slug").neq("estado", "oculto"),
    sb.rpc("analitica_busquedas", { desde: hace30 }),
  ]);
  for (const r of [embudo, productosEv, origenes, whatsapp, gastos, ventas30, productos, busquedas]) if (r.error) throw r.error;

  // Costo de las líneas viejas (antes de guardar el costo al vender): el de hoy
  const sinCosto = [...new Set(pedidos.flatMap((p) => p.lineas_pedido.filter((l) => l.costo_unitario === null && l.variante_id).map((l) => l.variante_id!)))];
  const costosHoy = await costosDeVariantes(sinCosto);

  const filas = new Map<string, FilaSemana>(
    lista.map((s) => [s, { semana: s, sesiones: 0, vieronProducto: 0, agregaron: 0, checkout: 0, whatsapp: 0, pedidos: 0, ventas: 0, contribucion: 0, gasto: 0, conversaciones: 0 }])
  );
  for (const e of (embudo.data ?? []) as { semana: string; sesiones: number; vieron_producto: number; agregaron: number; checkout: number; whatsapp: number }[]) {
    const f = filas.get(e.semana);
    if (!f) continue;
    Object.assign(f, {
      sesiones: Number(e.sesiones),
      vieronProducto: Number(e.vieron_producto),
      agregaron: Number(e.agregaron),
      checkout: Number(e.checkout),
      whatsapp: Number(e.whatsapp),
    });
  }
  const pedidosPorOrigen = new Map<string, number>();
  for (const p of pedidos) {
    const f = filas.get(lunesSV(new Date(p.created_at)));
    pedidosPorOrigen.set(p.origen || "web", (pedidosPorOrigen.get(p.origen || "web") ?? 0) + 1);
    if (!f) continue;
    const total = Number(p.total);
    const costo = p.lineas_pedido.reduce((s, l) => s + (l.costo_unitario !== null ? Number(l.costo_unitario) : (costosHoy.get(l.variante_id ?? "") ?? 0)) * l.cantidad, 0);
    f.pedidos++;
    f.ventas = r2(f.ventas + total);
    f.contribucion = r2(f.contribucion + total - costo - COSTO_ENVIO_FIJO - COMISION_PAQUETERA * total);
  }
  for (const g of (gastos.data ?? []) as { semana: string; monto: number; conversaciones: number | null }[]) {
    const f = filas.get(lunesSV(new Date(`${g.semana}T12:00:00Z`)));
    if (!f) continue;
    f.gasto = r2(f.gasto + Number(g.monto));
    f.conversaciones += Number(g.conversaciones ?? 0);
  }

  const nombres = new Map(((productos.data ?? []) as { id: string; nombre: string; slug: string }[]).map((p) => [p.id, p]));
  const vendidos = new Map(((ventas30.data ?? []) as { producto_id: string; unidades: number }[]).map((v) => [v.producto_id, Number(v.unidades)]));
  const porProducto = ((productosEv.data ?? []) as { producto_id: string; vistas: number; agregados: number; fotos: number }[])
    .filter((p) => nombres.has(p.producto_id))
    .map((p) => ({
      id: p.producto_id,
      nombre: nombres.get(p.producto_id)!.nombre,
      slug: nombres.get(p.producto_id)!.slug,
      vistas: Number(p.vistas),
      agregados: Number(p.agregados),
      vendidos: vendidos.get(p.producto_id) ?? 0,
    }));
  // Productos vendidos sin eventos (ej. pedidos por WhatsApp cargados a mano) también cuentan
  for (const [id, u] of vendidos) {
    if (!porProducto.some((p) => p.id === id) && nombres.has(id)) {
      porProducto.push({ id, nombre: nombres.get(id)!.nombre, slug: nombres.get(id)!.slug, vistas: 0, agregados: 0, vendidos: u });
    }
  }
  porProducto.sort((a, b) => b.vistas - a.vistas || b.vendidos - a.vendidos);

  return {
    semanas: lista.map((s) => filas.get(s)!),
    productos: porProducto,
    origenes: ((origenes.data ?? []) as { origen: string; sesiones: number }[]).map((o) => ({ origen: o.origen, sesiones: Number(o.sesiones) })),
    pedidosPorOrigen: [...pedidosPorOrigen.entries()].sort((a, b) => b[1] - a[1]),
    whatsapp: ((whatsapp.data ?? []) as { codigo: string; clics: number }[]).map((w) => ({ codigo: w.codigo, clics: Number(w.clics) })),
    busquedas: ((busquedas.data ?? []) as { termino: string; veces: number; sin_resultados: number }[]).map((b) => ({
      termino: b.termino,
      veces: Number(b.veces),
      sinResultados: Number(b.sin_resultados),
    })),
    gastos: (gastos.data ?? []) as { id: string; semana: string; canal: string; monto: number; conversaciones: number | null; notas: string | null }[],
  };
}
