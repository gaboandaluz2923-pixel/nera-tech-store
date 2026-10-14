import "server-only";
import { configCorreo, enviarCorreo } from "@/lib/correo";
import { createServiceClient } from "@/lib/supabase/server";
import { configTienda } from "@/lib/tienda/datos";
import { COLUMNAS_DESCUENTOS, lineasDescuento } from "@/lib/tienda/descuentos";
import { enlaceWhatsAppA } from "@/lib/whatsapp";
import {
  correoAvisoEquipo,
  correoEstado,
  correoFactura,
  correoPagoConfirmado,
  correoPedidoRecibido,
  type Correo,
  type DatosPedidoCorreo,
} from "./plantillas";

// Correos de pedidos: se llaman con after() para no demorar al cliente ni al panel.
// Cada envío (o su falla) queda anotado en el historial del pedido.

type Pedido = {
  id: string;
  numero: number;
  token: string;
  estado: string;
  forma_pago: string;
  total: number;
  envio: number;
  descuento: number;
  descuento_combos: number;
  descuento_cupon: number;
  puntos_usados: number;
  descuento_puntos: number;
  combos: { nombre: string; veces: number; descuento: number }[] | null;
  cupones: { codigo: string } | null;
  pagado_en: string | null;
  factura_numero: string | null;
  entrega: {
    nombre: string;
    telefono: string;
    correo: string;
    direccion: string;
    municipio: string | null;
    departamento: string | null;
    referencia: string | null;
    repartidor?: { nombre: string; telefono: string } | null;
    mensaje?: string | null;
  };
  lineas_pedido: { nombre: string; cantidad: number; precio_unitario: number }[];
};

async function cargar(pedidoId: string, sitio: string) {
  const sb = createServiceClient();
  const [{ data }, c, { data: cuentasFila }] = await Promise.all([
    sb
      .from("pedidos")
      .select(
        `id, numero, token, estado, forma_pago, total, envio, pagado_en, factura_numero, entrega, ${COLUMNAS_DESCUENTOS}, lineas_pedido(nombre, cantidad, precio_unitario)`
      )
      .eq("id", pedidoId)
      .single(),
    configTienda(),
    sb.from("configuracion").select("valor").eq("clave", "cuentas_bancarias").maybeSingle(),
  ]);
  if (!data) return null;
  const p = data as unknown as Pedido;
  const e = p.entrega;
  const datos: DatosPedidoCorreo = {
    numero: p.numero,
    nombre: e.nombre,
    telefono: e.telefono,
    repartidor: e.repartidor?.nombre || e.repartidor?.telefono ? e.repartidor : null,
    mensaje: e.mensaje || null,
    total: Number(p.total),
    envio: Number(p.envio),
    descuentos: lineasDescuento(p),
    formaPago: p.forma_pago,
    pagado: Boolean(p.pagado_en),
    lineas: p.lineas_pedido.map((l) => ({ nombre: l.nombre, cantidad: l.cantidad, precio: Number(l.precio_unitario) })),
    direccion: [e.direccion, e.municipio, e.departamento].filter(Boolean).join(", ") + (e.referencia ? ` (Ref.: ${e.referencia})` : ""),
    enlacePedido: `${sitio}/pedido/${p.token}`,
    whatsapp: enlaceWhatsAppA(c.whatsapp, `Hola, es sobre mi pedido #${p.numero}. [correo]`),
    negocio: { nombre: c.negocio.nombre || "Nera Tech", nit: c.negocio.nit, direccion: c.negocio.direccion },
    cuentas: Array.isArray(cuentasFila?.valor) ? cuentasFila.valor : [],
    mesesTasaCero: c.tasaCero.meses,
  };
  return { p, datos };
}

async function enviarYAnotar(p: Pedido, para: string, nombre: string, correo: Correo, etiqueta: string, quien: "cliente" | "equipo") {
  const r = await enviarCorreo({ para, nombrePara: nombre, asunto: correo.asunto, html: correo.html, texto: correo.texto, etiqueta });
  await createServiceClient()
    .from("pedido_eventos")
    .insert({
      pedido_id: p.id,
      estado_anterior: p.estado,
      estado_nuevo: p.estado,
      nota: r.enviado ? `Correo al ${quien}: "${correo.asunto}"` : `No se envió el correo al ${quien} ("${correo.asunto}"): ${r.motivo}`,
      usuario: "correo",
    });
  return r;
}

export async function avisarPedidoNuevo(pedidoId: string, sitio: string) {
  const x = await cargar(pedidoId, sitio);
  if (!x) return;
  await enviarYAnotar(x.p, x.p.entrega.correo, x.p.entrega.nombre, correoPedidoRecibido(x.datos), "pedido-recibido", "cliente");
  const cfg = await configCorreo();
  if (cfg.avisos_a) {
    await enviarYAnotar(
      x.p,
      cfg.avisos_a,
      "Nera Tech",
      correoAvisoEquipo({ ...x.datos, telefono: x.p.entrega.telefono, enlacePanel: `${sitio}/admin/pedidos/${x.p.id}` }),
      "aviso-equipo",
      "equipo"
    );
  }
}

export async function avisarPagoConfirmado(pedidoId: string, sitio: string) {
  const x = await cargar(pedidoId, sitio);
  if (!x || x.p.forma_pago === "contra_entrega") return;
  await enviarYAnotar(x.p, x.p.entrega.correo, x.p.entrega.nombre, correoPagoConfirmado(x.datos), "pago-confirmado", "cliente");
}

export async function avisarEstado(pedidoId: string, estado: string, sitio: string) {
  const x = await cargar(pedidoId, sitio);
  if (!x) return;
  const correo = correoEstado(x.datos, estado);
  if (correo) await enviarYAnotar(x.p, x.p.entrega.correo, x.p.entrega.nombre, correo, `estado-${estado}`, "cliente");
}

export async function avisarFactura(pedidoId: string, sitio: string) {
  const x = await cargar(pedidoId, sitio);
  if (!x) return;
  await enviarYAnotar(x.p, x.p.entrega.correo, x.p.entrega.nombre, correoFactura(x.datos, x.p.factura_numero), "factura", "cliente");
}
