"use server";

import { revalidatePath } from "next/cache";
import type { EstadoAccion } from "@/components/admin/formulario-accion";
import { limpiarTelefono, telefonoValido } from "@/lib/admin/pedido-manual";
import { equipo } from "@/lib/admin/sesion";

// Clientes (CRM): datos, etiquetas y notas internas. Cada cambio queda en el historial con quién lo hizo.

const texto = (v: FormDataEntryValue | null, max = 300) => String(v ?? "").trim().slice(0, max);
const ok = (mensaje: string): EstadoAccion => ({ ok: true, mensaje, vez: Date.now() });
const falla = (mensaje: string): EstadoAccion => ({ ok: false, mensaje, vez: Date.now() });

function refrescar(id: string) {
  revalidatePath("/admin/clientes");
  revalidatePath(`/admin/clientes/${id}`);
}

export async function guardarCliente(_prev: EstadoAccion, form: FormData): Promise<EstadoAccion> {
  const id = texto(form.get("id"), 40);
  const nombre = texto(form.get("nombre"), 120);
  const telefono = limpiarTelefono(texto(form.get("telefono"), 20));
  const alterno = limpiarTelefono(texto(form.get("telefono_alterno"), 20));
  const correo = texto(form.get("correo"), 120).toLowerCase();
  const dia = Number(texto(form.get("cumple_dia"), 2)) || null;
  const mes = Number(texto(form.get("cumple_mes"), 2)) || null;
  if (nombre.length < 2) return falla("Escribí el nombre.");
  if (telefono && !telefonoValido(telefono)) return falla("El teléfono debe tener 8 dígitos (ej. 7123 4567).");
  if (alterno && !telefonoValido(alterno)) return falla("El teléfono alterno debe tener 8 dígitos.");
  if (correo && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correo)) return falla("Revisá el correo.");
  if ((dia && !mes) || (!dia && mes) || (dia && !(dia >= 1 && dia <= 31)) || (mes && !(mes >= 1 && mes <= 12))) {
    return falla("El cumpleaños lleva día (1–31) y mes (1–12), o dejá los dos vacíos.");
  }
  const { supabase } = await equipo();
  if (correo) {
    const { data: otro } = await supabase.from("clientes").select("id, nombre").eq("correo", correo).neq("id", id).maybeSingle();
    if (otro) return falla(`Ese correo ya es de otro cliente (${otro.nombre ?? "sin nombre"}).`);
  }
  const municipio = texto(form.get("municipio"), 80);
  const direccion = texto(form.get("direccion"));
  const { error } = await supabase
    .from("clientes")
    .update({
      nombre,
      telefono: telefono || null,
      telefono_alterno: alterno || null,
      correo: correo || null,
      direccion: municipio || direccion ? { zona: municipio, departamento: null, municipio, direccion, referencia: texto(form.get("referencia")) || null } : null,
      cumple_dia: dia,
      cumple_mes: mes,
      acepta_whatsapp: form.get("acepta_whatsapp") === "on",
      acepta_correo: form.get("acepta_correo") === "on",
    })
    .eq("id", id);
  if (error) return falla(`No se pudo guardar: ${error.message}`);
  refrescar(id);
  return ok("Cliente guardado");
}

export async function guardarEtiquetas(_prev: EstadoAccion, form: FormData): Promise<EstadoAccion> {
  const id = texto(form.get("id"), 40);
  const etiquetas = [
    ...new Set(
      [...form.getAll("etiqueta").map(String), ...texto(form.get("otras")).split(",")]
        .map((e) => e.trim().toLowerCase().slice(0, 30))
        .filter(Boolean)
    ),
  ].slice(0, 12);
  const { supabase } = await equipo();
  const { error } = await supabase.from("clientes").update({ etiquetas }).eq("id", id);
  if (error) return falla(`No se pudo guardar: ${error.message}`);
  refrescar(id);
  return ok("Etiquetas guardadas");
}

export async function agregarNotaCliente(_prev: EstadoAccion, form: FormData): Promise<EstadoAccion> {
  const id = texto(form.get("id"), 40);
  const nota = texto(form.get("nota"), 1000);
  if (!nota) return falla("Escribí la nota.");
  const { supabase, usuario } = await equipo();
  const { error } = await supabase.from("cliente_notas").insert({ cliente_id: id, nota, usuario });
  if (error) return falla(`No se pudo guardar: ${error.message}`);
  refrescar(id);
  return ok("Nota agregada");
}
