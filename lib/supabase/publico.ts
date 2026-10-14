// Cliente de Supabase para la TIENDA pública: sin cookies ni sesión, solo la clave anon.
// Puede usarse dentro de funciones con "use cache" (no depende de la petición).
// Solo ve lo que las políticas RLS permiten al público: catálogo publicado y configuración pública.
import { createClient } from "@supabase/supabase-js";

export function clientePublico() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    auth: { persistSession: false, autoRefreshToken: false },
    // La caché la maneja "use cache" (que el panel refresca al guardar cambios).
    // Las consultas en sí nunca se guardan aparte, para no servir datos viejos entre despliegues.
    global: { fetch: (url, init) => fetch(url, { ...init, cache: "no-store" }) },
  });
}
