"use server";

import { revalidatePath, updateTag } from "next/cache";
import { after } from "next/server";
import { avisarEstado, avisarFactura } from "@/lib/correos/avisos";
import { sitioActual } from "@/lib/sitio";
import type { EstadoAccion } from "@/components/admin/formulario-accion";
import { SIGUIENTES, type EstadoPedido } from "@/lib/admin/pedidos";
import { equipo } from "@/lib/admin/sesion";
import { ETIQUETA_CATALOGO } from "@/lib/tienda/datos";
import { otorgarPuntos, revertirPuntos } from "@/lib/tienda/beneficios";
import { marcarPagado } from "@/lib/tienda/pedidos";

// Acciones de la sección Pedidos. Todas verifican que quien las usa sea del equipo.

const texto = (v: FormDataEntryValue | null) => String(v ?? "").trim();
const soloTelefono = (v: FormDataEntryValue | null) => texto(v).replace(/\D/g, "").replace(/^503(?=\d{8}$)/, "");
const ok = (mensaje: string): EstadoAccion => ({ ok: true, mensaje, vez: Date.now() });
const falla = (mensaje: string): EstadoAccion => ({ ok: false, mensaje, vez: Date.now() });

function refrescar(id: string) {
  revalidatePath("/admin/pedidos");
  revalidatePath(`/admin/pedidos/${id}`);
}

export async function cambiarEstadoPedido(_prev: EstadoAccion, form: FormData): Promise<EstadoAccion> {
  const id = texto(form.get("id"));
  const nuevo = texto(form.get("estado")) as EstadoPedido;
  const nota = texto(form.get("nota"));
  const mensaje = texto(form.get("mensaje_cliente")).slice(0, 500);
  const repNombre = texto(form.get("repartidor_nombre")).slice(0, 80);
  const repTel = texto(form.get("repartidor_telefono")).replace(/\D/g, "").replace(/^503(?=\d{8}$)/, "");
  if (repTel && !/^[267]\d{7}$/.test(repTel)) return falla("El teléfono del repartidor debe tener 8 dígitos (ej. 7123 4567).");
  const { supabase, usuario } = await equipo();
  const { data: p } = await supabase
    .from("pedidos")
    .select("id, estado, forma_pago, total, pagado_en, confirmado_en, entrega, cupon_id, puntos_usados, lineas_pedido(variante_id, cantidad)")
    .eq("id", id)
    .single();
  if (!p) return falla("No se encontró el pedido.");
  if (!SIGUIENTES[p.estado as EstadoPedido]?.some((s) => s.estado === nuevo)) {
    return falla("Ese cambio de estado no se puede hacer desde el estado actual.");
  }
  if (nuevo === "cancelado" && !nota) return falla("Escribí el motivo de la cancelación en la nota.");
  // Al cancelar se le devolvieron los puntos y se liberó el cupón: reabrirlo los cobraría dos veces
  if (nuevo === "pendiente_confirmar" && (p.cupon_id || Number(p.puntos_usados) > 0)) {
    return falla("Este pedido usó un cupón o Puntos Nera, que se devolvieron al cancelarlo. Pedile al cliente que haga un pedido nuevo.");
  }

  const cambios: Record<string, unknown> = { estado: nuevo };
  const ahora = new Date().toISOString();
  if (nuevo === "confirmado" && !p.confirmado_en) cambios.confirmado_en = ahora;
  if (nuevo === "entregado") {
    cambios.entregado_en = ahora;
    if (!p.confirmado_en) cambios.confirmado_en = ahora;
  }
  if (nuevo === "pendiente_confirmar") cambios.confirmado_en = null;

  // El mensaje para el cliente vale solo para este cambio; el repartidor se guarda hasta que se cambie
  const entrega = { ...((p.entrega ?? {}) as Record<string, unknown>) };
  entrega.mensaje = mensaje || null;
  if (repNombre || repTel) entrega.repartidor = { nombre: repNombre, telefono: repTel };
  cambios.entrega = entrega;

  const { error } = await supabase.from("pedidos").update(cambios).eq("id", id).eq("estado", p.estado);
  if (error) return falla(`No se pudo guardar: ${error.message}`);
  await supabase.from("pedido_eventos").insert({
    pedido_id: id,
    estado_anterior: p.estado,
    estado_nuevo: nuevo,
    nota:
      [
        nota,
        repNombre || repTel ? `Repartidor: ${[repNombre, repTel].filter(Boolean).join(" · ")}` : "",
        mensaje ? `Mensaje al cliente: "${mensaje}"` : "",
      ]
        .filter(Boolean)
        .join(" — ") || null,
    usuario,
  });

  // Inventario: al confirmar salen de bodega las unidades (las más viejas primero, con su IMEI);
  // al cancelar, devolver o regresar a "por confirmar" vuelven. Las funciones no descuentan dos veces.
  let avisoInventario = "";
  const sale = ["confirmado", "pagado", "en_camino", "entregado"].includes(nuevo);
  const vuelve = ["cancelado", "devuelto", "pendiente_confirmar"].includes(nuevo);
  if (sale || vuelve) {
    const { error: eInv } = await supabase.rpc(sale ? "inv_confirmar_pedido" : "inv_devolver_pedido", { p_pedido: id });
    if (eInv) {
      console.error("inventario", eInv);
      avisoInventario = ` (ojo: el inventario no se actualizó: ${eInv.message})`;
    } else if (nuevo === "devuelto") {
      avisoInventario = ". Las unidades volvieron a bodega; si el cliente abrió la caja, pasalas a Open Box en Inventario";
    }
    updateTag(ETIQUETA_CATALOGO);
  }

  // Correo al cliente con el nuevo estado
  const sitio = await sitioActual();
  if (["confirmado", "en_camino", "entregado", "cancelado"].includes(nuevo)) {
    after(() => avisarEstado(id, nuevo, sitio).catch((e) => console.error("avisarEstado", e)));
  }

  // Contra entrega: entregado = cobrado
  if (nuevo === "entregado" && p.forma_pago === "contra_entrega" && !p.pagado_en) {
    await marcarPagado({
      pedidoId: id,
      metodo: "contra_entrega",
      monto: Number(p.total),
      usuario,
      nota: "Cobrado en efectivo al entregar",
    });
  }
  // Puntos Nera: se ganan al quedar entregado y pagado; al cancelar o devolver se revierten
  if (nuevo === "entregado") await otorgarPuntos(id).catch((e) => console.error("otorgarPuntos", e));
  if (nuevo === "cancelado" || nuevo === "devuelto") await revertirPuntos(id, usuario).catch((e) => console.error("revertirPuntos", e));
  refrescar(id);
  return ok(`Estado actualizado${avisoInventario}`);
}

