import Image from "next/image";
import Link from "next/link";
import type { ProductoResumen } from "@/lib/tienda/datos";
import { TEXTO_DISPONIBILIDAD, cuota, usd } from "@/lib/tienda/formato";
import { formatoAlmacenamiento } from "@/lib/listas/normalizar";
import { BotonComparar } from "./comparar";

const ETIQUETAS: Record<string, string> = {
  "mas-pedidos": "Más pedido",
  "recien-llegado": "Nuevo",
  quincena: "Quincena",
};

export function TarjetaProducto({
  p,
  mesesTasaCero,
  comparar = false,
  prioridad = false,
}: {
  p: ProductoResumen;
  mesesTasaCero: number;
  comparar?: boolean;
  prioridad?: boolean;
}) {
  const etiqueta = p.colecciones.map((c) => ETIQUETAS[c]).find(Boolean);
  const agotado = p.disponibilidad === "agotado";
  return (
    <article className="group relative flex flex-col rounded-xl border bg-card p-3 transition-shadow hover:shadow-md">
      <Link href={`/producto/${p.slug}`} className="flex flex-1 flex-col" aria-label={p.nombre}>
        <div className="relative mb-3 aspect-square overflow-hidden rounded-lg bg-white">
          {p.imagen ? (
            <Image
              src={p.imagen.url}
              alt={p.imagen.alt}
              fill
              sizes="(min-width: 1024px) 22vw, (min-width: 640px) 30vw, 46vw"
              className={`object-contain p-2 transition-transform group-hover:scale-[1.03] ${agotado ? "opacity-50" : ""}`}
              loading={prioridad ? "eager" : "lazy"}
              fetchPriority={prioridad ? "high" : "auto"}
            />
          ) : null}
          {p.condicion !== "nuevo" ? (
            <span className="absolute top-1.5 right-1.5 rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-semibold text-amber-900">
              {p.condicion === "open_box" ? "Open Box" : "Usado"}
            </span>
          ) : null}
          {p.precioDesdeRegular ? (
            <span className="absolute top-1.5 left-1.5 rounded-full bg-marca px-2 py-0.5 text-[11px] font-semibold text-white">
              Oferta −{usd(p.precioDesdeRegular - p.precioDesde)}
            </span>
          ) : etiqueta ? (
            <span className="absolute top-1.5 left-1.5 rounded-full bg-marca px-2 py-0.5 text-[11px] font-semibold text-white">
              {etiqueta}
            </span>
          ) : null}
        </div>
        <h3 className="text-sm leading-snug font-semibold">{p.nombre}</h3>
        {p.almacenamientos.length ? (
          <p className="mt-0.5 text-xs text-muted-foreground">
            {[...p.almacenamientos].sort((a, b) => a - b).map(formatoAlmacenamiento).join(" · ")}
          </p>
        ) : null}
        <div className="mt-auto pt-2">
          <p className="text-lg font-bold">
            {p.precioHasta > p.precioDesde ? <span className="text-xs font-normal text-muted-foreground">Desde </span> : null}
            {usd(p.precioDesde)}
            {p.precioDesdeRegular ? (
              <span className="ml-1.5 text-sm font-normal text-muted-foreground line-through">{usd(p.precioDesdeRegular)}</span>
            ) : null}
          </p>
          {!agotado && p.precioDesde >= 100 ? (
            <p className="text-xs text-muted-foreground">
              o {mesesTasaCero} cuotas de {usd(cuota(p.precioDesde, mesesTasaCero))} tasa 0%
            </p>
          ) : null}
          <p className={`mt-1 text-xs font-medium ${agotado ? "text-muted-foreground" : "text-green-700"}`}>
            {TEXTO_DISPONIBILIDAD[p.disponibilidad].corto}
          </p>
        </div>
      </Link>
      {comparar ? (
        <div className="mt-2 border-t pt-2">
          <BotonComparar slug={p.slug} />
        </div>
      ) : null}
    </article>
  );
}
