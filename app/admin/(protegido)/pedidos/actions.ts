"use server";

import { revalidatePath, updateTag } from "next/cache";
import { after } from "next/server";
import { avisarEstado, avisarFactura } from "@/lib/correos/avisos";
import { sitioActual } from "@/lib/sitio";
import type { EstadoAccion } from "@/components/admin/formulario-accion";
import { SIGUIENTES, type EstadoPedido } from "@/lib/admin/pedidos";
import { equipo } from "@/lib/admin/sesion";
import { ETIQUETA_CATALOGO } from "@/lib/tienda/datos";
import { marcarPagado } from "@/lib/tienda/pedidos";

// Acciones de la sección Pedidos. Todas verifican que quien las usa sea del equipo.

const texto = (v: FormDataEntryValue | null) => String(v ?? "").trim();
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
  const { supabase, usuario } = await equipo();
  const { data: p } = await supabase
    .from("pedidos")
    .select("id, estado, forma_pago, total, pagado_en, confirmado_en, lineas_pedido(variante_id, cantidad)")
    .eq("id", id)
    .single();
  if (!p) return falla("No se encontró el pedido.");
  if (!SIGUIENTES[p.estado as EstadoPedido]?.some((s) => s.estado === nuevo)) {
    return falla("Ese cambio de estado no se puede hacer desde el estado actual.");
  }
  if (nuevo === "cancelado" && !nota) return falla("Escribí el motivo de la cancelación en la nota.");

  const cambios: Record<string, unknown> = { estado: nuevo };
  const ahora = new Date().toISOString();
  if (nuevo === "confirmado" && !p.confirmado_en) cambios.confirmado_en = ahora;
  if (nuevo === "entregado") {
    cambios.entregado_en = ahora;
    if (!p.confirmado_en) cambios.confirmado_en = ahora;
  }
  if (nuevo === "pendiente_confirmar") cambios.confirmado_en = null;

  const { error } = await supabase.from("pedidos").update(cambios).eq("id", id).eq("estado", p.estado);
  if (error) return falla(`No se pudo guardar: ${error.message}`);
  await supabase.from("pedido_eventos").insert({
    pedido_id: id,
    estado_anterior: p.estado,
    estado_nuevo: nuevo,
    nota: nota || null,
    usuario,
  });

  // Al confirmar, se descuentan las unidades propias en bodega (si había)
  if (nuevo === "confirmado" && !p.confirmado_en) {
    for (const l of (p.lineas_pedido ?? []) as { variante_id: string | null; cantidad: number }[]) {
      if (!l.variante_id) continue;
      const { data: v } = await supabase.from("variantes").select("stock").eq("id", l.variante_id).single();
      if (v && v.stock > 0) {
        await supabase.from("variantes").update({ stock: Math.max(0, v.stock - l.cantidad) }).eq("id", l.variante_id);
      }
    }
    updateTag(ETIQUETA_CATALOGO);
  }

  // Correo al cliente con el nuevo estado
  const sitio = await sitioActual();
  if (["confirmado", "en_camino", "entregado", "cancelado"].includes(nuevo)) {
    after(() => avisarEstado(id, nuevo, nota || null, sitio).catch((e) => console.error("avisarEstado", e)));
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
  refrescar(id);
  return ok("Estado actualizado");
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
