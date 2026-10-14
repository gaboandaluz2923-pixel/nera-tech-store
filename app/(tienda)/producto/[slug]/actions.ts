"use server";

import { z } from "zod";
import { createServiceClient } from "@/lib/supabase/server";

// "Avisame cuando haya": guarda el correo del visitante para avisarle cuando vuelva el stock.
// El navegador nunca escribe directo en la base: pasa por aquí con la clave de servicio.

export type EstadoAviso = { ok: boolean; mensaje: string } | null;

const esquema = z.object({
  correo: z.string().trim().toLowerCase().email(),
  productoId: z.string().uuid(),
});

export async function avisarStock(_prev: EstadoAviso, form: FormData): Promise<EstadoAviso> {
  // Campo trampa para robots: una persona no lo ve ni lo llena
  if (form.get("sitio")) return { ok: true, mensaje: "Listo." };

  const datos = esquema.safeParse({ correo: form.get("correo"), productoId: form.get("productoId") });
  if (!datos.success) return { ok: false, mensaje: "Revisá el correo: parece que falta algo." };

  const { error } = await createServiceClient()
    .from("suscriptores")
    .upsert(
      { correo: datos.data.correo, origen: "aviso_stock", producto_id: datos.data.productoId, activo: true },
      { onConflict: "correo,origen,producto_id" }
    );
  if (error) {
    console.error("avisarStock", error);
    return { ok: false, mensaje: "No pudimos guardar tu correo. Probá de nuevo o escribinos por WhatsApp." };
  }
  return { ok: true, mensaje: "¡Listo! Te escribimos en cuanto vuelva a haber." };
}
