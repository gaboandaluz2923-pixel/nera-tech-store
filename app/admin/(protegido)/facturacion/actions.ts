"use server";

import { revalidatePath } from "next/cache";
import type { EstadoAccion } from "@/components/admin/formulario-accion";
import { equipo, superAdmin } from "@/lib/admin/sesion";
import { TIPO_DOCUMENTO_ID, TIPO_ESTABLECIMIENTO, soloDigitos } from "@/lib/dte/catalogos";
import {
  configDte,
  descartar,
  emitirNotaCredito,
  emitirPedido,
  enviarDteCliente,
  ErrorDte,
  faltantesEmisor,
  faltantesFiscales,
  invalidar,
  procesarContingencias,
  reintentar,
  type ResultadoEmision,
} from "@/lib/dte/emitir";
import { certificadoDelEntorno, ErrorFirma } from "@/lib/dte/firma";
import { leerActividad, leerDireccion, leerFiscales } from "@/lib/dte/formularios";
import { ambienteActual, ErrorMH, probarConexion } from "@/lib/dte/mh";
import { tandaDePruebas } from "@/lib/dte/pruebas";
import { createServiceClient } from "@/lib/supabase/server";

// Acciones de Facturación electrónica. Configurar, anular, notas de crédito y pruebas: solo administradores.
// Emitir la factura de un pedido: también el operador (es parte de despachar pedidos).

const texto = (v: FormDataEntryValue | null) => String(v ?? "").trim();
const ok = (mensaje: string): EstadoAccion => ({ ok: true, mensaje, vez: Date.now() });
const falla = (mensaje: string): EstadoAccion => ({ ok: false, mensaje, vez: Date.now() });

function error(e: unknown): EstadoAccion {
  if (e instanceof ErrorDte) return falla(e.detalles.length ? `${e.message} ${e.detalles.join(" · ")}` : e.message);
  if (e instanceof ErrorFirma || e instanceof ErrorMH) return falla(e.message);
  console.error("facturación", e);
  return falla(e instanceof Error ? e.message : "Algo falló. Probá de nuevo.");
}

function resultado(r: ResultadoEmision): EstadoAccion {
  const obs = r.observaciones.length ? ` Observaciones: ${r.observaciones.join("; ")}` : "";
  const bien = r.estado === "procesado" || r.estado === "contingencia";
  return bien ? ok(`${r.numeroControl}: ${r.mensaje}${obs}`) : falla(`${r.numeroControl}: ${r.mensaje}${obs}`);
}

function refrescar(pedidoId?: string | null) {
  revalidatePath("/admin/facturacion");
  if (pedidoId) revalidatePath(`/admin/pedidos/${pedidoId}`);
}

async function guardarDte(cambios: Record<string, unknown>) {
  const { supabase } = await superAdmin();
  const actual = await configDte();
  const { data: fila } = await supabase.from("configuracion").select("valor").eq("clave", "dte").maybeSingle();
  const valor = { ...((fila?.valor as object) ?? {}), ...actual, ...cambios };
  const { error: e } = await supabase.from("configuracion").upsert({ clave: "dte", valor }, { onConflict: "clave" });
  if (e) throw new Error(`No se pudo guardar: ${e.message}`);
}

export async function guardarEmisor(_prev: EstadoAccion, form: FormData): Promise<EstadoAccion> {
  try {
    await superAdmin();
    const tipoDoc = texto(form.get("resp_tipo"));
    const emisor = {
      nit: soloDigitos(texto(form.get("nit"))),
      nrc: soloDigitos(texto(form.get("nrc"))),
      nombre: texto(form.get("nombre")).slice(0, 250),
      nombreComercial: texto(form.get("nombre_comercial")).slice(0, 150) || null,
      ...leerActividad(form, "actividad"),
      direccion: leerDireccion(form, "dir_"),
      telefono: soloDigitos(texto(form.get("telefono"))),
      correo: texto(form.get("correo")).toLowerCase(),
      codEstable: texto(form.get("cod_estable")).toUpperCase(),
      codPuntoVenta: texto(form.get("cod_punto")).toUpperCase(),
      tipoEstablecimiento: TIPO_ESTABLECIMIENTO[texto(form.get("tipo_establecimiento"))] ? texto(form.get("tipo_establecimiento")) : "02",
      responsable: {
        nombre: texto(form.get("resp_nombre")).slice(0, 100),
        tipoDoc: TIPO_DOCUMENTO_ID[tipoDoc] ? tipoDoc : "13",
        numDoc: soloDigitos(texto(form.get("resp_doc"))),
      },
    };
    await guardarDte({ emisor });
    const faltan = faltantesEmisor(emisor);
    refrescar();
    return faltan.length ? ok(`Guardado. Todavía falta: ${faltan.join(", ")}.`) : ok("Datos del emisor guardados y completos.");
  } catch (e) {
    return error(e);
  }
}