export async function registrarPago(_prev: EstadoAccion, form: FormData): Promise<EstadoAccion> {
  const id = texto(form.get("id"));
  const referencia = texto(form.get("referencia"));
  const { supabase, usuario } = await equipo();
  const { data: p } = await supabase.from("pedidos").select("id, forma_pago, total, pagado_en").eq("id", id).single();
  if (!p) return falla("No se encontró el pedido.");
  if (p.pagado_en) return falla("Este pedido ya está marcado como pagado.");
  await marcarPagado({
    pedidoId: id,
    metodo: p.forma_pago,
    monto: Number(p.total),
    referencia: referencia || null,
    usuario,
    nota: `Pago registrado a mano${referencia ? ` (ref. ${referencia})` : ""}`,
    sitio: await sitioActual(),
  });
  refrescar(id);
  return ok("Pago registrado");
}

export async function guardarFactura(_prev: EstadoAccion, form: FormData): Promise<EstadoAccion> {
  const id = texto(form.get("id"));
  const numero = texto(form.get("factura_numero"));
  const archivo = form.get("archivo");
  const { supabase, usuario } = await equipo();
  const { data: p } = await supabase.from("pedidos").select("id, numero, factura_archivo, factura_estado").eq("id", id).single();
  if (!p) return falla("No se encontró el pedido.");

  let ruta = p.factura_archivo as string | null;
  if (archivo instanceof File && archivo.size > 0) {
    if (archivo.type !== "application/pdf" && !archivo.name.toLowerCase().endsWith(".pdf")) {
      return falla("Subí la factura en PDF.");
    }
    if (archivo.size > 3_500_000) return falla("El PDF pesa demasiado (máximo 3.5 MB).");
    ruta = `pedido-${p.numero}/${Date.now()}.pdf`;
    const { error } = await supabase.storage
      .from("facturas")
      .upload(ruta, await archivo.arrayBuffer(), { contentType: "application/pdf", upsert: false });
    if (error) return falla(`No se pudo subir el PDF: ${error.message}`);
  }
  if (!numero && !ruta) return falla("Escribí el número o código de la factura, o subí el PDF.");

  const { error } = await supabase
    .from("pedidos")
    .update({
      factura_estado: "emitida",
      factura_numero: numero || null,
      factura_archivo: ruta,
      factura_emitida_en: new Date().toISOString(),
    })
    .eq("id", id);
  if (error) return falla(`No se pudo guardar: ${error.message}`);
  const { data: actual } = await supabase.from("pedidos").select("estado").eq("id", id).single();
  await supabase.from("pedido_eventos").insert({
    pedido_id: id,
    estado_anterior: actual?.estado,
    estado_nuevo: actual?.estado,
    nota: `Factura emitida${numero ? ` (${numero})` : ""}${ruta ? " y PDF subido" : ""}`,
    usuario,
  });
  // Correo "Tu factura está lista": la primera vez, o si se subió un PDF nuevo
  if (p.factura_estado !== "emitida" || ruta !== p.factura_archivo) {
    const sitio = await sitioActual();
    after(() => avisarFactura(id, sitio).catch((e) => console.error("avisarFactura", e)));
  }
  refrescar(id);
  return ok("Factura guardada: el cliente ya la puede descargar en su pedido");
}

