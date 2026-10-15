import "server-only";
import { createHash } from "node:crypto";
import { createServiceClient } from "@/lib/supabase/server";

// API de conversiones de Meta: avisa a Meta desde el servidor que una compra quedó PAGADA.
// Así Meta aprende de ventas reales aunque el cliente tenga bloqueadores de anuncios.
// Necesita en Vercel: NEXT_PUBLIC_META_PIXEL_ID y META_CONVERSIONS_TOKEN. Sin ellas no hace nada.
// Los datos personales viajan cifrados (SHA-256), como pide Meta.

const VERSION = process.env.META_GRAPH_VERSION || "v26.0";
const BASE = process.env.META_GRAPH_URL || "https://graph.facebook.com";

const sha = (v: string | null | undefined) => (v ? createHash("sha256").update(v.trim().toLowerCase()).digest("hex") : undefined);

type Pedido = {
  id: string;
  numero: number;
  total: number;
  created_at: string;
  pagado_en: string | null;
  meta_enviado_en: string | null;
  cliente_id: string | null;
  entrega: { nombre?: string; telefono?: string; correo?: string; municipio?: string | null } | null;
  atribucion: { fbp?: string | null; fbc?: string | null; ip?: string | null; agente?: string | null } | null;
  lineas_pedido: { variante_id: string | null; cantidad: number; precio_unitario: number }[];
};

export async function enviarCompraMeta(pedidoId: string, sitio: string): Promise<{ enviado: boolean; motivo?: string }> {
  const pixel = process.env.NEXT_PUBLIC_META_PIXEL_ID?.trim();
  const token = process.env.META_CONVERSIONS_TOKEN?.trim();
  if (!pixel || !token) return { enviado: false, motivo: "Falta configurar Meta en Vercel" };
  const sb = createServiceClient();
  const { data } = await sb
    .from("pedidos")
    .select("id, numero, total, created_at, pagado_en, meta_enviado_en, cliente_id, entrega, atribucion, lineas_pedido(variante_id, cantidad, precio_unitario)")
    .eq("id", pedidoId)
    .single();
  const p = data as unknown as Pedido | null;
  if (!p || !p.pagado_en) return { enviado: false, motivo: "Pedido sin pagar" };
  if (p.meta_enviado_en) return { enviado: true };

  const [nombre, ...resto] = (p.entrega?.nombre ?? "").split(" ");
  const a = p.atribucion ?? {};
  const evento = {
    event_name: "Purchase",
    // Meta acepta eventos de hasta 7 días: si el pago llega después, se usa la hora del pago
    event_time: Math.floor(new Date(p.pagado_en).getTime() / 1000),
    event_id: `pedido-${p.numero}`,
    action_source: "website",
    event_source_url: `${sitio}/checkout`,
    user_data: {
      em: sha(p.entrega?.correo) ? [sha(p.entrega?.correo)] : undefined,
      ph: p.entrega?.telefono ? [sha(`503${p.entrega.telefono.replace(/\D/g, "")}`)] : undefined,
      fn: nombre ? [sha(nombre)] : undefined,
      ln: resto.length ? [sha(resto.join(" "))] : undefined,
      ct: p.entrega?.municipio ? [sha(p.entrega.municipio.replace(/\s+/g, ""))] : undefined,
      country: [sha("sv")],
      external_id: p.cliente_id ? [sha(p.cliente_id)] : undefined,
      client_ip_address: a.ip || undefined,
      client_user_agent: a.agente || undefined,
      fbp: a.fbp || undefined,
      fbc: a.fbc || undefined,
    },
    custom_data: {
      currency: "USD",
      value: Number(p.total),
      order_id: String(p.numero),
      content_type: "product",
      content_ids: p.lineas_pedido.map((l) => l.variante_id).filter(Boolean),
      contents: p.lineas_pedido.map((l) => ({ id: l.variante_id, quantity: l.cantidad, item_price: Number(l.precio_unitario) })),
      num_items: p.lineas_pedido.reduce((s, l) => s + l.cantidad, 0),
    },
  };
  try {
    const r = await fetch(`${BASE}/${VERSION}/${pixel}/events?access_token=${encodeURIComponent(token)}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ data: [evento] }),
      cache: "no-store",
    });
    if (!r.ok) {
      const detalle = (await r.text()).slice(0, 200);
      console.error("Meta CAPI", r.status, detalle);
      return { enviado: false, motivo: `Meta respondió ${r.status}: ${detalle}` };
    }
    await sb.from("pedidos").update({ meta_enviado_en: new Date().toISOString() }).eq("id", p.id).is("meta_enviado_en", null);
    return { enviado: true };
  } catch (e) {
    console.error("Meta CAPI", e);
    return { enviado: false, motivo: "No se pudo contactar a Meta" };
  }
}

/**
 * Eventos del navegador (ver producto, agregar al carrito, iniciar pago…) enviados también desde
 * el servidor. Llevan el mismo event_id que el Pixel: Meta los cuenta una sola vez.
 */
export async function enviarEventoMeta(e: {
  nombre: string;
  id: string;
  url: string;
  ip: string | null;
  agente: string | null;
  fbp: string | null;
  fbc: string | null;
  datos: { valor?: number; ids?: string[]; nombre?: string; busqueda?: string };
}): Promise<void> {
  const pixel = process.env.NEXT_PUBLIC_META_PIXEL_ID?.trim();
  const token = process.env.META_CONVERSIONS_TOKEN?.trim();
  if (!pixel || !token) return;
  const evento = {
    event_name: e.nombre,
    event_time: Math.floor(Date.now() / 1000),
    event_id: e.id,
    action_source: "website",
    event_source_url: e.url,
    user_data: {
      client_ip_address: e.ip || undefined,
      client_user_agent: e.agente || undefined,
      fbp: e.fbp || undefined,
      fbc: e.fbc || undefined,
      country: [sha("sv")],
    },
    custom_data: {
      currency: "USD",
      value: e.datos.valor,
      content_ids: e.datos.ids?.length ? e.datos.ids : undefined,
      content_type: e.datos.ids?.length ? "product" : undefined,
      content_name: e.datos.nombre,
      search_string: e.datos.busqueda,
    },
  };
  try {
    const r = await fetch(`${BASE}/${VERSION}/${pixel}/events?access_token=${encodeURIComponent(token)}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ data: [evento] }),
      cache: "no-store",
    });
    if (!r.ok) console.error("Meta CAPI", e.nombre, r.status, (await r.text()).slice(0, 200));
  } catch (err) {
    console.error("Meta CAPI", e.nombre, err);
  }
}
