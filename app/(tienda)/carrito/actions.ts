"use server";

import { calcularCarrito, type ResumenCarrito } from "@/lib/tienda/calculo";

/** Precios, envío y total del carrito, leídos de la base en este momento. */
export async function resumenCarrito(lineas: unknown): Promise<ResumenCarrito> {
  return calcularCarrito(lineas);
}