export async function guardarOpcionesDte(_prev: EstadoAccion, form: FormData): Promise<EstadoAccion> {
  try {
    await superAdmin();
    const activo = form.get("activo") === "on";
    const automatica = form.get("automatica") === "on";
    if (activo && faltantesEmisor((await configDte()).emisor).length) return falla("Completá primero los datos del emisor.");
    await guardarDte({ activo, automatica });
    refrescar();
    return ok(
      activo
        ? automatica
          ? ambienteActual() === "01"
            ? "Activado: las facturas se emiten solas al quedar pagado cada pedido."
            : "Guardado. La emisión automática se enciende sola cuando las claves sean de producción."
          : "Activado: las facturas se emiten desde cada pedido con un botón."
        : "Facturación propia apagada: se sigue anotando la factura a mano."
    );
  } catch (e) {
    return error(e);
  }
}

export async function guardarReceptorPrueba(_prev: EstadoAccion, form: FormData): Promise<EstadoAccion> {
  try {
    await superAdmin();
    const f = leerFiscales(form);
    const faltan = faltantesFiscales(f);
    if (faltan.length) return falla(`Falta: ${faltan.join(", ")}.`);
    await guardarDte({ receptorPrueba: f });
    refrescar();
    return ok("Cliente de prueba guardado: los créditos fiscales de prueba salen a su nombre.");
  } catch (e) {
    return error(e);
  }
}

export async function probarHacienda(): Promise<EstadoAccion> {
  try {
    await superAdmin();
    const cert = certificadoDelEntorno();
    const ambiente = ambienteActual();
    await probarConexion(ambiente);
    const nitCfg = soloDigitos((await configDte()).emisor.nit);
    const aviso = cert.nit && nitCfg && soloDigitos(cert.nit) !== nitCfg ? ` Ojo: el certificado es del NIT ${cert.nit} y el emisor tiene ${nitCfg}.` : "";
    return ok(`Certificado y contraseñas correctos; Hacienda aceptó el usuario de la API. Ambiente: ${ambiente === "01" ? "PRODUCCIÓN" : "PRUEBAS"}.${aviso}`);
  } catch (e) {
    return error(e);
  }
}

export async function enviarContingencias(): Promise<EstadoAccion> {
  try {
    const { usuario } = await superAdmin();
    const r = await procesarContingencias(ambienteActual(), usuario);
    refrescar();
    if (r.mensaje) return falla(r.mensaje);
    return ok(`Listo: ${r.eventos} evento(s) de contingencia, ${r.enviados} documento(s) recibidos${r.rechazados ? `, ${r.rechazados} con problema` : ""}.`);
  } catch (e) {
    return error(e);
  }
}

export async function reintentarDte(_prev: EstadoAccion, form: FormData): Promise<EstadoAccion> {
  try {
    const { usuario } = await equipo();
    const id = texto(form.get("id"));
    const conFiscales = form.get("con_fiscales") === "1";
    const r = await reintentar(id, usuario, conFiscales ? leerFiscales(form) : null);
    refrescar(texto(form.get("pedido_id")) || null);
    return resultado(r);
  } catch (e) {
    return error(e);
  }
}

export async function descartarDte(_prev: EstadoAccion, form: FormData): Promise<EstadoAccion> {
  try {
    await superAdmin();
    if (form.get("confirmo") !== "on") return falla("Marcá la casilla para confirmar.");
    await descartar(texto(form.get("id")));
    refrescar(texto(form.get("pedido_id")) || null);
    return ok("Descartado: queda en el historial, sin valor.");
  } catch (e) {
    return error(e);
  }
}

