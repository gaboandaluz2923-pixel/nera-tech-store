// Clientes de Supabase para el servidor (Server Components, Server Actions, Route Handlers).
//
// - createClient(): usa la sesión del usuario (cookies). Para el panel /admin.
// - createServiceClient(): usa la clave de servicio, que salta las políticas RLS.
//   SOLO en código del servidor y SOLO para escrituras públicas controladas
//   (crear pedidos desde el checkout, registrar eventos, guardar suscriptores).
//   Nunca exponer esta clave al navegador.
import { createServerClient } from "@supabase/ssr";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";

export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // Se llama desde un Server Component: las cookies las refresca proxy.ts.
          }
        },
      },
    }
  );
}

export function createServiceClient() {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) {
    throw new Error(
      "Falta SUPABASE_SERVICE_ROLE_KEY en las variables de entorno del servidor."
    );
  }
  return createSupabaseClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
