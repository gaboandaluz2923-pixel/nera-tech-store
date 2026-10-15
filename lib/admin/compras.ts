import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { skuClave } from "@/lib/admin/catalogo";
import { interpretar } from "@/lib/listas/normalizar";

// Compras al proveedor: emparejar cada línea de la factura con el catálogo y llevar los totales.

export const DOCUMENTO = {
  ccf: "Crédito fiscal (precios sin IVA; el IVA se recupera)",
  factura: "Factura consumidor final (precios con IVA)",
  sin_iva: "Sin IVA (recibo, Miami)",
} as const;
export type Documento = keyof typeof DOCUMENTO;

/**
 * Qué variante del catálogo es esta línea:
 * 1) el mismo código o descripción ya enlazado a ese proveedor desde sus listas de precios;
 * 2) la descripción interpretada (marca, modelo, memoria y color) igual a la clave de una variante.
 */
export async function sugerirVarianteCompra(
  supabase: SupabaseClient,
  proveedorId: string | null,
  descripcion: string,
  codigo: string | null
): Promise<string | null> {
  if (proveedorId) {
    const claves = [...new Set([skuClave(codigo, descripcion), skuClave(null, descripcion)])];
    const { data } = await supabase
      .from("producto_proveedor")
      .select("variante_id")
      .eq("proveedor_id", proveedorId)
      .in("sku_proveedor", claves)
      .limit(1);
    if (data?.[0]?.variante_id) return data[0].variante_id as string;
  }
  const clave = interpretar(descripcion).claveVariante;
  if (!clave) return null;
  const { data } = await supabase.from("variantes").select("id").eq("clave", clave).limit(1);
  return (data?.[0]?.id as string | undefined) ?? null;
}

/** Subtotal, IVA y total de la compra según el tipo de documento (se guardan en compras) */
export async function recalcularTotales(supabase: SupabaseClient, compraId: string) {
  const [{ data: c }, { data: lineas }] = await Promise.all([
    supabase.from("compras").select("documento").eq("id", compraId).single(),
    supabase.from("compra_lineas").select("cantidad, costo_unitario").eq("compra_id", compraId),
  ]);
  if (!c) return;
  const suma = (lineas ?? []).reduce((s, l) => s + Number(l.cantidad) * Number(l.costo_unitario), 0);
  const r2 = (n: number) => Math.round(n * 100) / 100;
  let subtotal = suma;
  let iva = 0;
  if (c.documento === "ccf") iva = suma * 0.13;
  if (c.documento === "factura") {
    subtotal = suma / 1.13;
    iva = suma - subtotal;
  }
  // Lo que se le debe al proveedor (el flete o la aduana se pagan aparte: solo suben el costo de cada unidad)
  const total = c.documento === "ccf" ? suma + iva : suma;
  await supabase
    .from("compras")
    .update({ subtotal: r2(subtotal), iva: r2(iva), total: r2(total) })
    .eq("id", compraId);
}
