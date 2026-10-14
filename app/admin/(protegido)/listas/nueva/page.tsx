import { Suspense } from "react";
import { createClient } from "@/lib/supabase/server";
import { Importador } from "./importador";

async function Contenido() {
  const supabase = await createClient();
  const { data: proveedores } = await supabase
    .from("proveedores")
    .select("id, nombre")
    .eq("activo", true)
    .order("nombre");
  // Fecha de hoy en El Salvador (formato AAAA-MM-DD)
  const hoy = new Intl.DateTimeFormat("en-CA", { timeZone: "America/El_Salvador" }).format(new Date());
  return <Importador proveedores={proveedores ?? []} hoy={hoy} />;
}

export default function NuevaLista() {
  return (
    <div className="max-w-5xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Importar lista de precios</h1>
        <p className="text-muted-foreground">
          Cada importación queda guardada con su fecha. Lo que ya estaba vinculado se actualiza solo.
        </p>
      </div>
      <Suspense fallback={<p className="text-sm text-muted-foreground">Cargando…</p>}>
        <Contenido />
      </Suspense>
    </div>
  );
}
