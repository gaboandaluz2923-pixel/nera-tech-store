import Image from "next/image";
import { Gift, Plus } from "lucide-react";
import type { ComboInicio } from "@/lib/tienda/datos";
import { precioConDescuento, usd2 } from "@/lib/tienda/formato";
import { EnlaceCombo } from "./enlace-combo";

// Inicio: los combos vigentes ("Completá tu equipo"), junto al banner de la campaña. Cada tarjeta lleva a la ficha,
// donde está el botón "Agregar combo". Si el ahorro cubre todo el accesorio, se anuncia como regalo.

export function CombosInicio({ combos, descuentoSinTarjeta }: { combos: ComboInicio[]; descuentoSinTarjeta: number }) {
  if (!combos.length) return null;
  const todosRegalo = combos.every(({ combo }) => esRegalo(combo));
  return (
    <section aria-labelledby="t-combos-inicio">
      <h2 id="t-combos-inicio" className="mb-1 flex items-center gap-2 text-xl font-bold">
        <Gift className="size-5 text-marca" aria-hidden />
        {todosRegalo ? "Llevátelo con regalo" : "Combos: completá tu equipo"}
      </h2>
      <p className="mb-4 text-sm text-muted-foreground">
        {todosRegalo ? "Comprá el celular y el accesorio va gratis." : "Celular + accesorio con ahorro, en un solo clic."}
      </p>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {combos.map(({ producto: p, combo: c }) => {
          const valorItems = c.items.reduce((s, i) => s + i.precio * i.cantidad, 0);
          const ahorro = Math.min(c.ahorro, valorItems);
          const regalo = esRegalo(c);
          const accesorios = c.items.map((i) => `${i.cantidad > 1 ? `${i.cantidad} × ` : ""}${i.nombre}`).join(" + ");
          return (
            <EnlaceCombo
              key={c.id}
              href={`/producto/${p.slug}#t-combos`}
              productoId={p.id}
              combo={c.id}
              nombre={c.nombre}
              className="group flex gap-3 rounded-2xl border-2 border-dashed border-marca/50 bg-marca/5 p-3 transition-shadow hover:shadow-md"
            >
              <div className="flex shrink-0 items-center gap-1">
                <span className="relative size-20 overflow-hidden rounded-lg bg-white">
                  {p.imagen ? (
                    <Image src={p.imagen.url} alt={p.imagen.alt} fill sizes="80px" className="object-contain p-1" />
                  ) : null}
                </span>
                <Plus className="size-4 text-muted-foreground" aria-hidden />
                <span className="relative size-14 overflow-hidden rounded-lg bg-white">
                  {c.items[0]?.imagen ? (
                    <Image src={c.items[0].imagen.url} alt={c.items[0].imagen.alt} fill sizes="56px" className="object-contain p-0.5" />
                  ) : null}
                </span>
              </div>
              <div className="min-w-0 flex-1">
                <p className="leading-tight font-semibold">{p.nombre}</p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  + {accesorios} <span className="line-through">{usd2(valorItems)}</span>
                </p>
                <p className="mt-1">
                  <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-semibold text-green-800 dark:bg-green-950 dark:text-green-200">
                    {regalo ? "¡De regalo!" : `Ahorrás ${usd2(ahorro)}`}
                  </span>
                </p>
                <p className="mt-1 text-sm">
                  Desde <strong>{usd2(p.precioDesde)}</strong>
                  {descuentoSinTarjeta > 0 ? (
                    <span className="text-xs text-muted-foreground">
                      {" "}
                      · {usd2(precioConDescuento(p.precioDesde, descuentoSinTarjeta))} en efectivo
                    </span>
                  ) : null}
                </p>
                <p className="mt-1 text-sm font-semibold text-primary group-hover:underline">Ver combo →</p>
              </div>
            </EnlaceCombo>
          );
        })}
      </div>
    </section>
  );
}

function esRegalo(c: ComboInicio["combo"]) {
  const valor = c.items.reduce((s, i) => s + i.precio * i.cantidad, 0);
  return valor > 0 && c.ahorro >= valor - 0.004;
}
