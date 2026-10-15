"use server";

import { revalidatePath } from "next/cache";
import type { EstadoAccion } from "@/components/admin/formulario-accion";
import { superAdmin } from "@/lib/admin/sesion";

const num = (v: FormDataEntryValue | null) => {
  const n = Number(String(v ?? "").replace(/[$,\s]/g, ""));
  return Number.isFinite(n) && n >= 0 ? n : 0;
};

export async function guardarProveedor(_prev: EstadoAccion, formData: FormData): Promise<EstadoAccion> {
  const { supabase } = await superAdmin();
  const id = String(formData.get("id") ?? "");
  const nombre = String(formData.get("nombre") ?? "").trim();
  if (!nombre) return { ok: false, mensaje: "Escribí el nombre del proveedor.", vez: Date.now() };
  const datos = {
    nombre,
    tipo: formData.get("tipo") === "importacion" ? "importacion" : "local",
    contacto: String(formData.get("contacto") ?? "").trim() || null,
    telefono: String(formData.get("telefono") ?? "").trim() || null,
    correo: String(formData.get("correo") ?? "").trim() || null,
    // Solo números (así viene en la factura electrónica)
    nit: String(formData.get("nit") ?? "").replace(/\D/g, "") || null,
    plazo_credito_dias: Math.round(num(formData.get("plazo_credito_dias"))),
    transporte_lote: num(formData.get("transporte_lote")),
    flete_lote: num(formData.get("flete_lote")),
    seguro_lote: num(formData.get("seguro_lote")),
    dai_pct: num(formData.get("dai_pct")),
    iva_pct: num(formData.get("iva_pct")),
    unidades_lote: Math.max(1, Math.round(num(formData.get("unidades_lote")))),
    activo: formData.get("activo") === "on",
  };
  const { error } = id
    ? await supabase.from("proveedores").update(datos).eq("id", id)
    : await supabase.from("proveedores").insert(datos);
  if (error) return { ok: false, mensaje: `No se pudo guardar: ${error.message}`, vez: Date.now() };
  revalidatePath("/admin/proveedores");
  revalidatePath("/admin/precios");
  return { ok: true, mensaje: id ? "Proveedor guardado" : "Proveedor agregado", vez: Date.now() };
}
