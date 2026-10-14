import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { Suspense } from "react";
import { Button } from "@/components/ui/button";
import { configTienda, productosPorSlugs } from "@/lib/tienda/datos";
import { CLAVES_DECISIVAS, NOMBRE_CARACTERISTICA, TEXTO_DISPONIBILIDAD, cuota, usd } from "@/lib/tienda/formato";

export const metadata: Metadata = {
  title: "Comparar celulares",
  robots: { index: false, follow: true },
};

async function Tabla({ searchParams }: { searchParams: PageProps<"/comparar">["searchParams"] }) {
  const sp = await searchParams;
  const slugs = String(sp.p ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)
    .slice(0, 3);
  const [productos, c] = await Promise.all([productosPorSlugs(slugs), configTienda()]);

  if (productos.length < 2) {
    return (
      <div className="rounded-xl border border-dashed p-8 text-center">
        <p className="font-medium">Elegí 2 o 3 productos para compararlos.</p>
        <p className="mt-1 text-sm text-muted-foreground">Marcá “Comparar” en las tarjetas de la lista de celulares.</p>
        <Button className="mt-4" size="lg" nativeButton={false} render={<Link href="/celulares" />}>
          Ver celulares
        </Button>
      </div>
    );
  }

  const claves = [
    ...CLAVES_DECISIVAS,
    ...[...new Set(productos.flatMap((p) => Object.keys(p.caracteristicas)))].filter(
      (k) => !CLAVES_DECISIVAS.includes(k) && k !== "ram" && k !== "almacenamiento"
    ),
  ].filter((k) => productos.some((p) => String(p.caracteristicas[k] ?? "").trim()));

  const filas: { titulo: string; valores: React.ReactNode[] }[] = [
    {
      titulo: "Precio",
      valores: productos.map((p) => (
        <span key={p.id}>
          <span className="text-base font-bold">{usd(p.precioDesde)}</span>
          {p.precioDesde >= 100 ? (
            <span className="block text-xs text-muted-foreground">
              o {c.tasaCero.meses} × {usd(cuota(p.precioDesde, c.tasaCero.meses))}
            </span>
          ) : null}
        </span>
      )),
    },
    { titulo: "Memoria", valores: productos.map((p) => p.memorias.join(" / ") || "—") },
    { titulo: "Disponibilidad", valores: productos.map((p) => TEXTO_DISPONIBILIDAD[p.disponibilidad].corto) },
    ...claves.map((k) => ({
      titulo: NOMBRE_CARACTERISTICA[k] ?? k.replace(/_/g, " "),
      valores: productos.map((p) => String(p.caracteristicas[k] ?? "—")),
    })),
  ];

  return (
    <div className="-mx-4 overflow-x-auto px-4">
      <table className="w-full min-w-[34rem] table-fixed border-separate border-spacing-0 text-sm">
        <colgroup>
          <col className="w-28" />
          {productos.map((p) => (
            <col key={p.id} />
          ))}
        </colgroup>
        <thead>
          <tr>
            <th className="sticky left-0 z-10 bg-background" />
            {productos.map((p) => (
              <th key={p.id} scope="col" className="px-2 pb-3 align-top font-normal">
                <Link href={`/producto/${p.slug}`} className="block text-left">
                  <span className="relative mb-2 block aspect-square overflow-hidden rounded-lg bg-white">
                    {p.imagen ? <Image src={p.imagen.url} alt="" fill sizes="180px" className="object-contain p-2" /> : null}
                  </span>
                  <span className="block font-semibold hover:underline">{p.nombre}</span>
                </Link>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {filas.map((f) => (
            <tr key={f.titulo}>
              <th scope="row" className="sticky left-0 z-10 border-t bg-background py-2.5 pr-2 text-left align-top font-medium text-muted-foreground">
                {f.titulo}
              </th>
              {f.valores.map((v, i) => (
                <td key={i} className="border-t px-2 py-2.5 align-top">
                  {v}
                </td>
              ))}
            </tr>
          ))}
          <tr>
            <th className="sticky left-0 z-10 bg-background" />
            {productos.map((p) => (
              <td key={p.id} className="px-2 pt-3">
                <Button className="w-full" nativeButton={false} render={<Link href={`/producto/${p.slug}`} />}>
                  Ver
                </Button>
              </td>
            ))}
          </tr>
        </tbody>
      </table>
    </div>
  );
}

export default function PaginaComparar({ searchParams }: PageProps<"/comparar">) {
  return (
    <div className="mx-auto max-w-4xl px-4 pt-6 pb-24">
      <h1 className="mb-5 text-2xl font-bold">Comparar</h1>
      <Suspense fallback={<div className="h-64 rounded-xl bg-muted" aria-hidden />}>
        <Tabla searchParams={searchParams} />
      </Suspense>
    </div>
  );
}
