import { Suspense } from "react";
import { FilaEditable } from "@/components/admin/editable";
import { AgregarPersona, NuevaContrasena } from "@/components/admin/equipo-formularios";
import { BotonGuardar } from "@/components/admin/formulario-accion";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { superAdmin } from "@/lib/admin/sesion";
import { fechaCorta } from "@/lib/tienda/formato";
import { agregarPersona, guardarPersona, nuevaContrasena } from "./actions";

// Equipo: quién entra al panel y qué puede hacer. Solo la ven los administradores.

const ROL = {
  super_admin: { texto: "Administrador", ayuda: "Ve y cambia todo: precios, costos, proveedores, promociones, configuración y equipo." },
  operador: { texto: "Operador", ayuda: "Catálogo (sin precios), pedidos, pedidos manuales, clientes y el resumen de ventas. No ve costos ni ganancia." },
} as const;

async function Lista() {
  const { supabase, usuario } = await superAdmin();
  const { data, error } = await supabase.from("equipo").select("correo, nombre, rol, created_at").order("created_at");
  if (error) throw error;
  const personas = (data ?? []) as { correo: string; nombre: string | null; rol: keyof typeof ROL; created_at: string }[];
  return (
    <ul className="space-y-2">
      {personas.map((p) => (
        <li key={p.correo}>
          <FilaEditable
            accion={guardarPersona}
            vista={
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
                <span className="min-w-40 flex-1">
                  <span className="block font-medium">
                    {p.nombre || "Sin nombre"}
                    {p.correo === usuario.toLowerCase() ? <span className="font-normal text-muted-foreground"> (vos)</span> : null}
                  </span>
                  <span className="block text-xs text-muted-foreground">{p.correo}</span>
                </span>
                <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${p.rol === "super_admin" ? "bg-marca/15 text-marca-oscuro" : "bg-muted"}`}>
                  {ROL[p.rol]?.texto ?? p.rol}
                </span>
                <span className="text-xs text-muted-foreground">Desde {fechaCorta(p.created_at)}</span>
                {p.correo !== usuario.toLowerCase() ? <NuevaContrasena accion={nuevaContrasena} correo={p.correo} /> : null}
              </div>
            }
          >
            <input type="hidden" name="correo" value={p.correo} />
            <p className="text-sm text-muted-foreground">{p.correo}</p>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1">
                <Label htmlFor={`n-${p.correo}`}>Nombre</Label>
                <Input id={`n-${p.correo}`} name="nombre" defaultValue={p.nombre ?? ""} />
              </div>
              <div className="space-y-1">
                <Label htmlFor={`r-${p.correo}`}>Rol</Label>
                <select id={`r-${p.correo}`} name="rol" defaultValue={p.rol} className="h-9 w-full rounded-md border px-2 text-sm">
                  <option value="operador">Operador</option>
                  <option value="super_admin">Administrador</option>
                </select>
              </div>
            </div>
            {p.correo !== usuario.toLowerCase() ? (
              <div className="rounded-md border border-dashed p-2">
                <BotonGuardar variant="outline" size="sm" name="accion" value="quitar" className="text-destructive">
                  Quitar acceso al panel
                </BotonGuardar>
                <p className="mt-1 text-xs text-muted-foreground">No borra nada: lo que hizo queda en el historial con su nombre.</p>
              </div>
            ) : null}
          </FilaEditable>
        </li>
      ))}
    </ul>
  );
}

export default function Equipo() {
  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <h1 className="text-xl font-semibold">Equipo</h1>
        <p className="text-sm text-muted-foreground">Quién entra al panel y qué puede hacer. Lo que cada persona cambia queda con su nombre en el historial.</p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Personas</CardTitle>
          <CardDescription>
            <strong>Administrador:</strong> {ROL.super_admin.ayuda}
            <br />
            <strong>Operador:</strong> {ROL.operador.ayuda}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Suspense fallback={<p className="text-sm text-muted-foreground">Cargando…</p>}>
            <Lista />
          </Suspense>
          <AgregarPersona accion={agregarPersona} />
        </CardContent>
      </Card>
    </div>
  );
}
