"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";

// Inicia sesión con Google. Al volver, /auth/callback enlaza los pedidos del cliente.
export function BotonGoogle({ volver = "/mis-pedidos", enlazar }: { volver?: string; enlazar?: string }) {
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function entrar() {
    setCargando(true);
    setError(null);
    const destino = new URL("/auth/callback", window.location.origin);
    destino.searchParams.set("volver", volver);
    if (enlazar) destino.searchParams.set("enlazar", enlazar);
    const { error } = await createClient().auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: destino.toString() },
    });
    if (error) {
      setError("No pudimos abrir Google. Probá de nuevo.");
      setCargando(false);
    }
  }

  return (
    <div className="space-y-2">
      <Button type="button" size="lg" variant="outline" className="h-12 w-full bg-white text-base" onClick={entrar} disabled={cargando}>
        <svg viewBox="0 0 24 24" className="size-5" aria-hidden>
          <path fill="#4285F4" d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.5h6.5a5.5 5.5 0 0 1-2.4 3.6v3h3.9c2.3-2.1 3.5-5.2 3.5-8.8Z" />
          <path fill="#34A853" d="M12 24c3.2 0 6-1.1 7.9-2.9l-3.9-3c-1.1.7-2.4 1.2-4 1.2-3.1 0-5.7-2.1-6.6-4.9h-4v3.1A12 12 0 0 0 12 24Z" />
          <path fill="#FBBC05" d="M5.4 14.4a7.2 7.2 0 0 1 0-4.8V6.5h-4a12 12 0 0 0 0 11l4-3.1Z" />
          <path fill="#EA4335" d="M12 4.8c1.7 0 3.3.6 4.5 1.8l3.4-3.4A12 12 0 0 0 1.4 6.5l4 3.1C6.3 6.9 8.9 4.8 12 4.8Z" />
        </svg>
        {cargando ? "Abriendo Google…" : "Continuar con Google"}
      </Button>
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
    </div>
  );
}
