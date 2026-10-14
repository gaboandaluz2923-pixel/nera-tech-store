import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { ChevronRight } from "lucide-react";
import { AgregarPedido } from "@/components/tienda/agregar-pedido";
import { BotonGoogle } from "@/components/tienda/boton-google";
import { Button } from "@/components/ui/button";
import { enlazarCuenta, pedidosDeUsuario } from "@/lib/tienda/cuentas";
import { ESTADO_PEDIDO, fechaCorta, usd2 } from "@/lib/tienda/formato";
import { createClient } from "@/lib/supabase/server";
import { salir } from "./actions";

export const metadata: Metadata = { title: "Mis pedidos", robots: { index: false, follow: false } };

async function Contenido() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return (
      <div className="max-w-sm space-y-4">
        <p className="text-muted-foreground">
          Entrá con tu cuenta de Google para ver tus pedidos, su estado y tus facturas. Aparecen solos los pedidos que hiciste
          con el mismo correo.
        </p>
        <BotonGoogle volver="/mis-pedidos" />
        <p className="text-sm text-muted-foreground">
          ¿Compraste sin cuenta? También podés ver tu pedido con el enlace “Ver mi pedido” que te enviamos.
        </p>
      </div>
    );
  }

  await enlazarCuenta(user); // por si hizo pedidos nuevos con este correo
  const pedidos = await pedidosDeUsuario(user.id);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-2 text-sm text-muted-foreground">
        <span>Entraste como {user.email}</span>
        <form action={salir}>
          <Button type="submit" variant="ghost" size="sm">
            Salir
          </Button>
        </form>
      </div>
      {pedidos.length ? (
        <ul className="divide-y rounded-xl border">
          {pedidos.map((p) => {
            const estado = ESTADO_PEDIDO[p.estado] ?? ESTADO_PEDIDO.pendiente_confirmar;
            return (
              <li key={p.token}>
                <Link href={`/pedido/${p.token}`} className="flex items-center gap-3 p-4 hover:bg-muted/50">
                  <span className="min-w-0 flex-1">
                    <span className="flex flex-wrap items-center gap-2">
                      <span className="font-semibold">Pedido #{p.numero}</span>
                      <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${estado.clase}`}>{estado.texto}</span>
                    </span>
                    <span className="mt-0.5 block truncate text-sm text-muted-foreground">
                      {p.lineas_pedido.map((l) => `${l.cantidad > 1 ? `${l.cantidad} × ` : ""}${l.nombre}`).join(", ")}
                    </span>
                    <span className="block text-xs text-muted-foreground">
                      {fechaCorta(p.created_at)} · {usd2(Number(p.total))}
                      {p.factura_estado === "emitida" ? " · Factura lista" : ""}
                    </span>
                  </span>
                  <ChevronRight className="size-5 text-muted-foreground" aria-hidden />
                </Link>
              </li>
            );
          })}
        </ul>
      ) : (
        <p className="rounded-xl border border-dashed p-6 text-center text-muted-foreground">
          Todavía no hay pedidos con {user.email}.
        </p>
      )}
      <AgregarPedido />
    </div>
  );
}

export default function MisPedidos() {
  return (
    <div className="mx-auto max-w-2xl px-4 pt-6 pb-16">
      <h1 className="mb-4 text-2xl font-bold">Mis pedidos</h1>
      <Suspense fallback={<div className="h-40 animate-pulse rounded-xl bg-muted" />}>
        <Contenido />
      </Suspense>
    </div>
  );
}
