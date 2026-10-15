import { superAdmin } from "@/lib/admin/sesion";

// CSV con todos los clientes del CRM (solo administradores). Para WhatsApp (listas de difusión) o Excel.

const celda = (v: unknown) => {
  const s = Array.isArray(v) ? v.join(", ") : v === null || v === undefined ? "" : String(v);
  // Evita que Excel interprete fórmulas
  const seguro = /^[=+\-@]/.test(s) ? `'${s}` : s;
  return /[",\n;]/.test(seguro) ? `"${seguro.replace(/"/g, '""')}"` : seguro;
};

export async function GET() {
  let supabase;
  try {
    ({ supabase } = await superAdmin());
  } catch {
    return new Response("Solo para administradores.", { status: 403 });
  }
  const filas: string[] = [
    ["Nombre", "Teléfono", "Teléfono alterno", "WhatsApp internacional", "Correo", "Acepta correos", "Acepta WhatsApp", "Etiquetas", "Origen", "Creado"].join(","),
  ];
  for (let desde = 0; desde < 50000; desde += 1000) {
    const { data, error } = await supabase
      .from("clientes")
      .select("nombre, telefono, telefono_alterno, correo, acepta_correo, acepta_whatsapp, etiquetas, origen, created_at")
      .order("created_at")
      .range(desde, desde + 999);
    if (error) return new Response(`No se pudo leer el CRM: ${error.message}`, { status: 500 });
    for (const c of data ?? []) {
      filas.push(
        [
          c.nombre,
          c.telefono,
          c.telefono_alterno,
          c.telefono ? `+503${c.telefono}` : "",
          c.correo,
          c.acepta_correo ? "sí" : "no",
          c.acepta_whatsapp ? "sí" : "no",
          c.etiquetas,
          c.origen,
          String(c.created_at ?? "").slice(0, 10),
        ]
          .map(celda)
          .join(",")
      );
    }
    if (!data || data.length < 1000) break;
  }
  const hoy = new Date().toLocaleDateString("en-CA", { timeZone: "America/El_Salvador" });
  return new Response(`﻿${filas.join("\n")}`, {
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": `attachment; filename="clientes-nera-tech-${hoy}.csv"`,
      "cache-control": "no-store",
    },
  });
}
