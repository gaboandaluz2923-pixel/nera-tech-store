"use server";

import { revalidatePath } from "next/cache";
import type { EstadoAccion } from "@/components/admin/formulario-accion";
import { lunesSV } from "@/lib/admin/analitica";
import { superAdmin } from "@/lib/admin/sesion";

const texto = (v: FormDataEntryValue | null) => String(v ?? "").trim();
const falla = (mensaje: string): EstadoAccion => ({ ok: false, mensaje, vez: Date.now() });

/** Gasto de pauta de una semana y canal. Si ya existe, se corrige (no se duplica). */
export async function guardarGasto(_prev: EstadoAccion, form: FormData): Promise<EstadoAccion> {
  const fecha = texto(form.get("semana"));
  const canal = texto(form.get("canal")) || "meta";
  const monto = Number(texto(form.get("monto")).replace(/[$,\s]/g, ""));
  const conv = texto(form.get("conversaciones"));
  if (!/^\d{4}-\d{2}-\d{2}$/.test(fecha)) return falla("Elegí un día de la semana del gasto.");
  if (!(monto >= 0)) return falla("Escribí cuánto gastaste (en dólares).");
  if (!["meta", "google", "tiktok", "otro"].includes(canal)) return falla("Elegí el canal.");
  if (conv && !(Number(conv) >= 0)) return falla("Revisá el número de conversaciones.");
  const semana = lunesSV(new Date(`${fecha}T12:00:00Z`));
  const { supabase } = await superAdmin();
  const { error } = await supabase.from("gasto_pauta").upsert(
    {
      semana,
      canal,
      monto: Math.round(monto * 100) / 100,
      conversaciones: conv ? Math.round(Number(conv)) : null,
      notas: texto(form.get("notas")).slice(0, 200) || null,
    },
    { onConflict: "semana,canal" }
  );
  if (error) return falla(`No se pudo guardar: ${error.message}`);
  revalidatePath("/admin/analitica");
  return { ok: true, mensaje: `Gasto guardado en la semana del ${semana}.`, vez: Date.now() };
}
