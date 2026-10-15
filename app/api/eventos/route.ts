import { after, NextResponse, type NextRequest } from "next/server";
import { enviarEventoMeta } from "@/lib/meta";
import { createServiceClient } from "@/lib/supabase/server";

// Eventos de la tienda (lib/analytics.ts → navigator.sendBeacon). Se guardan en la tabla `eventos`.
// Público a propósito: solo acepta tipos conocidos y datos chicos.

const TIPOS = new Set([
  "vista_pagina",
  "vista_producto",
  "clic_foto",
  "clic_specs",
  "clic_bundle",
  "clic_whatsapp",
  "agregar_carrito",
  "inicio_checkout",
  "pago_elegido",
  "compra",
  "correo_capturado",
  "busqueda",
  "cupon_aplicado",
]);
// Eventos que también van a Meta desde el servidor (la compra va aparte, al confirmarse el pago)
const META: Record<string, string> = {
  vista_producto: "ViewContent",
  agregar_carrito: "AddToCart",
  inicio_checkout: "InitiateCheckout",
  pago_elegido: "AddPaymentInfo",
  busqueda: "Search",
  correo_capturado: "Lead",
  clic_whatsapp: "Contact",
};

const esUuid = (s: unknown) => typeof s === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s);
const corto = (s: unknown, n: number) => (typeof s === "string" ? s.slice(0, n) : null);

export async function POST(request: NextRequest) {
  const texto = await request.text();
  if (texto.length > 4000) return new NextResponse(null, { status: 413 });
  let e: Record<string, unknown>;
  try {
    e = JSON.parse(texto);
  } catch {
    return new NextResponse(null, { status: 400 });
  }
  if (!TIPOS.has(String(e.tipo))) return new NextResponse(null, { status: 400 });
  // Datos: solo valores simples, sin datos personales
  const datos: Record<string, string | number | boolean> = {};
  for (const [k, v] of Object.entries((e.datos as Record<string, unknown>) ?? {}).slice(0, 15)) {
    if (["productoId", "varianteId"].includes(k)) continue;
    if (typeof v === "number" && Number.isFinite(v)) datos[k.slice(0, 30)] = v;
    else if (typeof v === "boolean") datos[k.slice(0, 30)] = v;
    else if (typeof v === "string") datos[k.slice(0, 30)] = v.slice(0, 120);
  }
  const { error } = await createServiceClient()
    .from("eventos")
    .insert({
      tipo: e.tipo,
      producto_id: esUuid(e.productoId) ? e.productoId : null,
      variante_id: esUuid(e.varianteId) ? e.varianteId : null,
      sesion_id: corto(e.sesion, 64),
      origen: corto(e.origen, 120),
      dispositivo: corto(e.dispositivo, 20),
      pagina: corto(e.pagina, 200),
      datos,
    });
  // Un producto borrado (llave foránea) no debe dar error al visitante
  if (error && error.code !== "23503") console.error("eventos", error.message);

  const nombreMeta = META[String(e.tipo)];
  if (nombreMeta && typeof e.eventoId === "string" && e.eventoId.length <= 64) {
    const valor = typeof datos.valor === "number" ? datos.valor : undefined;
    const ids = [e.varianteId, e.productoId].filter(esUuid).slice(0, 1) as string[];
    const url = `${request.nextUrl.origin}${corto(e.pagina, 200) ?? "/"}`;
    after(() =>
      enviarEventoMeta({
        nombre: nombreMeta,
        id: e.eventoId as string,
        url,
        ip: request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || null,
        agente: request.headers.get("user-agent"),
        fbp: request.cookies.get("_fbp")?.value ?? null,
        fbc: request.cookies.get("_fbc")?.value ?? null,
        datos: {
          valor,
          ids,
          nombre: typeof datos.nombre === "string" ? datos.nombre : undefined,
          busqueda: typeof datos.termino === "string" ? datos.termino : undefined,
        },
      })
    );
  }
  return new NextResponse(null, { status: 204 });
}
