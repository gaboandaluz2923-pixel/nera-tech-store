import "server-only";
import { headers } from "next/headers";

/** Dirección pública del sitio según la petición actual (https://nera-tech-store.vercel.app, el dominio propio, etc.). */
export async function sitioActual() {
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host");
  const proto = h.get("x-forwarded-proto") ?? (host?.startsWith("localhost") ? "http" : "https");
  return host ? `${proto}://${host}` : (process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000");
}
