"use client";

import { useMemo, useState } from "react";
import {
  BotonGuardar,
  FormularioAccion,
  type EstadoAccion,
} from "@/components/admin/formulario-accion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

// Tabla de variantes de un producto: se cambia directo en la fila (color, unidades en bodega, disponibilidad y si se
// muestra). Con las casillas se marcan varias para mostrarlas u ocultarlas juntas. Cuando hay cambios aparece
// "Guardar cambios"; nada se guarda hasta tocarlo.

export type FilaVariante = {
  id: string;
  memoria: string;
  color: string | null;
  stock: number;
  precio: number;
  activo: boolean;
  disponibilidad_manual: "auto" | "bajo_pedido" | "agotado";
};

const DISPONIBILIDAD = {
  auto: "Según el proveedor",
  bajo_pedido: "Bajo pedido (48 h)",
  agotado: "Agotado",
} as const;

const SELECT = "h-8 w-full rounded-md border bg-background px-1.5 text-sm";
const usd = (n: number) =>
  n > 0
    ? n.toLocaleString("en-US", { style: "currency", currency: "USD" })
    : "Sin precio";

export function VariantesEditor({
  productoId,
  variantes,
  accion,
}: {
  productoId: string;
  variantes: FilaVariante[];
  accion: (prev: EstadoAccion, form: FormData) => Promise<EstadoAccion>;
}) {
  const [filas, setFilas] = useState(variantes);
  const [marcadas, setMarcadas] = useState<Set<string>>(new Set());
  const original = useMemo(
    () => new Map(variantes.map((v) => [v.id, v])),
    [variantes],
  );

  const cambiadas = filas.filter((f) => {
    const o = original.get(f.id)!;
    return (
      (f.color ?? "") !== (o.color ?? "") ||
      f.stock !== o.stock ||
      f.activo !== o.activo ||
      f.disponibilidad_manual !== o.disponibilidad_manual
    );
  });
  const cambioStock = cambiadas.some(
    (f) => f.stock !== original.get(f.id)!.stock,
  );
  const cambiar = (id: string, c: Partial<FilaVariante>) =>
    setFilas((x) => x.map((f) => (f.id === id ? { ...f, ...c } : f)));
  const aMarcadas = (c: Partial<FilaVariante>) =>
    setFilas((x) => x.map((f) => (marcadas.has(f.id) ? { ...f, ...c } : f)));
  const todas = marcadas.size === filas.length && filas.length > 0;

  return (
    <FormularioAccion accion={accion} className="space-y-3">
      <input type="hidden" name="id" value={productoId} />
      <input
        type="hidden"
        name="cambios"
        value={JSON.stringify(
          cambiadas.map((f) => ({
            varianteId: f.id,
            color: f.color,
            stock: f.stock,
            activo: f.activo,
            disponibilidad_manual: f.disponibilidad_manual,
          })),
        )}
      />

      {/* Acciones para las marcadas */}
      <div className="flex flex-wrap items-center gap-2 text-sm">
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            className="size-4 accent-[var(--marca)]"
            checked={todas}
            onChange={() =>
              setMarcadas(todas ? new Set() : new Set(filas.map((f) => f.id)))
            }
          />
          Marcar todas
        </label>
        {marcadas.size ? (
          <>
            <span className="text-muted-foreground">
              · {marcadas.size} marcadas:
            </span>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => aMarcadas({ activo: true })}
            >
              Mostrar
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => aMarcadas({ activo: false })}
            >
              No mostrar
            </Button>
            <select
              aria-label="Disponibilidad de las marcadas"
              className="h-8 rounded-md border bg-background px-1.5 text-sm"
              value=""
              onChange={(e) =>
                e.target.value &&
                aMarcadas({
                  disponibilidad_manual: e.target
                    .value as FilaVariante["disponibilidad_manual"],
                })
              }
            >
              <option value="">Si no hay en bodega…</option>
              {Object.entries(DISPONIBILIDAD).map(([k, t]) => (
                <option key={k} value={k}>
                  {t}
                </option>
              ))}
            </select>
          </>
        ) : null}
      </div>

      {/* Filas */}
      <div className="divide-y rounded-md border">
        <div className="hidden grid-cols-[1.5rem_1.6fr_1.2fr_5rem_1.4fr_4.5rem] gap-2 bg-muted px-2 py-1.5 text-xs text-muted-foreground sm:grid">
          <span />
          <span>Variante</span>
          <span>Color</span>
          <span>En bodega</span>
          <span>Si no hay en bodega</span>
          <span>Mostrar</span>
        </div>
        {filas.map((f) => {
          const o = original.get(f.id)!;
          const sucia = cambiadas.includes(f);
          return (
            <div
              key={f.id}
              className={`grid grid-cols-[1.5rem_1fr_1fr] items-center gap-2 px-2 py-2 sm:grid-cols-[1.5rem_1.6fr_1.2fr_5rem_1.4fr_4.5rem] ${
                sucia ? "bg-amber-50 dark:bg-amber-950/30" : ""
              } ${f.activo ? "" : "text-muted-foreground"}`}
            >
              <input
                type="checkbox"
                aria-label={`Marcar ${f.memoria} ${f.color ?? ""}`}
                className="size-4 accent-[var(--marca)]"
                checked={marcadas.has(f.id)}
                onChange={() =>
                  setMarcadas((m) => {
                    const n = new Set(m);
                    if (n.has(f.id)) n.delete(f.id);
                    else n.add(f.id);
                    return n;
                  })
                }
              />
              <div className="min-w-0 text-sm">
                <p className="font-medium">{f.memoria}</p>
                <p className="text-xs text-muted-foreground">
                  {usd(Number(f.precio))}
                </p>
              </div>
              <Input
                aria-label="Color"
                className="h-8"
                value={f.color ?? ""}
                placeholder="Sin color"
                onChange={(e) => cambiar(f.id, { color: e.target.value })}
              />
              <div className="col-start-2 sm:col-start-auto">
                <Input
                  aria-label="Unidades en bodega"
                  type="number"
                  min="0"
                  className="h-8"
                  value={f.stock}
                  onChange={(e) =>
                    cambiar(f.id, {
                      stock: Math.max(
                        0,
                        Math.round(Number(e.target.value) || 0),
                      ),
                    })
                  }
                />
              </div>
              <select
                aria-label="Si no hay en bodega"
                className={SELECT}
                value={f.disponibilidad_manual}
                onChange={(e) =>
                  cambiar(f.id, {
                    disponibilidad_manual: e.target
                      .value as FilaVariante["disponibilidad_manual"],
                  })
                }
              >
                {Object.entries(DISPONIBILIDAD).map(([k, t]) => (
                  <option key={k} value={k}>
                    {t}
                  </option>
                ))}
              </select>
              <label className="col-start-2 flex items-center gap-2 text-sm sm:col-start-auto">
                <input
                  type="checkbox"
                  className="size-4 accent-[var(--marca)]"
                  checked={f.activo}
                  onChange={(e) => cambiar(f.id, { activo: e.target.checked })}
                />
                <span className="sm:sr-only">Mostrar</span>
              </label>
              {sucia && f.stock !== o.stock ? (
                <p className="col-span-full text-xs text-amber-800 dark:text-amber-300">
                  Unidades en bodega: {o.stock} → {f.stock}
                </p>
              ) : null}
            </div>
          );
        })}
      </div>

      {/* Guardar: aparece solo si cambiaste algo */}
      {cambiadas.length ? (
        <div className="sticky bottom-2 z-10 space-y-2 rounded-md border bg-background p-3 shadow-md">
          {cambioStock ? (
            <div className="space-y-1">
              <label
                htmlFor={`nota-${productoId}`}
                className="text-xs font-medium"
              >
                Cambiaste unidades en bodega: ¿por qué? (conteo, dañado,
                regalo…)
              </label>
              <Input
                id={`nota-${productoId}`}
                name="nota"
                placeholder="Conteo de bodega"
              />
              <p className="text-xs text-muted-foreground">
                Las compras y las ventas mueven el stock solas; aquí solo se
                corrige después de contar.
              </p>
            </div>
          ) : null}
          <div className="flex flex-wrap items-center gap-2">
            <BotonGuardar>Guardar cambios ({cambiadas.length})</BotonGuardar>
            <Button
              type="button"
              variant="ghost"
              onClick={() => setFilas(variantes)}
            >
              Descartar
            </Button>
          </div>
        </div>
      ) : null}
    </FormularioAccion>
  );
}
