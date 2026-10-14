import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * ¿La sesión actual es del equipo? (función es_equipo de la migración 0004)
 * Mientras la migración 0004 no se haya corrido, la función no existe y se deja pasar a
 * cualquier usuario con sesión (como antes), para no dejar a Gabriel fuera de su panel.
 */
export async function esDelEquipo(supabase: SupabaseClient): Promise<boolean> {
  const { data, error } = await supabase.rpc("es_equipo");
  if (error) {
    const faltaFuncion = error.code === "PGRST202" || /es_equipo/.test(error.message ?? "");
    if (faltaFuncion) console.warn("Falta correr la migración 0004 (es_equipo).");
    return faltaFuncion;
  }
  return Boolean(data);
}
