import Image from "next/image";
import Link from "next/link";
import { Search, UserRound } from "lucide-react";
import { CATEGORIAS } from "@/lib/tienda/formato";
import { catalogo } from "@/lib/tienda/datos";
import { CarritoBoton } from "./carrito-hoja";

// Encabezado de la tienda (Krug: logo al inicio, buscador arriba, secciones visibles, nada que adivinar).
export async function Encabezado() {
  const productos = await catalogo();
  const conProductos = new Set(productos.map((p) => p.categoria));
  const categorias = CATEGORIAS.filter((c) => conProductos.has(c.slug));

  return (
    <header className="sticky top-0 z-30 border-b bg-background/95 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center gap-3 px-4 py-2">
        <Link href="/" className="shrink-0" aria-label="Nera Tech, ir al inicio">
          <Image src="/marca/logo-claro.png" alt="Nera Tech" width={68} height={40} priority className="h-10 w-auto" />
        </Link>
        <form action="/buscar" className="relative ml-auto flex-1 sm:max-w-sm" role="search">
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <input
            name="q"
            type="search"
            placeholder="Buscar celular, audífonos…"
            aria-label="Buscar productos"
            className="h-10 w-full rounded-full border bg-muted/40 pr-3 pl-9 text-sm outline-none focus-visible:border-marca focus-visible:ring-3 focus-visible:ring-marca/30"
          />
        </form>
        <Link
          href="/mi-cuenta"
          aria-label="Mi cuenta"
          className="flex size-10 shrink-0 items-center justify-center rounded-full hover:bg-muted"
        >
          <UserRound className="size-6" aria-hidden />
        </Link>
        <CarritoBoton />
      </div>
      <nav aria-label="Categorías" className="mx-auto max-w-6xl overflow-x-auto px-2">
        <ul className="flex gap-1 pb-2 text-sm whitespace-nowrap">
          {categorias.map((c) => (
            <li key={c.slug}>
              <Link href={`/${c.slug}`} className="block rounded-full px-3 py-1.5 font-medium hover:bg-muted">
                {c.nombre}
              </Link>
            </li>
          ))}
          <li>
            <Link href="/garantia" className="block rounded-full px-3 py-1.5 text-muted-foreground hover:bg-muted">
              Garantía
            </Link>
          </li>
          <li>
            <Link href="/envios-y-pagos" className="block rounded-full px-3 py-1.5 text-muted-foreground hover:bg-muted">
              Envíos y pagos
            </Link>
          </li>
        </ul>
      </nav>
    </header>
  );
}
