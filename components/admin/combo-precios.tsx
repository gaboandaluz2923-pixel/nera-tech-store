"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { margenNeto, NOMBRE_COBRO, type CostosCobro, type FormaCobro } from "@/lib/costos-cobro";

// Combos en Promociones: precio de venta del combo y margen neto con cada forma de cobro (como en Precios).
// El costo (con IVA) es fijo; los precios del celular (por memoria), de los accesorios y el ahorro se editan.
// Un combo se envía en un solo paquete: un envío, una paquetería.

export type ConfigCombo = { productoId: string; ram: number | null; alm: number | null; memoria: string; precio: number; costo: number | null };
export type ItemCombo = ConfigCombo & { nombre: string; cantidad: number };
export type DatosCombo = {
  id: string;
  nombre: string;
  activo: boolean;
  ahorro: number;
  principal: { nombre: string; configs: ConfigCombo[] };
  items: ItemCombo[];
  envioCobrado: number;
  descuentoPct: number;
  cobro: CostosCobro;
};

const usd = (n: number) => n.toLocaleString("en-US", { style: "currency", currency: "USD" });
const pct = (n: number | null) => (n === null ? "—" : `${(n * 100).toFixed(1)}%`);
const FORMAS = Object.keys(NOMBRE_COBRO) as FormaCobro[];
const claveDe = (c: { productoId: string; ram: number | null; alm: number | null }) => `${c.productoId}|${c.ram ?? ""}|${c.alm ?? ""}`;

