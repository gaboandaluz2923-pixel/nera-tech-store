"use client";

import { useState, useTransition } from "react";
import { Pencil } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { margenEfectivo, precioParaMargenEfectivo } from "@/lib/precios";

// Precio de venta en la tabla de Precios, junto con su margen en efectivo.
// Se ve como texto; el lápiz abre dos campos enlazados: si cambiás el precio se recalcula el margen,
// y si cambiás el margen se recalcula el precio (exacto, con centavos). "Guardar" cambia el precio.

const aTexto = (n: number | null, dec: number) => (n === null || !Number.isFinite(n) ? "" : n.toFixed(dec));
const leer = (t: string) => {
  const n = Number(t.replace(/[$,%\s]/g, ""));
  return t.trim() !== "" && Number.isFinite(n) ? n : null;
};

export function PrecioMargenEditable({
  accion,
  ocultos,
  valor,
  costo,
  descuentoPct,
  sugerido,
  etiqueta,
}: {
  accion: (form: FormData) => Promise<void>;
  ocultos: Record<string, string>;
  valor: number | null;
  /** Costo puesto del mejor proveedor (o null si no hay) */
  costo: number | null;
  /** % de descuento por pagar sin tarjeta */
  descuentoPct: number;
  sugerido: number | null;
  etiqueta: string;
}) {
  const margenDe = (p: number | null) => {
    if (p === null || costo === null) return null;
    const m = margenEfectivo(p, costo, descuentoPct);
    return m === null ? null : Math.round(m * 1000) / 10; // en %, un decimal
  };
  const [editando, setEditando] = useState(false);
  const [precio, setPrecio] = useState(aTexto(valor, 2));
  const [margen, setMargen] = useState(aTexto(margenDe(valor), 1));
  const [pendiente, empezar] = useTransition();

  const abrir = () => {
    setPrecio(aTexto(valor, 2));
    setMargen(aTexto(margenDe(valor), 1));
    setEditando(true);
  };

  if (!editando) {
    return (
      <div className="flex items-center justify-end gap-2">
        <span className={`tabular-nums ${valor ? "font-semibold" : "text-amber-700"}`}>{valor ? `$${valor.toFixed(2)}` : "Sin precio"}</span>
        <Button type="button" size="icon-sm" variant="ghost" onClick={abrir} aria-label={`Editar ${etiqueta}`} title="Editar precio o margen">
          <Pencil className="size-3.5" aria-hidden />
        </Button>
      </div>
    );
  }

  const precioNum = leer(precio);
  const tarjeta = precioNum !== null && costo !== null && precioNum > 0 ? ((precioNum - costo) / precioNum) * 100 : null;
  const bajoCosto = precioNum !== null && costo !== null && precioNum * (1 - descuentoPct / 100) < costo;

  return (
    <form
      className="space-y-1"
      onSubmit={(e) => {
        e.preventDefault();
        if (precioNum === null || precioNum < 0) {
          toast.error("Escribí un precio válido.");
          return;
        }
        const datos = new FormData(e.currentTarget);
        datos.set("precio", precioNum.toFixed(2));
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
      <div className="flex items-center gap-1">
        <label className="flex items-center gap-1 text-xs text-muted-foreground">
          $
          <Input
            type="number"
            step="0.01"
            min="0"
            inputMode="decimal"
            value={precio}
            onChange={(e) => {
              setPrecio(e.target.value);
              setMargen(aTexto(margenDe(leer(e.target.value)), 1));
            }}
            placeholder={sugerido ? String(sugerido) : ""}
            className="h-8 w-24 text-right tabular-nums"
            aria-label={`Precio de ${etiqueta}`}
            autoFocus
          />
        </label>
        <label className="flex items-center gap-1 text-xs text-muted-foreground">
          <Input
            type="number"
            step="0.1"
            max="99"
            inputMode="decimal"
            value={margen}
            onChange={(e) => {
              setMargen(e.target.value);
              const m = leer(e.target.value);
              if (m !== null && costo !== null) setPrecio(aTexto(precioParaMargenEfectivo(costo, m, descuentoPct), 2));
            }}
            disabled={costo === null}
            className="h-8 w-16 text-right tabular-nums"
            aria-label={`Margen en efectivo de ${etiqueta}`}
            title={costo === null ? "Sin costo de proveedor: no se puede calcular el margen" : "Margen si paga sin tarjeta"}
          />
          %
        </label>
      </div>
      <p className={`text-xs ${bajoCosto ? "text-red-600 dark:text-red-400" : "text-muted-foreground"}`}>
        {bajoCosto
          ? "En efectivo queda bajo el costo"
          : tarjeta !== null
            ? `Margen en efectivo · con tarjeta ${tarjeta.toFixed(1)}%`
            : "Margen en efectivo"}
      </p>
      <div className="flex gap-1">
        <Button type="submit" size="sm" disabled={pendiente}>
          {pendiente ? "…" : "Guardar"}
        </Button>
        <Button type="button" size="sm" variant="ghost" onClick={() => setEditando(false)}>
          Cancelar
        </Button>
      </div>
    </form>
  );
}
