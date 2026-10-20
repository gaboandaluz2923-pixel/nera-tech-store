"use server";

import { revalidatePath, updateTag } from "next/cache";
import { after } from "next/server";
import type { EstadoAccion } from "@/components/admin/formulario-accion";
import {
  bloqueoEdicion,
  cotizarEdicion,
  leerPedidoParaEditar,
  pagadoDe,
  r2,
  type CotizacionEdicion,
  type EntradaEdicion,
} from "@/lib/admin/editar-pedido";
import { superAdmin } from "@/lib/admin/sesion";
import { avisarPedidoModificado } from "@/lib/correos/avisos";
import { sitioActual } from "@/lib/sitio";
import { createServiceClient } from "@/lib/supabase/server";
import { ETIQUETA_CATALOGO } from "@/lib/tienda/datos";
import { FORMA_PAGO, usd2 } from "@/lib/tienda/formato";

// Corregir un pedido (solo administradores) y registrar el saldo o la devolución que resulte.

const ok = (mensaje: string): EstadoAccion => ({ ok: true, mensaje, vez: Date.now() });
const falla = (mensaje: string): EstadoAccion => ({ ok: false, mensaje, vez: Date.now() });
const texto = (v: unknown, max = 500) => String(v ?? "").replace(/\s+/g, " ").trim().slice(0, max);

function refrescar(id: string) {
  revalidatePath("/admin/pedidos");
  revalidatePath(`/admin/pedidos/${id}`);
  revalidatePath("/admin");
}

function limpiarEntrada(x: EntradaEdicion): EntradaEdicion {
  return {
    pedidoId: String(x?.pedidoId ?? ""),
    lineas: (Array.isArray(x?.lineas) ? x.lineas : []).slice(0, 40).map((l) => ({
      id: l?.id ? String(l.id) : null,
      v: String(l?.v ?? ""),
      c: Number(l?.c) || 0,
      precio: l?.precio === null || l?.precio === undefined || String(l.precio) === "" ? null : Number(l.precio),
    })),
    envio: {
      modo: (["normal", "gratis", "monto"] as const).includes(x?.envio?.modo) ? x.envio.modo : "normal",
      monto: x?.envio?.monto === null || x?.envio?.monto === undefined ? null : Number(x.envio.monto),
      motivo: texto(x?.envio?.motivo, 60) || null,
    },
    extra: { tipo: x?.extra?.tipo === "pct" ? "pct" : "monto", valor: Number(x?.extra?.valor) || 0, motivo: texto(x?.extra?.motivo, 80) || null },
    quitarCombos: Boolean(x?.quitarCombos),
  };
}

export async function cotizarEdicionPedido(
  entrada: EntradaEdicion
): Promise<{ ok: true; cotizacion: CotizacionEdicion } | { ok: false; mensaje: string }> {
  try {
    await superAdmin();
    const e = limpiarEntrada(entrada);
    const p = await leerPedidoParaEditar(e.pedidoId);
    const bloqueo = await bloqueoEdicion(p);
    if (bloqueo) return { ok: false, mensaje: bloqueo };
    return { ok: true, cotizacion: await cotizarEdicion(e, p) };
  } catch (err) {
    return { ok: false, mensaje: err instanceof Error ? err.message : "No se pudo calcular." };
  }
}

