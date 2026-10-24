import Image from "next/image";
import Link from "next/link";
import { ImageOff } from "lucide-react";
import { Suspense } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createClient } from "@/lib/supabase/server";
import { tablaPrecios, type FilaPrecio } from "@/lib/admin/precios-tabla";
import { pct, roasMinimo, usd } from "@/lib/precios";
import { NOMBRE_COBRO, type FormaCobro } from "@/lib/costos-cobro";
import { BotonGuardar, FormularioAccion } from "@/components/admin/formulario-accion";
import { PrecioMargenEditable } from "@/components/admin/precio-margen-editable";
import { anotarPrecioObservado, fijarPrecio } from "./actions";

const ROTACION = { rapida: "se vende rápido", normal: "rotación normal", lenta: "sin ventas en 30 días" } as const;

type Filtros = { q?: string; categoria?: string; vista?: string };

function Cambio({ valor }: { valor: number | null }) {
  if (!valor) return null;
  const sube = valor > 0;
  return (
    <span
      className={`ml-1 text-xs ${sube ? "text-red-600 dark:text-red-400" : "text-green-700 dark:text-green-400"}`}
      title="Cambio contra la lista anterior de ese proveedor"
    >
      {sube ? "▲" : "▼"} {usd(Math.abs(valor))}
    </span>
  );
}

