import { ivaDelMes, leerMes } from "@/lib/admin/finanzas";
import { superAdmin } from "@/lib/admin/sesion";
import { createServiceClient } from "@/lib/supabase/server";

// Libros de IVA del mes en CSV (para el contador): ?mes=2026-10&libro=ventas|compras

const celda = (v: unknown) => {
  const s = v === null || v === undefined ? "" : String(v);
  const seguro = /^[=+\-@]/.test(s) ? `'${s}` : s;
  return /[",\n;]/.test(seguro) ? `"${seguro.replace(/"/g, '""')}"` : seguro;
};

export async function GET(req: Request) {
  try {
    await superAdmin();
  } catch {
    return new Response("Solo para administradores.", { status: 403 });
  }
  const url = new URL(req.url);
  const mes = leerMes(url.searchParams.get("mes") ?? undefined);
  const libro = url.searchParams.get("libro") === "compras" ? "compras" : "ventas";
  const datos = await ivaDelMes(createServiceClient(), mes);
  const filas = libro === "ventas" ? datos.ventas : datos.libroCompras;
  const csv = [
    ["Fecha", "Documento", "Número", libro === "ventas" ? "Cliente" : "Proveedor", "NIT / NRC", "Gravado (sin IVA)", "IVA", "Total"].join(","),
    ...filas.map((f) => [f.fecha, f.documento, f.numero, f.nombre, f.nit, f.gravado.toFixed(2), f.iva.toFixed(2), f.total.toFixed(2)].map(celda).join(",")),
  ].join("\n");
  return new Response(`﻿${csv}`, {
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": `attachment; filename="libro-${libro}-${mes}.csv"`,
      "cache-control": "no-store",
    },
  });
}
