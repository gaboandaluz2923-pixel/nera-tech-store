"use client";

import { useEffect } from "react";
import { medir, type DatosEvento, type TipoEvento } from "@/lib/analytics";

/**
 * Para páginas del servidor: registra un evento al mostrarse.
 * Con `unaVez`, no se repite si la persona recarga la página (ej. la compra).
 */
export function MedirEvento({ tipo, datos, unaVez }: { tipo: TipoEvento; datos?: DatosEvento; unaVez?: string }) {
  useEffect(() => {
    if (unaVez) {
      try {
        if (sessionStorage.getItem(`medido-${unaVez}`)) return;
        sessionStorage.setItem(`medido-${unaVez}`, "1");
      } catch {}
    }
    medir(tipo, datos);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  return null;
}
