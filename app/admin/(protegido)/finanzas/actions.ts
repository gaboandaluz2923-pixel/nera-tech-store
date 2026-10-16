"use server";

import { revalidatePath } from "next/cache";
import type { EstadoAccion } from "@/components/admin/formulario-accion";
import { CATEGORIAS_GASTO, DOCUMENTO_GASTO } from "@/lib/admin/finanzas";
import { superAdmin } from "@/lib/admin/sesion";

// Finanzas: gastos y saldo inicial de caja (solo administradores).

const texto = (v: FormDataEntryValue | null, max = 300) => String(v ?? "").trim().slice(0, max);
const numero = (v: FormDataEntryValue | null) => {
  const n = Number(texto(v).replace(/[$,\s]/g, ""));
  return Number.isFinite(n) ? n : NaN;
};
const ok = (mensaje: string): EstadoAccion => ({ ok: true, mensaje, vez: Date.now() });
const falla = (mensaje: string): EstadoAccion => ({ ok: false, mensaje, vez: Date.now() });
const fechaValida = (s: string) => /^\d{4}-\d{2}-\d{2}$/.test(s);
const r2 = (n: number) => Math.round(n * 100) / 100;

export async function guardarGasto(_prev: EstadoAccion, form: FormData): Promise<EstadoAccion> {
  const { supabase, usuario } = await superAdmin();
  const id = texto(form.get("id"), 40);
  const fecha = texto(form.get("fecha"), 10);
  const categoria = texto(form.get("categoria"), 20);
  const documento = texto(form.get("documento"), 10) || "sin";
  const descripcion = texto(form.get("descripcion"), 200);
  const monto = numero(form.get("monto"));
  // Con crédito fiscal se puede escribir el IVA; si se deja vacío se calcula el 13%
  const ivaTexto = texto(form.get("iva"), 20);
  const iva = documento === "ccf" ? (ivaTexto ? numero(form.get("iva")) : r2(monto * 0.13)) : 0;
  const pagado = form.get("pagado") === "on";
  const pagadoEn = texto(form.get("pagado_en"), 10) || fecha;
  const forma = texto(form.get("forma_pago"), 20);
  if (!fechaValida(fecha)) return falla("La fecha no es válida.");
  if (!(categoria in CATEGORIAS_GASTO)) return falla("Elegí la categoría.");
  if (!(documento in DOCUMENTO_GASTO)) return falla("Elegí el documento.");
  if (descripcion.length < 2) return falla("Escribí qué es (ej. Alquiler de bodega octubre).");
  if (!(monto >= 0)) return falla("Escribí el monto.");
  if (!(iva >= 0)) return falla("El IVA no es válido.");
  if (pagado && !fechaValida(pagadoEn)) return falla("La fecha de pago no es válida.");
  const datos = {
    fecha,
    categoria,
    documento,
    descripcion,
    beneficiario: texto(form.get("beneficiario"), 120) || null,
    numero: texto(form.get("numero"), 80) || null,
    nit: texto(form.get("nit"), 30).replace(/[^\d-]/g, "") || null,
    monto: r2(monto),
    iva: r2(iva),
    fijo: form.get("fijo") === "on",
    forma_pago: ["efectivo", "transferencia", "tarjeta", "otro"].includes(forma) ? forma : null,
    pagado_en: pagado ? pagadoEn : null,
    notas: texto(form.get("notas"), 500) || null,
  };
  const { error } = id
    ? await supabase.from("gastos").update(datos).eq("id", id)
    : await supabase.from("gastos").insert({ ...datos, creado_por: usuario });
  if (error) return falla(`No se pudo guardar: ${error.message}`);
  revalidatePath("/admin/finanzas");
  return ok(id ? "Gasto guardado" : "Gasto agregado");
}

export async function borrarGasto(_prev: EstadoAccion, form: FormData): Promise<EstadoAccion> {
  const id = texto(form.get("id"), 40);
  if (form.get("confirmar") !== "on") return falla("Marcá la casilla para confirmar que querés borrarlo.");
  const { supabase } = await superAdmin();
  const { error } = await supabase.from("gastos").delete().eq("id", id);
  if (error) return falla(`No se pudo borrar: ${error.message}`);
  revalidatePath("/admin/finanzas");
  return ok("Gasto borrado");
}

/** Copia al mes elegido los gastos marcados como fijos del mes anterior (sin pagar), si todavía no están */
export async function copiarFijos(_prev: EstadoAccion, form: FormData): Promise<EstadoAccion> {
  const mes = texto(form.get("mes"), 7);
  if (!/^\d{4}-\d{2}$/.test(mes)) return falla("Mes no válido.");
  const { supabase, usuario } = await superAdmin();
  const [a, m] = mes.split("-").map(Number);
  const ant = m === 1 ? `${a - 1}-12` : `${a}-${String(m - 1).padStart(2, "0")}`;
  const sig = m === 12 ? `${a + 1}-01` : `${a}-${String(m + 1).padStart(2, "0")}`;
  const [{ data: fijos }, { data: yaEste }] = await Promise.all([
    supabase.from("gastos").select("*").eq("fijo", true).gte("fecha", `${ant}-01`).lt("fecha", `${mes}-01`),
    supabase.from("gastos").select("descripcion").eq("fijo", true).gte("fecha", `${mes}-01`).lt("fecha", `${sig}-01`),
  ]);
  const existentes = new Set((yaEste ?? []).map((g) => String(g.descripcion).toLowerCase()));
  const nuevos = (fijos ?? [])
    .filter((g) => !existentes.has(String(g.descripcion).toLowerCase()))
    .map((g) => ({
      fecha: `${mes}-${String(Math.min(Number(String(g.fecha).slice(8, 10)) || 1, 28)).padStart(2, "0")}`,
      categoria: g.categoria,
      documento: g.documento,
      descripcion: g.descripcion,
      beneficiario: g.beneficiario,
      nit: g.nit,
      monto: g.monto,
      iva: g.iva,
      fijo: true,
      forma_pago: g.forma_pago,
      creado_por: usuario,
    }));
  if (!nuevos.length) return falla("No hay gastos fijos del mes anterior para copiar (o ya están).");
  const { error } = await supabase.from("gastos").insert(nuevos);
  if (error) return falla(`No se pudo copiar: ${error.message}`);
  revalidatePath("/admin/finanzas");
  return ok(`${nuevos.length} gastos fijos copiados (sin pagar). Revisá los montos.`);
}

export async function guardarSaldoInicial(_prev: EstadoAccion, form: FormData): Promise<EstadoAccion> {
  const monto = numero(form.get("saldo_inicial"));
  const fecha = texto(form.get("saldo_fecha"), 10);
  if (!Number.isFinite(monto)) return falla("Escribí el saldo.");
  if (!fechaValida(fecha)) return falla("La fecha no es válida.");
  const { supabase } = await superAdmin();
  const { error } = await supabase
    .from("configuracion")
    .upsert({ clave: "finanzas", valor: { saldo_inicial: r2(monto), saldo_fecha: fecha }, publica: false }, { onConflict: "clave" });
  if (error) return falla(`No se pudo guardar: ${error.message}`);
  revalidatePath("/admin/finanzas");
  return ok("Saldo inicial guardado");
}
