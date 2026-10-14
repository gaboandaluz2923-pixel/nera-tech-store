// Arma enlaces de WhatsApp con el mensaje ya escrito.
// Cada botón del sitio pasa por aquí para que el mensaje lleve producto, precio,
// intención y un código corto de la página de origen (sirve para medir en el panel).

export type IntencionWhatsApp = "pregunta" | "tasa_cero" | "comprar" | "pedido";

const NUMERO = process.env.NEXT_PUBLIC_WHATSAPP_NUMERO ?? "";

export function enlaceWhatsApp(mensaje: string) {
  const texto = encodeURIComponent(mensaje);
  return `https://wa.me/${NUMERO}?text=${texto}`;
}

export function mensajeProducto(opts: {
  intencion: IntencionWhatsApp;
  nombre: string;
  precio: number;
  cuota?: { meses: number; monto: number };
  codigoPagina: string;
}) {
  const precio = `$${opts.precio.toFixed(2)}`;
  const base: Record<IntencionWhatsApp, string> = {
    pregunta: `Hola, tengo una pregunta sobre el ${opts.nombre} (${precio}).`,
    tasa_cero: opts.cuota
      ? `Hola, quiero el ${opts.nombre} a ${precio} con tasa 0% (${opts.cuota.meses} cuotas de $${opts.cuota.monto.toFixed(2)}).`
      : `Hola, quiero el ${opts.nombre} a ${precio} con tasa 0%.`,
    comprar: `Hola, quiero comprar el ${opts.nombre} a ${precio}.`,
    pedido: `Hola, acabo de hacer un pedido en la web.`,
  };
  return `${base[opts.intencion]} [${opts.codigoPagina}]`;
}
