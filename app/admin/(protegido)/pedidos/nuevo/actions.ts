"use server";

import { revalidatePath, updateTag } from "next/cache";
import { after } from "next/server";
import { avisarPedidoNuevo } from "@/lib/correos/avisos";
import { CANALES_MANUALES, cotizarManual, limpiarTelefono, telefonoValido, type CotizacionManual, type LineaManual } from "@/lib/admin/pedido-manual";
import { equipo } from "@/lib/admin/sesion";
import { CANAL } from "@/lib/admin/pedidos";
import { createServiceClient } from "@/lib/supabase/server";
import { sitioActual } from "@/lib/sitio";
import { costosDeVariantes } from "@/lib/tienda/costos";
import { ETIQUETA_CATALOGO } from "@/lib/tienda/datos";
import { FORMA_PAGO, usd2 } from "@/lib/tienda/formato";
import { otorgarPuntos } from "@/lib/tienda/beneficios";
import { marcarPagado } from "@/lib/tienda/pedidos";

// Pedido manual: lo crea alguien del equipo (operador o administrador) para una venta que entró
// por WhatsApp, redes, llamada o en persona. Así todas las ventas quedan en el sistema.

export type ClienteEncontrado = {
  id: string;
  nombre: string;
  correo: string | null;
  telefonoAlterno: string | null;
  municipio: string | null;
  direccion: string | null;
  referencia: string | null;
  pedidos: number;
} | null;

/** Busca un cliente por teléfono para llenar sus datos. */
export async function buscarCliente(telefono: string): Promise<ClienteEncontrado> {
  const { supabase } = await equipo();
  const tel = limpiarTelefono(String(telefono ?? ""));
  if (!telefonoValido(tel)) return null;
  const { data } = await supabase
    .from("clientes")
    .select("id, nombre, correo, telefono_alterno, direccion")
    .or(`telefono.eq.${tel},telefono_alterno.eq.${tel}`)
    .order("created_at")
    .limit(1)
    .maybeSingle();
  if (!data) return null;
  const { count } = await supabase
    .from("pedidos")
    .select("id", { count: "exact", head: true })
    .eq("cliente_id", data.id)
    .not("estado", "in", "(cancelado,devuelto)");
  const d = (data.direccion ?? {}) as { municipio?: string; direccion?: string; referencia?: string };
  return {
    id: data.id,
    nombre: data.nombre ?? "",
    correo: data.correo,
    telefonoAlterno: data.telefono_alterno,
    municipio: d.municipio ?? null,
    direccion: d.direccion ?? null,
    referencia: d.referencia ?? null,
    pedidos: count ?? 0,
  };
}

export type DatosManual = {
  canal: string;
  nombre: string;
  telefono: string;
  telefonoAlterno?: string;
  correo?: string;
  lineas: LineaManual[];
  entrega: "domicilio" | "persona";
  municipio?: string;
  direccion?: string;
  referencia?: string;
  formaPago: string;
  estado: "pendiente_confirmar" | "confirmado" | "entregado";
  pagado: boolean;
  referenciaPago?: string;
  nota?: string;
  enviarCorreo: boolean;
  totalVisto: number;
};

const FORMAS = ["contra_entrega", "transferencia", "wompi", "tasa_cero"] as const;

/** Totales del pedido manual (se recalculan en el servidor con los precios de la base). */
export async function cotizarPedidoManual(e: {
  lineas: LineaManual[];
  formaPago: string;
  entrega: "domicilio" | "persona";
}): Promise<{ ok: true; cotizacion: CotizacionManual } | { ok: false; mensaje: string }> {
  const { esSuperAdmin } = await equipo();
  try {
    const cotizacion = await cotizarManual({
      lineas: Array.isArray(e.lineas) ? e.lineas.slice(0, 40) : [],
      formaPago: String(e.formaPago ?? ""),
      conEnvio: e.entrega !== "persona",
      puedePrecioEspecial: esSuperAdmin,
    });
    return { ok: true, cotizacion };
  } catch (err) {
    return { ok: false, mensaje: err instanceof Error ? err.message : "No se pudo calcular el pedido." };
  }
}

