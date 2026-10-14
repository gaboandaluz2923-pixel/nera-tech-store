import Link from "next/link";
import { Suspense } from "react";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/server";
import { lineasPendientes } from "@/lib/admin/catalogo";

async function Contenido() {
  const supabase = await createClient();
  const [listas, pendientes] = await Promise.all([
    supabase
      .from("listas_precios")
      .select("id, fecha, nombre_archivo, created_at, proveedores(nombre), lineas_lista(count)")
      .order("fecha", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(50),
    lineasPendientes(supabase),
  ]);
  if (listas.error) throw listas.error;

  type Fila = {
    id: string;
    fecha: string;
    nombre_archivo: string | null;
    proveedores: { nombre: string } | null;
    lineas_lista: { count: number }[];
  };
  const filas = (listas.data ?? []) as unknown as Fila[];
  // Vigentes: todas las listas de la fecha más reciente de cada proveedor (puede haber varias partes)
  const fechaVigente = new Map<string, string>();

  return (
    <div className="space-y-6">
      {pendientes.length > 0 ? (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-amber-300 bg-amber-50 p-4 text-amber-950 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-100">
          <p className="text-sm">
            <strong>{pendientes.length} líneas nuevas</strong> de tus proveedores todavía no están en tu
            catálogo.
          </p>
          <Button nativeButton={false} render={<Link href="/admin/listas/emparejar" />}>Emparejar</Button>
        </div>
      ) : null}

      {filas.length === 0 ? (
        <p className="text-muted-foreground">Todavía no importaste ninguna lista.</p>
      ) : (
        <div className="overflow-x-auto rounded-lg border">
          <table className="w-full text-sm">
            <thead className="bg-muted text-left">
              <tr>
                <th className="p-2">Fecha</th>
                <th className="p-2">Proveedor</th>
                <th className="p-2">Archivo</th>
                <th className="p-2 text-right">Líneas</th>
                <th className="p-2"></th>
              </tr>
            </thead>
            <tbody>
              {filas.map((l) => {
                const proveedor = l.proveedores?.nombre ?? "—";
                if (!fechaVigente.has(proveedor)) fechaVigente.set(proveedor, l.fecha);
                const vigente = fechaVigente.get(proveedor) === l.fecha;
                return (
                  <tr key={l.id} className="border-t">
                    <td className="p-2 tabular-nums">{l.fecha}</td>
                    <td className="p-2">{proveedor}</td>
                    <td className="p-2 text-muted-foreground">{l.nombre_archivo ?? "—"}</td>
                    <td className="p-2 text-right tabular-nums">{l.lineas_lista?.[0]?.count ?? 0}</td>
                    <td className="p-2 text-xs">
                      {vigente ? (
                        <span className="rounded bg-green-100 px-1.5 py-0.5 text-green-900 dark:bg-green-900/40 dark:text-green-100">
                          Vigente
                        </span>
                      ) : (
                        <span className="text-muted-foreground">Histórica</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export default function Listas() {
  return (
    <div className="max-w-5xl space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Listas de precios</h1>
          <p className="text-muted-foreground">
            La lista más reciente de cada proveedor es la vigente (si la manda en varias partes el mismo día, todas cuentan); las anteriores quedan como historial.
          </p>
        </div>
        <Button nativeButton={false} render={<Link href="/admin/listas/nueva" />}>Importar lista</Button>
      </div>
      <Suspense fallback={<p className="text-sm text-muted-foreground">Cargando…</p>}>
        <Contenido />
      </Suspense>
    </div>
  );
}
