import "server-only";
import { z } from "zod";
import { createServiceClient } from "@/lib/supabase/server";
import { calcularCarrito, type ResumenCarrito } from "@/lib/tienda/calculo";
import { configTienda } from "@/lib/tienda/datos";
import { crearEnlacePago, ErrorWompi } from "@/lib/wompi";

// Pedidos de la tienda: se crean y se actualizan SOLO desde el servidor (clave de servicio).

export const DEPARTAMENTOS = [
  "Ahuachapán",
  "Cabañas",
  "Chalatenango",
  "Cuscatlán",
  "La Libertad",
  "La Paz",
  "La Unión",
  "Morazán",
  "San Miguel",
  "San Salvador",
  "San Vicente",
  "Santa Ana",
  "Sonsonate",
  "Usulután",
] as const;

export const OTRA_ZONA = "Otro municipio";
export const MINIMO_TASA_CERO = 100;

const texto = (max: number) => z.string().trim().max(max);

export const esquemaCheckout = z
  .object({
    nombre: texto(80).min(3, "Escribí tu nombre completo."),
    telefono: z
      .string()
      .transform((t) => t.replace(/\D/g, "").replace(/^503(?=\d{8}$)/, ""))
      .refine((t) => /^[267]\d{7}$/.test(t), "Escribí un teléfono de 8 dígitos."),
    correo: z.string().trim().toLowerCase().email("Revisá tu correo: ahí te llega la factura."),
    zona: texto(80).min(1, "Elegí dónde lo recibís."),
    departamento: texto(40).optional().default(""),
    municipio: texto(80).optional().default(""),
    direccion: texto(300).min(8, "Escribí la dirección completa (colonia, calle, casa)."),
    referencia: texto(200).optional().default(""),
    formaPago: z.enum(["contra_entrega", "transferencia", "wompi", "tasa_cero"]),
    creditoFiscal: z.boolean().default(false),
    nit: texto(20).optional().default(""),
    nrc: texto(20).optional().default(""),
    razonSocial: texto(150).optional().default(""),
    giro: texto(150).optional().default(""),
    notas: texto(300).optional().default(""),
    totalVisto: z.number().nonnegative(),
    lineas: z.array(z.object({ v: z.string(), c: z.number() })).min(1, "Tu carrito está vacío.").max(30),
  })
  .superRefine((d, ctx) => {
    if (d.zona === OTRA_ZONA && !DEPARTAMENTOS.includes(d.departamento as (typeof DEPARTAMENTOS)[number])) {
      ctx.addIssue({ code: "custom", path: ["departamento"], message: "Elegí el departamento." });
    }
    if (d.zona === OTRA_ZONA && d.municipio.length < 3) {
      ctx.addIssue({ code: "custom", path: ["municipio"], message: "Escribí el municipio o distrito." });
    }
    if (d.creditoFiscal) {
      if (!/^[\d-]{9,17}$/.test(d.nit)) ctx.addIssue({ code: "custom", path: ["nit"], message: "Revisá el NIT." });
      if (!/^[\d-]{2,10}$/.test(d.nrc)) ctx.addIssue({ code: "custom", path: ["nrc"], message: "Revisá el NRC." });
      if (d.razonSocial.length < 3)
        ctx.addIssue({ code: "custom", path: ["razonSocial"], message: "Escribí el nombre o razón social." });
      if (d.giro.length < 3) ctx.addIssue({ code: "custom", path: ["giro"], message: "Escribí el giro o actividad." });
    }
  });

export type DatosCheckout = z.infer<typeof esquemaCheckout>;

export type ResultadoPedido =
  | { ok: true; url: string; externa: boolean }
  | { ok: false; mensaje: string; campos?: Record<string, string>; resumen?: ResumenCarrito };

const ahora = () => new Date().toISOString();

