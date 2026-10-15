"use server";

import { revalidatePath, updateTag } from "next/cache";
import { ETIQUETA_CATALOGO } from "@/lib/tienda/datos";
import { superAdmin } from "@/lib/admin/sesion";
import type { EstadoAccion } from "@/components/admin/formulario-accion";

/** Fija el precio de venta de una configuración (todas sus variantes de color) y guarda el historial. */
export async function fijarPrecio(formData: FormData) {
  const productoId = String(formData.get("productoId") ?? "");
  const ram = String(formData.get("ram") ?? "");
  const alm = String(formData.get("alm") ?? "");
  const precio = Number(String(formData.get("precio") ?? "").replace(/[$,\s]/g, ""));
  const razon = String(formData.get("razon") ?? "manual");
  if (!productoId || !Number.isFinite(precio) || precio < 0) return;

  const { supabase, usuario } = await superAdmin();
  let q = supabase.from("variantes").select("id, precio").eq("producto_id", productoId);
  q = ram === "" ? q.is("ram_gb", null) : q.eq("ram_gb", Number(ram));
  q = alm === "" ? q.is("almacenamiento_gb", null) : q.eq("almacenamiento_gb", Number(alm));
  const { data: variantes, error } = await q;
  if (error) throw error;

  const cambian = (variantes ?? []).filter((v) => Number(v.precio) !== precio);
  if (cambian.length === 0) return;

  const { error: e2 } = await supabase
    .from("variantes")
    .update({ precio })
    .in(
      "id",
      cambian.map((v) => v.id)
    );
  if (e2) throw e2;

  await supabase.from("precios_venta").insert(
    cambian.map((v) => ({
      variante_id: v.id,
      precio,
      precio_anterior: v.precio,
      razon,
      usuario,
    }))
  );
  revalidatePath("/admin/precios");
  updateTag(ETIQUETA_CATALOGO); // la tienda muestra el precio nuevo de inmediato
}

/**
 * Anota un precio visto en el mercado (otra tienda, Marketplace, Facebook…), escrito a mano.
 * Nunca se leen precios de Facebook ni de Marketplace por programa (CLAUDE.md, principio 9).
 */
export async function anotarPrecioObservado(_prev: EstadoAccion, form: FormData): Promise<EstadoAccion> {
  const productoId = String(form.get("productoId") ?? "");
  const ram = String(form.get("ram") ?? "");
  const alm = String(form.get("alm") ?? "");
  const precio = Number(String(form.get("precio") ?? "").replace(/[$,\s]/g, ""));
  const fuente = String(form.get("fuente") ?? "").trim().slice(0, 80);
  const url = String(form.get("url") ?? "").trim().slice(0, 300);
  if (!productoId) return { ok: false, mensaje: "Falta el producto.", vez: Date.now() };
  if (!(precio > 0)) return { ok: false, mensaje: "Escribí el precio que viste.", vez: Date.now() };
  if (fuente.length < 2) return { ok: false, mensaje: "Escribí dónde lo viste (ej. Tienda X, Marketplace).", vez: Date.now() };
  const { supabase, usuario } = await superAdmin();
  const { error } = await supabase.from("precios_observados").insert({
    producto_id: productoId,
    ram_gb: ram === "" ? null : Number(ram),
    almacenamiento_gb: alm === "" ? null : Number(alm),
    precio: Math.round(precio * 100) / 100,
    fuente,
    url: url || null,
    nuevo_sellado: form.get("usado") !== "on",
    usuario,
  });
  if (error) return { ok: false, mensaje: `No se pudo guardar: ${error.message}`, vez: Date.now() };
  revalidatePath("/admin/precios");
  return { ok: true, mensaje: "Precio de mercado anotado. La sugerencia ya lo toma en cuenta.", vez: Date.now() };
}
