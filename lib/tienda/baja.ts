import "server-only";
import { createServiceClient } from "@/lib/supabase/server";

const esToken = (t: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(t);

/** Cliente dueño del enlace de baja (solo nombre y si ya está de baja) */
export async function clienteDeBaja(token: string) {
  if (!esToken(token)) return null;
  const { data } = await createServiceClient().from("clientes").select("nombre, correo, acepta_correo").eq("baja_token", token).maybeSingle();
  return data;
}

/** Deja de enviarle publicidad por correo. Los correos de sus pedidos le siguen llegando. */
export async function darDeBaja(token: string): Promise<boolean> {
  if (!esToken(token)) return false;
  const { data } = await createServiceClient()
    .from("clientes")
    .update({ acepta_correo: false, ofertas_elegido_en: new Date().toISOString() })
    .eq("baja_token", token)
    .select("id");
  return Boolean(data?.length);
}
