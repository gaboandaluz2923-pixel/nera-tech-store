import Link from "next/link";
import { Suspense } from "react";
import { NuevoProducto } from "@/components/admin/nuevo-producto";
import { equipo } from "@/lib/admin/sesion";
import { crearProducto } from "../actions";

// "+ Nuevo producto": para lo que no viene en una lista de proveedor (compra suelta, Miami, regalo…).

async function Formulario() {
  const { supabase, esSuperAdmin } = await equipo();
  const [{ data: categorias }, proveedores] = await Promise.all([
    supabase.from("categorias").select("id, nombre").order("orden"),
    esSuperAdmin
      ? supabase.from("proveedores").select("id, nombre").eq("activo", true).order("nombre").then((r) => r.data ?? [])
      : Promise.resolve(null),
  ]);
  return <NuevoProducto accion={crearProducto} categorias={categorias ?? []} proveedores={proveedores} />;
}

export default function NuevoProductoPagina() {
  return (
    <div className="max-w-3xl space-y-4">
      <div>
        <Link href="/admin/catalogo" className="text-sm text-muted-foreground hover:underline">
          ← Catálogo
        </Link>
        <h1 className="text-xl font-semibold">Nuevo producto</h1>
        <p className="text-sm text-muted-foreground">
          Si el producto viene en la lista de un proveedor, es mejor importarla en{" "}
          <Link href="/admin/listas/nueva" className="text-primary underline">
            Listas
          </Link>
          : así queda vinculado y su costo se actualiza solo.
        </p>
      </div>
      <Suspense fallback={<p className="text-sm text-muted-foreground">Cargando…</p>}>
        <Formulario />
      </Suspense>
    </div>
  );
}
