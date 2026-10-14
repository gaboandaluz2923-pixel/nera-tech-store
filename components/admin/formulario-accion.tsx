"use client";

import { createContext, startTransition, useActionState, useContext } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

// Formulario del panel: guarda con una Server Action, muestra "Guardado" o el error en un aviso
// y desactiva el botón mientras guarda. A propósito NO borra lo escrito si hubo un error.

export type EstadoAccion = { ok: boolean; mensaje: string; vez?: number } | null;
type Accion = (prev: EstadoAccion, form: FormData) => Promise<EstadoAccion>;

const Pendiente = createContext(false);

export function FormularioAccion({
  accion,
  children,
  className,
}: {
  accion: Accion;
  children: React.ReactNode;
  className?: string;
}) {
  const [, despachar, pendiente] = useActionState(async (prev: EstadoAccion, form: FormData) => {
    const r = await accion(prev, form);
    if (r) {
      if (r.ok) toast.success(r.mensaje);
      else toast.error(r.mensaje);
    }
    return r;
  }, null);

  return (
    <form
      className={className}
      onSubmit={(e) => {
        // Con onSubmit (en vez de action=) React no vacía el formulario al terminar
        e.preventDefault();
        const datos = new FormData(e.currentTarget, (e.nativeEvent as SubmitEvent).submitter);
        startTransition(() => despachar(datos));
      }}
    >
      <Pendiente.Provider value={pendiente}>{children}</Pendiente.Provider>
    </form>
  );
}

export function BotonGuardar({
  children = "Guardar",
  variant,
  size,
  className,
  name,
  value,
  etiqueta,
}: {
  children?: React.ReactNode;
  variant?: "default" | "outline" | "secondary" | "ghost" | "destructive";
  size?: "default" | "sm" | "lg" | "icon" | "icon-sm";
  className?: string;
  name?: string;
  value?: string;
  /** Texto para lectores de pantalla en botones que solo tienen ícono */
  etiqueta?: string;
}) {
  const pendiente = useContext(Pendiente);
  return (
    <Button
      type="submit"
      variant={variant}
      size={size}
      className={className}
      disabled={pendiente}
      name={name}
      value={value}
      aria-label={etiqueta}
      title={etiqueta}
    >
      {pendiente && !size?.startsWith("icon") ? "Guardando…" : children}
    </Button>
  );
}
