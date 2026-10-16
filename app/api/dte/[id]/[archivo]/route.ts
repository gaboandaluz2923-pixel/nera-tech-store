import { type NextRequest } from "next/server";
import { equipo } from "@/lib/admin/sesion";
import { archivosDte } from "@/lib/dte/emitir";
import { createServiceClient } from "@/lib/supabase/server";

// Descarga de la factura electrónica: PDF (representación gráfica) o JSON (archivo DTE con firma y sello).
// La puede bajar el equipo del panel, o el cliente con el enlace secreto de su pedido (?t=token).
// Nombre del archivo: el código de generación (Normativa 2.0).

export async function GET(request: NextRequest, ctx: { params: Promise<{ id: string; archivo: string }> }) {
  const { id, archivo } = await ctx.params;
  if (!/^[0-9a-f-]{36}$/i.test(id) || !["pdf", "json"].includes(archivo)) return new Response("No encontrado", { status: 404 });

  const token = request.nextUrl.searchParams.get("t");
  let permitido = false;
  if (token) {
    const { data } = await createServiceClient().from("dte_documentos").select("prueba, ambiente, pedidos(token)").eq("id", id).maybeSingle();
    const ped = data?.pedidos as unknown as { token: string } | null;
    // El cliente solo ve documentos de producción
    permitido = Boolean(data && !data.prueba && data.ambiente === "01" && ped?.token && ped.token === token);
  } else {
    permitido = await equipo()
      .then(() => true)
      .catch(() => false);
  }
  if (!permitido) return new Response("No autorizado", { status: 403 });

  try {
    const { d, pdf, json } = await archivosDte(id);
    if (d.estado === "descartado") return new Response("Documento descartado", { status: 404 });
    const descarga = request.nextUrl.searchParams.get("ver") !== "1";
    const cabeceras = {
      "cache-control": "private, no-store",
      "content-disposition": `${descarga ? "attachment" : "inline"}; filename="${d.codigo_generacion}.${archivo}"`,
    };
    return archivo === "pdf"
      ? new Response(Buffer.from(pdf), { headers: { ...cabeceras, "content-type": "application/pdf" } })
      : new Response(json, { headers: { ...cabeceras, "content-type": "application/json; charset=utf-8" } });
  } catch {
    return new Response("No encontrado", { status: 404 });
  }
}
