"use client";

import { useState, useTransition } from "react";
import { Pencil } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { margenNeto, precioParaMargenNeto, type CostosCobro } from "@/lib/costos-cobro";

// Precio de venta en la tabla de Precios, junto con su margen NETO en efectivo (paquetera: ya resta envío,
// paquetería y comisión de contra entrega; ver lib/costos-cobro.ts).
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
  envioCobrado,
  cobro,
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
  /** Lo que paga el cliente por el envío */
  envioCobrado: number;
  /** Costos de envío y cobro (Configuración) */
  cobro: CostosCobro;
}) {
  const neto = (forma: "efectivo" | "tarjeta", p: number) =>
    margenNeto(forma, { precio: p, costo: costo ?? 0, envioCobrado, descuentoPct }, cobro);
  const margenDe = (p: number | null) => {
    if (p === null || costo === null || !(p > 0)) return null;
    const m = neto("efectivo", p).pct;
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
  const tarjetaNeto = precioNum !== null && costo !== null && precioNum > 0 ? neto("tarjeta", precioNum).pct : null;
  const tarjeta = tarjetaNeto === null ? null : tarjetaNeto * 100;
  const bajoCosto = precioNum !== null && costo !== null && precioNum > 0 && neto("efectivo", precioNum).neto < 0;

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
              if (m !== null && costo !== null)
                setPrecio(aTexto(precioParaMargenNeto("efectivo", m, { costo, envioCobrado, descuentoPct }, cobro), 2));
            }}
            disabled={costo === null}
            className="h-8 w-16 text-right tabular-nums"
            aria-label={`Margen neto en efectivo de ${etiqueta}`}
            title={costo === null ? "Sin costo: no se puede calcular el margen" : "Margen neto si paga en efectivo al recibir (paquetera)"}
          />
          %
        </label>
      </div>
      <p className={`text-xs ${bajoCosto ? "text-red-600 dark:text-red-400" : "text-muted-foreground"}`}>
        {bajoCosto
          ? "En efectivo pierde dinero (con envío y comisión)"
          : tarjeta !== null
            ? `Margen neto en efectivo · tarjeta web ${tarjeta.toFixed(1)}%`
            : "Margen neto en efectivo"}
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
