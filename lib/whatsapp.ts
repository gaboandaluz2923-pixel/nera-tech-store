// Arma enlaces de WhatsApp con el mensaje ya escrito.
// Cada botón del sitio pasa por aquí para que el mensaje lleve producto, precio,
// intención y un código corto de la página de origen (sirve para medir en el panel).

export type IntencionWhatsApp = "pregunta" | "tasa_cero" | "comprar" | "pedido";

const NUMERO = process.env.NEXT_PUBLIC_WHATSAPP_NUMERO ?? "";

/** Limpia el número: solo dígitos (ej. "+503 7123-4567" → "50371234567"). */
const limpiar = (n: string) => n.replace(/\D/g, "");

export function enlaceWhatsAppA(numero: string, mensaje: string) {
  return `https://wa.me/${limpiar(numero || NUMERO)}?text=${encodeURIComponent(mensaje)}`;
}

export function enlaceWhatsApp(mensaje: string) {
  return enlaceWhatsAppA(NUMERO, mensaje);
}

export function mensajeProducto(opts: {
  intencion: IntencionWhatsApp;
  nombre: string;
  precio: number;
  cuota?: { meses: number; monto: number };
  codigoPagina: string;
  /** Enlace a la ficha del producto: va al final del mensaje para que el equipo vea exactamente qué quiere */
  enlace?: string;
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
  return `${base[opts.intencion]}${opts.enlace ? `\n${opts.enlace}` : ""} [${opts.codigoPagina}]`;
}
