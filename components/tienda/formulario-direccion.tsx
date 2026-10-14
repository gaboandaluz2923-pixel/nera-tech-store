"use client";

import { useState } from "react";
import { guardarDireccion } from "@/app/(tienda)/mi-cuenta/actions";
import { BotonGuardar, FormularioAccion } from "@/components/admin/formulario-accion";
import type { Direccion } from "@/lib/tienda/cuentas";

const entrada = "h-11 w-full rounded-lg border bg-background px-3 text-base";

export function FormularioDireccion({
  d,
  zonas,
  departamentos,
  otraZona,
}: {
  d?: Direccion;
  zonas: string[];
  departamentos: readonly string[];
  otraZona: string;
}) {
  const [zona, setZona] = useState(d?.zona && (zonas.includes(d.zona) || d.zona === otraZona) ? d.zona : (zonas[0] ?? otraZona));
  const id = d?.id ?? "nueva";
  return (
    <FormularioAccion accion={guardarDireccion} className="space-y-3">
      {d ? <input type="hidden" name="id" value={d.id} /> : null}
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="space-y-1 text-sm font-medium">
          <span>Nombre</span>
          <input name="nombre" defaultValue={d?.nombre ?? "Casa"} placeholder="Casa, Trabajo…" className={entrada} />
        </label>
        <label className="space-y-1 text-sm font-medium">
          <span>Municipio</span>
          <select name="zona" value={zona} onChange={(e) => setZona(e.target.value)} className={entrada}>
            {zonas.map((z) => (
              <option key={z} value={z}>
                {z}
              </option>
            ))}
            <option value={otraZona}>{otraZona} del país</option>
          </select>
        </label>
        {zona === otraZona ? (
          <>
            <label className="space-y-1 text-sm font-medium">
              <span>Departamento</span>
              <select name="departamento" defaultValue={d?.departamento ?? ""} className={entrada}>
                <option value="" disabled>
                  Elegí uno
                </option>
                {departamentos.map((x) => (
                  <option key={x} value={x}>
                    {x}
                  </option>
                ))}
              </select>
            </label>
            <label className="space-y-1 text-sm font-medium">
              <span>Municipio o distrito</span>
              <input name="municipio" defaultValue={d?.zona === otraZona ? (d?.municipio ?? "") : ""} className={entrada} />
            </label>
          </>
        ) : null}
      </div>
      <label className="block space-y-1 text-sm font-medium">
        <span>Dirección</span>
        <input name="direccion" defaultValue={d?.direccion ?? ""} placeholder="Colonia, calle o pasaje y número de casa" className={entrada} />
      </label>
      <label className="block space-y-1 text-sm font-medium">
        <span>Punto de referencia (opcional)</span>
        <input name="referencia" defaultValue={d?.referencia ?? ""} placeholder="Ej. frente al parque, portón negro" className={entrada} />
      </label>
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" name="principal" defaultChecked={d?.principal} className="size-4 accent-[var(--marca)]" id={`principal-${id}`} />
        Usar esta dirección por defecto
      </label>
      <BotonGuardar>{d ? "Guardar cambios" : "Agregar dirección"}</BotonGuardar>
    </FormularioAccion>
  );
}