/** Tabla de precio y margen neto del combo, una fila por memoria del celular */
export function TablaCombo({
  d,
  precios,
  ahorro,
}: {
  d: DatosCombo;
  /** precio por clave producto|ram|alm (si falta, el actual) */
  precios?: Record<string, number>;
  ahorro?: number;
}) {
  const precioDe = (c: ConfigCombo) => precios?.[claveDe(c)] ?? c.precio;
  const valorItems = d.items.reduce((s, i) => s + precioDe(i) * i.cantidad, 0);
  const ah = Math.min(ahorro ?? d.ahorro, valorItems);
  const costoItems = d.items.some((i) => i.costo === null) ? null : d.items.reduce((s, i) => s + (i.costo ?? 0) * i.cantidad, 0);
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[640px] text-xs tabular-nums">
        <thead className="text-muted-foreground">
          <tr className="border-b">
            <th className="py-1 pr-2 text-left font-normal">Celular</th>
            <th className="py-1 pr-2 text-right font-normal">Precio del combo (tarjeta)</th>
            <th className="py-1 pr-2 text-right font-normal">En efectivo</th>
            <th className="py-1 pr-2 text-right font-normal">Costo con IVA</th>
            {FORMAS.map((f) => (
              <th key={f} className="py-1 pr-2 text-right font-normal">
                {NOMBRE_COBRO[f]}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {d.principal.configs.map((c) => {
            const precio = Math.round((precioDe(c) + valorItems - ah) * 100) / 100;
            const costo = c.costo === null || costoItems === null ? null : c.costo + costoItems;
            return (
              <tr key={claveDe(c)} className="border-b last:border-0">
                <td className="py-1.5 pr-2">{c.memoria || d.principal.nombre}</td>
                <td className="py-1.5 pr-2 text-right font-semibold">{usd(precio)}</td>
                <td className="py-1.5 pr-2 text-right">{usd(Math.round(precio * (100 - d.descuentoPct)) / 100)}</td>
                <td className="py-1.5 pr-2 text-right">{costo === null ? "sin costo" : usd(costo)}</td>
                {FORMAS.map((f) => {
                  if (costo === null) return <td key={f} className="py-1.5 pr-2 text-right text-muted-foreground">—</td>;
                  const n = margenNeto(f, { precio, costo, envioCobrado: d.envioCobrado, descuentoPct: d.descuentoPct }, d.cobro);
                  const malo = n.neto < 0 || (n.pct !== null && n.pct < 0.05);
                  return (
                    <td
                      key={f}
                      className={`py-1.5 pr-2 text-right ${malo ? "text-red-600 dark:text-red-400" : ""}`}
                      title={`Cobrás ${usd(n.cobrado)} − comisión ${usd(n.comision)} − envío y paquetería ${usd(n.envio)} − costo ${usd(n.costo)}`}
                    >
                      <span className="font-medium">{usd(n.neto)}</span> <span className="text-muted-foreground">{pct(n.pct)}</span>
                    </td>
                  );
                })}
              </tr>
            );
          })}
        </tbody>
      </table>
      <p className="mt-1 text-xs text-muted-foreground">
        Margen neto con un solo envío y una paquetería para todo el combo. En rojo si queda bajo 5% o pierde. Pasá el mouse para ver la cuenta.
      </p>
    </div>
  );
}

/** Campos del formulario "Editar" de un combo, con la tabla de margen en vivo */
export function CamposCombo({ d }: { d: DatosCombo }) {
  const todos = [...d.principal.configs, ...d.items];
  const [precios, setPrecios] = useState<Record<string, string>>(() =>
    Object.fromEntries(todos.map((c) => [claveDe(c), c.precio.toFixed(2)]))
  );
  const [ahorro, setAhorro] = useState(d.ahorro.toFixed(2));
  const num = (t: string) => {
    const n = Number(t.replace(/[$,\s]/g, ""));
    return Number.isFinite(n) && n >= 0 ? n : 0;
  };
  const preciosNum = Object.fromEntries(Object.entries(precios).map(([k, v]) => [k, num(v)]));
  const cambios = todos
    .filter((c, i, a) => a.findIndex((x) => claveDe(x) === claveDe(c)) === i)
    .filter((c) => Math.abs(num(precios[claveDe(c)]) - c.precio) > 0.004)
    .map((c) => ({ productoId: c.productoId, ram: c.ram, alm: c.alm, precio: num(precios[claveDe(c)]) }));
  const valorItems = d.items.reduce((s, i) => s + num(precios[claveDe(i)]) * i.cantidad, 0);

  const campo = (c: ConfigCombo, etiqueta: string) => (
    <div key={claveDe(c)} className="space-y-1">
      <Label htmlFor={`cp-${d.id}-${claveDe(c)}`} className="text-xs">
        {etiqueta}
      </Label>
      <div className="flex items-center gap-1">
        <span className="text-xs text-muted-foreground">$</span>
        <Input
          id={`cp-${d.id}-${claveDe(c)}`}
          inputMode="decimal"
          className="h-8 w-28 text-right tabular-nums"
          value={precios[claveDe(c)]}
          onChange={(e) => setPrecios((p) => ({ ...p, [claveDe(c)]: e.target.value }))}
        />
      </div>
      <p className="text-xs text-muted-foreground">costo {c.costo === null ? "sin dato" : usd(c.costo)} con IVA</p>
    </div>
  );

  return (
    <div className="space-y-3">
      <input type="hidden" name="id" value={d.id} />
      <input type="hidden" name="precios" value={JSON.stringify(cambios)} />
      <p className="font-medium">{d.nombre}</p>
      <div className="flex flex-wrap gap-4">
        {d.principal.configs.map((c) => campo(c, `${d.principal.nombre}${c.memoria ? ` ${c.memoria}` : ""} (tarjeta)`))}
        {d.items.map((i) => campo(i, `${i.cantidad > 1 ? `${i.cantidad} × ` : ""}${i.nombre} (tarjeta)`))}
        <div className="space-y-1">
          <Label htmlFor={`cb-${d.id}`} className="text-xs">
            Ahorro del combo
          </Label>
          <div className="flex items-center gap-1">
            <span className="text-xs text-muted-foreground">$</span>
            <Input
              id={`cb-${d.id}`}
              name="descuento"
              inputMode="decimal"
              className="h-8 w-24 text-right tabular-nums"
              value={ahorro}
              onChange={(e) => setAhorro(e.target.value)}
            />
          </div>
          <button type="button" className="text-xs text-primary underline" onClick={() => setAhorro(valorItems.toFixed(2))}>
            Accesorios de regalo ({usd(valorItems)})
          </button>
        </div>
        <label className="flex h-8 items-center gap-2 self-center text-sm">
          <input type="checkbox" name="activo" defaultChecked={d.activo} className="size-4" /> Activo
        </label>
      </div>
      {cambios.length ? (
        <p className="rounded-md bg-amber-50 p-2 text-xs text-amber-900 dark:bg-amber-950/40 dark:text-amber-200">
          Al guardar cambia el precio de venta de {cambios.length === 1 ? "este producto" : "estos productos"} en toda la tienda (no solo
          en el combo), igual que en Precios.
        </p>
      ) : null}
      <TablaCombo d={d} precios={preciosNum} ahorro={num(ahorro)} />
    </div>
  );
}
