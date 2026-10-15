"use server";

import type { EstadoAccion } from "@/components/admin/formulario-accion";
import { equipo } from "@/lib/admin/sesion";

// Cada persona del equipo cambia su propia contraseña (por ejemplo, la temporal que le dieron).

export async function cambiarContrasena(_prev: EstadoAccion, form: FormData): Promise<EstadoAccion> {
  const nueva = String(form.get("nueva") ?? "");
  const repetida = String(form.get("repetida") ?? "");
  const vez = Date.now();
  if (nueva.length < 10) return { ok: false, mensaje: "Usá al menos 10 letras o números.", vez };
  if (nueva !== repetida) return { ok: false, mensaje: "Las dos contraseñas no coinciden.", vez };
  const { supabase } = await equipo();
  const { error } = await supabase.auth.updateUser({ password: nueva });
  if (error) return { ok: false, mensaje: `No se pudo cambiar: ${error.message}`, vez };
  return { ok: true, mensaje: "Contraseña cambiada. La próxima vez entrá con la nueva.", vez };
}
