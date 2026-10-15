"use client";

import { startTransition, useActionState, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { ResultadoEquipo } from "@/app/admin/(protegido)/equipo/actions";

// Formularios de Equipo que devuelven una contraseña temporal: se muestra una sola vez, en pantalla,
// para pasársela a la persona en persona o por WhatsApp. No se guarda en ningún lado.

type Accion = (prev: ResultadoEquipo, form: FormData) => Promise<ResultadoEquipo>;

function Contrasena({ r, cerrar }: { r: NonNullable<ResultadoEquipo>; cerrar: () => void }) {
  return (
    <div className="space-y-2 rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-950">
      <p className="font-medium">{r.mensaje}</p>
      <p>
        Correo: <strong>{r.correo}</strong>
        <br />
        Contraseña temporal: <code className="rounded bg-white px-1.5 py-0.5 font-mono text-base">{r.contrasena}</code>
      </p>
      <p className="text-xs">
        Copiala ahora: no se vuelve a mostrar. Que entre en www.neratechsv.com/admin/login y la cambie en “Mi contraseña”.
      </p>
      <Button type="button" size="sm" variant="outline" onClick={cerrar}>
        Ya la copié
      </Button>
    </div>
  );
}

function useAccion(accion: Accion) {
  const [r, despachar, pendiente] = useActionState(async (prev: ResultadoEquipo, form: FormData) => {
    const res = await accion(prev, form);
    if (res && !res.ok) toast.error(res.mensaje);
    else if (res && !res.contrasena) toast.success(res.mensaje);
    return res;
  }, null);
  const [cerrada, setCerrada] = useState(0);
  const visible = r && r.ok && r.contrasena && r.vez !== cerrada ? r : null;
  return { visible, cerrar: () => setCerrada(r?.vez ?? 0), despachar, pendiente };
}

export function AgregarPersona({ accion }: { accion: Accion }) {
  const { visible, cerrar, despachar, pendiente } = useAccion(accion);
  const [abierto, setAbierto] = useState(false);
  if (visible) return <Contrasena r={visible} cerrar={cerrar} />;
  if (!abierto) {
    return (
      <Button type="button" onClick={() => setAbierto(true)}>
        + Agregar persona
      </Button>
    );
  }
  return (
    <form
      className="space-y-3 rounded-lg border p-3"
      onSubmit={(e) => {
        e.preventDefault();
        const datos = new FormData(e.currentTarget);
        startTransition(() => despachar(datos));
      }}
    >
      <div className="grid gap-3 sm:grid-cols-3">
        <div className="space-y-1">
          <Label htmlFor="eq-nombre">Nombre</Label>
          <Input id="eq-nombre" name="nombre" placeholder="Ej. Gabriela" required />
        </div>
        <div className="space-y-1">
          <Label htmlFor="eq-correo">Correo</Label>
          <Input id="eq-correo" name="correo" type="email" placeholder="correo@gmail.com" required />
        </div>
        <div className="space-y-1">
          <Label htmlFor="eq-rol">Rol</Label>
          <select id="eq-rol" name="rol" defaultValue="operador" className="h-9 w-full rounded-md border px-2 text-sm">
            <option value="operador">Operador</option>
            <option value="super_admin">Administrador</option>
          </select>
        </div>
      </div>
      <div className="flex gap-2">
        <Button type="submit" disabled={pendiente}>
          {pendiente ? "Agregando…" : "Agregar"}
        </Button>
        <Button type="button" variant="ghost" onClick={() => setAbierto(false)}>
          Cancelar
        </Button>
      </div>
    </form>
  );
}

export function NuevaContrasena({ accion, correo }: { accion: Accion; correo: string }) {
  const { visible, cerrar, despachar, pendiente } = useAccion(accion);
  if (visible) return <Contrasena r={visible} cerrar={cerrar} />;
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        const datos = new FormData(e.currentTarget);
        startTransition(() => despachar(datos));
      }}
    >
      <input type="hidden" name="correo" value={correo} />
      <Button type="submit" variant="ghost" size="sm" disabled={pendiente}>
        {pendiente ? "Generando…" : "Olvidó su contraseña"}
      </Button>
    </form>
  );
}