function FilaTabla({ f }: { f: FilaPrecio }) {
  // En rojo si el margen neto de esa forma de cobro es menos de 5%
  return (
    <tr className="border-t align-top">
      <td className="p-2">
        <div className="flex items-start gap-2">
          {/* Miniatura: toca para abrir el producto en Catálogo (ahí se suben las fotos) */}
          <Link
            href={`/admin/catalogo/${f.productoId}`}
            className="relative size-12 shrink-0 overflow-hidden rounded-md border bg-white"
            title={f.foto ? `Ver ${f.producto} en Catálogo` : "Sin foto: subila en Catálogo"}
          >
            {f.foto ? (
              <Image src={f.foto} alt="" fill sizes="48px" className="object-contain p-0.5" />
            ) : (
              <span className="flex size-full items-center justify-center text-muted-foreground">
                <ImageOff className="size-4" aria-hidden />
                <span className="sr-only">Sin foto</span>
              </span>
            )}
          </Link>
          <div className="min-w-0">
            <div className="font-medium">{f.producto}</div>
            <div className="text-xs text-muted-foreground">
              {[f.memoria, f.colores.join(", ")].filter(Boolean).join(" · ")}
            </div>
          </div>
        </div>
      </td>
      <td className="p-2">
        <ul className="space-y-0.5 text-xs">
          {f.ofertas.map((o) => (
            <li
              key={o.proveedor}
              className={
                o === f.mejor
                  ? "font-semibold"
                  : o.disponible
                    ? "text-muted-foreground"
                    : "text-muted-foreground line-through"
              }
            >
              {o.proveedor} {usd(o.precio)}
              {o.stock !== null ? <span className="font-normal"> ({o.stock})</span> : null}
              {o === f.mejor ? <Cambio valor={f.cambio} /> : null}
              {o.sugerido ? (
                <span className="font-normal text-muted-foreground"> · sug. {usd(o.sugerido)}</span>
              ) : null}
            </li>
          ))}
        </ul>
      </td>
      <td className="p-2 text-right tabular-nums">
        <div>{usd(f.mejor?.costo)}</div>
        {f.mejor ? (
          <div className="text-xs text-muted-foreground">
            {f.mejor.sinIva ? `${usd(f.mejor.sinIva)} + IVA` : "IVA incluido"}
          </div>
        ) : null}
      </td>
      <td className="w-64 p-2 align-top">
        {f.sugerencia ? (
          <div className="space-y-1">
            <div className="flex items-center justify-end gap-2">
              <span className="text-right">
                <span className="block font-semibold tabular-nums">{usd(f.sugerencia.precio)}</span>
                <span className="block text-xs text-muted-foreground">
                  {f.netoSugerido ? `deja ${usd(f.netoSugerido.neto)} en efectivo` : `deja ${usd(f.sugerencia.contribucion)}`} ·{" "}
                  {ROTACION[f.sugerencia.rotacion]}
                </span>
              </span>
              {f.precioVenta !== f.sugerencia.precio ? (
                <form action={fijarPrecio}>
                  <input type="hidden" name="productoId" value={f.productoId} />
                  <input type="hidden" name="ram" value={f.ramGb ?? ""} />
                  <input type="hidden" name="alm" value={f.almacenamientoGb ?? ""} />
                  <input type="hidden" name="precio" value={f.sugerencia.precio} />
                  <input type="hidden" name="razon" value="sugerido aprobado" />
                  <Button type="submit" size="sm" variant="outline" aria-label={`Usar ${usd(f.sugerencia.precio)} en ${f.producto} ${f.memoria}`}>
                    Usar
                  </Button>
                </form>
              ) : (
                <span className="text-xs text-green-700">= tu precio</span>
              )}
            </div>
            <details className="text-xs">
              <summary className="cursor-pointer text-right text-primary">
                Por qué
                {f.mercado
                  ? f.mercado.min === f.mercado.max
                    ? ` · mercado ${usd(f.mercado.min)}`
                    : ` · mercado ${usd(f.mercado.min)}–${usd(f.mercado.max)}`
                  : " · sin mercado"}
              </summary>
              <ul className="mt-1 list-disc space-y-0.5 pl-4 text-muted-foreground">
                {f.sugerencia.explicacion.map((t) => (
                  <li key={t}>{t}</li>
                ))}
              </ul>
              {f.observados.length ? (
                <p className="mt-1 text-muted-foreground">
                  Anotados: {f.observados.map((o) => `${usd(o.precio)} ${o.fuente} (${o.fecha.slice(5).split("-").reverse().join("/")})`).join(" · ")}
                </p>
              ) : null}
              <FormularioAccion accion={anotarPrecioObservado} className="mt-2 space-y-1 rounded-md bg-muted/50 p-2">
                <input type="hidden" name="productoId" value={f.productoId} />
                <input type="hidden" name="ram" value={f.ramGb ?? ""} />
                <input type="hidden" name="alm" value={f.almacenamientoGb ?? ""} />
                <p className="font-medium text-foreground">Anotar un precio que viste</p>
                <div className="flex gap-1">
                  <Input name="precio" inputMode="decimal" placeholder="$" className="h-7 w-20 text-xs" aria-label="Precio visto" />
                  <Input name="fuente" placeholder="Dónde (ej. Tienda X)" className="h-7 min-w-0 flex-1 text-xs" aria-label="Dónde lo viste" />
                </div>
                <label className="flex items-center gap-1">
                  <input type="checkbox" name="usado" className="size-3.5" /> Era usado o reacondicionado (no cuenta)
                </label>
                <BotonGuardar size="sm" variant="outline">
                  Anotar
                </BotonGuardar>
              </FormularioAccion>
            </details>
          </div>
        ) : (
          <span className="text-muted-foreground">—</span>
        )}
      </td>
      <td className="p-2">
        <PrecioMargenEditable
          accion={fijarPrecio}
          ocultos={{ productoId: f.productoId, ram: String(f.ramGb ?? ""), alm: String(f.almacenamientoGb ?? "") }}
          valor={f.precioVenta}
          costo={f.mejor?.costo ?? null}
          descuentoPct={f.descuentoSinTarjetaPct}
          sugerido={f.precioObjetivo}
          etiqueta={`Precio de venta de ${f.producto} ${f.memoria}`}
          envioCobrado={f.envioCobrado}
          cobro={f.cobro}
        />
        {f.precioVaria ? <p className="mt-1 text-xs text-amber-700">Los colores tienen precios distintos</p> : null}
      </td>
      <td className="p-2">
        {f.netos ? (
          <table className="ml-auto text-xs tabular-nums">
            <tbody>
              {(Object.keys(NOMBRE_COBRO) as FormaCobro[]).map((k) => {
                const n = f.netos![k];
                const bajo = n.pct !== null && n.pct < 0.05;
                return (
                  <tr key={k} title={`Cobrás ${usd(n.cobrado)} − comisión ${usd(n.comision)} − envío y paquetería ${usd(n.envio)} − costo ${usd(n.costo)}`}>
                    <td className="pr-2 text-muted-foreground">{NOMBRE_COBRO[k]}</td>
                    <td className={`pr-2 text-right font-medium ${bajo ? "text-red-600 dark:text-red-400" : ""}`}>{pct(n.pct)}</td>
                    <td className={`text-right ${n.neto < 0 ? "text-red-600 dark:text-red-400" : ""}`}>{usd(n.neto)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        ) : (
          <span className="block text-right text-muted-foreground">—</span>
        )}
        {f.netos && f.precioVenta && f.netos.efectivo.neto > 0 ? (
          <div className="mt-1 text-right text-xs text-muted-foreground">
            ROAS mín. {roasMinimo(f.netos.efectivo.cobrado, f.netos.efectivo.neto) ?? "—"}x
          </div>
        ) : null}
      </td>
    </tr>
  );
}

async function Contenido({ searchParams }: { searchParams: Promise<Filtros> }) {
  const filtros = await searchParams;
  const supabase = await createClient();
  const todas = await tablaPrecios(supabase);

  if (todas.length === 0) {
    return (
      <div className="space-y-3">
        <p>Todavía no hay productos vinculados a proveedores.</p>
        <Button nativeButton={false} render={<Link href="/admin/listas/nueva" />}>Importar una lista</Button>
      </div>
    );
  }

  const categorias = [...new Map(todas.map((f) => [f.categoriaSlug, f.categoria])).entries()];
  const q = (filtros.q ?? "").toLowerCase().trim();
  const filas = todas.filter((f) => {
    if (filtros.categoria && f.categoriaSlug !== filtros.categoria) return false;
    if (q && !`${f.producto} ${f.memoria}`.toLowerCase().includes(q)) return false;
    if (filtros.vista === "comparar" && f.ofertas.length < 2) return false;
    if (filtros.vista === "cambios" && !f.cambio) return false;
    if (filtros.vista === "sin-precio" && f.precioVenta) return false;
    if (filtros.vista === "sugerido" && (!f.sugerencia || f.sugerencia.precio === f.precioVenta)) return false;
    if (filtros.vista === "margen-bajo" && !(f.netos && Object.values(f.netos).some((n) => n.pct !== null && n.pct < 0.05)))
      return false;
    return true;
  });

  return (
    <div className="space-y-4">
      <form className="flex flex-wrap items-end gap-2" action="/admin/precios">
        <Input name="q" defaultValue={filtros.q ?? ""} placeholder="Buscar modelo…" className="h-9 w-48" />
        <select
          name="categoria"
          defaultValue={filtros.categoria ?? ""}
          className="h-9 rounded-lg border bg-background px-2 text-sm"
        >
          <option value="">Todas las categorías</option>
          {categorias.map(([slug, nombre]) => (
            <option key={slug} value={slug}>
              {nombre}
            </option>
          ))}
        </select>
        <select
          name="vista"
          defaultValue={filtros.vista ?? ""}
          className="h-9 rounded-lg border bg-background px-2 text-sm"
        >
          <option value="">Todo</option>
          <option value="comparar">En 2 o más proveedores</option>
          <option value="cambios">Con cambio de precio</option>
          <option value="sin-precio">Sin precio de venta</option>
          <option value="sugerido">Sugerido distinto de tu precio</option>
          <option value="margen-bajo">Margen neto bajo (menos de 5%)</option>
        </select>
        <Button type="submit" variant="outline">
          Filtrar
        </Button>
        <span className="ml-auto text-sm text-muted-foreground">{filas.length} configuraciones</span>
      </form>

      <div className="overflow-x-auto rounded-lg border">
        <table className="w-full min-w-[900px] text-sm">
          <thead className="bg-muted text-left text-xs">
            <tr>
              <th className="p-2">Producto</th>
              <th className="p-2">Proveedores (existencia)</th>
              <th className="p-2 text-right">Costo puesto (con IVA)</th>
              <th className="p-2 text-right">Precio sugerido</th>
              <th className="p-2">Tu precio de venta (con tarjeta)</th>
              <th className="p-2 text-right">Margen neto (lo que te queda)</th>
            </tr>
          </thead>
          <tbody>
            {filas.map((f) => (
              <FilaTabla key={f.clave} f={f} />
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-muted-foreground">
        En negrita el mejor proveedor (menor costo puesto con existencia). Tachado = sin existencia. Margen neto = lo
        que te queda de cada venta según cómo paga el cliente: lo que cobrás (efectivo y transferencia con el descuento
        sin tarjeta) más el envío que paga, menos la comisión (contra entrega, Wompi o la tasa 0% más cara), el envío de
        la paquetera, la paquetería y el costo con IVA; en % sobre lo que cobrás, en rojo si es menos de 5%. Los
        valores se cambian en Configuración → Costos de envío y cobro. Pasá el mouse sobre una fila para ver la cuenta.
        Con el lápiz podés escribir el precio o el margen neto en efectivo: el otro se calcula solo. ROAS mínimo = lo
        que necesitás vender por cada dólar de pauta para no perder (con efectivo). El precio sugerido combina tu costo, el margen
        objetivo de la categoría, los precios de mercado que anotaste en los últimos 30 días y cuánto se vendió;
        nunca baja del mínimo sin pérdida y solo se aplica si tocás <strong>Usar</strong>.
      </p>
    </div>
  );
}

export default function Precios(props: PageProps<"/admin/precios">) {
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold">Precios</h1>
        <p className="text-muted-foreground">
          A quién comprarle cada equipo, cuánto te cuesta y cuánto te deja a tu precio de venta.
        </p>
      </div>
      <Suspense fallback={<p className="text-sm text-muted-foreground">Calculando…</p>}>
        <Contenido searchParams={props.searchParams as Promise<Filtros>} />
      </Suspense>
    </div>
  );
}
