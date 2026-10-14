"use server";

import { sitioActual } from "@/lib/sitio";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { cotizarPedido, type Cotizacion } from "@/lib/tienda/beneficios";
import { perfilDeUsuario, type Direccion } from "@/lib/tienda/cuentas";
import { OTRA_ZONA, crearPedido, esquemaCheckout, iniciarPagoWompi, type ResultadoPedido } from "@/lib/tienda/pedidos";


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
    const clientePuntos = datos.data.usarPuntos ? await clienteDeSesion() : null;
    const r = await crearPedido(datos.data, await sitioActual(), { clientePuntos });
    // Con sesión: guardar la dirección nueva en su cuenta (si la pidió)
    if (r.ok && (entrada as { guardarDireccion?: boolean })?.guardarDireccion) {
      await guardarDireccionDeCompra(datos.data).catch((e) => console.error("guardarDireccionDeCompra", e));
    }
    return r;
  } catch (e) {
    console.error("confirmarPedido", e);
    return { ok: false, mensaje: "No pudimos guardar tu pedido. Probá de nuevo o escribinos por WhatsApp." };
  }
}

/** Cliente de la sesión de Google (para usar Puntos Nera). */
async function clienteDeSesion(): Promise<string | null> {
  const {
    data: { user },
  } = await (await createClient()).auth.getUser();
  if (!user) return null;
  return (await perfilDeUsuario(user)).id;
}

/** Total del checkout con 6%, cupón o puntos, calculado en el servidor (igual que al confirmar). */
export async function cotizar(e: {
  lineas: unknown;
  formaPago: string;
  cupon?: string;
  usarPuntos?: boolean;
  correo?: string;
}): Promise<Cotizacion> {
  const clientePuntos = await clienteDeSesion().catch(() => null);
  return cotizarPedido({
    lineas: e.lineas,
    formaPago: String(e.formaPago ?? ""),
    cupon: String(e.cupon ?? "").slice(0, 40),
    usarPuntos: Boolean(e.usarPuntos),
    correo: String(e.correo ?? "").slice(0, 120),
    clientePuntos,
  });
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
  const url = await iniciarPagoWompi(data.id, await sitioActual());
  return url ? { ok: true, url } : { ok: false, mensaje: "Wompi no respondió. Probá en un minuto o escribinos por WhatsApp." };
}

export type DatosCuenta = {
  nombre: string;
  telefono: string;
  telefonoAlterno: string;
  correo: string;
  direcciones: Direccion[];
} | null;

/** Si el cliente tiene sesión, sus datos para llenar el checkout solos. */
export async function datosCuentaParaCheckout(): Promise<DatosCuenta> {
  const {
    data: { user },
  } = await (await createClient()).auth.getUser();
  if (!user) return null;
  const p = await perfilDeUsuario(user);
  return {
    nombre: p.nombre,
    telefono: p.telefono ?? "",
    telefonoAlterno: p.telefono_alterno ?? "",
    correo: p.correo ?? user.email ?? "",
    direcciones: p.direcciones,
  };
}

async function guardarDireccionDeCompra(d: {
  zona: string;
  departamento: string;
  municipio: string;
  direccion: string;
  referencia: string;
  telefono: string;
  telefonoAlterno: string;
}) {
  const {
    data: { user },
  } = await (await createClient()).auth.getUser();
  if (!user) return;
  const perfil = await perfilDeUsuario(user);
  const sb = createServiceClient();
  if (!perfil.telefono || (d.telefonoAlterno && !perfil.telefono_alterno)) {
    await sb
      .from("clientes")
      .update({
        telefono: perfil.telefono || d.telefono,
        telefono_alterno: perfil.telefono_alterno || d.telefonoAlterno || null,
      })
      .eq("id", perfil.id);
  }
  const igual = perfil.direcciones.some((x) => x.direccion.trim().toLowerCase() === d.direccion.trim().toLowerCase());
  if (igual || perfil.direcciones.length >= 5) return;
  const otra = d.zona !== OTRA_ZONA;
  await sb.from("direcciones").insert({
    cliente_id: perfil.id,
    nombre: perfil.direcciones.length ? `Dirección ${perfil.direcciones.length + 1}` : "Casa",
    zona: d.zona,
    departamento: otra ? null : d.departamento,
    municipio: otra ? d.zona : d.municipio,
    direccion: d.direccion,
    referencia: d.referencia || null,
    principal: perfil.direcciones.length === 0,
  });
}
