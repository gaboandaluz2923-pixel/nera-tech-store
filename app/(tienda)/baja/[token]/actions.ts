"use server";

import { darDeBaja } from "@/lib/tienda/baja";

export async function confirmarBaja(token: string): Promise<boolean> {
  return darDeBaja(String(token ?? ""));
}
