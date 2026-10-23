// Plantillas de los correos de pedidos. HTML sencillo con tablas y estilos en línea
// (así se ve bien en Gmail, Outlook y el teléfono). Todo el texto en español de El Salvador.

import { MESES_ACCESORIO, MESES_CELULAR } from "@/lib/tienda/garantia";

export type DatosPedidoCorreo = {
  numero: number;
  nombre: string;
  total: number;
  envio: number;
  /** Por qué el envío es gratis o distinto (ej. "Octubre Naranja") */
  envioMotivo?: string | null;
  /** Combos, descuento por efectivo o transferencia, cupón y puntos (ver lib/tienda/descuentos.ts) */
  descuentos: { texto: string; monto: number }[];
  formaPago: string;
  pagado: boolean;
  lineas: { nombre: string; cantidad: number; precio: number }[];
  direccion: string;
  telefono: string;
  /** Quién lleva el pedido (lo pone el equipo al marcarlo "en camino") */
  repartidor: { nombre: string; telefono: string } | null;
  /** Mensaje del equipo para el cliente en el último cambio de estado */
  mensaje: string | null;
  /** Puntos Nera ganados con este pedido (al entregarse y pagarse) */
  puntosGanados: { puntos: number; valor: number } | null;
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
<tr><td style="padding:6px 0;font-size:14px;color:#666">Envío${d.envioMotivo ? ` · ${esc(d.envioMotivo)}` : ""}</td><td style="padding:6px 0;font-size:14px;color:#666;text-align:right">${d.envio ? usd(d.envio) : "Gratis"}</td></tr>
${d.descuentos
  .map(
    (x) =>
      `<tr><td style="padding:6px 0;font-size:14px;color:#1f9d55">${esc(x.texto)}</td><td style="padding:6px 0;font-size:14px;color:#1f9d55;text-align:right">−${usd(x.monto)}</td></tr>`
  )
  .join("")}
<tr><td style="padding:8px 0;font-size:16px;font-weight:bold;color:#1c1c1c">Total</td><td style="padding:8px 0;font-size:16px;font-weight:bold;color:#1c1c1c;text-align:right">${usd(d.total)}</td></tr>
</table>`;
}

/** Lo común a todos los correos: sitio (para el logo), WhatsApp, datos del negocio y por qué le llega */
export type Marco = {
  sitio: string;
  whatsapp: string;
  negocio: { nombre: string; nit: string; direccion: string };
  /** Texto del pie: por qué recibe el correo */
  motivo?: string;
  /** Enlace "No quiero recibir más ofertas" (solo en correos de publicidad) */
  baja?: string;
};

function marco(m: Marco, titulo: string, cuerpo: string, previa: string) {
  const pie = [m.negocio.nombre, m.negocio.nit ? `NIT ${m.negocio.nit}` : "", m.negocio.direccion].filter(Boolean).map(esc).join(" · ");
  return `<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(titulo)}</title></head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:Arial,Helvetica,sans-serif">
<span style="display:none;max-height:0;overflow:hidden">${esc(previa)}</span>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f5"><tr><td align="center" style="padding:24px 12px">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border-radius:16px">
<tr><td align="center" style="padding:24px;background:#1C1C1C;border-radius:16px 16px 0 0">
<img src="${esc(m.sitio)}/marca/logo-oscuro.png" width="140" height="82" alt="Nera Tech" style="display:block;margin:0 auto;border:0">
</td></tr>
<tr><td style="padding:24px">
<h1 style="margin:0 0 12px;font-size:22px;line-height:1.3;color:#1c1c1c">${esc(titulo)}</h1>
${cuerpo}
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:24px;border-top:1px solid #eee"><tr><td style="padding-top:20px;text-align:center">
<p style="margin:0;font-size:15px;color:#333"><strong>¿Tenés alguna duda?</strong> Estamos para ayudarte.</p>
${boton("Escribinos por WhatsApp", m.whatsapp, VERDE_WA, true)}
<p style="margin:0;font-size:13px;color:#666">O respondé este correo.</p>
</td></tr></table>
</td></tr></table>
<p style="max-width:560px;margin:16px auto 0;font-size:11px;color:#999;text-align:center">${pie}<br>${esc(m.motivo ?? "Recibís este correo porque hiciste un pedido en Nera Tech.")}${
    m.baja ? `<br><a href="${esc(m.baja)}" style="color:#999;text-decoration:underline">No quiero recibir más publicidad</a>` : ""
  }</p>
