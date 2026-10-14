"use server";

import { revalidatePath } from "next/cache";
import type { EstadoAccion } from "@/components/admin/formulario-accion";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { direccionDelUsuario, perfilDeUsuario } from "@/lib/tienda/cuentas";
import { configTienda } from "@/lib/tienda/datos";
import { DEPARTAMENTOS, OTRA_ZONA } from "@/lib/tienda/pedidos";

// Acciones de "Mi cuenta". Cada una verifica la sesión y que los datos sean del propio cliente.

const texto = (v: FormDataEntryValue | null) => String(v ?? "").trim();
const telefono = (v: FormDataEntryValue | null) => texto(v).replace(/\D/g, "").replace(/^503(?=\d{8}$)/, "");
const ok = (mensaje: string): EstadoAccion => ({ ok: true, mensaje, vez: Date.now() });
const falla = (mensaje: string): EstadoAccion => ({ ok: false, mensaje, vez: Date.now() });

async function usuario() {
  const {
    data: { user },
  } = await (await createClient()).auth.getUser();
  return user;
}

export async function guardarPerfil(_prev: EstadoAccion, form: FormData): Promise<EstadoAccion> {
  const u = await usuario();
  if (!u) return falla("Tu sesión venció. Entrá de nuevo con Google.");
  const nombre = texto(form.get("nombre"));
  const tel = telefono(form.get("telefono"));
  const alterno = telefono(form.get("telefono_alterno"));
  const dia = Number(form.get("cumple_dia")) || null;
  const mes = Number(form.get("cumple_mes")) || null;
  if (nombre.length < 3) return falla("Escribí tu nombre completo.");
  if (tel && !/^[267]\d{7}$/.test(tel)) return falla("El teléfono debe tener 8 dígitos.");
  if (alterno && !/^[267]\d{7}$/.test(alterno)) return falla("El teléfono alterno debe tener 8 dígitos.");
  if ((dia && !mes) || (!dia && mes)) return falla("Elegí el día y el mes de tu cumpleaños, o dejá los dos vacíos.");
  if (dia && mes && dia > new Date(2024, mes, 0).getDate()) return falla("Ese día no existe en ese mes.");

  const perfil = await perfilDeUsuario(u);
  const { error } = await createServiceClient()
    .from("clientes")
    .update({ nombre, telefono: tel || null, telefono_alterno: alterno || null, cumple_dia: dia, cumple_mes: mes })
    .eq("id", perfil.id);
  if (error) return falla("No se pudo guardar. Probá de nuevo.");
  revalidatePath("/mi-cuenta");
  return ok("Datos guardados");
}

export async function guardarPreferencias(_prev: EstadoAccion, form: FormData): Promise<EstadoAccion> {
  const u = await usuario();
  if (!u) return falla("Tu sesión venció. Entrá de nuevo con Google.");
  const perfil = await perfilDeUsuario(u);
  const { error } = await createServiceClient()
    .from("clientes")
    .update({ acepta_whatsapp: form.get("acepta_whatsapp") === "on", acepta_correo: form.get("acepta_correo") === "on" })
    .eq("id", perfil.id);
  if (error) return falla("No se pudo guardar. Probá de nuevo.");
  revalidatePath("/mi-cuenta");
  return ok("Preferencias guardadas");
}

export async function guardarDireccion(_prev: EstadoAccion, form: FormData): Promise<EstadoAccion> {
  const u = await usuario();
  if (!u) return falla("Tu sesión venció. Entrá de nuevo con Google.");
  const id = texto(form.get("id"));
  const zona = texto(form.get("zona"));
  const departamento = texto(form.get("departamento"));
  const municipio = texto(form.get("municipio"));
  const direccion = texto(form.get("direccion"));
  const zonas = (await configTienda()).municipiosContraEntrega;
  if (!zonas.includes(zona) && zona !== OTRA_ZONA) return falla("Elegí el municipio.");
  if (zona === OTRA_ZONA && !DEPARTAMENTOS.includes(departamento as (typeof DEPARTAMENTOS)[number])) {
    return falla("Elegí el departamento.");
  }
  if (zona === OTRA_ZONA && municipio.length < 3) return falla("Escribí el municipio o distrito.");
  if (direccion.length < 8) return falla("Escribí la dirección completa (colonia, calle, casa).");

  const sb = createServiceClient();
  const perfil = await perfilDeUsuario(u);
  const datos = {
    nombre: texto(form.get("nombre")).slice(0, 40) || "Casa",
    zona,
    departamento: zona === OTRA_ZONA ? departamento : null,
    municipio: zona === OTRA_ZONA ? municipio : zona,
    direccion: direccion.slice(0, 300),
    referencia: texto(form.get("referencia")).slice(0, 200) || null,
  };
  const principal = form.get("principal") === "on" || perfil.direcciones.length === 0;

  let direccionId = id;
  if (id) {
    if (!(await direccionDelUsuario(u.id, id))) return falla("Esa dirección no es tuya.");
    await sb.from("direcciones").update(datos).eq("id", id);
  } else {
    if (perfil.direcciones.length >= 5) return falla("Podés guardar hasta 5 direcciones.");
    const { data, error } = await sb.from("direcciones").insert({ ...datos, cliente_id: perfil.id }).select("id").single();
    if (error) return falla("No se pudo guardar. Probá de nuevo.");
    direccionId = data.id;
  }
  if (principal) {
    await sb.from("direcciones").update({ principal: false }).eq("cliente_id", perfil.id);
    await sb.from("direcciones").update({ principal: true }).eq("id", direccionId);
  }
  revalidatePath("/mi-cuenta");
  return ok("Dirección guardada");
}

export async function cambiarDireccion(_prev: EstadoAccion, form: FormData): Promise<EstadoAccion> {
  const u = await usuario();
  if (!u) return falla("Tu sesión venció. Entrá de nuevo con Google.");
  const id = texto(form.get("id"));
  const clienteId = await direccionDelUsuario(u.id, id);
  if (!clienteId) return falla("Esa dirección no es tuya.");
  const sb = createServiceClient();
  if (texto(form.get("accion")) === "borrar") {
    await sb.from("direcciones").delete().eq("id", id);
    revalidatePath("/mi-cuenta");
    return ok("Dirección borrada");
  }
  await sb.from("direcciones").update({ principal: false }).eq("cliente_id", clienteId);
  await sb.from("direcciones").update({ principal: true }).eq("id", id);
  revalidatePath("/mi-cuenta");
  return ok("Dirección principal cambiada");
}
