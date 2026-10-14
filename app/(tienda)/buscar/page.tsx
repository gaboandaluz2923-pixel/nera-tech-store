import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { Button } from "@/components/ui/button";
import { IconoWhatsApp } from "@/components/tienda/icono-whatsapp";
import { TarjetaProducto } from "@/components/tienda/tarjeta-producto";
import { catalogo, configTienda, type ProductoResumen } from "@/lib/tienda/datos";
import { sinAcentos } from "@/lib/listas/normalizar";
import { enlaceWhatsAppA } from "@/lib/whatsapp";

export const metadata: Metadata = {
  title: "Buscar",
  robots: { index: false, follow: true },
};

const normal = (s: string) => sinAcentos(s.toLowerCase()).replace(/[^a-z0-9+]+/g, " ").trim();

/** Cada palabra buscada tiene que aparecer en el nombre, marca, categoría o memorias. */
function buscar(productos: ProductoResumen[], q: string) {
  const palabras = normal(q)
    .split(" ")
    .filter(Boolean)
    // "128gb" y "128 gb" se buscan igual
    .map((w) => w.replace(/^(\d+)(gb|tb)$/, "$1"));
  if (!palabras.length) return [];
  return productos
    .map((p) => {
      const texto = normal([p.nombre, p.marca, p.categoriaNombre, p.resumen, ...p.memorias].filter(Boolean).join(" "));
      const nombre = normal(p.nombre);
      const coincide = palabras.every((w) => texto.includes(w));
      const puntos = palabras.filter((w) => nombre.includes(w)).length;
      return { p, coincide, puntos };
    })
    .filter((r) => r.coincide)
    .sort((a, b) => b.puntos - a.puntos || Number(a.p.disponibilidad === "agotado") - Number(b.p.disponibilidad === "agotado"))
    .map((r) => r.p);
}

async function Resultados({ searchParams }: { searchParams: PageProps<"/buscar">["searchParams"] }) {
  const q = String((await searchParams).q ?? "").slice(0, 80);
  const [productos, c] = await Promise.all([catalogo(), configTienda()]);
  const encontrados = buscar(productos, q);

  return (
    <>
      <h1 className="text-2xl font-bold">{q ? <>Resultados para “{q}”</> : "Buscar"}</h1>
      <form action="/buscar" className="mt-4 flex gap-2" role="search">
        <input
          name="q"
          type="search"
          defaultValue={q}
          placeholder="Ej. Galaxy A17, audífonos, 256 GB"
          aria-label="Buscar productos"
          className="h-11 min-w-0 flex-1 rounded-lg border px-3 text-base outline-none focus-visible:border-marca focus-visible:ring-3 focus-visible:ring-marca/30"
        />
        <Button type="submit" size="lg" className="h-11">
          Buscar
        </Button>
      </form>

      {q && encontrados.length ? (
        <>
          <p className="mt-4 mb-4 text-sm text-muted-foreground">
            {encontrados.length} {encontrados.length === 1 ? "producto" : "productos"}
          </p>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {encontrados.map((p, i) => (
              <TarjetaProducto key={p.id} p={p} mesesTasaCero={c.tasaCero.meses} prioridad={i < 2} />
            ))}
          </div>
        </>
      ) : q ? (
        <div className="mt-6 rounded-xl border border-dashed p-6 text-center">
          <p className="font-medium">No encontramos “{q}” en la tienda.</p>
          <p className="mt-1 text-sm text-muted-foreground">Puede que lo consigamos. Preguntanos y te decimos precio y entrega.</p>
          <div className="mt-4 flex flex-col justify-center gap-2 sm:flex-row">
            <Button
              size="lg"
              nativeButton={false}
              render={
                <a
                  href={enlaceWhatsAppA(c.whatsapp, `Hola, ¿tienen ${q}? [buscar]`)}
                  target="_blank"
                  rel="noopener noreferrer"
                />
              }
            >
              <IconoWhatsApp className="size-5" />
              ¿Lo tienen? Preguntar
            </Button>
            <Button size="lg" variant="outline" nativeButton={false} render={<Link href="/celulares" />}>
              Ver celulares
            </Button>
          </div>
        </div>
      ) : null}
    </>
  );
}

export default function PaginaBuscar({ searchParams }: PageProps<"/buscar">) {
  return (
    <div className="mx-auto max-w-6xl px-4 pt-6 pb-16">
      <Suspense fallback={<div className="h-24 rounded-xl bg-muted" aria-hidden />}>
        <Resultados searchParams={searchParams} />
      </Suspense>
    </div>
  );
}
