"use client";

import { useActionState } from "react";
import { agregarPedidoACuenta, type EstadoReclamo } from "@/app/(tienda)/mis-pedidos/actions";
import { Button } from "@/components/ui/button";

export function AgregarPedido() {
  const [estado, accion, enviando] = useActionState<EstadoReclamo, FormData>(agregarPedidoACuenta, null);
  return (
    <form action={accion} className="space-y-3 rounded-xl border p-4">
      <p className="font-semibold">¿Te falta un pedido?</p>
      <p className="text-sm text-muted-foreground">Escribí el número de pedido y el teléfono que usaste al comprar.</p>
      <div className="grid gap-2 sm:grid-cols-[1fr_1fr_auto]">
        <input name="numero" inputMode="numeric" placeholder="Pedido # (ej. 1001)" aria-label="Número de pedido" className="h-11 rounded-lg border px-3 text-base" />
        <input name="telefono" type="tel" inputMode="tel" placeholder="Teléfono" aria-label="Teléfono" className="h-11 rounded-lg border px-3 text-base" />
        <Button type="submit" variant="outline" className="h-11" disabled={enviando}>
          {enviando ? "Buscando…" : "Agregar"}
        </Button>
      </div>
      {estado ? <p className={`text-sm ${estado.ok ? "text-green-700" : "text-destructive"}`}>{estado.mensaje}</p> : null}
    </form>
  );
}
