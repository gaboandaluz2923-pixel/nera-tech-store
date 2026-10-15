import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Condicion, TipoIdentificador } from "@/lib/inventario/identificadores";

// Lecturas del inventario para el panel (solo administradores: lotes y movimientos tienen costos).
// Stock en bodega = suma de lotes; cada lote tiene su costo y su fecha (lo más viejo sale primero).

export const DIAS_LENTO = 30;

export type FilaInventario = {
  varianteId: string;
  productoId: string;
  producto: string;
  variante: string;
  condicion: Condicion;
  tipoId: TipoIdentificador;
  enBodega: number;
  conIdentificador: number;
  faltanId: number;
  /** Costo del lote más viejo con costo: lo próximo que sale */
  costoProximo: number | null;
  /** Valor de lo que hay en bodega (solo unidades con costo conocido) */
  valor: number;
  sinCosto: number;
  precio: number;
  diasEnBodega: number;
  ultimaVenta: string | null;
  lento: boolean;
};

type FilaLote = {
  variante_id: string;
  cantidad: number;
  costo_unitario: number | null;
  fecha: string;
  created_at: string;
  variantes: {
    nombre: string;
    precio: number;
    producto_id: string;
    productos: { nombre: string; condicion: Condicion | null; categorias: { identificador: TipoIdentificador | null } | null } | null;
  } | null;
};

const dias = (desde: string) => Math.max(0, Math.floor((Date.now() - new Date(`${desde.slice(0, 10)}T12:00:00`).getTime()) / 86_400_000));

export async function leerInventario(supabase: SupabaseClient): Promise<FilaInventario[]> {
  const hace = new Date(Date.now() - 90 * 86_400_000).toISOString();
  const [lotesR, unidadesR, ventasR] = await Promise.all([
    supabase
      .from("lotes")
      .select(
        "variante_id, cantidad, costo_unitario, fecha, created_at, variantes(nombre, precio, producto_id, productos(nombre, condicion, categorias(identificador)))"
      )
      .gt("cantidad", 0)
      .order("fecha")
      .order("created_at")
      .limit(5000),
    supabase.from("unidades").select("variante_id").eq("estado", "en_bodega").limit(20000),
    supabase
      .from("movimientos_inventario")
      .select("variante_id, created_at")
      .eq("tipo", "venta")
      .gte("created_at", hace)
      .order("created_at", { ascending: false })
      .limit(5000),
  ]);
  if (lotesR.error) throw lotesR.error;
  const conId = new Map<string, number>();
  for (const u of unidadesR.data ?? []) conId.set(u.variante_id as string, (conId.get(u.variante_id as string) ?? 0) + 1);
  const ultimaVenta = new Map<string, string>();
  for (const m of ventasR.data ?? []) if (!ultimaVenta.has(m.variante_id as string)) ultimaVenta.set(m.variante_id as string, m.created_at as string);

  const filas = new Map<string, FilaInventario>();
  for (const l of (lotesR.data ?? []) as unknown as FilaLote[]) {
    const v = l.variantes;
    let f = filas.get(l.variante_id);
    if (!f) {
      const condicion = v?.productos?.condicion ?? "nuevo";
      f = {
        varianteId: l.variante_id,
        productoId: v?.producto_id ?? "",
        producto: v?.productos?.nombre ?? "—",
        variante: v?.nombre ?? "",
        condicion,
        tipoId: v?.productos?.categorias?.identificador ?? (condicion === "nuevo" ? "serie" : "imei"),
        enBodega: 0,
        conIdentificador: conId.get(l.variante_id) ?? 0,
        faltanId: 0,
        costoProximo: null,
        valor: 0,
        sinCosto: 0,
        precio: Number(v?.precio ?? 0),
        // los lotes vienen del más viejo al más nuevo
        diasEnBodega: dias(l.fecha),
        ultimaVenta: ultimaVenta.get(l.variante_id) ?? null,
        lento: false,
      };
      filas.set(l.variante_id, f);
    }
    f.enBodega += l.cantidad;
    if (l.costo_unitario === null) f.sinCosto += l.cantidad;
    else {
      f.valor += l.cantidad * Number(l.costo_unitario);
      if (f.costoProximo === null) f.costoProximo = Number(l.costo_unitario);
    }
  }
  for (const f of filas.values()) {
    f.faltanId = Math.max(0, f.enBodega - f.conIdentificador);
    const sinVentaReciente = !f.ultimaVenta || dias(f.ultimaVenta) >= DIAS_LENTO;
    f.lento = f.diasEnBodega >= DIAS_LENTO && sinVentaReciente;
  }
  return [...filas.values()].sort((a, b) => b.diasEnBodega - a.diasEnBodega || a.producto.localeCompare(b.producto));
}

