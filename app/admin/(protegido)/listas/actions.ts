"use server";

import { revalidatePath, updateTag } from "next/cache";
import { ETIQUETA_CATALOGO } from "@/lib/tienda/datos";
import { equipo } from "@/lib/admin/sesion";
import {
  asociarLineaEn,
  crearEnCatalogoEn,
  esquemaImportacion,
  ignorarLineasEn,
  importarListaEn,
} from "@/lib/admin/importar";

export type ResultadoImportacion =
  | { ok: true; listaId: string; total: number; vinculadas: number; pendientes: number; ignoradas: number }
  | { ok: false; error: string };

function refrescar() {
  revalidatePath("/admin/listas");
  revalidatePath("/admin/precios");
  // La disponibilidad de la tienda depende del stock de los proveedores
  updateTag(ETIQUETA_CATALOGO);
}

export async function importarLista(entrada: unknown): Promise<ResultadoImportacion> {
  const parsed = esquemaImportacion.safeParse(entrada);
  if (!parsed.success) return { ok: false, error: "Los datos de la lista no son válidos." };
  try {
    const { supabase } = await equipo();
    const r = await importarListaEn(supabase, parsed.data);
    refrescar();
    return { ok: true, ...r };
  } catch (e) {
    console.error("importarLista", e);
    const mensaje =
      e && typeof e === "object" && "message" in e ? String((e as { message: unknown }).message) : "";
    return { ok: false, error: mensaje || "No se pudo importar la lista." };
  }
}

/** Crea en el catálogo (como ocultos) los productos de las líneas marcadas y las vincula. */
export async function crearEnCatalogo(formData: FormData) {
  const ids = formData.getAll("ids").map(String).filter(Boolean);
  if (ids.length === 0) return;
  const { supabase } = await equipo();
  await crearEnCatalogoEn(supabase, ids);
  refrescar();
}

/** Vincula una línea a una variante que ya existe (cuando el normalizador no acertó). */
export async function asociarLinea(formData: FormData) {
  const lineaId = String(formData.get("lineaId") ?? "");
  const varianteId = String(formData.get("varianteId") ?? "");
  if (!lineaId || !varianteId) return;
  const { supabase } = await equipo();
  await asociarLineaEn(supabase, lineaId, varianteId);
  refrescar();
}

/** No vender estas líneas: quedan recordadas para las próximas listas del mismo proveedor. */
export async function ignorarLineas(formData: FormData) {
  const ids = formData.getAll("ids").map(String).filter(Boolean);
  if (ids.length === 0) return;
  const { supabase } = await equipo();
  await ignorarLineasEn(supabase, ids);
  refrescar();
}
