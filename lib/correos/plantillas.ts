// Plantillas de los correos de pedidos. HTML sencillo con tablas y estilos en línea
// (así se ve bien en Gmail, Outlook y el teléfono). Todo el texto en español de El Salvador.

export type DatosPedidoCorreo = {
  numero: number;
  nombre: string;
  total: number;
  envio: number;
  descuento: number; // 6% por efectivo o transferencia; 0 si no aplica
  formaPago: string;
  pagado: boolean;
  lineas: { nombre: string; cantidad: number; precio: number }[];
  direccion: string;
  telefono: string;
  /** Quién lleva el pedido (lo pone el equipo al marcarlo "en camino") */
  repartidor: { nombre: string; telefono: string } | null;
  /** Mensaje del equipo para el cliente en el último cambio de estado */
  mensaje: string | null;
  enlacePedido: string;
  whatsapp: string; // enlace wa.me ya armado
  negocio: { nombre: string; nit: string; direccion: string };
  cuentas: { banco: string; tipo: string; numero: string; titular: string }[];
  mesesTasaCero: number;
};

const NARANJA = "#C85000";
const VERDE_WA = "#1f9d55";
const usd = (n: number) => n.toLocaleString("en-US", { style: "currency", currency: "USD" });
const tel = (t: string) => t.replace(/^(\d{4})(\d{4})$/, "$1 $2");
const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

function boton(texto: string, url: string, color = NARANJA, ancho = false) {
  return `<table role="presentation" cellpadding="0" cellspacing="0" ${ancho ? 'width="100%"' : ""} style="margin:20px 0"><tr><td align="center" style="border-radius:12px;background:${color}">
<a href="${esc(url)}" style="display:${ancho ? "block" : "inline-block"};padding:${ancho ? "16px 22px" : "14px 22px"};font-size:${ancho ? "17px" : "16px"};font-weight:bold;color:#ffffff;text-decoration:none;border-radius:12px;text-align:center">${esc(texto)}</a>
</td></tr></table>`;
}

/** Recuadro de entrega: a quién, dónde y teléfono */
function bloqueEntrega(d: DatosPedidoCorreo) {
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:16px 0;background:#f7f7f8;border-radius:12px"><tr><td style="padding:14px 16px;font-size:14px;line-height:1.5;color:#333">
<strong style="color:#1c1c1c">Entrega</strong><br>${esc(d.nombre)}<br>${esc(d.direccion)}<br>Tel. ${esc(tel(d.telefono))}
</td></tr></table>`;
}

/** Recuadro destacado (repartidor o mensaje del equipo) */
function destacado(html: string) {
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:16px 0;background:#fff4ec;border-left:4px solid #E96000;border-radius:8px"><tr><td style="padding:14px 16px;font-size:15px;line-height:1.5;color:#1c1c1c">${html}</td></tr></table>`;
}

function tablaProductos(d: DatosPedidoCorreo) {
  const filas = d.lineas
    .map(
      (l) => `<tr><td style="padding:6px 0;font-size:14px;color:#1c1c1c">${l.cantidad > 1 ? `${l.cantidad} × ` : ""}${esc(l.nombre)}</td>
<td style="padding:6px 0;font-size:14px;color:#1c1c1c;text-align:right;white-space:nowrap">${usd(l.precio * l.cantidad)}</td></tr>`
    )
    .join("");
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-top:1px solid #eee;border-bottom:1px solid #eee;margin:16px 0">
${filas}
<tr><td style="padding:6px 0;font-size:14px;color:#666">Envío</td><td style="padding:6px 0;font-size:14px;color:#666;text-align:right">${d.envio ? usd(d.envio) : "Gratis"}</td></tr>
${d.descuento > 0 ? `<tr><td style="padding:6px 0;font-size:14px;color:#1f9d55">Descuento por ${d.formaPago === "contra_entrega" ? "pago en efectivo" : "transferencia"}</td><td style="padding:6px 0;font-size:14px;color:#1f9d55;text-align:right">−${usd(d.descuento)}</td></tr>` : ""}
<tr><td style="padding:8px 0;font-size:16px;font-weight:bold;color:#1c1c1c">Total</td><td style="padding:8px 0;font-size:16px;font-weight:bold;color:#1c1c1c;text-align:right">${usd(d.total)}</td></tr>
</table>`;
}

function base(d: DatosPedidoCorreo, titulo: string, cuerpo: string, previa: string) {
  const pie = [d.negocio.nombre, d.negocio.nit ? `NIT ${d.negocio.nit}` : "", d.negocio.direccion].filter(Boolean).map(esc).join(" · ");
  return `<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(titulo)}</title></head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:Arial,Helvetica,sans-serif">
