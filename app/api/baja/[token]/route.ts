import { NextResponse, type NextRequest } from "next/server";
import { darDeBaja } from "@/lib/tienda/baja";

// Baja con un toque desde Gmail/Outlook (encabezado List-Unsubscribe-Post): no pide confirmación.
export async function POST(_request: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const ok = await darDeBaja(token);
  return NextResponse.json({ ok }, { status: ok ? 200 : 404 });
}