export async function reenviarDte(_prev: EstadoAccion, form: FormData): Promise<EstadoAccion> {
  try {
    await equipo();
    const para = texto(form.get("para")).toLowerCase() || undefined;
    if (para && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(para)) return falla("Revisá el correo.");
    const r = await enviarDteCliente(texto(form.get("id")), para);
    refrescar(texto(form.get("pedido_id")) || null);
    return r.enviado ? ok("Enviado al cliente con el PDF y el JSON.") : falla(`No se envió: ${r.motivo}`);
  } catch (e) {
    return error(e);
  }
}

export async function anularDte(_prev: EstadoAccion, form: FormData): Promise<EstadoAccion> {
  try {
    const { usuario } = await superAdmin();
    if (form.get("confirmo") !== "on") return falla("Marcá la casilla para confirmar la anulación.");
    const tipo = Number(texto(form.get("tipo"))) as 1 | 2 | 3;
    if (![1, 2, 3].includes(tipo)) return falla("Elegí el motivo de la anulación.");
    const motivo = texto(form.get("motivo"));
    const r = await invalidar({
      documentoId: texto(form.get("id")),
      tipo,
      motivo,
      reemplazoId: texto(form.get("reemplazo")) || null,
      usuario,
    });
    refrescar(texto(form.get("pedido_id")) || null);
    return r.ok ? ok(r.mensaje) : falla(r.mensaje);
  } catch (e) {
    return error(e);
  }
}

export async function notaDeCredito(_prev: EstadoAccion, form: FormData): Promise<EstadoAccion> {
  try {
    const { usuario } = await superAdmin();
    const cantidades: Record<number, number> = {};
    for (const [k, v] of form.entries()) {
      const m = k.match(/^cant_(\d+)$/);
      if (m) cantidades[Number(m[1])] = Number(String(v).replace(",", ".")) || 0;
    }
    const motivo = texto(form.get("motivo"));
    if (!motivo) return falla("Escribí el motivo (ej. devolución de 1 unidad).");
    const r = await emitirNotaCredito({ ccfId: texto(form.get("id")), cantidades, motivo, usuario });
    refrescar(texto(form.get("pedido_id")) || null);
    return resultado(r);
  } catch (e) {
    return error(e);
  }
}

export async function emitirDePedido(_prev: EstadoAccion, form: FormData): Promise<EstadoAccion> {
  try {
    const { usuario } = await equipo();
    const pedidoId = texto(form.get("id"));
    const tipo = texto(form.get("tipo")) === "03" ? "03" : "01";
    const fiscales = tipo === "03" && form.get("con_fiscales") === "1" ? leerFiscales(form) : null;
    const r = await emitirPedido({ pedidoId, tipo, fiscales, usuario });
    refrescar(pedidoId);
    return resultado(r);
  } catch (e) {
    return error(e);
  }
}

/** Guarda los datos fiscales del cliente sin emitir (para completar un crédito fiscal). */
export async function guardarFiscalesCliente(_prev: EstadoAccion, form: FormData): Promise<EstadoAccion> {
  try {
    await equipo();
    const clienteId = texto(form.get("cliente_id"));
    if (!clienteId) return falla("El pedido no tiene cliente.");
    const f = leerFiscales(form);
    const faltan = faltantesFiscales(f);
    await createServiceClient().from("clientes").update({ datos_fiscales: f }).eq("id", clienteId);
    refrescar(texto(form.get("pedido_id")) || null);
    return faltan.length ? ok(`Guardado. Todavía falta: ${faltan.join(", ")}.`) : ok("Datos fiscales guardados.");
  } catch (e) {
    return error(e);
  }
}

/** Una tanda del botón de pruebas (el panel la repite hasta completar). */
export async function tandaPruebasHacienda() {
  try {
    const { usuario } = await superAdmin();
    const r = await tandaDePruebas(usuario);
    revalidatePath("/admin/facturacion");
    return { ok: true as const, ...r };
  } catch (e) {
    const x = error(e);
    return { ok: false as const, mensaje: x?.mensaje ?? "Error" };
  }
}
