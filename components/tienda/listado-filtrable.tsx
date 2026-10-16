"use client";

import { useMemo, useState } from "react";
import type { ProductoResumen } from "@/lib/tienda/datos";
import { formatoAlmacenamiento } from "@/lib/listas/normalizar";
import { TarjetaProducto } from "./tarjeta-producto";

// Filtros de una categoría. Todo pasa en el teléfono del cliente (el catálogo es chico),
// así que filtrar es instantáneo y no gasta datos.

type Orden = "recomendado" | "menor" | "mayor";

const PRESUPUESTOS = [
  { id: "hasta-150", texto: "Hasta $150", min: 0, max: 150 },
  { id: "150-250", texto: "$150 a $250", min: 150, max: 250 },
  { id: "250-400", texto: "$250 a $400", min: 250, max: 400 },
  { id: "mas-400", texto: "Más de $400", min: 400, max: Number.POSITIVE_INFINITY },
];

function Chip({ activo, onClick, children }: { activo: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={activo}
      className={`shrink-0 rounded-full border px-3 py-1.5 text-sm font-medium transition-colors ${
        activo ? "border-marca bg-marca text-white" : "bg-background hover:bg-muted"
      }`}
    >
      {children}
    </button>
  );
}

export function ListadoFiltrable({
  productos,
  mesesTasaCero,
  conMemoria,
}: {
  productos: ProductoResumen[];
  mesesTasaCero: number;
  conMemoria: boolean;
}) {
  const [marca, setMarca] = useState<string | null>(null);
  const [presupuesto, setPresupuesto] = useState<string | null>(null);
  const [almacenamiento, setAlmacenamiento] = useState<number | null>(null);
  const [solo5g, setSolo5g] = useState(false);
  const [ocultarAgotados, setOcultarAgotados] = useState(false);
  const [orden, setOrden] = useState<Orden>("recomendado");

  const marcas = useMemo(
    () => [...new Set(productos.map((p) => p.marca).filter((m): m is string => Boolean(m)))].sort(),
    [productos]
  );
  const almacenamientos = useMemo(
    () => [...new Set(productos.flatMap((p) => p.almacenamientos))].sort((a, b) => a - b),
    [productos]
  );
  const presupuestos = PRESUPUESTOS.filter((r) => productos.some((p) => p.precioDesde >= r.min && p.precioDesde < r.max));
  const hay5g = productos.some((p) => p.es5g) && productos.some((p) => !p.es5g);
  const hayAgotados = productos.some((p) => p.disponibilidad === "agotado");

  const visibles = useMemo(() => {
    const rango = PRESUPUESTOS.find((r) => r.id === presupuesto);
    const lista = productos.filter(
      (p) =>
        (!marca || p.marca === marca) &&
        (!rango || (p.precioDesde >= rango.min && p.precioDesde < rango.max)) &&
        (almacenamiento === null || p.almacenamientos.includes(almacenamiento)) &&
        (!solo5g || p.es5g) &&
        (!ocultarAgotados || p.disponibilidad !== "agotado")
    );
    if (orden === "menor") return [...lista].sort((a, b) => a.precioDesde - b.precioDesde);
    if (orden === "mayor") return [...lista].sort((a, b) => b.precioDesde - a.precioDesde);
    // Recomendado: disponibles primero, luego el orden que se fijó en el panel
    const peso = { bodega: 0, proveedor: 0, agotado: 1 } as const;
    return [...lista].sort((a, b) => peso[a.disponibilidad] - peso[b.disponibilidad]);
  }, [productos, marca, presupuesto, almacenamiento, solo5g, ocultarAgotados, orden]);

  const [masAbierto, setMasAbierto] = useState(false);
  const hayMas = (conMemoria && almacenamientos.length > 1) || hay5g || hayAgotados;
  const secundarios = (almacenamiento !== null ? 1 : 0) + (solo5g ? 1 : 0) + (ocultarAgotados ? 1 : 0);

  const hayFiltros = marca || presupuesto || almacenamiento !== null || solo5g || ocultarAgotados;
  const limpiar = () => {
    setMarca(null);
    setPresupuesto(null);
    setAlmacenamiento(null);
    setSolo5g(false);
    setOcultarAgotados(false);
  };

  return (
    <div>
      <div className="space-y-2" role="group" aria-label="Filtros">
        {/* Una sola fila: marca y precio. En el teléfono se desliza de lado; en la computadora se acomoda */}
        <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:flex-wrap sm:overflow-visible sm:px-0">
          {marcas.length > 1 ? (
            <>
              <Chip activo={!marca} onClick={() => setMarca(null)}>
                Todas
              </Chip>
              {marcas.map((m) => (
                <Chip key={m} activo={marca === m} onClick={() => setMarca(marca === m ? null : m)}>
                  {m}
                </Chip>
              ))}
            </>
          ) : null}
          {marcas.length > 1 && presupuestos.length > 1 ? <span className="my-1 w-px shrink-0 bg-border" aria-hidden /> : null}
          {presupuestos.length > 1
            ? presupuestos.map((r) => (
                <Chip key={r.id} activo={presupuesto === r.id} onClick={() => setPresupuesto(presupuesto === r.id ? null : r.id)}>
                  {r.texto}
                </Chip>
              ))
            : null}
          {hayMas ? (
            <span className="sm:hidden">
              <Chip activo={masAbierto || secundarios > 0} onClick={() => setMasAbierto(!masAbierto)}>
                {masAbierto ? "Menos filtros" : `Más filtros${secundarios ? ` (${secundarios})` : ""}`}
              </Chip>
            </span>
          ) : null}
        </div>
        {/* Memoria, 5G y disponibles: en el teléfono detrás de "Más filtros" */}
        {hayMas ? (
          <div
            className={`-mx-4 gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:flex sm:flex-wrap sm:overflow-visible sm:px-0 ${
              masAbierto ? "flex" : "hidden"
            }`}
          >
            {conMemoria && almacenamientos.length > 1
              ? almacenamientos.map((a) => (
                  <Chip
                    key={a}
                    activo={almacenamiento === a}
                    onClick={() => setAlmacenamiento(almacenamiento === a ? null : a)}
                  >
                    {formatoAlmacenamiento(a)}
                  </Chip>
                ))
              : null}
            {hay5g ? (
              <Chip activo={solo5g} onClick={() => setSolo5g(!solo5g)}>
                Solo 5G
              </Chip>
            ) : null}
            {hayAgotados ? (
              <Chip activo={ocultarAgotados} onClick={() => setOcultarAgotados(!ocultarAgotados)}>
                Solo disponibles
              </Chip>
            ) : null}
          </div>
        ) : null}
      </div>

      <div className="mt-3 mb-4 flex items-center justify-between gap-3 text-sm">
        <p className="text-muted-foreground" aria-live="polite">
          {visibles.length} {visibles.length === 1 ? "producto" : "productos"}
          {hayFiltros ? (
            <>
              {" · "}
              <button type="button" className="font-medium text-primary underline" onClick={limpiar}>
                Quitar filtros
              </button>
            </>
          ) : null}
        </p>
        <label className="flex items-center gap-2">
          <span className="sr-only sm:not-sr-only sm:text-muted-foreground">Ordenar</span>
          <select
            value={orden}
            onChange={(e) => setOrden(e.target.value as Orden)}
            className="h-9 rounded-lg border bg-background px-2 text-sm"
          >
            <option value="recomendado">Recomendados</option>
            <option value="menor">Menor precio</option>
            <option value="mayor">Mayor precio</option>
          </select>
        </label>
      </div>

      {visibles.length ? (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {visibles.map((p, i) => (
            <TarjetaProducto key={p.id} p={p} mesesTasaCero={mesesTasaCero} comparar={conMemoria} prioridad={i < 2} />
          ))}
        </div>
      ) : (
        <div className="rounded-xl border border-dashed p-8 text-center">
          <p className="font-medium">No hay productos con esos filtros.</p>
          <button type="button" className="mt-2 text-sm font-medium text-primary underline" onClick={limpiar}>
            Ver todos
          </button>
        </div>
      )}
    </div>
  );
}
