import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function NoEncontrado() {
  return (
    <div className="mx-auto max-w-xl px-4 py-16 text-center">
      <p className="text-sm font-semibold text-marca">Error 404</p>
      <h1 className="mt-2 text-2xl font-bold">Esta página no existe o el producto ya no está</h1>
      <p className="mt-2 text-muted-foreground">Buscalo de nuevo o mirá los celulares disponibles.</p>
      <form action="/buscar" className="mx-auto mt-6 flex max-w-sm gap-2" role="search">
        <input
          name="q"
          type="search"
          placeholder="Buscar producto"
          aria-label="Buscar productos"
          className="h-11 min-w-0 flex-1 rounded-lg border px-3 text-base"
        />
        <Button type="submit" size="lg" className="h-11" variant="outline">
          Buscar
        </Button>
      </form>
      <Button className="mt-4 h-12 px-6 text-base" size="lg" nativeButton={false} render={<Link href="/celulares" />}>
        Ver celulares
      </Button>
    </div>
  );
}