export async function facturaNoAplica(_prev: EstadoAccion, form: FormData): Promise<EstadoAccion> {
  const id = texto(form.get("id"));
  const { supabase } = await equipo();
  const { error } = await supabase.from("pedidos").update({ factura_estado: "no_aplica" }).eq("id", id);
  if (error) return falla(`No se pudo guardar: ${error.message}`);
  refrescar(id);
  return ok("Marcado: no lleva factura");
}

export async function agregarNota(_prev: EstadoAccion, form: FormData): Promise<EstadoAccion> {
  const id = texto(form.get("id"));
  const nota = texto(form.get("nota"));
  if (!nota) return falla("Escribí la nota.");
  const { supabase, usuario } = await equipo();
  const { data: p } = await supabase.from("pedidos").select("estado").eq("id", id).single();
  if (!p) return falla("No se encontró el pedido.");
  await supabase.from("pedido_eventos").insert({ pedido_id: id, estado_anterior: p.estado, estado_nuevo: p.estado, nota, usuario });
  refrescar(id);
  return ok("Nota agregada");
}

/** Corrige los datos de entrega de un pedido (nombre, teléfonos, municipio, dirección, referencia). */
export async function guardarEntrega(_prev: EstadoAccion, form: FormData): Promise<EstadoAccion> {
  const id = texto(form.get("id"));
  const nombre = texto(form.get("nombre")).slice(0, 120);
  const telefono = soloTelefono(form.get("telefono"));
  const alterno = soloTelefono(form.get("telefono_alterno"));
  if (!nombre) return falla("Escribí el nombre.");
  if (!/^[267]\d{7}$/.test(telefono)) return falla("El teléfono debe tener 8 dígitos (ej. 7123 4567).");
  if (alterno && !/^[267]\d{7}$/.test(alterno)) return falla("El teléfono alterno debe tener 8 dígitos.");
  const { supabase, usuario } = await equipo();
  const { data: p } = await supabase.from("pedidos").select("estado, entrega").eq("id", id).single();
  if (!p) return falla("No se encontró el pedido.");
  const antes = (p.entrega ?? {}) as Record<string, unknown>;
  const despues = {
    ...antes,
    nombre,
    telefono,
    telefono_alterno: alterno || null,
    municipio: texto(form.get("municipio")).slice(0, 80) || antes.municipio,
    direccion: texto(form.get("direccion")).slice(0, 300),
    referencia: texto(form.get("referencia")).slice(0, 300) || null,
  };
  const cambiados = ["nombre", "telefono", "telefono_alterno", "municipio", "direccion", "referencia"].filter(
    (k) => (antes[k] ?? null) !== ((despues as Record<string, unknown>)[k] ?? null)
  );
  if (!cambiados.length) return ok("Sin cambios");
  const { error } = await supabase.from("pedidos").update({ entrega: despues }).eq("id", id);
  if (error) return falla(`No se pudo guardar: ${error.message}`);
  const NOMBRES: Record<string, string> = {
    nombre: "nombre",
    telefono: "teléfono",
    telefono_alterno: "teléfono alterno",
    municipio: "municipio",
    direccion: "dirección",
    referencia: "referencia",
  };
  await supabase.from("pedido_eventos").insert({
    pedido_id: id,
    estado_anterior: p.estado,
    estado_nuevo: p.estado,
    nota: `Datos de entrega corregidos: ${cambiados.map((k) => NOMBRES[k]).join(", ")}`,
    usuario,
  });
  refrescar(id);
  return ok("Datos de entrega guardados");
}

/** Enlace manual: el pedido pasa al cliente con ese correo (se crea si no existe). */
export async function cambiarCorreoCliente(_prev: EstadoAccion, form: FormData): Promise<EstadoAccion> {
  const id = texto(form.get("id"));
  const correo = texto(form.get("correo")).toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correo)) return falla("Escribí un correo válido.");
  const { supabase, usuario } = await equipo();
  const { data: p } = await supabase.from("pedidos").select("estado, entrega").eq("id", id).single();
  if (!p) return falla("No se encontró el pedido.");
  const entrega = p.entrega as { nombre: string; telefono: string };
  let { data: cliente } = await supabase.from("clientes").select("id").eq("correo", correo).maybeSingle();
  if (!cliente) {
    const { data: nuevo, error } = await supabase
      .from("clientes")
      .insert({ nombre: entrega.nombre, telefono: entrega.telefono, correo, origen: "panel" })
      .select("id")
      .single();
    if (error) return falla(`No se pudo crear el cliente: ${error.message}`);
    cliente = nuevo;
  }
  await supabase.from("pedidos").update({ cliente_id: cliente.id }).eq("id", id);
  await supabase.from("pedido_eventos").insert({
    pedido_id: id,
    estado_anterior: p.estado,
    estado_nuevo: p.estado,
    nota: `Pedido enlazado a la cuenta de ${correo}`,
    usuario,
  });
  refrescar(id);
  return ok(`Listo: cuando ${correo} entre con Google va a ver este pedido`);
}