export async function crearPedidoManual(d: DatosManual): Promise<{ ok: true; id: string; numero: number } | { ok: false; mensaje: string }> {
  const { usuario, esSuperAdmin } = await equipo();
  const t = (v: unknown, max = 300) => String(v ?? "").trim().slice(0, max);

  const canal = t(d.canal, 20);
  if (!(CANALES_MANUALES as readonly string[]).includes(canal)) return { ok: false, mensaje: "Elegí por dónde entró el pedido." };
  const nombre = t(d.nombre, 120);
  if (nombre.length < 2) return { ok: false, mensaje: "Escribí el nombre del cliente." };
  const telefono = limpiarTelefono(t(d.telefono, 20));
  if (!telefonoValido(telefono)) return { ok: false, mensaje: "El teléfono debe tener 8 dígitos (ej. 7123 4567)." };
  const alterno = limpiarTelefono(t(d.telefonoAlterno, 20));
  if (alterno && !telefonoValido(alterno)) return { ok: false, mensaje: "El teléfono alterno debe tener 8 dígitos." };
  const correo = t(d.correo, 120).toLowerCase();
  if (correo && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correo)) return { ok: false, mensaje: "Revisá el correo (o dejalo vacío)." };
  const enPersona = d.entrega === "persona";
  const municipio = t(d.municipio, 80);
  const direccion = t(d.direccion);
  if (!enPersona && (!municipio || direccion.length < 5)) return { ok: false, mensaje: "Escribí el municipio y la dirección de entrega." };
  const formaPago = t(d.formaPago, 20);
  if (!(FORMAS as readonly string[]).includes(formaPago)) return { ok: false, mensaje: "Elegí la forma de pago." };
  const estado = (["pendiente_confirmar", "confirmado", "entregado"] as const).find((x) => x === d.estado) ?? "confirmado";

  let cot: CotizacionManual;
  try {
    cot = await cotizarManual({ lineas: Array.isArray(d.lineas) ? d.lineas.slice(0, 40) : [], formaPago, conEnvio: !enPersona, puedePrecioEspecial: esSuperAdmin });
  } catch (err) {
    return { ok: false, mensaje: err instanceof Error ? err.message : "No se pudo calcular el pedido." };
  }
  if (Math.abs(cot.total - Number(d.totalVisto)) > 0.009) {
    return { ok: false, mensaje: `El total cambió a ${usd2(cot.total)} (un precio o una oferta cambió). Revisalo y volvé a tocar Crear pedido.` };
  }

  const sb = createServiceClient();
  // Cliente: el del correo; si no, el del teléfono; si no, uno nuevo
  const { data: porCorreo } = correo ? await sb.from("clientes").select("id, correo, nombre").eq("correo", correo).maybeSingle() : { data: null };
  const { data: porTelefono } = porCorreo
    ? { data: null }
    : await sb.from("clientes").select("id, correo, nombre").eq("telefono", telefono).order("created_at").limit(1).maybeSingle();
  const existente = porCorreo ?? porTelefono;
  const direccionCliente = enPersona ? null : { zona: municipio, departamento: null, municipio, direccion, referencia: t(d.referencia) || null };
  let clienteId: string;
  if (existente) {
    clienteId = existente.id;
    await sb
      .from("clientes")
      .update({
        ...(existente.nombre ? {} : { nombre }),
        ...(!existente.correo && correo ? { correo } : {}),
        ...(alterno ? { telefono_alterno: alterno } : {}),
        ...(direccionCliente ? { direccion: direccionCliente } : {}),
      })
      .eq("id", clienteId);
  } else {
    const { data: nuevo, error } = await sb
      .from("clientes")
      .insert({ nombre, telefono, telefono_alterno: alterno || null, correo: correo || null, direccion: direccionCliente, origen: canal })
      .select("id")
      .single();
    if (error) return { ok: false, mensaje: `No se pudo guardar el cliente: ${error.message}` };
    clienteId = nuevo.id;
  }

  const ahora = new Date().toISOString();
  const { data: pedido, error: e1 } = await sb
    .from("pedidos")
    .insert({
      cliente_id: clienteId,
      estado,
      forma_pago: formaPago,
      subtotal: cot.subtotal,
      envio: cot.envio,
      descuento: cot.descuento,
      total: cot.total,
      canal,
      creado_por: usuario,
      origen: canal,
      entrega: {
        nombre,
        telefono,
        telefono_alterno: alterno || null,
        correo: correo || "",
        zona: enPersona ? "Entrega en persona" : municipio,
        departamento: null,
        municipio: enPersona ? "Entrega en persona" : municipio,
        direccion: enPersona ? "" : direccion,
        referencia: enPersona ? null : t(d.referencia) || null,
      },
      notas: t(d.nota, 500) || null,
      confirmado_en: estado === "pendiente_confirmar" ? null : ahora,
      entregado_en: estado === "entregado" ? ahora : null,
    })
    .select("id, numero, total")
    .single();
  if (e1) return { ok: false, mensaje: `No se pudo crear el pedido: ${e1.message}` };

  const costos = await costosDeVariantes(cot.lineas.map((l) => l.varianteId)).catch(() => new Map<string, number>());
  const { error: e2 } = await sb.from("lineas_pedido").insert(
    cot.lineas.map((l) => ({
      pedido_id: pedido.id,
      variante_id: l.varianteId,
      nombre: l.nombre,
      cantidad: l.cantidad,
      precio_unitario: l.precio,
      precio_regular: l.precioRegular,
      costo_unitario: costos.get(l.varianteId) ?? null,
    }))
  );
  if (e2) {
    await sb.from("pedidos").delete().eq("id", pedido.id);
    return { ok: false, mensaje: `No se pudo guardar los productos: ${e2.message}` };
  }
  const especiales = cot.lineas.filter((l) => l.especial);
  await sb.from("pedido_eventos").insert({
    pedido_id: pedido.id,
    estado_nuevo: estado,
    nota: [
      `Pedido creado en el panel (${CANAL[canal] ?? canal})`,
      `${FORMA_PAGO[formaPago]}`,
      enPersona ? "entrega en persona" : "",
      especiales.length ? `precio especial: ${especiales.map((l) => `${l.nombre} ${usd2(l.precio)}`).join(", ")}` : "",
    ]
      .filter(Boolean)
      .join(" · "),
    usuario,
  });

  // Confirmado o entregado: se descuentan las unidades propias en bodega (igual que al confirmar en Pedidos)
  if (estado !== "pendiente_confirmar") {
    for (const l of cot.lineas) {
      const { data: v } = await sb.from("variantes").select("stock").eq("id", l.varianteId).single();
      if (v && v.stock > 0) await sb.from("variantes").update({ stock: Math.max(0, v.stock - l.cantidad) }).eq("id", l.varianteId);
    }
    updateTag(ETIQUETA_CATALOGO);
  }

  const sitio = await sitioActual();
  if (d.pagado || estado === "entregado") {
    await marcarPagado({
      pedidoId: pedido.id,
      metodo: formaPago as (typeof FORMAS)[number],
      monto: Number(pedido.total),
      referencia: t(d.referenciaPago, 80) || null,
      usuario,
      nota: `Pago registrado al crear el pedido${t(d.referenciaPago, 80) ? ` (ref. ${t(d.referenciaPago, 80)})` : ""}`,
    });
    if (estado === "entregado") await otorgarPuntos(pedido.id).catch((e) => console.error("otorgarPuntos", e));
  } else if (formaPago !== "wompi") {
    await sb.from("pagos").insert({ pedido_id: pedido.id, metodo: formaPago, monto: pedido.total, estado: "pendiente" });
  }
  if (correo && d.enviarCorreo) {
    after(() => avisarPedidoNuevo(pedido.id, sitio, { avisarEquipo: false }).catch((e) => console.error("avisarPedidoNuevo", e)));
  }

  revalidatePath("/admin/pedidos");
  revalidatePath("/admin");
  return { ok: true, id: pedido.id, numero: pedido.numero };
}
