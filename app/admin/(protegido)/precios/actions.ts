"use server";

import { revalidatePath } from "next/cache";
import { equipo } from "@/lib/admin/sesion";

/** Fija el precio de venta de una configuración (todas sus variantes de color) y guarda el historial. */
export async function fijarPrecio(formData: FormData) {
  const productoId = String(formData.get("productoId") ?? "");
  const ram = String(formData.get("ram") ?? "");
  const alm = String(formData.get("alm") ?? "");
  const precio = Number(String(formData.get("precio") ?? "").replace(/[$,\s]/g, ""));
  const razon = String(formData.get("razon") ?? "manual");
  if (!productoId || !Number.isFinite(precio) || precio < 0) return;

  const { supabase, usuario } = await equipo();
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
}