export async function guardarEdicionPedido(
  entrada: EntradaEdicion & { motivo: string; mensaje: string; avisar: boolean; aceptaBajoCosto: boolean; totalVisto: number }
): Promise<EstadoAccion> {
  let s: Awaited<ReturnType<typeof superAdmin>>;
  try {
    s = await superAdmin();
  } catch (err) {
    return falla(err instanceof Error ? err.message : "Sin permiso.");
  }
  const { supabase, usuario } = s;
  const e = limpiarEntrada(entrada);
  const motivo = texto(entrada.motivo, 300);
  const mensaje = texto(entrada.mensaje, 500);
  if (!motivo) return falla("Escribí el motivo del cambio (queda en el historial).");

  let p: Awaited<ReturnType<typeof leerPedidoParaEditar>>;
  let cot: CotizacionEdicion;
  try {
    p = await leerPedidoParaEditar(e.pedidoId);
    const bloqueo = await bloqueoEdicion(p);
    if (bloqueo) return falla(bloqueo);
    cot = await cotizarEdicion(e, p);
  } catch (err) {
    return falla(err instanceof Error ? err.message : "No se pudo calcular.");
  }
  if (!cot.cambios.length) return falla("No cambiaste nada.");
  if (Math.abs(cot.total - Number(entrada.totalVisto)) > 0.009) {
    return falla(`El total cambió a ${usd2(cot.total)} mientras editabas. Revisalo y volvé a guardar.`);
  }
  if (cot.bajoCosto && !entrada.aceptaBajoCosto) {
    return falla(`Así el pedido deja ${usd2(cot.contribucion)} (pierde dinero). Marcá «Sí, dejarlo así» si es a propósito.`);
  }

  const sb = createServiceClient();
  // Pedido viejo marcado como pagado sin el detalle del pago: se anota el pago por el total de antes, así el
  // saldo queda bien de aquí en adelante
  if (p.pagado_en && !p.pagos.some((x) => x.estado === "aprobado")) {
    await sb.from("pagos").insert({ pedido_id: p.id, metodo: p.forma_pago, monto: Number(p.total), estado: "aprobado", payload: { nota: "Pago anterior (anotado al corregir el pedido)" } });
  }
  const conBodega = cot.cambianProductos && p.inventario_descontado;
  // 1) Si cambian los productos de un pedido ya apartado en bodega: vuelve todo y se aparta de nuevo al final
  if (conBodega) {
    const { error } = await supabase.rpc("inv_devolver_pedido", { p_pedido: p.id });
    if (error) return falla(`No se pudo devolver a bodega lo apartado: ${error.message}`);
  }

  // 2) Líneas
  const quedan = new Set(cot.lineas.map((l) => l.id).filter(Boolean) as string[]);
  const quitar = p.lineas_pedido.filter((l) => !quedan.has(l.id)).map((l) => l.id);
  let errorLineas: string | null = null;
  if (quitar.length) {
    const { error } = await sb.from("lineas_pedido").delete().in("id", quitar).eq("pedido_id", p.id);
    if (error) errorLineas = error.message;
  }
  for (const l of cot.lineas.filter((x) => x.id)) {
    const a = p.lineas_pedido.find((x) => x.id === l.id)!;
    if (a.cantidad === l.cantidad && Math.abs(Number(a.precio_unitario) - l.precio) < 0.005) continue;
    const { error } = await sb
      .from("lineas_pedido")
      .update({ cantidad: l.cantidad, precio_unitario: l.precio, ...(Math.abs(Number(a.precio_unitario) - l.precio) >= 0.005 ? { precio_regular: null } : {}) })
      .eq("id", l.id!);
    if (error) errorLineas = error.message;
  }
  const nuevas = cot.lineas.filter((l) => !l.id);
  if (nuevas.length) {
    const { error } = await sb.from("lineas_pedido").insert(
      nuevas.map((l) => ({
        pedido_id: p.id,
        variante_id: l.varianteId,
        nombre: l.nombre,
        cantidad: l.cantidad,
        precio_unitario: l.precio,
        costo_unitario: l.costo,
      }))
    );
    if (error) errorLineas = error.message;
  }

  // 3) Pedido
  const { error: ePedido } = await sb
    .from("pedidos")
    .update({
      subtotal: cot.subtotal,
      envio: cot.envio,
      envio_motivo: cot.envioMotivo,
      descuento: cot.descuentoPago,
      descuento_combos: cot.descuentoCombos,
      ...(e.quitarCombos ? { combos: [] } : {}),
      descuento_extra: cot.descuentoExtra,
      descuento_extra_motivo: cot.descuentoExtraMotivo,
      total: cot.total,
      modificado_en: new Date().toISOString(),
    })
    .eq("id", p.id);

  // 4) Bodega: se aparta lo nuevo (las funciones no descuentan dos veces)
  let avisoBodega = "";
  if (conBodega) {
    const { error } = await supabase.rpc("inv_confirmar_pedido", { p_pedido: p.id });
    avisoBodega = error ? ` Ojo: no se pudo apartar de bodega (${error.message}).` : " Se apartaron de bodega los equipos de nuevo: revisá los IMEI.";
    updateTag(ETIQUETA_CATALOGO);
  }

  // 5) Pagos sin cobrar (transferencia, contra entrega): el monto pendiente pasa a ser el total nuevo
  if (!p.pagado_en) {
    await sb.from("pagos").update({ monto: cot.total }).eq("pedido_id", p.id).eq("estado", "pendiente").neq("metodo", "wompi");
  }

  // 6) Historial
  const saldoTexto =
    p.pagado_en || cot.pagado > 0
      ? cot.saldo > 0.004
        ? ` Saldo pendiente: ${usd2(cot.saldo)}.`
        : cot.saldo < -0.004
          ? ` A favor del cliente: ${usd2(-cot.saldo)} (devolver).`
          : " Pago al día."
      : "";
  await sb.from("pedido_eventos").insert({
    pedido_id: p.id,
    estado_anterior: p.estado,
    estado_nuevo: p.estado,
    nota: `Pedido corregido: ${motivo}. ${cot.cambios.join(" · ")}. Total ${usd2(cot.totalAnterior)} → ${usd2(cot.total)}.${saldoTexto}${
      cot.bajoCosto ? ` Bajo costo, aceptado (deja ${usd2(cot.contribucion)}).` : ""
    }${mensaje ? ` Mensaje al cliente: "${mensaje}"` : ""}`,
    usuario,
  });

  // 7) Correo al cliente
  if (entrada.avisar) {
    const sitio = await sitioActual();
    const resumen = { cambios: cot.cambios, totalAnterior: cot.totalAnterior, pagado: cot.pagado, saldo: cot.saldo, mensaje: mensaje || null };
    after(() => avisarPedidoModificado(p.id, sitio, resumen).catch((err) => console.error("avisarPedidoModificado", err)));
  }

  refrescar(p.id);
  if (ePedido || errorLineas) return falla(`Se guardó a medias: ${ePedido?.message ?? errorLineas}. Revisá el pedido.`);
  return ok(`Pedido corregido: total ${usd2(cot.total)}.${saldoTexto}${avisoBodega}${entrada.avisar ? " Se le avisa al cliente por correo." : ""}`);
}

