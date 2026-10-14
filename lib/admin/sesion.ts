import "server-only";
import { createClient } from "@/lib/supabase/server";
import { esDelEquipo } from "@/lib/supabase/equipo";

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
  if (!(await esDelEquipo(supabase))) throw new Error("Tu cuenta no tiene acceso al panel.");
  return { supabase, usuario: user.email ?? user.id };
}
