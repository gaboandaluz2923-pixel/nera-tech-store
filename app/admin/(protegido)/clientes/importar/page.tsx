import Link from "next/link";
import { Suspense } from "react";
import { BotonBrevo, ImportarClientes } from "@/components/admin/importar-clientes";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { superAdmin } from "@/lib/admin/sesion";
import { ETIQUETA_HISTORIAL } from "@/lib/clientes/excel-ordenes";
import { importarClientesExcel, sincronizarBrevo } from "./actions";

// Solo administradores: importar clientes anteriores del Excel y mandar la lista a Brevo.

async function Contenido() {
  const { supabase } = await superAdmin();
  const [{ count: total }, { count: conCorreo }, { count: anteriores }] = await Promise.all([
    supabase.from("clientes").select("id", { count: "exact", head: true }),
    supabase.from("clientes").select("id", { count: "exact", head: true }).not("correo", "is", null).eq("acepta_correo", true),
    supabase.from("clientes").select("id", { count: "exact", head: true }).contains("etiquetas", [ETIQUETA_HISTORIAL]),
  ]);
  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>1. Clientes del Excel</CardTitle>
          <CardDescription>
            Elegí el Excel «Pedidos e Inventario»: se lee la pestaña ORDENES. Cada cliente entra una sola vez (se reconoce por teléfono o
            correo) con la etiqueta «{ETIQUETA_HISTORIAL}», y cada compra queda como nota (qué compró, cuánto pagó y cómo). Si lo importás
            otra vez, no se repite nada. Antes de importar se muestra cuántos son.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ImportarClientes importar={importarClientesExcel} />
          {anteriores ? (
            <p className="mt-3 text-sm">
              Ya hay{" "}
              <Link href={`/admin/clientes?etiqueta=${encodeURIComponent(ETIQUETA_HISTORIAL)}`} className="text-primary underline">
                {anteriores} clientes con la etiqueta «{ETIQUETA_HISTORIAL}»
              </Link>
              .
            </p>
          ) : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>2. Lista para campañas en Brevo</CardTitle>
          <CardDescription>
            Manda a la lista «Clientes Nera Tech» de Brevo a los {conCorreo ?? 0} clientes con correo que aceptan publicidad (de {total ?? 0}{" "}
            en el CRM). Quien se da de baja en un correo ya no se incluye. Después, en Brevo → Campañas, elegís esa lista.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <BotonBrevo sincronizar={sincronizarBrevo} />
          <p className="text-sm">
            {/* Es una descarga (archivo), no una página: va con <a download> */}
            <a href="/admin/clientes/exportar" download className="text-primary underline">
              Descargar todos los clientes (CSV)
            </a>{" "}
            <span className="text-muted-foreground">— con teléfonos, para listas de difusión de WhatsApp o para revisar en Excel.</span>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

export default function ImportarClientesPagina() {
  return (
    <div className="max-w-3xl space-y-4">
      <div>
        <Link href="/admin/clientes" className="text-sm text-muted-foreground hover:underline">
          ← Clientes
        </Link>
        <h1 className="text-xl font-semibold">Importar clientes y campañas</h1>
      </div>
      <Suspense fallback={<p className="text-sm text-muted-foreground">Cargando…</p>}>
        <Contenido />
      </Suspense>
    </div>
  );
}
