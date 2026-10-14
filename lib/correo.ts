import "server-only";
import { createServiceClient } from "@/lib/supabase/server";

// Envío de correos con Brevo (https://developers.brevo.com/reference/sendtransacemail).
// La clave va en Vercel como BREVO_API_KEY. Si falta, no se envía nada (y no rompe la compra).
// Remitente, "responder a" y correo de avisos se editan en el panel → Configuración → Correos.

const URL_BREVO = process.env.BREVO_API_URL ?? "https://api.brevo.com/v3/smtp/email";

export type ConfigCorreo = { remitente: string; nombre: string; responder_a: string; avisos_a: string };

export async function configCorreo(): Promise<ConfigCorreo> {
  const { data } = await createServiceClient().from("configuracion").select("valor").eq("clave", "correo").maybeSingle();
  const v = (data?.valor ?? {}) as Partial<ConfigCorreo>;
  return {
    remitente: v.remitente || "pedidos@neratechsv.com",
    nombre: v.nombre || "Nera Tech",
    responder_a: v.responder_a || "",
    avisos_a: v.avisos_a || "",
  };
}

export type ResultadoCorreo = { enviado: boolean; motivo?: string };

export async function enviarCorreo(c: {
  para: string;
  nombrePara?: string;
  asunto: string;
  html: string;
  texto: string;
  etiqueta: string;
  /** Encabezados extra (ej. List-Unsubscribe en correos de publicidad) */
  encabezados?: Record<string, string>;
}): Promise<ResultadoCorreo> {
  const clave = process.env.BREVO_API_KEY?.trim();
  if (!clave) return { enviado: false, motivo: "Falta BREVO_API_KEY en Vercel" };
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(c.para)) return { enviado: false, motivo: "Correo del destinatario no válido" };
  const cfg = await configCorreo();
  try {
    const r = await fetch(URL_BREVO, {
      method: "POST",
      headers: { "api-key": clave, "content-type": "application/json", accept: "application/json" },
      body: JSON.stringify({
        sender: { name: cfg.nombre, email: cfg.remitente },
        to: [{ email: c.para, ...(c.nombrePara ? { name: c.nombrePara } : {}) }],
        ...(cfg.responder_a ? { replyTo: { email: cfg.responder_a, name: cfg.nombre } } : {}),
        subject: c.asunto,
        htmlContent: c.html,
        textContent: c.texto,
        tags: [c.etiqueta],
        ...(c.encabezados ? { headers: c.encabezados } : {}),
      }),
      cache: "no-store",
    });
    if (!r.ok) {
      const detalle = (await r.text()).slice(0, 200);
      console.error("Brevo", r.status, detalle);
      return { enviado: false, motivo: `Brevo respondió ${r.status}: ${detalle}` };
    }
    return { enviado: true };
  } catch (e) {
    console.error("Brevo", e);
    return { enviado: false, motivo: "No se pudo contactar a Brevo" };
  }
}
