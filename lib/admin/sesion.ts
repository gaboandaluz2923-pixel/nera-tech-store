import "server-only";
import { createClient } from "@/lib/supabase/server";

/**
 * Toda acción del panel empieza aquí: verifica que haya un usuario del equipo con sesión.
 * Las Server Actions se pueden llamar por POST directo, así que no basta con ocultar botones.
 */
export async function equipo() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Sesión vencida. Volvé a entrar al panel.");
  return { supabase, usuario: user.email ?? user.id };
}
