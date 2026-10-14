"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { confirmarBaja } from "@/app/(tienda)/baja/[token]/actions";

export function BotonBaja({ token, yaDeBaja }: { token: string; yaDeBaja: boolean }) {
  const [listo, setListo] = useState(yaDeBaja);
  const [error, setError] = useState(false);
  const [enviando, iniciar] = useTransition();
  if (listo) {
    return <p className="rounded-lg bg-green-50 p-3 font-medium text-green-800">Listo: ya no te enviamos publicidad por correo.</p>;
  }
  return (
    <div className="space-y-2">
      <Button
        size="lg"
        className="h-12 w-full text-base"
        disabled={enviando}
        onClick={() =>
          iniciar(async () => {
            const ok = await confirmarBaja(token);
            if (ok) setListo(true);
            else setError(true);
          })
        }
      >
        {enviando ? "Guardando…" : "No quiero recibir publicidad"}
      </Button>
      {error ? <p className="text-sm text-destructive">No se pudo guardar. Probá de nuevo o escribinos por WhatsApp.</p> : null}
    </div>
  );
}