export type CompraResumen = {
  id: string;
  numero: string | null;
  fecha: string;
  condicion: "contado" | "credito";
  dias_credito: number;
  vence_en: string;
  total: number;
  estado: "borrador" | "recibida" | "anulada";
  pagada_en: string | null;
  proveedores: { nombre: string } | null;
};

export const SELECT_COMPRA =
  "id, numero, fecha, condicion, dias_credito, vence_en, total, estado, pagada_en, proveedores(nombre)" as const;

/** Días que faltan para el vencimiento (negativo = vencida) */
export function diasParaVencer(venceEn: string) {
  const hoy = new Date(new Date().toLocaleString("en-US", { timeZone: "America/El_Salvador" }));
  hoy.setHours(12, 0, 0, 0);
  return Math.round((new Date(`${venceEn}T12:00:00`).getTime() - hoy.getTime()) / 86_400_000);
}

export function textoVencimiento(c: Pick<CompraResumen, "pagada_en" | "vence_en" | "estado" | "condicion">) {
  if (c.estado === "anulada") return "Anulada";
  if (c.pagada_en) return "Pagada";
  const d = diasParaVencer(c.vence_en);
  if (d < 0) return `Vencida hace ${-d} ${-d === 1 ? "día" : "días"}`;
  if (d === 0) return "Vence hoy";
  return `Vence en ${d} ${d === 1 ? "día" : "días"}`;
}

/** Cuentas por pagar: compras no anuladas y sin pagar, de la que vence primero a la última */
export async function porPagar(supabase: SupabaseClient) {
  const { data, error } = await supabase
    .from("compras")
    .select(SELECT_COMPRA)
    .neq("estado", "anulada")
    .is("pagada_en", null)
    .order("vence_en")
    .limit(200);
  if (error) return { compras: [] as CompraResumen[], total: 0, vencidas: 0, estaSemana: 0 };
  const compras = (data ?? []) as unknown as CompraResumen[];
  return {
    compras,
    total: compras.reduce((s, c) => s + Number(c.total), 0),
    vencidas: compras.filter((c) => diasParaVencer(c.vence_en) < 0).length,
    estaSemana: compras.filter((c) => {
      const d = diasParaVencer(c.vence_en);
      return d >= 0 && d <= 7;
    }).length,
  };
}

/** Variantes del catálogo para elegir en una compra: "Producto · variante" */
export async function variantesParaElegir(supabase: SupabaseClient) {
  const { data } = await supabase
    .from("variantes")
    .select("id, nombre, sku, clave, productos(nombre, condicion, estado)")
    .limit(5000);
  return ((data ?? []) as unknown as {
    id: string;
    nombre: string;
    sku: string | null;
    clave: string | null;
    productos: { nombre: string; condicion: Condicion | null; estado: string } | null;
  }[])
    .map((v) => ({
      id: v.id,
      texto: `${v.productos?.nombre ?? "—"} · ${v.nombre}`,
      clave: v.clave,
      sku: v.sku,
      condicion: (v.productos?.condicion ?? "nuevo") as Condicion,
    }))
    .sort((a, b) => a.texto.localeCompare(b.texto));
}
