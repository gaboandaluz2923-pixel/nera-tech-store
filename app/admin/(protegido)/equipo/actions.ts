"use server";

import { randomInt } from "node:crypto";
import { revalidatePath } from "next/cache";
import type { EstadoAccion } from "@/components/admin/formulario-accion";
import { superAdmin } from "@/lib/admin/sesion";
import { createServiceClient } from "@/lib/supabase/server";

// Equipo: quién entra al panel y con qué rol. Solo para super admin.
// Las cuentas nuevas se crean con una contraseña temporal que se muestra UNA vez en pantalla;
// la persona la cambia en "Mi contraseña" al entrar.

const texto = (v: FormDataEntryValue | null, max = 120) => String(v ?? "").trim().slice(0, max);
const ROLES = ["super_admin", "operador"] as const;

export type ResultadoEquipo = { ok: boolean; mensaje: string; contrasena?: string; correo?: string; vez: number } | null;

/** 12 letras y números fáciles de dictar (sin 0/O ni 1/l/I) */
function contrasenaTemporal() {
  const letras = "abcdefghjkmnpqrstuvwxyzABCDEFGHJKMNPQRSTUVWXYZ23456789";
  return Array.from({ length: 12 }, () => letras[randomInt(letras.length)]).join("");
}

export async function agregarPersona(_prev: ResultadoEquipo, form: FormData): Promise<ResultadoEquipo> {
  const correo = texto(form.get("correo")).toLowerCase();
  const nombre = texto(form.get("nombre"), 60);
  const rol = texto(form.get("rol"), 20);
  const vez = Date.now();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correo)) return { ok: false, mensaje: "Escribí un correo válido.", vez };
  if (!nombre) return { ok: false, mensaje: "Escribí el nombre (así aparece en el historial).", vez };
  if (!(ROLES as readonly string[]).includes(rol)) return { ok: false, mensaje: "Elegí el rol.", vez };
  const { supabase } = await superAdmin();

  const { data: ya } = await supabase.from("equipo").select("correo").eq("correo", correo).maybeSingle();
  if (ya) return { ok: false, mensaje: "Esa persona ya está en el equipo. Cambiá su rol con Editar.", vez };

  // Usuario para entrar: se crea con contraseña temporal; si ya existía, se usa el que tiene
  const contrasena = contrasenaTemporal();
  const { error: eUsuario } = await createServiceClient().auth.admin.createUser({
    email: correo,
    password: contrasena,
    email_confirm: true,
    user_metadata: { nombre },
  });
  const yaTeniaUsuario = Boolean(eUsuario && /already|registered|exists/i.test(eUsuario.message));
  if (eUsuario && !yaTeniaUsuario) return { ok: false, mensaje: `No se pudo crear el usuario: ${eUsuario.message}`, vez };

  const { error } = await supabase.from("equipo").insert({ correo, nombre, rol });
  if (error) return { ok: false, mensaje: `No se pudo agregar: ${error.message}`, vez };
  revalidatePath("/admin/equipo");
  return yaTeniaUsuario
    ? { ok: true, mensaje: `${nombre} ya tenía usuario: entra con ${correo} y la contraseña que ya usa.`, vez }
    : { ok: true, mensaje: `${nombre} ya puede entrar.`, contrasena, correo, vez };
}

export async function guardarPersona(_prev: EstadoAccion, form: FormData): Promise<EstadoAccion> {
  const correo = texto(form.get("correo")).toLowerCase();
  const nombre = texto(form.get("nombre"), 60);
  const rol = texto(form.get("rol"), 20);
  const accion = texto(form.get("accion"), 20);
  const vez = Date.now();
  const { supabase, usuario } = await superAdmin();
  const yo = usuario.toLowerCase() === correo;

  const { data: supers } = await supabase.from("equipo").select("correo").eq("rol", "super_admin");
  const ultimoSuper = (supers ?? []).length <= 1 && (supers ?? []).some((s) => s.correo === correo);

  if (accion === "quitar") {
    if (yo) return { ok: false, mensaje: "No podés quitarte el acceso a vos mismo.", vez };
    if (ultimoSuper) return { ok: false, mensaje: "Tiene que quedar al menos un administrador.", vez };
    const { error } = await supabase.from("equipo").delete().eq("correo", correo);
    if (error) return { ok: false, mensaje: `No se pudo quitar: ${error.message}`, vez };
    revalidatePath("/admin/equipo");
    return { ok: true, mensaje: "Listo: ya no puede entrar al panel.", vez };
  }

  if (!nombre) return { ok: false, mensaje: "Escribí el nombre.", vez };
  if (!(ROLES as readonly string[]).includes(rol)) return { ok: false, mensaje: "Elegí el rol.", vez };
  if (rol !== "super_admin" && (yo || ultimoSuper)) {
    return { ok: false, mensaje: yo ? "No podés quitarte el rol de administrador a vos mismo." : "Tiene que quedar al menos un administrador.", vez };
  }
  const { error } = await supabase.from("equipo").update({ nombre, rol }).eq("correo", correo);
  if (error) return { ok: false, mensaje: `No se pudo guardar: ${error.message}`, vez };
  revalidatePath("/admin/equipo");
  return { ok: true, mensaje: "Guardado", vez };
}

/** Nueva contraseña temporal para alguien que olvidó la suya (se muestra una vez). */
export async function nuevaContrasena(_prev: ResultadoEquipo, form: FormData): Promise<ResultadoEquipo> {
  const correo = texto(form.get("correo")).toLowerCase();
  const vez = Date.now();
  await superAdmin();
  const admin = createServiceClient().auth.admin;
  // Buscar el usuario por correo (el equipo es chico: alcanza con las primeras páginas)
  let id: string | null = null;
  for (let pagina = 1; pagina <= 10 && !id; pagina++) {
    const { data, error } = await admin.listUsers({ page: pagina, perPage: 200 });
    if (error) return { ok: false, mensaje: `No se pudo buscar el usuario: ${error.message}`, vez };
    id = data.users.find((u) => u.email?.toLowerCase() === correo)?.id ?? null;
    if (data.users.length < 200) break;
  }
  if (!id) return { ok: false, mensaje: "No encontré el usuario de ese correo.", vez };
  const contrasena = contrasenaTemporal();
  const { error } = await admin.updateUserById(id, { password: contrasena });
  if (error) return { ok: false, mensaje: `No se pudo cambiar: ${error.message}`, vez };
  return { ok: true, mensaje: "Contraseña nueva lista.", contrasena, correo, vez };
}
