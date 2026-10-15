import Link from "next/link";
import { Suspense } from "react";
import { NuevoPedido } from "@/components/admin/nuevo-pedido";
import { variantesVendibles } from "@/lib/admin/pedido-manual";
import { equipo } from "@/lib/admin/sesion";
import { configTienda } from "@/lib/tienda/datos";

// Pedido manual: para las ventas que entran por WhatsApp, redes, llamada o en persona.

async function Formulario({ searchParams }: { searchParams: PageProps<"/admin/pedidos/nuevo">["searchParams"] }) {
  const [{ esSuperAdmin }, variantes, c, sp] = await Promise.all([equipo(), variantesVendibles(), configTienda(), searchParams]);
  const tel = typeof sp.tel === "string" ? sp.tel.replace(/\D/g, "").slice(0, 11) : "";
  return (
    <NuevoPedido
      variantes={variantes}
      esAdmin={esSuperAdmin}
      municipios={c.municipiosContraEntrega}
      costoEnvio={Number(c.envio.costo) || 0}
      telefonoInicial={tel}
    />
  );
}

export default function PaginaNuevoPedido({ searchParams }: PageProps<"/admin/pedidos/nuevo">) {
  return (
    <div className="max-w-3xl space-y-4">
      <div>
        <Link href="/admin/pedidos" className="text-sm text-muted-foreground hover:underline">
          ← Pedidos
        </Link>
        <h1 className="text-xl font-semibold">Nuevo pedido</h1>
        <p className="text-sm text-muted-foreground">
          Para las ventas por WhatsApp, redes, llamada o en persona. Queda junto a los de la tienda, con el cliente y quién lo creó.
        </p>
      </div>
      <Suspense fallback={<p className="text-sm text-muted-foreground">Cargando productos…</p>}>
        <Formulario searchParams={searchParams} />
      </Suspense>
    </div>
  );
}
