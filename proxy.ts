// Se ejecuta antes de cada petición a /admin y a las páginas de cuenta del cliente.
// 1) Refresca la sesión de Supabase (cookies) para que no caduque a mitad de uso.
// 2) Panel: sin sesión → /admin/login. Con sesión pero sin estar en la lista de equipo
//    (por ejemplo un cliente que entró con Google) → también al login, con un aviso.
import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { esDelEquipo } from "@/lib/supabase/equipo";

export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });

  // Si Supabase aún no está configurado (fase 0), dejamos pasar para ver las páginas.
  if (
    !process.env.NEXT_PUBLIC_SUPABASE_URL ||
    !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  ) {
    return response;
  }

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;
  if (!pathname.startsWith("/admin")) return response; // páginas del cliente: solo refrescar la sesión

  const esLogin = pathname.startsWith("/admin/login");
  const esEquipo = user ? await esDelEquipo(supabase) : false;

  if (!esEquipo && !esLogin) {
    const url = request.nextUrl.clone();
    url.pathname = "/admin/login";
    url.search = "";
    url.searchParams.set("volver", pathname);
    if (user) url.searchParams.set("aviso", "sin-acceso");
    return NextResponse.redirect(url);
  }

  if (esEquipo && esLogin) {
    const url = request.nextUrl.clone();
    url.pathname = "/admin";
    url.search = "";
    return NextResponse.redirect(url);
  }

  return response;
}

export const config = {
  matcher: ["/admin/:path*", "/mis-pedidos/:path*", "/mi-cuenta/:path*"],
};
