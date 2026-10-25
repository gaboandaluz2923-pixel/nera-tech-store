import type { SupabaseClient } from "@supabase/supabase-js";

// Productos que hoy están en una campaña de envío gratis activa (Promociones → Envío gratis), con el nombre de la campaña.
// Sirve para calcular el mínimo sin pérdida: si el cliente no paga envío, el producto tiene que cubrirlo solo.
export async function productosConEnvioGratis(supabase: SupabaseClient): Promise<Map<string, string>> {
  const { data, error } = await supabase
    .from("promocion_productos")
    .select("producto_id, promociones!inner(nombre, tipo, activa, inicio, fin)")
    .eq("promociones.tipo", "envio_gratis")
    .eq("promociones.activa", true)
    .limit(5000);
  const res = new Map<string, string>();
  if (error) return res;
  const ahora = Date.now();
  for (const f of (data ?? []) as unknown as { producto_id: string; promociones: { nombre: string; inicio: string | null; fin: string | null } }[]) {
    const c = f.promociones;
    if (c.inicio && new Date(c.inicio).getTime() > ahora) continue;
    if (c.fin && new Date(c.fin).getTime() <= ahora) continue;
    res.set(f.producto_id, c.nombre);
  }
  return res;
}
