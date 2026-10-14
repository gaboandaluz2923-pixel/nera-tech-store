// Google regresa aquí después de iniciar sesión. Se crea la sesión y se enlazan los pedidos del cliente.
import { NextResponse, type NextRequest } from "next/server";
import { enlazarCuenta } from "@/lib/tienda/cuentas";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const q = request.nextUrl.searchParams;
  const volver = q.get("volver") ?? "/mis-pedidos";
  const seguro = volver.startsWith("/") && !volver.startsWith("//") ? volver : "/mis-pedidos";
  const code = q.get("code");

  if (code) {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error && data.user) {
      try {
        await enlazarCuenta(data.user, q.get("enlazar"));
      } catch (e) {
        console.error("enlazarCuenta", e);
      }
      return NextResponse.redirect(new URL(seguro, request.url));
    }
    console.error("auth callback", error);
  }
  return NextResponse.redirect(new URL("/cuenta/entrar?error=1", request.url));
}
