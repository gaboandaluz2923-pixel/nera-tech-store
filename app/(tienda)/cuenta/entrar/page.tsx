import type { Metadata } from "next";
import { Suspense } from "react";
import { BotonGoogle } from "@/components/tienda/boton-google";

export const metadata: Metadata = { title: "Entrar", robots: { index: false, follow: false } };

async function Contenido({ searchParams }: { searchParams: PageProps<"/cuenta/entrar">["searchParams"] }) {
  const sp = await searchParams;
  const volver = typeof sp.volver === "string" ? sp.volver : "/mis-pedidos";
  const enlazar = typeof sp.enlazar === "string" ? sp.enlazar : undefined;
  return (
    <>
      {sp.error ? (
        <p className="mb-4 rounded-lg bg-destructive/10 p-3 text-sm text-destructive">No se pudo iniciar sesión. Probá de nuevo.</p>
      ) : null}
      <BotonGoogle volver={volver} enlazar={enlazar} />
    </>
  );
}

export default function PaginaEntrar(props: PageProps<"/cuenta/entrar">) {
  return (
    <div className="mx-auto max-w-sm px-4 py-12">
      <h1 className="text-2xl font-bold">Tus pedidos, siempre a mano</h1>
      <p className="mt-2 mb-6 text-muted-foreground">
        Entrá con tu cuenta de Google para ver tus pedidos, su estado y tus facturas. No necesitás cuenta para comprar.
      </p>
      <Suspense fallback={<div className="h-12 rounded-lg bg-muted" />}>
        <Contenido searchParams={props.searchParams} />
      </Suspense>
    </div>
  );
}
