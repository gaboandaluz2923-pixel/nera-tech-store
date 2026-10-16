import { NextResponse, type NextRequest } from "next/server";
import { revisionDiaria } from "@/lib/tienda/regalos";
import { revisionDiariaDte } from "@/lib/dte/emitir";
import { SITE_URL } from "@/lib/url-sitio";

// Revisión diaria que llama Vercel (vercel.json → crons) a las 7:00 a. m. de El Salvador:
// cupones de cumpleaños, avisos "ya hay stock" y facturación electrónica pendiente. Vercel manda la clave CRON_SECRET.
export async function GET(request: NextRequest) {
  const clave = process.env.CRON_SECRET;
  if (!clave || request.headers.get("authorization") !== `Bearer ${clave}`) {
    return NextResponse.json({ ok: false, error: "No autorizado" }, { status: 401 });
  }
  const sitio = SITE_URL.startsWith("http://localhost") ? request.nextUrl.origin : SITE_URL;
  const r = await revisionDiaria(sitio);
  // Facturación electrónica: contingencia pendiente y facturas automáticas atrasadas
  const dte = await revisionDiariaDte().catch((e) => ({ error: String(e) }));
  console.log("Revisión diaria", JSON.stringify({ ...r, dte }));
  return NextResponse.json({ ok: true, ...r, dte });
}
