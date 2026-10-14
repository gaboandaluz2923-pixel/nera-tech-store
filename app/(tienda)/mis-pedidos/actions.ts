"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { reclamarPedido } from "@/lib/tienda/cuentas";
import { createClient } from "@/lib/supabase/server";

export type EstadoReclamo = { ok: boolean; mensaje: string } | null;

export async function agregarPedidoACuenta(_prev: EstadoReclamo, form: FormData): Promise<EstadoReclamo> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, mensaje: "Tu sesión venció. Entrá de nuevo con Google." };
  const numero = Number(String(form.get("numero") ?? "").replace(/\D/g, ""));
  const telefono = String(form.get("telefono") ?? "").replace(/\D/g, "").replace(/^503(?=\d{8}$)/, "");
  if (!numero || !/^\d{8}$/.test(telefono)) return { ok: false, mensaje: "Escribí el número de pedido y el teléfono de 8 dígitos." };
  const r = await reclamarPedido(user.id, numero, telefono);
  if (r.ok) revalidatePath("/mis-pedidos");
  return r;
}

export async function salir() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/");
}
