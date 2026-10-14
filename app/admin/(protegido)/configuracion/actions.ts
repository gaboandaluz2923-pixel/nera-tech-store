"use server";

import { revalidatePath, updateTag } from "next/cache";
import type { EstadoAccion } from "@/components/admin/formulario-accion";
import { equipo } from "@/lib/admin/sesion";
import { ETIQUETA_CATALOGO } from "@/lib/tienda/datos";

// Datos del negocio que usa la tienda (WhatsApp, envío, contra entrega, tasa 0%, pie de página, garantía).

const texto = (v: FormDataEntryValue | null) => String(v ?? "").trim();
const numero = (v: FormDataEntryValue | null) => {
  const n = Number(texto(v).replace(/[$,\s]/g, ""));
  return Number.isFinite(n) ? n : NaN;
};
const lineas = (v: FormDataEntryValue | null) =>
  texto(v)
    .split("\n")
    .map((l) => l.replace(/^[-•·\d.)\s]+/, "").trim())
    .filter(Boolean);
const falla = (mensaje: string): EstadoAccion => ({ ok: false, mensaje, vez: Date.now() });

export async function guardarConfiguracion(_prev: EstadoAccion, form: FormData): Promise<EstadoAccion> {
  const clave = texto(form.get("clave"));
  let valor: unknown;

  switch (clave) {
    case "whatsapp": {
      const digitos = texto(form.get("numero")).replace(/\D/g, "");
      const completo = digitos.length === 8 ? `503${digitos}` : digitos;
      if (!/^503[267]\d{7}$/.test(completo)) {
        return falla("Escribí el número de WhatsApp de 8 dígitos (ej. 7123 4567), con o sin 503.");
      }
      valor = { numero: completo };
      break;
    }
    case "envio": {
      const costo = numero(form.get("costo"));
      const gratis = texto(form.get("gratis_desde")) ? numero(form.get("gratis_desde")) : null;
      if (!(costo >= 0) || (gratis !== null && !(gratis > 0))) return falla("Revisá los montos de envío.");
      valor = { costo, gratis_desde: gratis, gratis_con_accesorio: form.get("gratis_con_accesorio") === "on" };
      break;
    }
    case "municipios_contra_entrega": {
      const lista = lineas(form.get("municipios"));
      if (!lista.length) return falla("Escribí al menos un municipio o zona.");
      valor = lista;
      break;
    }
    case "tasa_cero": {
      const meses = Math.round(numero(form.get("meses")));
      if (!(meses >= 2 && meses <= 48)) return falla("Los meses de tasa 0% deben estar entre 2 y 48.");
      valor = { meses, banco: texto(form.get("banco")) };
      break;
    }
    case "negocio": {
      valor = {
        nombre: texto(form.get("nombre")) || "Nera Tech",
        nit: texto(form.get("nit")),
        direccion: texto(form.get("direccion")),
        correo: texto(form.get("correo")),
      };
      break;
    }
    case "garantia_texto": {
      const plazo = Math.round(numero(form.get("plazo_meses")));
      const dias = Math.round(numero(form.get("cambio_inmediato_dias")) || 0);
      if (!(plazo >= 1)) return falla("El plazo de garantía debe ser de al menos 1 mes.");
      valor = {
        plazo_meses: plazo,
        resumen: texto(form.get("resumen")) || `${plazo} meses de garantía Nera Tech por defectos de fábrica.`,
        cambio_inmediato_dias: dias,
        cubre: lineas(form.get("cubre")),
        no_cubre: lineas(form.get("no_cubre")),
        como_reclamar: lineas(form.get("como_reclamar")),
        nota: texto(form.get("nota")),
      };
      break;
    }
    default:
      return falla("No se reconoce qué se quiere guardar.");
  }

  const { supabase } = await equipo();
  const { error } = await supabase.from("configuracion").update({ valor }).eq("clave", clave);
  if (error) return falla(`No se pudo guardar: ${error.message}`);
  revalidatePath("/admin/configuracion");
  updateTag(ETIQUETA_CATALOGO);
  return { ok: true, mensaje: "Guardado. Ya se ve en la tienda.", vez: Date.now() };
}
