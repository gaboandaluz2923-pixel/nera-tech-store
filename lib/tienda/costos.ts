import "server-only";
import { createServiceClient } from "@/lib/supabase/server";
import { COMISION_PAQUETERA, COSTO_ENVIO_FIJO, costoPuesto, type CostosProveedor } from "@/lib/precios";

// Costo puesto de las variantes de un pedido, para que ningún descuento deje el pedido
// por debajo del costo (decisión de Gabriel, fase 4). Se calcula igual que en Precios:
// el proveedor más barato con existencia para esa configuración (el color no cambia el costo).

type Var = {
  id: string;
  producto_id: string;
  ram_gb: number | null;
  almacenamiento_gb: number | null;
  precio: number;
  productos: { categorias: { margen_objetivo_pct: number } | null } | null;
};

const clave = (v: { producto_id: string; ram_gb: number | null; almacenamiento_gb: number | null }) =>
  `${v.producto_id}|${v.ram_gb ?? "-"}|${v.almacenamiento_gb ?? "-"}`;

/** Costo puesto por variante. Si no hay proveedor, se estima con el margen objetivo de la categoría. */
export async function costosDeVariantes(ids: string[]): Promise<Map<string, number>> {
  const costos = new Map<string, number>();
  if (!ids.length) return costos;
  const sb = createServiceClient();
  const { data: vs } = await sb
    .from("variantes")
    .select("id, producto_id, ram_gb, almacenamiento_gb, precio, productos(categorias(margen_objetivo_pct))")
    .in("id", ids);
  const pedidas = (vs ?? []) as unknown as Var[];
  if (!pedidas.length) return costos;

  const { data: hermanas } = await sb
    .from("variantes")
    .select("id, producto_id, ram_gb, almacenamiento_gb")
    .in("producto_id", [...new Set(pedidas.map((v) => v.producto_id))]);
  const grupoDe = new Map((hermanas ?? []).map((h) => [h.id as string, clave(h as Var)]));
  const { data: vinculos } = await sb
    .from("producto_proveedor")
    .select("variante_id, proveedor_id, ultimo_precio, ultimo_stock")
    .eq("activo", true)
    .in("variante_id", [...grupoDe.keys()]);
  const provIds = [...new Set((vinculos ?? []).map((l) => l.proveedor_id as string))];
  const { data: provs } = provIds.length ? await sb.from("proveedores").select("*").in("id", provIds) : { data: [] };
  const provPorId = new Map(((provs ?? []) as (CostosProveedor & { id: string })[]).map((p) => [p.id, p]));

  // Mejor costo por configuración: primero entre los que tienen existencia
  const porGrupo = new Map<string, { conStock: number[]; todos: number[] }>();
  for (const l of vinculos ?? []) {
    const g = grupoDe.get(l.variante_id as string);
    const prov = provPorId.get(l.proveedor_id as string);
    if (!g || !prov) continue;
    const c = costoPuesto(Number(l.ultimo_precio), prov);
    const x = porGrupo.get(g) ?? { conStock: [], todos: [] };
    x.todos.push(c);
    if (l.ultimo_stock === null || Number(l.ultimo_stock) > 0) x.conStock.push(c);
    porGrupo.set(g, x);
  }

  for (const v of pedidas) {
    const x = porGrupo.get(clave(v));
    const lista = x?.conStock.length ? x.conStock : x?.todos;
    if (lista?.length) costos.set(v.id, Math.min(...lista));
    else {
      const margen = Number(v.productos?.categorias?.margen_objetivo_pct ?? 10) / 100;
      costos.set(v.id, Math.round(Number(v.precio) * (1 - margen) * 100) / 100);
    }
  }
  return costos;
}

/**
 * Cuánto descuento extra (cupón o puntos) aguanta un pedido sin quedar bajo costo.
 * Contribución = cobrado − costo − costo fijo de envío − comisión × cobrado (CLAUDE.md).
 * Despejando: descuento máximo = (cobrado × (1 − comisión) − costo − fijo) ÷ (1 − comisión).
 */
export function descuentoMaximo(cobradoSinBeneficio: number, costoTotal: number): number {
  const libre = (cobradoSinBeneficio * (1 - COMISION_PAQUETERA) - costoTotal - COSTO_ENVIO_FIJO) / (1 - COMISION_PAQUETERA);
  return Math.max(0, Math.floor(libre * 100) / 100);
}
