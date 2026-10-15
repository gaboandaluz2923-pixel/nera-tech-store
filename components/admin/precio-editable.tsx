"use client";

import { useState, useTransition } from "react";
import { Pencil } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

// Precio en la tabla de Precios: se ve como texto; "Editar" abre el campo, "Guardar" lo cambia.

export function PrecioEditable({
  accion,
  ocultos,
  valor,
  sugerido,
  etiqueta,
}: {
  accion: (form: FormData) => Promise<void>;
  ocultos: Record<string, string>;
  valor: number | null;
  sugerido: number | null;
  etiqueta: string;
}) {
  const [editando, setEditando] = useState(false);
  const [pendiente, empezar] = useTransition();
  if (!editando) {
    return (
      <div className="flex items-center justify-end gap-2">
        <span className={`tabular-nums ${valor ? "font-semibold" : "text-amber-700"}`}>{valor ? `$${valor.toFixed(2)}` : "Sin precio"}</span>
        <Button type="button" size="icon-sm" variant="ghost" onClick={() => setEditando(true)} aria-label={`Editar ${etiqueta}`} title="Editar">
          <Pencil className="size-3.5" aria-hidden />
        </Button>
      </div>
    );
  }
  return (
    <form
      className="flex items-center gap-1"
      onSubmit={(e) => {
        e.preventDefault();
        const datos = new FormData(e.currentTarget);
        empezar(async () => {
          try {
            await accion(datos);
            toast.success("Precio guardado");
            setEditando(false);
          } catch {
            toast.error("No se pudo guardar el precio.");
          }
        });
      }}
    >
      {Object.entries(ocultos).map(([k, v]) => (
        <input key={k} type="hidden" name={k} value={v} />
      ))}
      <Input
        name="precio"
        type="number"
        step="0.01"
        min="0"
        inputMode="decimal"
        defaultValue={valor ?? ""}
        placeholder={sugerido ? String(sugerido) : ""}
        className="h-8 w-24 text-right tabular-nums"
        aria-label={etiqueta}
        autoFocus
      />
      <Button type="submit" size="sm" disabled={pendiente}>
        {pendiente ? "…" : "Guardar"}
      </Button>
      <Button type="button" size="sm" variant="ghost" onClick={() => setEditando(false)}>
        Cancelar
      </Button>
    </form>
  );
}
