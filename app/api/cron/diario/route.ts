import { NextResponse, type NextRequest } from "next/server";
import { revisionDiaria } from "@/lib/tienda/regalos";
import { SITE_URL } from "@/lib/url-sitio";

// Revisión diaria que llama Vercel (vercel.json → crons) a las 7:00 a. m. de El Salvador:
// cupones de cumpleaños y avisos "ya hay stock". Vercel manda la clave CRON_SECRET.
export async function GET(request: NextRequest) {
  const clave = process.env.CRON_SECRET;
  if (!clave || request.headers.get("authorization") !== `Bearer ${clave}`) {
    return NextResponse.json({ ok: false, error: "No autorizado" }, { status: 401 });
  }
  const sitio = SITE_URL.startsWith("http://localhost") ? request.nextUrl.origin : SITE_URL;
  const r = await revisionDiaria(sitio);
  console.log("Revisión diaria", JSON.stringify(r));
  return NextResponse.json({ ok: true, ...r });
}
