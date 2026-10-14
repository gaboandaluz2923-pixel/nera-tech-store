"use server";

import { revalidatePath } from "next/cache";
import type { EstadoAccion } from "@/components/admin/formulario-accion";
import { equipo } from "@/lib/admin/sesion";
import { sitioActual } from "@/lib/sitio";
import { revisionDiaria } from "@/lib/tienda/regalos";

/** Corre ya la misma revisión que hace Vercel cada mañana. */
export async function revisarAhora(): Promise<EstadoAccion> {
  await equipo();
  const r = await revisionDiaria(await sitioActual());
  revalidatePath("/admin/correos");
  const partes = [
    `Cumpleaños: ${r.cumple.creados} ${r.cumple.creados === 1 ? "regalo nuevo" : "regalos nuevos"} (${r.cumple.correos} por correo${r.cumple.sinPublicidad ? `, ${r.cumple.sinPublicidad} sin correo porque no quieren publicidad` : ""})`,
    `Ya hay stock: ${r.stock.avisados} ${r.stock.avisados === 1 ? "aviso enviado" : "avisos enviados"}`,
  ];
  const errores = [...r.cumple.errores, ...r.stock.errores];
  return {
    ok: errores.length === 0,
    mensaje: `${partes.join(". ")}.${errores.length ? ` Problemas: ${errores.slice(0, 3).join(" | ")}` : ""}`,
    vez: Date.now(),
  };
}