<span style="display:none;max-height:0;overflow:hidden">${esc(previa)}</span>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f5"><tr><td align="center" style="padding:24px 12px">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border-radius:16px">
<tr><td align="center" style="padding:24px;background:#1C1C1C;border-radius:16px 16px 0 0">
<img src="${esc(new URL(d.enlacePedido).origin)}/marca/logo-oscuro.png" width="140" height="82" alt="Nera Tech" style="display:block;margin:0 auto;border:0">
</td></tr>
<tr><td style="padding:24px">
<h1 style="margin:0 0 12px;font-size:22px;line-height:1.3;color:#1c1c1c">${esc(titulo)}</h1>
${cuerpo}
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:24px;border-top:1px solid #eee"><tr><td style="padding-top:20px;text-align:center">
<p style="margin:0;font-size:15px;color:#333"><strong>¿Tenés alguna duda?</strong> Estamos para ayudarte.</p>
${boton("Escribinos por WhatsApp", d.whatsapp, VERDE_WA, true)}
<p style="margin:0;font-size:13px;color:#666">O respondé este correo.</p>
</td></tr></table>
</td></tr></table>
<p style="max-width:560px;margin:16px auto 0;font-size:11px;color:#999;text-align:center">${pie}<br>Recibís este correo porque hiciste un pedido en Nera Tech.</p>
</td></tr></table></body></html>`;
}

const p = (t: string) => `<p style="margin:0 0 12px;font-size:15px;line-height:1.5;color:#333">${t}</p>`;

function instruccionesPago(d: DatosPedidoCorreo) {
  if (d.pagado) return p("<strong>Pago recibido.</strong> Gracias.");
  switch (d.formaPago) {
    case "contra_entrega":
      return p(`Pagás <strong>${usd(d.total)}</strong> en efectivo cuando lo recibís.`);
    case "wompi":
      return p(`Tu pago con tarjeta todavía no se completó.`) + boton(`Pagar ${usd(d.total)} con tarjeta`, d.enlacePedido);
    case "transferencia":
      return (
        p(`Transferí <strong>${usd(d.total)}</strong> a una de estas cuentas y mandanos el comprobante por WhatsApp:`) +
        (d.cuentas.length
          ? d.cuentas
              .map((c) => p(`<strong>${esc(c.banco)}</strong><br>${esc(c.tipo)} · ${esc(c.numero)}<br>${esc(c.titular)}`))
              .join("")
          : p("Te mandamos los datos de la cuenta por WhatsApp.")) +
        boton("Enviar comprobante por WhatsApp", d.whatsapp, "#1f9d55")
      );
    case "tasa_cero":
      return p(`Te escribimos por WhatsApp para procesar tu pago en ${d.mesesTasaCero} cuotas sin intereses.`) + boton("Escribir por WhatsApp", d.whatsapp, "#1f9d55");
    default:
      return "";
  }
}

export type Correo = { asunto: string; html: string; texto: string };

const textoProductos = (d: DatosPedidoCorreo) =>
  d.lineas.map((l) => `- ${l.cantidad} x ${l.nombre}: ${usd(l.precio * l.cantidad)}`).join("\n") +
  `\nEnvío: ${d.envio ? usd(d.envio) : "Gratis"}` +
  (d.descuento > 0 ? `\nDescuento (${d.formaPago === "contra_entrega" ? "efectivo" : "transferencia"}): -${usd(d.descuento)}` : "") +
  `\nTotal: ${usd(d.total)}`;

export function correoPedidoRecibido(d: DatosPedidoCorreo): Correo {
  const nombre = d.nombre.split(" ")[0];
  const titulo = `¡Gracias, ${nombre}! Recibimos tu pedido #${d.numero}`;
  const cuerpo =
    p("Lo estamos revisando y te escribimos por WhatsApp para confirmar la entrega.") +
    instruccionesPago(d) +
    tablaProductos(d) +
    bloqueEntrega(d) +
    boton("Ver mi pedido", d.enlacePedido);
  return {
    asunto: `Recibimos tu pedido #${d.numero}`,
    html: base(d, titulo, cuerpo, `Pedido #${d.numero} por ${usd(d.total)}`),
    texto: `${titulo}\n\n${textoProductos(d)}\n\nEntrega: ${d.direccion}\n\nVer tu pedido: ${d.enlacePedido}`,
  };
}

export function correoPagoConfirmado(d: DatosPedidoCorreo): Correo {
  const titulo = `Pago recibido: pedido #${d.numero}`;
  const cuerpo =
    p(`Recibimos tu pago de <strong>${usd(d.total)}</strong>. Te escribimos para coordinar la entrega.`) +
    tablaProductos(d) +
    bloqueEntrega(d) +
    boton("Ver mi pedido", d.enlacePedido);
  return {
    asunto: `Pago recibido · pedido #${d.numero}`,
    html: base(d, titulo, cuerpo, `Recibimos tu pago de ${usd(d.total)}`),
    texto: `${titulo}\n\n${textoProductos(d)}\n\nVer tu pedido: ${d.enlacePedido}`,
  };
}

