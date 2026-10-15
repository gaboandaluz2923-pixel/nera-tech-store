"use client";

import { useState } from "react";
import { Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { BotonGuardar, FormularioAccion, type EstadoAccion } from "./formulario-accion";

// Forma de trabajar de todo el panel: la información se ve como texto; "Editar" abre el formulario,
// "Guardar" guarda y vuelve a la vista, "Cancelar" vuelve sin cambiar nada.

type Accion = (prev: EstadoAccion, form: FormData) => Promise<EstadoAccion>;

export function BotonEditar({ onClick, children = "Editar" }: { onClick: () => void; children?: React.ReactNode }) {
  // "+ Nuevo cupón" y similares: sin lápiz
  const crear = typeof children === "string" && children.startsWith("+");
  return (
    <Button type="button" variant="outline" size="sm" onClick={onClick}>
      {crear ? null : <Pencil className="size-3.5" aria-hidden />}
      {children}
    </Button>
  );
}

function Botones({ cancelar, guardar }: { cancelar: () => void; guardar?: string }) {
  return (
    <div className="flex flex-wrap gap-2 pt-1">
      <BotonGuardar>{guardar ?? "Guardar"}</BotonGuardar>
      <Button type="button" variant="ghost" onClick={cancelar}>
        Cancelar
      </Button>
    </div>
  );
}

/** Tarjeta con título: muestra `vista` y, al tocar Editar, el formulario (`children`). */
export function Editable({
  titulo,
  descripcion,
  accion,
  vista,
  children,
  puedeEditar = true,
  textoEditar,
  textoGuardar,
  extra,
}: {
  titulo: React.ReactNode;
  descripcion?: React.ReactNode;
  accion: Accion;
  vista: React.ReactNode;
  /** Campos del formulario (incluidos los <input type="hidden">) */
  children: React.ReactNode;
  puedeEditar?: boolean;
  textoEditar?: string;
  textoGuardar?: string;
  /** Algo más a la derecha del título (por ejemplo otro botón) */
  extra?: React.ReactNode;
}) {
  const [editando, setEditando] = useState(false);
  return (
    <Card>
      <CardHeader className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1 space-y-1">
          <CardTitle>{titulo}</CardTitle>
          {descripcion ? <CardDescription>{descripcion}</CardDescription> : null}
        </div>
        {!editando ? (
          <div className="flex shrink-0 flex-wrap justify-end gap-2">
            {extra}
            {puedeEditar ? <BotonEditar onClick={() => setEditando(true)}>{textoEditar}</BotonEditar> : null}
          </div>
        ) : null}
      </CardHeader>
      <CardContent>
        {editando ? (
          <FormularioAccion accion={accion} className="space-y-4" alGuardar={() => setEditando(false)}>
            {children}
            <Botones cancelar={() => setEditando(false)} guardar={textoGuardar} />
          </FormularioAccion>
        ) : (
          vista
        )}
      </CardContent>
    </Card>
  );
}

/** Lo mismo sin tarjeta, para filas de una lista (por ejemplo cada variante o cada proveedor). */
export function FilaEditable({
  accion,
  vista,
  children,
  puedeEditar = true,
  className = "rounded-md border p-3",
  textoEditar,
  textoGuardar,
}: {
  accion: Accion;
  vista?: React.ReactNode;
  children: React.ReactNode;
  puedeEditar?: boolean;
  className?: string;
  textoEditar?: string;
  textoGuardar?: string;
}) {
  const [editando, setEditando] = useState(false);
  if (editando) {
    return (
      <FormularioAccion accion={accion} className={`space-y-3 ${className}`} alGuardar={() => setEditando(false)}>
        {children}
        <Botones cancelar={() => setEditando(false)} guardar={textoGuardar} />
      </FormularioAccion>
    );
  }
  return (
    <div className={`flex flex-wrap items-start justify-between gap-3 ${className}`}>
      {vista ? <div className="min-w-0 flex-1">{vista}</div> : null}
      {puedeEditar ? <BotonEditar onClick={() => setEditando(true)}>{textoEditar}</BotonEditar> : null}
    </div>
  );
}
