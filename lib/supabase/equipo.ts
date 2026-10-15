import type { SupabaseClient } from "@supabase/supabase-js";

export type Rol = "super_admin" | "operador";

/** Secciones que solo ve un super admin (el operador ve Inicio, Catálogo, Pedidos, Clientes y Garantía). */
export const SOLO_SUPER_ADMIN = [
  "/admin/proveedores",
  "/admin/listas",
  "/admin/precios",
  "/admin/promociones",
  "/admin/correos",
  "/admin/analitica",
  "/admin/configuracion",
  "/admin/equipo",
  "/admin/inventario",
  "/admin/clientes/importar",
  "/admin/clientes/exportar",
];

export const esSoloSuperAdmin = (ruta: string) =>
  SOLO_SUPER_ADMIN.some((s) => ruta === s || ruta.startsWith(`${s}/`));

const falta = (e: { code?: string; message?: string }, nombre: string) =>
  e.code === "PGRST202" || new RegExp(nombre).test(e.message ?? "");

/**
 * Rol de la sesión actual en el equipo (funciones de las migraciones 0004 y 0008), o null si no es del equipo.
 * Mientras la 0008 no se haya corrido no existe mi_rol(): quien sea del equipo cuenta como super admin (como antes).
 * Mientras la 0004 tampoco, se deja pasar a cualquier usuario con sesión, para no dejar a Gabriel fuera de su panel.
 */
export async function rolDelEquipo(supabase: SupabaseClient): Promise<Rol | null> {
  const { data, error } = await supabase.rpc("mi_rol");
  if (!error) return data === "super_admin" || data === "operador" ? data : null;
  if (!falta(error, "mi_rol")) return null;
  const r = await supabase.rpc("es_equipo");
  if (r.error) {
    const sinFuncion = falta(r.error, "es_equipo");
    if (sinFuncion) console.warn("Falta correr la migración 0004 (es_equipo).");
    return sinFuncion ? "super_admin" : null;
  }
  return r.data ? "super_admin" : null;
}

/** ¿La sesión actual es del equipo? */
export async function esDelEquipo(supabase: SupabaseClient): Promise<boolean> {
  return (await rolDelEquipo(supabase)) !== null;
}
