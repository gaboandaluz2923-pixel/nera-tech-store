"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";

// Llena de una vez los precios de oferta de un producto con un % menos sobre el precio normal
// (redondeado al .99 o al entero terminado en 9 o 5, como en Precios). Avisa si alguno queda
// por debajo del mínimo sin pérdida.

function redondeo(n: number) {
  // Hacia abajo, para que el cliente ahorre al menos el % que elegiste
  if (n < 30) return Math.max(0.99, Math.floor(n + 0.01) - 0.01);
  const entero = Math.floor(n);
  const decena = Math.floor(entero / 10) * 10;
  return entero % 10 >= 9 ? decena + 9 : entero % 10 >= 5 ? decena + 5 : decena - 1;
}

export function RellenarPorcentaje({ producto }: { producto: string }) {
  const [pct, setPct] = useState("");
  const [aviso, setAviso] = useState<string | null>(null);
  const aplicar = (limpiar = false) => {
    const campos = document.querySelectorAll<HTMLInputElement>(`input[data-producto="${producto}"]`);
    let bajo = 0;
    campos.forEach((c) => {
      if (limpiar) {
        c.value = "";
        return;
      }
      const normal = Number(c.dataset.normal);
      const minimo = Number(c.dataset.minimo || 0);
      const valor = Math.round(redondeo(normal * (1 - Number(pct) / 100)) * 100) / 100;
      c.value = valor > 0 && valor < normal ? valor.toFixed(2) : "";
      if (minimo && valor < minimo) bajo++;
    });
    setAviso(limpiar ? null : bajo ? `${bajo} quedan bajo el mínimo sin pérdida.` : null);
  };
  return (
    <div className="flex flex-wrap items-center gap-1.5 text-sm">
      <input
        value={pct}
        onChange={(e) => setPct(e.target.value.replace(/[^\d.]/g, ""))}
        inputMode="decimal"
        placeholder="%"
        aria-label="Porcentaje de descuento para todas las opciones"
        className="h-8 w-14 rounded-md border px-2"
      />
      <Button type="button" size="sm" variant="outline" disabled={!(Number(pct) > 0 && Number(pct) < 90)} onClick={() => aplicar()}>
        Bajar % a todas
      </Button>
      <Button type="button" size="sm" variant="ghost" onClick={() => aplicar(true)}>
        Quitar
      </Button>
      {aviso ? <span className="text-xs font-medium text-destructive">{aviso}</span> : null}
    </div>
  );
}