/** Crea el pedido completo. Los precios salen de la base, no del navegador. */
export async function crearPedido(datos: DatosCheckout, origen: string): Promise<ResultadoPedido> {
  const sb = createServiceClient();
  const [resumen, config] = await Promise.all([calcularCarrito(datos.lineas), configTienda()]);

  if (!resumen.lineas.length) return { ok: false, mensaje: "Tu carrito está vacío o los productos ya no están disponibles.", resumen };
  if (resumen.quitadas.length) {
    return { ok: false, mensaje: "Algo de tu carrito ya no está disponible. Revisá el resumen y confirmá de nuevo.", resumen };
  }
  if (Math.abs(resumen.total - datos.totalVisto) > 0.009) {
    return { ok: false, mensaje: "El total cambió mientras comprabas. Revisalo y confirmá de nuevo.", resumen };
  }
  const contraEntrega = config.municipiosContraEntrega.includes(datos.zona);
  if (datos.formaPago === "contra_entrega" && !contraEntrega) {
    return { ok: false, mensaje: "El pago contra entrega no está disponible en esa zona. Elegí otra forma de pago." };
  }
  if (datos.formaPago === "tasa_cero" && resumen.total < MINIMO_TASA_CERO) {
    return { ok: false, mensaje: `La tasa 0% es para compras desde $${MINIMO_TASA_CERO}.` };
  }

  // Freno simple contra pedidos repetidos o automáticos: máximo 3 por teléfono cada 10 minutos
  const hace10 = new Date(Date.now() - 10 * 60_000).toISOString();
  const { count } = await sb
    .from("pedidos")
    .select("id", { count: "exact", head: true })
    .eq("entrega->>telefono", datos.telefono)
    .gte("created_at", hace10);
  if ((count ?? 0) >= 3) {
    return { ok: false, mensaje: "Ya recibimos varios pedidos con ese teléfono. Escribinos por WhatsApp y lo revisamos." };
  }

  // Cliente: uno por correo (así se enlaza después con su cuenta de Google)
  const { data: existente } = await sb.from("clientes").select("id").eq("correo", datos.correo).maybeSingle();
  const direccion = {
    zona: datos.zona,
    departamento: datos.zona === OTRA_ZONA ? datos.departamento : null,
    municipio: datos.zona === OTRA_ZONA ? datos.municipio : datos.zona,
    direccion: datos.direccion,
    referencia: datos.referencia || null,
  };
  let clienteId = existente?.id as string | undefined;
  if (clienteId) {
    await sb.from("clientes").update({ nombre: datos.nombre, telefono: datos.telefono, direccion }).eq("id", clienteId);
  } else {
    const { data: nuevo, error } = await sb
      .from("clientes")
      .insert({ nombre: datos.nombre, telefono: datos.telefono, correo: datos.correo, direccion, origen: "web" })
      .select("id")
      .single();
    if (error) throw error;
    clienteId = nuevo.id;
  }

  const facturacion = datos.creditoFiscal
    ? { tipo: "credito_fiscal", nit: datos.nit, nrc: datos.nrc, nombre: datos.razonSocial, giro: datos.giro }
    : { tipo: "consumidor_final" };

  const { data: pedido, error: e1 } = await sb
    .from("pedidos")
    .insert({
      cliente_id: clienteId,
      estado: "pendiente_confirmar",
      forma_pago: datos.formaPago,
      subtotal: resumen.subtotal,
      envio: resumen.envio,
      descuento: 0,
      total: resumen.total,
      entrega: { nombre: datos.nombre, telefono: datos.telefono, correo: datos.correo, ...direccion },
      facturacion,
      origen: "web",
      notas: datos.notas || null,
    })
    .select("id, numero, token, total")
    .single();
  if (e1) throw e1;

  const { error: e2 } = await sb.from("lineas_pedido").insert(
    resumen.lineas.map((l) => ({
      pedido_id: pedido.id,
      variante_id: l.varianteId,
      nombre: l.nombre,
      cantidad: l.cantidad,
      precio_unitario: l.precio,
    }))
  );
  if (e2) {
    await sb.from("pedidos").delete().eq("id", pedido.id);
    throw e2;
  }
  await sb.from("pedido_eventos").insert({
    pedido_id: pedido.id,
    estado_nuevo: "pendiente_confirmar",
    nota: "Pedido hecho en la tienda en línea",
    usuario: "cliente",
  });

  if (datos.formaPago === "wompi") {
    const url = await iniciarPagoWompi(pedido.id, origen);
    return url ? { ok: true, url, externa: true } : { ok: true, url: `/pedido/${pedido.token}?pago=error`, externa: false };
  }
  await sb.from("pagos").insert({ pedido_id: pedido.id, metodo: datos.formaPago, monto: pedido.total, estado: "pendiente" });
  return { ok: true, url: `/pedido/${pedido.token}?nuevo=1`, externa: false };
}

/**
 * Crea un enlace de pago de Wompi para el pedido y devuelve su dirección (o null si Wompi falló).
 * Cada intento tiene su propio identificador: "<id del pedido>-i<n>".
 */
