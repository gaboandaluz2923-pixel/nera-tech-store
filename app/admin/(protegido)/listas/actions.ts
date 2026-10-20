"use server";

import { revalidatePath, updateTag } from "next/cache";
import { redirect } from "next/navigation";
import { avisarStockDespues } from "@/lib/tienda/regalos";
import { ETIQUETA_CATALOGO } from "@/lib/tienda/datos";
import { superAdmin } from "@/lib/admin/sesion";
import {
  asociarLineaEn,
  crearEnCatalogoEn,
  dejarDeIgnorarEn,
  esquemaImportacion,
  ignorarLineasEn,
  importarListaEn,
} from "@/lib/admin/importar";

export type ResultadoImportacion =
  | { ok: true; listaId: string; total: number; vinculadas: number; pendientes: number; ignoradas: number }
  | { ok: false; error: string };

/** Si algo falla, se vuelve a Emparejar con el motivo (en vez de la pantalla de error) */
async function conAviso(paso: () => Promise<unknown>) {
  let error: string | null = null;
  try {
    await paso();
  } catch (e) {
    console.error("emparejar", e);
    error = e instanceof Error ? e.message : String(e);
  }
  if (error) redirect(`/admin/listas/emparejar?error=${encodeURIComponent(error.slice(0, 300))}`);
}

function refrescar() {
  revalidatePath("/admin/listas");
  revalidatePath("/admin/precios");
  // La disponibilidad de la tienda depende del stock de los proveedores
  updateTag(ETIQUETA_CATALOGO);
  // Si algo volvió a tener stock, avisa a quienes pidieron "Avisame cuando haya"
  void avisarStockDespues();
}

export async function importarLista(entrada: unknown): Promise<ResultadoImportacion> {
  const parsed = esquemaImportacion.safeParse(entrada);
  if (!parsed.success) return { ok: false, error: "Los datos de la lista no son válidos." };
  try {
    const { supabase } = await superAdmin();
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
  // Nombre del producto corregido a mano en Emparejar (casilla nombre_<id>)
  const nombres = new Map(ids.map((id) => [id, String(formData.get(`nombre_${id}`) ?? "").trim()]));
  // Categoría elegida en Emparejar (casilla cat_<id>, slug)
  const categorias = new Map(ids.map((id) => [id, String(formData.get(`cat_${id}`) ?? "").replace(/[^a-z0-9-]/g, "")]));
  let creadas = 0;
  await conAviso(async () => {
    const { supabase } = await superAdmin();
    creadas = await crearEnCatalogoEn(supabase, ids, nombres, categorias);
  });
  refrescar();
  redirect(`/admin/listas/emparejar?listo=${encodeURIComponent(`Listo: ${creadas} líneas creadas en el catálogo (ocultas) y vinculadas al proveedor`)}`);
}

/** Vincula una línea a una variante que ya existe (cuando el normalizador no acertó). */
export async function asociarLinea(formData: FormData) {
  const lineaId = String(formData.get("lineaId") ?? "");
  const varianteId = String(formData.get("varianteId") ?? "");
  if (!lineaId || !varianteId) return;
  await conAviso(async () => {
    const { supabase } = await superAdmin();
    await asociarLineaEn(supabase, lineaId, varianteId);
  });
  refrescar();
}

/** Deshace "Ignorar": las líneas marcadas en "Ignoradas" vuelven a Emparejar. */
export async function dejarDeIgnorar(formData: FormData) {
  const claves = formData.getAll("ignorados").map(String).filter(Boolean);
  if (claves.length === 0) return;
  await conAviso(async () => {
    const { supabase } = await superAdmin();
    await dejarDeIgnorarEn(supabase, claves);
  });
  refrescar();
}

/** No vender estas líneas: quedan recordadas para las próximas listas del mismo proveedor. */
export async function ignorarLineas(formData: FormData) {
  const ids = formData.getAll("ids").map(String).filter(Boolean);
  if (ids.length === 0) return;
  await conAviso(async () => {
    const { supabase } = await superAdmin();
    await ignorarLineasEn(supabase, ids);
  });
  refrescar();
}
