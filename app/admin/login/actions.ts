"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { esDelEquipo } from "@/lib/supabase/equipo";

export type EstadoLogin = { error?: string };

export async function iniciarSesion(
  _estado: EstadoLogin,
  formData: FormData
): Promise<EstadoLogin> {
  const correo = String(formData.get("correo") ?? "").trim();
  const contrasena = String(formData.get("contrasena") ?? "");
  const volver = String(formData.get("volver") ?? "/admin");

  if (!correo || !contrasena) {
    return { error: "Escribí tu correo y tu contraseña." };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({
    email: correo,
    password: contrasena,
  });

  if (error) {
    return { error: "Correo o contraseña incorrectos." };
  }

  if (!(await esDelEquipo(supabase))) {
    await supabase.auth.signOut();
    return { error: "Esa cuenta no tiene acceso al panel." };
  }

  redirect(volver.startsWith("/admin") ? volver : "/admin");
}

export async function cerrarSesion() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/admin/login");
}