/** Pago de un saldo pendiente después de corregir un pedido ya pagado (o un pago parcial). */
export async function registrarPagoSaldo(_prev: EstadoAccion, form: FormData): Promise<EstadoAccion> {
  const { usuario } = await superAdmin();
  const id = texto(form.get("id"), 40);
  const monto = r2(Number(form.get("monto")));
  const referencia = texto(form.get("referencia"), 80);
  if (!(monto > 0)) return falla("Escribí el monto que pagó el cliente.");
  const sb = createServiceClient();
  const { data: p } = await sb.from("pedidos").select("id, estado, forma_pago, total, pagado_en, pagos(monto, estado)").eq("id", id).single();
  if (!p) return falla("No se encontró el pedido.");
  const pagado = pagadoDe(p as { pagado_en: string | null; total: number; pagos: { monto: number; estado: string }[] });
  const saldo = r2(Number(p.total) - pagado);
  if (monto > saldo + 0.009) return falla(`El saldo pendiente es ${usd2(saldo)}; no se puede registrar más que eso.`);
  await sb.from("pagos").insert({ pedido_id: id, metodo: p.forma_pago, monto, estado: "aprobado", referencia_externa: referencia || null });
  await sb.from("pedido_eventos").insert({
    pedido_id: id,
    estado_anterior: p.estado,
    estado_nuevo: p.estado,
    nota: `Pago del saldo: ${usd2(monto)} (${FORMA_PAGO[p.forma_pago] ?? p.forma_pago}${referencia ? `, ref. ${referencia}` : ""}). Queda ${usd2(r2(saldo - monto))}.`,
    usuario,
  });
  refrescar(id);
  return ok(`Pago de ${usd2(monto)} registrado`);
}

/** Devolución al cliente de lo que pagó de más (se registra como pago negativo). */
export async function registrarDevolucion(_prev: EstadoAccion, form: FormData): Promise<EstadoAccion> {
  const { usuario } = await superAdmin();
  const id = texto(form.get("id"), 40);
  const monto = r2(Number(form.get("monto")));
  const referencia = texto(form.get("referencia"), 80);
  if (!(monto > 0)) return falla("Escribí el monto que le devolviste.");
  const sb = createServiceClient();
  const { data: p } = await sb.from("pedidos").select("id, estado, forma_pago, total, pagado_en, pagos(monto, estado)").eq("id", id).single();
  if (!p) return falla("No se encontró el pedido.");
  const pagado = pagadoDe(p as { pagado_en: string | null; total: number; pagos: { monto: number; estado: string }[] });
  const aFavor = r2(pagado - Number(p.total));
  if (monto > aFavor + 0.009) return falla(`Lo que está a favor del cliente es ${usd2(Math.max(0, aFavor))}.`);
  await sb.from("pagos").insert({ pedido_id: id, metodo: p.forma_pago, monto: -monto, estado: "aprobado", referencia_externa: referencia || null });
  await sb.from("pedido_eventos").insert({
    pedido_id: id,
    estado_anterior: p.estado,
    estado_nuevo: p.estado,
    nota: `Devolución al cliente: ${usd2(monto)}${referencia ? ` (ref. ${referencia})` : ""}.`,
    usuario,
  });
  refrescar(id);
  return ok(`Devolución de ${usd2(monto)} registrada`);
}
