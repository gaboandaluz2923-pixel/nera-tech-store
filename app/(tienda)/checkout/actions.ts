"use server";

import { headers } from "next/headers";
import { createServiceClient } from "@/lib/supabase/server";
import { crearPedido, esquemaCheckout, iniciarPagoWompi, type ResultadoPedido } from "@/lib/tienda/pedidos";

/** Dirección pública del sitio desde la petición (para las direcciones de regreso de Wompi). */
async function origenSitio() {
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host");
  const proto = h.get("x-forwarded-proto") ?? (host?.startsWith("localhost") ? "http" : "https");
  return host ? `${proto}://${host}` : (process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000");
}

export async function confirmarPedido(entrada: unknown): Promise<ResultadoPedido> {
  // Campo trampa para robots
  if ((entrada as { sitio?: string })?.sitio) return { ok: false, mensaje: "No se pudo enviar el pedido." };

  const datos = esquemaCheckout.safeParse(entrada);
  if (!datos.success) {
    const campos: Record<string, string> = {};
    for (const i of datos.error.issues) {
      const k = String(i.path[0] ?? "");
      if (k && !campos[k]) campos[k] = i.message;
    }
    return { ok: false, mensaje: "Revisá los datos marcados en rojo.", campos };
  }
  try {
    return await crearPedido(datos.data, await origenSitio());
  } catch (e) {
    console.error("confirmarPedido", e);
    return { ok: false, mensaje: "No pudimos guardar tu pedido. Probá de nuevo o escribinos por WhatsApp." };
  }
}

/** Vuelve a abrir el pago con tarjeta de un pedido (desde la página del pedido). */
export async function reintentarPagoTarjeta(token: string): Promise<{ ok: boolean; url?: string; mensaje?: string }> {
  if (!/^[0-9a-f]{64}$/.test(token)) return { ok: false, mensaje: "Pedido no encontrado." };
  const { data } = await createServiceClient()
    .from("pedidos")
    .select("id, forma_pago, pagado_en")
    .eq("token", token)
    .maybeSingle();
  if (!data || data.forma_pago !== "wompi") return { ok: false, mensaje: "Pedido no encontrado." };
  if (data.pagado_en) return { ok: false, mensaje: "Este pedido ya está pagado." };
  const url = await iniciarPagoWompi(data.id, await origenSitio());
  return url ? { ok: true, url } : { ok: false, mensaje: "Wompi no respondió. Probá en un minuto o escribinos por WhatsApp." };
}
