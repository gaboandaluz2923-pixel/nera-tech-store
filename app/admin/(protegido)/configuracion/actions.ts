"use server";

import { revalidatePath, updateTag } from "next/cache";
import type { EstadoAccion } from "@/components/admin/formulario-accion";
import { superAdmin } from "@/lib/admin/sesion";
import { ETIQUETA_CATALOGO } from "@/lib/tienda/datos";
import { DESCUENTO_SIN_TARJETA } from "@/lib/tienda/formato";
import { ErrorWompi, datosNegocio, tokenWompi } from "@/lib/wompi";
import { configCorreo, enviarCorreo } from "@/lib/correo";

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
      const maximo = texto(form.get("maximo")) ? numero(form.get("maximo")) : null;
      if (maximo !== null && !(maximo > 0)) return falla("Revisá el monto máximo de contra entrega.");
      valor = { municipios: lista, todo_el_pais: form.get("todo_el_pais") === "on", maximo };
      break;
    }
    case "descuento_sin_tarjeta": {
      const porcentaje = numero(form.get("porcentaje"));
      if (!(porcentaje >= 0 && porcentaje <= DESCUENTO_SIN_TARJETA.maximo)) {
        return falla(`El descuento debe estar entre 0 y ${DESCUENTO_SIN_TARJETA.maximo}%.`);
      }
      valor = { porcentaje: Math.round(porcentaje * 100) / 100 };
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
    case "correo": {
      const esCorreo = (x: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(x);
      const remitente = texto(form.get("remitente")).toLowerCase();
      const responder = texto(form.get("responder_a")).toLowerCase();
      const avisos = texto(form.get("avisos_a")).toLowerCase();
      if (!esCorreo(remitente)) return falla("Escribí el correo desde el que salen los correos (ej. pedidos@neratechsv.com).");
      if (responder && !esCorreo(responder)) return falla("Revisá el correo para respuestas.");
      if (avisos && !esCorreo(avisos)) return falla("Revisá el correo para avisos de pedidos.");
      valor = { remitente, nombre: texto(form.get("nombre")) || "Nera Tech", responder_a: responder, avisos_a: avisos };
      break;
    }
    case "puntos": {
      const dolares = numero(form.get("dolares_por_punto"));
      const valorPunto = numero(form.get("valor_punto"));
      const vence = Math.round(numero(form.get("vence_meses")));
      const minimo = Math.round(numero(form.get("minimo_canje")) || 0);
      if (!(dolares > 0)) return falla("Escribí cada cuántos dólares se gana 1 punto.");
      if (!(valorPunto > 0 && valorPunto < dolares)) return falla("El valor del punto debe ser mayor que cero y menor que los dólares por punto.");
      if (!(vence >= 1 && vence <= 60)) return falla("Los puntos deben vencer entre 1 y 60 meses.");
      if (!(minimo >= 0)) return falla("Revisá el mínimo de puntos.");
      valor = { activo: form.get("activo") === "on", dolares_por_punto: dolares, valor_punto: valorPunto, vence_meses: vence, minimo_canje: minimo };
      break;
    }
    case "regalo_cumple": {
      const monto = numero(form.get("monto"));
      const minimo = numero(form.get("minimo")) || 0;
      if (!(monto > 0)) return falla("Escribí el monto del regalo.");
      if (!(minimo >= 0) || (minimo > 0 && minimo <= monto)) return falla("La compra mínima debe ser mayor que el regalo (o 0 para sin mínimo).");
      valor = { activo: form.get("activo") === "on", monto, minimo };
      break;
    }
    case "cuentas_bancarias": {
      const cuentas = lineas(form.get("cuentas")).map((l) => {
        const [banco = "", tipo = "", numero = "", titular = ""] = l.split("|").map((x) => x.trim());
        return { banco, tipo, numero, titular };
      });
      const mala = cuentas.find((c) => !c.banco || !c.numero || !c.titular);
      if (mala) return falla("Cada cuenta va en una línea así: Banco | Tipo | Número | Titular");
      valor = cuentas;
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

  const { supabase } = await superAdmin();
  // upsert: crea la clave si todavía no existe (las nuevas quedan privadas, menos las que lee la tienda)
  const publica = clave === "descuento_sin_tarjeta" ? { publica: true } : {};
  const { error } = await supabase.from("configuracion").upsert({ clave, valor, ...publica }, { onConflict: "clave" });
  if (error) return falla(`No se pudo guardar: ${error.message}`);
  revalidatePath("/admin/configuracion");
  updateTag(ETIQUETA_CATALOGO);
  return { ok: true, mensaje: "Guardado. Ya se ve en la tienda.", vez: Date.now() };
}

/** Pide un token a Wompi con las claves de Vercel para confirmar que funcionan (no muestra las claves). */
export async function probarWompi(): Promise<EstadoAccion> {
  await superAdmin();
  try {
    await tokenWompi();
    const negocio = await datosNegocio().catch(() => null);
    const modo =
      negocio?.estaProductivo === true
        ? " Modo PRODUCCIÓN: los pagos se cobran de verdad."
        : negocio?.estaProductivo === false
          ? " Modo PRUEBAS: los pagos NO se cobran."
          : "";
    return { ok: true, mensaje: `Conexión con Wompi correcta: las claves funcionan.${modo}`, vez: Date.now() };
  } catch (e) {
    return falla(e instanceof ErrorWompi ? e.message : "No se pudo contactar a Wompi. Probá de nuevo en un minuto.");
  }
}

/** Manda un correo de prueba al correo de avisos (o al de quien está en el panel). */
export async function correoDePrueba(): Promise<EstadoAccion> {
  const { usuario } = await superAdmin();
  const cfg = await configCorreo();
  const para = cfg.avisos_a || (usuario.includes("@") ? usuario : "");
  if (!para) return falla("Guardá primero el correo para avisos de pedidos.");
  const r = await enviarCorreo({
    para,
    asunto: "Prueba de correo de Nera Tech",
    html: `<p style="font-family:Arial,sans-serif;font-size:15px">Si leés esto, los correos de la tienda funcionan. Salen desde <strong>${cfg.remitente}</strong>.</p>`,
    texto: `Si leés esto, los correos de la tienda funcionan. Salen desde ${cfg.remitente}.`,
    etiqueta: "prueba",
  });
  return r.enviado ? { ok: true, mensaje: `Correo de prueba enviado a ${para}. Revisá tu bandeja (y spam).`, vez: Date.now() } : falla(`No se envió: ${r.motivo}`);
}
