"use client";

import { useState, useTransition } from "react";
import { Lock } from "lucide-react";
import { reintentarPagoTarjeta } from "@/app/(tienda)/checkout/actions";
import { Button } from "@/components/ui/button";

export function PagarConTarjeta({ token, texto }: { token: string; texto: string }) {
  const [abriendo, iniciar] = useTransition();
  const [error, setError] = useState<string | null>(null);
  return (
    <div className="space-y-2">
      <Button
        size="lg"
        className="h-12 w-full text-base"
        disabled={abriendo}
        onClick={() =>
          iniciar(async () => {
            setError(null);
            const r = await reintentarPagoTarjeta(token);
            if (r.ok && r.url) window.location.href = r.url;
            else setError(r.mensaje ?? "No se pudo abrir el pago.");
          })
        }
      >
        <Lock className="size-4" aria-hidden />
        {abriendo ? "Abriendo Wompi…" : texto}
      </Button>
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
    </div>
  );
}