</td></tr></table></body></html>`;
}

function base(d: DatosPedidoCorreo, titulo: string, cuerpo: string, previa: string) {
  return marco({ sitio: new URL(d.enlacePedido).origin, whatsapp: d.whatsapp, negocio: d.negocio }, titulo, cuerpo, previa);
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
  `\nEnvío: ${d.envio ? usd(d.envio) : "Gratis"}${d.envioMotivo ? ` (${d.envioMotivo})` : ""}` +
  d.descuentos.map((x) => `\n${x.texto}: -${usd(x.monto)}`).join("") +
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
  const puntos =
    estado === "entregado" && d.puntosGanados
      ? destacado(
          `<strong>Ganaste ${d.puntosGanados.puntos} Puntos Nera</strong><br>Valen ${usd(d.puntosGanados.puntos * d.puntosGanados.valor)} en tu próxima compra. Usalos al pagar con tu cuenta de Google.`
        )
      : "";
  const cuerpo =
    p(m.texto) + repartidor + mensaje + puntos + efectivo + (estado === "cancelado" ? "" : bloqueEntrega(d)) + tablaProductos(d) + boton("Ver mi pedido", d.enlacePedido);
  return {
    asunto: n(m.asunto),
    html: base(d, n(m.titulo), cuerpo, n(m.texto)),
    texto: `${n(m.titulo)}\n\n${m.texto}${d.repartidor && estado === "en_camino" ? `\nTe lo lleva ${d.repartidor.nombre || "nuestro repartidor"}${d.repartidor.telefono ? ` (tel. ${d.repartidor.telefono})` : ""}` : ""}${d.mensaje ? `\n\nMensaje de Nera Tech: ${d.mensaje}` : ""}\n\n${textoProductos(d)}\n\nVer tu pedido: ${d.enlacePedido}`,
  };
}

/** El equipo corrigió el pedido: qué cambió, el total nuevo y si queda saldo por pagar o algo a favor. */
export function correoPedidoModificado(
  d: DatosPedidoCorreo,
  x: { cambios: string[]; totalAnterior: number; pagado: number; saldo: number; mensaje: string | null }
): Correo {
  const nombre = d.nombre.split(" ")[0];
  const titulo = `${nombre}, actualizamos tu pedido #${d.numero}`;
  const lista = `<ul style="margin:0 0 12px;padding-left:20px;font-size:15px;line-height:1.6;color:#333">${x.cambios.map((c) => `<li>${esc(c)}</li>`).join("")}</ul>`;
  const totales = p(
    x.totalAnterior !== d.total
      ? `El total pasó de <span style="text-decoration:line-through;color:#999">${usd(x.totalAnterior)}</span> a <strong>${usd(d.total)}</strong>.`
      : `El total sigue siendo <strong>${usd(d.total)}</strong>.`
  );
  const yaPago = x.pagado > 0.004;
  let pago = "";
  if (yaPago && x.saldo > 0.004) {
    pago = destacado(`<strong>Te falta pagar ${usd(x.saldo)}</strong><br>Ya recibimos ${usd(x.pagado)}. Escribinos por WhatsApp y te ayudamos a completar el pago.`);
  } else if (yaPago && x.saldo < -0.004) {
    pago = destacado(`<strong>Tenés ${usd(-x.saldo)} a tu favor</strong><br>Te los devolvemos por el mismo medio con que pagaste. Te escribimos para coordinarlo.`);
  } else if (!yaPago) {
    pago = instruccionesPago(d);
  } else {
    pago = p("<strong>Tu pago está al día.</strong> No tenés que hacer nada más.");
  }
  const mensaje = x.mensaje ? destacado(`<strong>Mensaje de Nera Tech:</strong><br>${esc(x.mensaje)}`) : "";
  const cuerpo = p("Hicimos estos cambios en tu pedido:") + lista + mensaje + totales + pago + tablaProductos(d) + boton("Ver mi pedido", d.enlacePedido);
  const saldoTexto = yaPago && x.saldo > 0.004 ? `\nTe falta pagar: ${usd(x.saldo)}` : yaPago && x.saldo < -0.004 ? `\nA tu favor: ${usd(-x.saldo)}` : "";
  return {
    asunto: `Actualizamos tu pedido #${d.numero}`,
    html: base(d, titulo, cuerpo, `Total nuevo: ${usd(d.total)}`),
    texto: `${titulo}\n\nCambios:\n${x.cambios.map((c) => `- ${c}`).join("\n")}${x.mensaje ? `\n\nMensaje de Nera Tech: ${x.mensaje}` : ""}\n\nTotal: ${usd(x.totalAnterior)} → ${usd(d.total)}${saldoTexto}\n\n${textoProductos(d)}\n\nVer tu pedido: ${d.enlacePedido}`,
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

/**
 * Entrega de la factura electrónica (Normativa DTE: el correo lleva solo la entrega, sin publicidad).
 * Van adjuntos el PDF y el archivo JSON con la firma y el sello de Hacienda.
 */
export function correoDte(
  m: Marco,
  x: {
    tipo: string;
    nombre: string | null;
    numeroControl: string;
    codigoGeneracion: string;
    total: number;
    pedido: number | null;
    enlace: string | null;
    contingencia: boolean;
    prueba: boolean;
  }
): Correo {
  const titulo = `Tu ${x.tipo.toLowerCase()} electrónica${x.pedido ? ` del pedido #${x.pedido}` : ""}`;
  const cuerpo =
    (x.prueba ? destacado("<strong>Prueba:</strong> este documento es del ambiente de pruebas de Hacienda y no tiene valor legal.") : "") +
    p(`${x.nombre ? `Hola, ${esc(x.nombre.split(" ")[0])}. ` : ""}Te enviamos tu ${esc(x.tipo.toLowerCase())} por ${usd(x.total)}. Van adjuntos el PDF y el archivo JSON: guardalos, también te sirven para la garantía.`) +
    `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:16px 0;background:#f7f7f8;border-radius:12px"><tr><td style="padding:14px 16px;font-size:13px;line-height:1.6;color:#333">
<strong style="color:#1c1c1c">Número de control</strong><br>${esc(x.numeroControl)}<br>
<strong style="color:#1c1c1c">Código de generación</strong><br>${esc(x.codigoGeneracion)}
</td></tr></table>` +
    (x.contingencia
      ? p("Se emitió mientras el sistema de Hacienda no respondía. En cuanto lo reciban te mandamos el sello de recepción.")
      : p("Podés comprobarla en el sitio de consulta de Hacienda con el código QR del PDF.")) +
    (x.enlace ? boton("Ver mi pedido", x.enlace) : "");
  return {
    asunto: `${x.tipo} electrónica ${x.numeroControl}${x.pedido ? ` · pedido #${x.pedido}` : ""}`,
    html: marco({ ...m, motivo: "Recibís este correo porque compraste en Nera Tech. Es la entrega de tu documento tributario." }, titulo, cuerpo, `${x.tipo} ${x.numeroControl}`),
    texto: `${titulo}\n\nNúmero de control: ${x.numeroControl}\nCódigo de generación: ${x.codigoGeneracion}\nTotal: ${usd(x.total)}\n\nVan adjuntos el PDF y el archivo JSON.${x.enlace ? `\n\nTu pedido: ${x.enlace}` : ""}`,
  };
}

/** Aviso de que un documento se invalidó ante Hacienda (el evento también se entrega al cliente). */
export function correoDteInvalidado(m: Marco, x: { tipo: string; numeroControl: string; motivo: string; reemplazo: string | null; pedido: number | null }): Correo {
  const titulo = `${x.tipo} ${x.numeroControl} anulada`;
  const cuerpo =
    p(`Te avisamos que anulamos ante el Ministerio de Hacienda tu ${esc(x.tipo.toLowerCase())} <strong>${esc(x.numeroControl)}</strong>${x.pedido ? ` del pedido #${x.pedido}` : ""}.`) +
    p(`Motivo: ${esc(x.motivo)}`) +
    (x.reemplazo ? p(`La reemplaza el documento <strong>${esc(x.reemplazo)}</strong>, que te llega en otro correo.`) : "") +
    p("Va adjunto el comprobante de la anulación (archivo JSON con el sello de Hacienda).");
  return {
    asunto: `Anulación de ${x.tipo.toLowerCase()} ${x.numeroControl}`,
    html: marco({ ...m, motivo: "Recibís este correo porque compraste en Nera Tech. Es un aviso sobre tu documento tributario." }, titulo, cuerpo, titulo),
    texto: `${titulo}\n\nMotivo: ${x.motivo}${x.reemplazo ? `\nLa reemplaza: ${x.reemplazo}` : ""}`,
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

// ---------------------------------------------------------------------------
// Correos de la fase 4: regalo de cumpleaños (publicidad, con baja) y "ya hay stock"
// ---------------------------------------------------------------------------

export function correoRegaloCumple(
  m: Marco,
  r: { nombre: string; codigo: string; monto: number; minimo: number; fin: string }
): Correo {
  const nombre = r.nombre.split(" ")[0] || "";
  const hasta = new Date(r.fin).toLocaleDateString("es-SV", { day: "numeric", month: "long", timeZone: "America/El_Salvador" });
  const titulo = `¡Feliz cumpleaños${nombre ? `, ${nombre}` : ""}! Te regalamos ${usd(r.monto)}`;
  const cuerpo =
    p(`Para celebrarte, tenés <strong>${usd(r.monto)} de descuento</strong> en tu compra de este mes${r.minimo > 0 ? ` (desde ${usd(r.minimo)})` : ""}.`) +
    `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:16px 0"><tr><td align="center" style="padding:18px;border:2px dashed #E96000;border-radius:12px;background:#fff4ec">
<p style="margin:0;font-size:13px;color:#666">Tu código</p>
<p style="margin:4px 0 0;font-size:26px;font-weight:bold;letter-spacing:2px;color:#1c1c1c;font-family:'Courier New',monospace">${esc(r.codigo)}</p>
</td></tr></table>` +
    p(`Escribilo en "¿Tenés un cupón?" al pagar, con este mismo correo. Vale hasta el ${esc(hasta)}.`) +
    boton("Ver celulares y accesorios", `${m.sitio}/celulares`);
  return {
    asunto: `🎁 ${nombre ? `${nombre}, te` : "Te"} regalamos ${usd(r.monto)} por tu cumpleaños`,
    html: marco(m, titulo, cuerpo, `Tu código ${r.codigo} vale hasta el ${hasta}`),
    texto: `${titulo}\n\nTu código: ${r.codigo}\n${usd(r.monto)} de descuento${r.minimo > 0 ? ` en compras desde ${usd(r.minimo)}` : ""}. Vale hasta el ${hasta}.\n\n${m.sitio}${m.baja ? `\n\nNo quiero recibir más publicidad: ${m.baja}` : ""}`,
  };
}

export function correoStockDisponible(m: Marco, x: { producto: string; enlace: string; precio: number | null; imagen: string | null }): Correo {
  const titulo = `¡Ya hay ${x.producto}!`;
  const cuerpo =
    p(`Nos pediste que te avisáramos: <strong>${esc(x.producto)}</strong> ya está disponible${x.precio ? ` desde <strong>${usd(x.precio)}</strong>` : ""}.`) +
    (x.imagen
      ? `<p style="margin:16px 0;text-align:center"><img src="${esc(x.imagen)}" width="220" alt="${esc(x.producto)}" style="max-width:220px;height:auto;border:0"></p>`
      : "") +
    p("Las unidades se van rápido: si lo querés, apartalo hoy.") +
    boton("Comprar ahora", x.enlace);
  return {
    asunto: `Ya hay ${x.producto} en Nera Tech`,
    html: marco({ ...m, motivo: "Recibís este correo porque pediste que te avisáramos cuando hubiera." }, titulo, cuerpo, "Ya está disponible"),
    texto: `${titulo}\n\nYa está disponible${x.precio ? ` desde ${usd(x.precio)}` : ""}.\n\n${x.enlace}`,
  };
}

// ---------------------------------------------------------------------------
// Campañas de correo (Brevo): titular, texto corto y hasta 4 productos con su precio real.
// El enlace de baja lo pone Brevo ({{ unsubscribe }}): quien se da de baja queda bloqueado en Brevo.
// ---------------------------------------------------------------------------
export type ProductoCampana = {
  nombre: string;
  enlace: string;
  imagen: string | null;
  /** Precio con tarjeta (el publicado); "desde" si hay varias opciones */
  precio: number;
  desde: boolean;
  /** Precio normal tachado, si está en oferta */
  precioRegular: number | null;
  /** Precio pagando en efectivo o transferencia */
  precioEfectivo: number;
  /** "En bodega: entrega en menos de 24 horas", "Oferta hasta el 31 oct", "Open Box"… */
  etiquetas: string[];
};

export function correoCampana(
  m: Marco,
  c: { asunto: string; previa: string; titulo: string; intro: string; productos: ProductoCampana[]; pctEfectivo: number; cierre: string; enlaceTienda: string }
): Correo {
  const tarjeta = (x: ProductoCampana) => `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 16px;border:1px solid #eee;border-radius:14px"><tr>
${x.imagen ? `<td width="150" valign="middle" style="padding:12px;width:150px"><a href="${esc(x.enlace)}"><img src="${esc(x.imagen)}" width="140" alt="${esc(x.nombre)}" style="display:block;width:140px;max-width:140px;height:auto;border:0;border-radius:8px"></a></td>` : ""}
<td valign="middle" style="padding:12px 14px 12px ${x.imagen ? "4px" : "14px"}">
<p style="margin:0 0 6px;font-size:16px;font-weight:bold;line-height:1.3;color:#1c1c1c">${esc(x.nombre)}</p>
${x.etiquetas.map((e) => `<span style="display:inline-block;margin:0 4px 6px 0;padding:2px 8px;border-radius:999px;background:#fff4ec;font-size:12px;color:#9a3d00">${esc(e)}</span>`).join("")}
<p style="margin:4px 0 0;font-size:20px;font-weight:bold;color:#1c1c1c">${x.desde ? '<span style="font-size:13px;font-weight:normal;color:#666">Desde </span>' : ""}${usd(x.precio)}${
    x.precioRegular ? ` <span style="font-size:13px;font-weight:normal;color:#999;text-decoration:line-through">${usd(x.precioRegular)}</span>` : ""
  }</p>
<p style="margin:2px 0 10px;font-size:13px;color:#1f9d55">${usd(x.precioEfectivo)} pagando en efectivo o transferencia (−${c.pctEfectivo}%)</p>
<a href="${esc(x.enlace)}" style="display:inline-block;padding:10px 18px;border-radius:10px;background:${NARANJA};font-size:15px;font-weight:bold;color:#ffffff;text-decoration:none">Ver y comprar</a>
</td></tr></table>`;
  const confianza = `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:8px 0 4px;background:#f7f7f8;border-radius:12px"><tr><td style="padding:12px 14px;font-size:13px;line-height:1.6;color:#333;text-align:center">
✔ Pagás al recibir &nbsp;·&nbsp; ✔ Garantía: ${MESES_CELULAR} meses en celulares y equipos, ${MESES_ACCESORIO} en accesorios &nbsp;·&nbsp; ✔ Envío a todo el país</td></tr></table>`;
  const cuerpo =
    c.intro
      .split(/\n{2,}/)
      .map((t) => t.trim())
      .filter(Boolean)
      .map((t) => p(esc(t).replace(/\n/g, "<br>")))
      .join("") +
    c.productos.map(tarjeta).join("") +
    confianza +
    (c.cierre ? p(esc(c.cierre)) : "") +
    boton("Ver todo en la tienda", c.enlaceTienda, NARANJA, true);
  const html = marco(
    { ...m, motivo: "Recibís este correo porque compraste en Nera Tech.", baja: "{{ unsubscribe }}" },
    c.titulo,
    cuerpo,
    c.previa
  );
  const texto =
    `${c.titulo}\n\n${c.intro}\n\n` +
    c.productos
      .map((x) => `${x.nombre}: ${x.desde ? "desde " : ""}${usd(x.precio)} (${usd(x.precioEfectivo)} en efectivo)\n${x.enlace}`)
      .join("\n\n") +
    `\n\n${c.cierre}\n\nPagás al recibir · Garantía: ${MESES_CELULAR} meses en celulares y equipos, ${MESES_ACCESORIO} en accesorios · Envío a todo el país\n${c.enlaceTienda}\n\nNo quiero recibir más correos: {{ unsubscribe }}`;
  return { asunto: c.asunto, html, texto };
}
