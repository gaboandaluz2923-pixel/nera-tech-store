"use client";

// Medición de la tienda: TODA interacción relevante pasa por medir(). Desde aquí va a:
// 1) la tabla propia `eventos` (POST /api/eventos), 2) Google Analytics 4 y 3) Meta Pixel.
// Las compras confirmadas se mandan a Meta además desde el servidor (lib/meta.ts).

export type TipoEvento =
  | "vista_pagina"
  | "vista_producto"
  | "clic_foto"
  | "clic_specs"
  | "clic_bundle"
  | "clic_whatsapp"
  | "agregar_carrito"
  | "inicio_checkout"
  | "pago_elegido"
  | "compra"
  | "correo_capturado"
  | "busqueda"
  | "cupon_aplicado";

export type DatosEvento = {
  productoId?: string | null;
  varianteId?: string | null;
  nombre?: string;
  valor?: number;
  /** Para compras: número del pedido (sirve de id para no contar dos veces) */
  pedido?: string;
  [k: string]: unknown;
};

declare global {
  interface Window {
    gtag?: (...a: unknown[]) => void;
    fbq?: (...a: unknown[]) => void;
    dataLayer?: unknown[];
  }
}

const CLAVE_SESION = "nera-sesion";
const CLAVE_ORIGEN = "nera-origen";

function guardado(clave: string, almacen: "local" | "session"): string | null {
  try {
    return (almacen === "local" ? localStorage : sessionStorage).getItem(clave);
  } catch {
    return null;
  }
}
function guardar(clave: string, valor: string, almacen: "local" | "session") {
  try {
    (almacen === "local" ? localStorage : sessionStorage).setItem(clave, valor);
  } catch {}
}

/** Identificador anónimo del navegador (no es un dato personal) */
export function sesion(): string {
  let s = guardado(CLAVE_SESION, "local");
  if (!s) {
    s = typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : String(Math.random()).slice(2);
    guardar(CLAVE_SESION, s, "local");
  }
  return s;
}

/** De dónde llegó la visita (utm_source, fbclid, gclid o el sitio anterior), guardado al entrar */
export function origen(): string | null {
  const previo = guardado(CLAVE_ORIGEN, "session");
  if (previo) return previo;
  if (typeof window === "undefined") return null;
  const u = new URL(window.location.href);
  const o =
    u.searchParams.get("utm_source") ||
    (u.searchParams.get("fbclid") ? "facebook" : null) ||
    (u.searchParams.get("gclid") ? "google-ads" : null) ||
    (document.referrer && !document.referrer.includes(window.location.host) ? new URL(document.referrer).hostname : null) ||
    "directo";
  const fbclid = u.searchParams.get("fbclid");
  if (fbclid) guardar("nera-fbc", `fb.1.${Date.now()}.${fbclid}`, "local");
  const campaña = u.searchParams.get("utm_campaign");
  const valor = campaña ? `${o}/${campaña}` : o;
  guardar(CLAVE_ORIGEN, valor, "session");
  return valor;
}

const dispositivo = () => (typeof window !== "undefined" && window.matchMedia("(max-width: 767px)").matches ? "movil" : "escritorio");

// Nombres estándar de GA4 y Meta para cada evento propio
const GA4: Partial<Record<TipoEvento, string>> = {
  vista_producto: "view_item",
  agregar_carrito: "add_to_cart",
  inicio_checkout: "begin_checkout",
  pago_elegido: "add_payment_info",
  compra: "purchase",
  busqueda: "search",
  correo_capturado: "generate_lead",
  clic_whatsapp: "contact",
};
const META: Partial<Record<TipoEvento, string>> = {
  vista_producto: "ViewContent",
  agregar_carrito: "AddToCart",
  inicio_checkout: "InitiateCheckout",
  pago_elegido: "AddPaymentInfo",
  busqueda: "Search",
  correo_capturado: "Lead",
  clic_whatsapp: "Contact",
  // "Purchase" lo manda el servidor cuando el pago se confirma (ver lib/meta.ts)
};

/** Registra un evento. Nunca rompe la página: si algo falla, se ignora. */
export function medir(tipo: TipoEvento, d: DatosEvento = {}) {
  if (typeof window === "undefined") return;
  try {
    // Mismo id para el Pixel y para el envío desde el servidor: Meta lo cuenta una sola vez
    const eventoId = typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`;
    const cuerpo = JSON.stringify({
      tipo,
      eventoId,
      productoId: d.productoId ?? null,
      varianteId: d.varianteId ?? null,
      sesion: sesion(),
      origen: origen(),
      dispositivo: dispositivo(),
      pagina: window.location.pathname,
      datos: d,
    });
    const enviado = navigator.sendBeacon?.("/api/eventos", new Blob([cuerpo], { type: "application/json" }));
    if (!enviado) fetch("/api/eventos", { method: "POST", body: cuerpo, keepalive: true, headers: { "content-type": "application/json" } }).catch(() => {});

    const g = GA4[tipo];
    if (g && window.gtag) {
      window.gtag("event", g, {
        currency: "USD",
        value: d.valor,
        transaction_id: d.pedido,
        search_term: typeof d.termino === "string" ? d.termino : undefined,
        items: d.productoId ? [{ item_id: d.varianteId ?? d.productoId, item_name: d.nombre, price: d.valor }] : undefined,
      });
    }
    const m = META[tipo];
    if (m && window.fbq) {
      window.fbq("track", m, {
        currency: "USD",
        value: d.valor,
        content_ids: d.varianteId ? [d.varianteId] : d.productoId ? [d.productoId] : undefined,
        content_type: "product",
        content_name: d.nombre,
        search_string: typeof d.termino === "string" ? d.termino : undefined,
      }, { eventID: eventoId });
    }
  } catch {}
}

/** Cookies de Meta (_fbp, _fbc) para que la compra del servidor se una con la visita */
export function cookiesMeta(): { fbp: string | null; fbc: string | null } {
  if (typeof document === "undefined") return { fbp: null, fbc: null };
  const leer = (n: string) => document.cookie.split("; ").find((c) => c.startsWith(`${n}=`))?.split("=")[1] ?? null;
  return { fbp: leer("_fbp"), fbc: leer("_fbc") ?? guardado("nera-fbc", "local") };
}
