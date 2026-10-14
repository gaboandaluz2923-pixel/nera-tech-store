import { NextResponse, type NextRequest } from "next/server";
import { revisionDiaria } from "@/lib/tienda/regalos";

// Revisión diaria que llama Vercel (vercel.json → crons) a las 7:00 a. m. de El Salvador:
// cupones de cumpleaños y avisos "ya hay stock". Vercel manda la clave CRON_SECRET.
export async function GET(request: NextRequest) {
  const clave = process.env.CRON_SECRET;
  if (!clave || request.headers.get("authorization") !== `Bearer ${clave}`) {
    return NextResponse.json({ ok: false, error: "No autorizado" }, { status: 401 });
  }
  const sitio = process.env.NEXT_PUBLIC_SITE_URL || request.nextUrl.origin;
  const r = await revisionDiaria(sitio);
  console.log("Revisión diaria", JSON.stringify(r));
  return NextResponse.json({ ok: true, ...r });
}
