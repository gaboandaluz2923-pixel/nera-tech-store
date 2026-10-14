import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { BotonBaja } from "@/components/tienda/boton-baja";
import { clienteDeBaja } from "@/lib/tienda/baja";

export const metadata: Metadata = { title: "No recibir publicidad", robots: { index: false, follow: false } };

// Página del enlace "No quiero recibir más publicidad" de los correos.
// Pide un toque para confirmar (los antivirus de correo abren los enlaces solos).
async function Contenido({ params }: { params: PageProps<"/baja/[token]">["params"] }) {
  const { token } = await params;
  const c = await clienteDeBaja(token);
  if (!c) {
    return <p className="text-muted-foreground">Este enlace no es válido. Si querés dejar de recibir publicidad, escribinos por WhatsApp.</p>;
  }
  return (
    <div className="space-y-4">
      <p>
        {c.nombre ? `${c.nombre.split(" ")[0]}, ` : ""}¿no querés recibir más publicidad ni ofertas por correo
        {c.correo ? ` en ${c.correo}` : ""}?
      </p>
      <p className="text-sm text-muted-foreground">Los avisos de tus pedidos y tus facturas te van a seguir llegando.</p>
      <BotonBaja token={token} yaDeBaja={!c.acepta_correo} />
      <p className="text-sm text-muted-foreground">
        Si tenés cuenta, también lo podés cambiar en{" "}
        <Link href="/mi-cuenta" className="underline">
          Mi cuenta
        </Link>
        .
      </p>
    </div>
  );
}

export default function Baja({ params }: PageProps<"/baja/[token]">) {
  return (
    <div className="mx-auto max-w-md px-4 pt-10 pb-16">
      <h1 className="mb-4 text-2xl font-bold">Publicidad por correo</h1>
      <Suspense fallback={<div className="h-32 animate-pulse rounded-2xl bg-muted" />}>
        <Contenido params={params} />
      </Suspense>
    </div>
  );
}
