"use client";

import { usePathname } from "next/navigation";

/** Oculta su contenido en ciertas páginas (ej. el WhatsApp flotante en el checkout, donde tapa los campos). */
export function OcultarEn({ rutas, children }: { rutas: string[]; children: React.ReactNode }) {
  const ruta = usePathname();
  return rutas.some((r) => ruta.startsWith(r)) ? null : <>{children}</>;
}
