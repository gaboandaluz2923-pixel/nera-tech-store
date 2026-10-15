import "server-only";
import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import { rolDelEquipo, type Rol } from "@/lib/supabase/equipo";

/**
 * Toda acción del panel empieza aquí: verifica que haya sesión Y que el correo esté en la lista de equipo.
 * (Los clientes también pueden tener sesión con Google; no deben poder usar el panel.)
 * Las Server Actions se pueden llamar por POST directo, así que no basta con ocultar botones.
 */
export async function equipo() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Sesión vencida. Volvé a entrar al panel.");
  const rol = await rolDelEquipo(supabase);
  if (!rol) throw new Error("Tu cuenta no tiene acceso al panel.");
  return { supabase, usuario: user.email ?? user.id, rol, esSuperAdmin: rol === "super_admin" };
}

/** Lo mismo, pero solo para super admin (proveedores, precios, promociones, configuración, equipo…). */
export async function superAdmin() {
  const s = await equipo();
  if (!s.esSuperAdmin) throw new Error("Esto solo lo puede hacer un administrador.");
  return s;
}

/** Rol de quien está viendo la página (una sola consulta por petición). */
export const rolActual = cache(async (): Promise<{ rol: Rol | null; correo: string | null }> => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { rol: null, correo: null };
  return { rol: await rolDelEquipo(supabase), correo: user.email ?? null };
});