const MENSAJES_ESTADO: Record<string, { asunto: string; titulo: string; texto: string }> = {
  confirmado: {
    asunto: "Tu pedido #N está confirmado",
    titulo: "Pedido #N confirmado",
    texto: "Ya separamos tu equipo. Te avisamos cuando salga hacia tu dirección.",
  },
  en_camino: {
    asunto: "Tu pedido #N va en camino",
    titulo: "Tu pedido #N va en camino",
    texto: "Ya salió hacia tu dirección. Tené tu teléfono a mano por si el repartidor te llama.",
  },
  entregado: {
    asunto: "Pedido #N entregado",
    titulo: "¡Listo! Pedido #N entregado",
    texto: "Gracias por comprar en Nera Tech. Tu garantía empieza hoy. Si algo falla, escribinos.",
  },
  cancelado: {
    asunto: "Tu pedido #N fue cancelado",
    titulo: "Pedido #N cancelado",
    texto: "Cancelamos tu pedido. Si fue un error o tenés dudas, escribinos por WhatsApp.",
  },
};

export function correoEstado(d: DatosPedidoCorreo, estado: string): Correo | null {
  const m = MENSAJES_ESTADO[estado];
  if (!m) return null;
  const n = (s: string) => s.replace("#N", `#${d.numero}`);
  const efectivo = estado === "en_camino" && d.formaPago === "contra_entrega" && !d.pagado ? p(`Tené listo <strong>${usd(d.total)}</strong> en efectivo.`) : "";
  const repartidor =
    estado === "en_camino" && d.repartidor && (d.repartidor.nombre || d.repartidor.telefono)
      ? destacado(
          `<strong>Te lo lleva ${esc(d.repartidor.nombre || "nuestro repartidor")}</strong>${
            d.repartidor.telefono
              ? `<br>Tel. <a href="tel:+503${esc(d.repartidor.telefono)}" style="color:${NARANJA};font-weight:bold">${esc(tel(d.repartidor.telefono))}</a>`
              : ""
          }`
        )
      : "";
  const mensaje = d.mensaje ? destacado(`<strong>Mensaje de Nera Tech:</strong><br>${esc(d.mensaje).replace(/\n/g, "<br>")}`) : "";
  const cuerpo =
    p(m.texto) + repartidor + mensaje + efectivo + (estado === "cancelado" ? "" : bloqueEntrega(d)) + tablaProductos(d) + boton("Ver mi pedido", d.enlacePedido);
  return {
    asunto: n(m.asunto),
    html: base(d, n(m.titulo), cuerpo, n(m.texto)),
    texto: `${n(m.titulo)}\n\n${m.texto}${d.repartidor && estado === "en_camino" ? `\nTe lo lleva ${d.repartidor.nombre || "nuestro repartidor"}${d.repartidor.telefono ? ` (tel. ${d.repartidor.telefono})` : ""}` : ""}${d.mensaje ? `\n\nMensaje de Nera Tech: ${d.mensaje}` : ""}\n\n${textoProductos(d)}\n\nVer tu pedido: ${d.enlacePedido}`,
  };
}

export function correoFactura(d: DatosPedidoCorreo, numeroFactura: string | null): Correo {
  const titulo = `Tu factura del pedido #${d.numero}`;
  const cuerpo =
    p(`Tu factura electrónica${numeroFactura ? ` (${esc(numeroFactura)})` : ""} ya está lista. Descargala desde tu pedido:`) +
    boton("Descargar mi factura", d.enlacePedido) +
    p("Guardala: también te sirve para la garantía.");
  return {
    asunto: `Factura del pedido #${d.numero}`,
    html: base(d, titulo, cuerpo, "Tu factura electrónica ya está lista"),
    texto: `${titulo}\n\nDescargala aquí: ${d.enlacePedido}`,
  };
}

/** Aviso interno al equipo cuando entra un pedido. */
export function correoAvisoEquipo(d: DatosPedidoCorreo & { telefono: string; enlacePanel: string }): Correo {
  const titulo = `Pedido nuevo #${d.numero} · ${usd(d.total)}`;
  const cuerpo =
    p(`<strong>${esc(d.nombre)}</strong> · ${esc(d.telefono)}<br>${esc(d.direccion)}`) +
    p(`Pago: <strong>${esc(d.formaPago.replace("_", " "))}</strong>${d.pagado ? " · PAGADO" : ""}`) +
    tablaProductos(d) +
    boton("Abrir en el panel", d.enlacePanel);
  return {
    asunto: titulo,
    html: base(d, titulo, cuerpo, titulo),
    texto: `${titulo}\n${d.nombre} · ${d.telefono}\n${d.direccion}\n\n${textoProductos(d)}\n\n${d.enlacePanel}`,
  };
}