export async function iniciarPagoWompi(pedidoId: string, origen: string): Promise<string | null> {
  const sb = createServiceClient();
  const { data: p } = await sb
    .from("pedidos")
    .select("id, numero, token, total, pagado_en, estado, lineas_pedido(nombre, cantidad)")
    .eq("id", pedidoId)
    .single();
  if (!p || p.pagado_en || p.estado === "cancelado") return null;

  const { count } = await sb.from("pagos").select("id", { count: "exact", head: true }).eq("pedido_id", p.id).eq("metodo", "wompi");
  const identificador = `${p.id}-i${(count ?? 0) + 1}`;
  const descripcion = (p.lineas_pedido as { nombre: string; cantidad: number }[])
    .map((l) => `${l.cantidad} × ${l.nombre}`)
    .join(", ");
  try {
    const enlace = await crearEnlacePago({
      identificador,
      monto: Number(p.total),
      nombre: `Pedido #${p.numero} · Nera Tech`,
      descripcion,
      urlRedirect: `${origen}/api/wompi/regreso`,
      urlWebhook: `${origen}/api/webhooks/wompi`,
      urlRetorno: `${origen}/pedido/${p.token}`,
    });
    await sb.from("pagos").insert({
      pedido_id: p.id,
      metodo: "wompi",
      monto: p.total,
      estado: "pendiente",
      referencia_externa: identificador,
      payload: { idEnlace: enlace.idEnlace, urlEnlace: enlace.urlEnlace, estaProductivo: enlace.estaProductivo ?? null },
    });
    return enlace.urlEnlace;
  } catch (e) {
    console.error("Wompi: no se pudo crear el enlace", e instanceof ErrorWompi ? e.message : e);
    await sb.from("pedido_eventos").insert({
      pedido_id: p.id,
      estado_nuevo: p.estado,
      estado_anterior: p.estado,
      nota: "No se pudo abrir el pago con tarjeta (Wompi). El cliente puede reintentar.",
      usuario: "sistema",
    });
    return null;
  }
}

/**
 * Marca un pedido como pagado. Si ya estaba pagado no hace nada (Wompi puede avisar dos veces:
 * por el regreso del cliente y por el webhook).
 */
export async function marcarPagado(p: {
  pedidoId: string;
  metodo: "contra_entrega" | "transferencia" | "wompi" | "tasa_cero";
  monto: number;
  referencia?: string | null;
  pagoReferencia?: string | null; // identificador del intento de Wompi
  payload?: unknown;
  usuario: string;
  nota: string;
}): Promise<boolean> {
  const sb = createServiceClient();
  const { data: pedido } = await sb.from("pedidos").select("id, estado, pagado_en").eq("id", p.pedidoId).single();
  if (!pedido) return false;
  if (pedido.pagado_en) return true;

  // Solo marca si nadie lo marcó entre tanto (evita dos registros con avisos simultáneos)
  const { data: marcado } = await sb
    .from("pedidos")
    .update({ pagado_en: ahora() })
    .eq("id", p.pedidoId)
    .is("pagado_en", null)
    .select("id");
  if (!marcado?.length) return true;

  const datosPago = { estado: "aprobado", monto: p.monto, payload: p.payload ?? null };
  const { data: pagoPrevio } = p.pagoReferencia
    ? await sb.from("pagos").select("id").eq("referencia_externa", p.pagoReferencia).maybeSingle()
    : await sb
        .from("pagos")
        .select("id")
        .eq("pedido_id", p.pedidoId)
        .eq("metodo", p.metodo)
        .eq("estado", "pendiente")
        .limit(1)
        .maybeSingle();
  if (pagoPrevio) {
    await sb
      .from("pagos")
      .update({ ...datosPago, ...(p.referencia && !p.pagoReferencia ? { referencia_externa: p.referencia } : {}) })
      .eq("id", pagoPrevio.id);
  } else {
    await sb.from("pagos").insert({ pedido_id: p.pedidoId, metodo: p.metodo, referencia_externa: p.referencia ?? null, ...datosPago });
  }
  await sb.from("pedido_eventos").insert({
    pedido_id: p.pedidoId,
    estado_anterior: pedido.estado,
    estado_nuevo: pedido.estado,
    nota: p.nota,
    usuario: p.usuario,
  });
  return true;
}

/** Busca el pedido de un intento de pago de Wompi. */
export async function pedidoDeIntentoWompi(identificador: string) {
  const sb = createServiceClient();
  const { data } = await sb
    .from("pagos")
    .select("pedido_id, monto, pedidos(token, total, numero)")
    .eq("referencia_externa", identificador)
    .eq("metodo", "wompi")
    .maybeSingle();
  if (!data) return null;
  const pedido = data.pedidos as unknown as { token: string; total: number; numero: number } | null;
  return pedido ? { pedidoId: data.pedido_id as string, token: pedido.token, total: Number(pedido.total), numero: pedido.numero } : null;
}
