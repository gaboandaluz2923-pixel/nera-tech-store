import Link from "next/link";
import { Suspense } from "react";
import { PrepararCampana } from "@/components/admin/preparar-campana";
import { opcionesCampana, TIPOS_CAMPANA } from "@/lib/admin/campanas";
import { superAdmin } from "@/lib/admin/sesion";
import { crearCampana, previsualizarCampana } from "./actions";

// Preparar una campaña de correo con productos y precios reales; se crea como borrador en Brevo.

async function Contenido() {
  await superAdmin();
  const { opciones, sugeridos } = await opcionesCampana();
  return (
    <PrepararCampana
      tipos={TIPOS_CAMPANA}
      opciones={opciones}
      sugeridos={sugeridos}
      previsualizar={previsualizarCampana}
      crear={crearCampana}
    />
  );
}

export default function PaginaCampana() {
  return (
    <div className="max-w-3xl space-y-4">
      <div>
        <Link href="/admin/promociones" className="text-sm text-muted-foreground hover:underline">
          ← Promociones
        </Link>
        <h1 className="text-xl font-semibold">Preparar campaña de correo</h1>
        <p className="text-sm text-muted-foreground">
          Elegí el tipo y los productos; los precios, «En bodega» y las fechas de oferta salen de la tienda. Se crea como borrador en
          Brevo para la lista «Clientes Nera Tech»: ahí la revisás, te mandás una prueba y la agendás.
        </p>
      </div>
      <Suspense fallback={<p className="text-sm text-muted-foreground">Cargando…</p>}>
        <Contenido />
      </Suspense>
    </div>
  );
}
