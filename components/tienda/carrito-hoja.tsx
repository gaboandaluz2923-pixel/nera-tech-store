"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState, useTransition } from "react";
import { Minus, Plus, ShoppingBag, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { resumenCarrito } from "@/app/(tienda)/carrito/actions";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import type { ResumenCarrito } from "@/lib/tienda/calculo";
import {
  MAX_POR_PRODUCTO,
  abrirCarrito,
  agregarAlCarrito,
  alAbrirCarrito,
  cambiarCantidad,
  quitarDelCarrito,
  useCarrito,
} from "@/lib/tienda/carrito";
import type { ProductoResumen } from "@/lib/tienda/datos";
import { usd, usd2 } from "@/lib/tienda/formato";
import { medir } from "@/lib/analytics";

/** Recalcula el carrito en el servidor cada vez que cambia. Lo usan la hoja y el checkout. */
export function useResumenCarrito() {
  const lineas = useCarrito();
  const [resumen, setResumen] = useState<ResumenCarrito | null>(null);
  const [cargando, iniciar] = useTransition();
  const clave = JSON.stringify(lineas);

  useEffect(() => {
    let vigente = true;
    iniciar(async () => {
      const r = await resumenCarrito(JSON.parse(clave));
      if (!vigente) return;
      setResumen(r);
      if (r.quitadas.length) {
        quitarDelCarrito(r.quitadas);
        toast.info("Quitamos del carrito algo que ya no está disponible.");
      }
    });
    return () => {
      vigente = false;
    };
  }, [clave]);

  return { lineas, resumen, cargando };
}

export function CarritoBoton() {
  const lineas = useCarrito();
  const cantidad = lineas.reduce((s, l) => s + l.c, 0);
  return (
    <button
      type="button"
      onClick={abrirCarrito}
      className="relative flex size-10 shrink-0 items-center justify-center rounded-full hover:bg-muted"
      aria-label={cantidad ? `Carrito: ${cantidad} productos` : "Carrito vacío"}
    >
      <ShoppingBag className="size-6" aria-hidden />
      {cantidad ? (
        <span className="absolute -top-0.5 -right-0.5 flex min-w-5 items-center justify-center rounded-full bg-marca px-1 text-[11px] leading-5 font-bold text-white">
          {cantidad}
        </span>
      ) : null}
    </button>
  );
}

export function CarritoHoja({ accesorios }: { accesorios: ProductoResumen[] }) {
  const [abierto, setAbierto] = useState(false);
  const { lineas, resumen, cargando } = useResumenCarrito();

  useEffect(() => alAbrirCarrito(() => setAbierto(true)), []);

  const enCarrito = new Set(resumen?.lineas.map((l) => l.productoId));
  const hayEquipo = resumen?.lineas.some((l) => l.categoria === "celulares" || l.categoria === "tablets");
  const sugeridos = hayEquipo
    ? accesorios.filter((a) => a.varianteDestacada && !enCarrito.has(a.id)).slice(0, 3)
    : [];
  const vacio = lineas.length === 0;

  return (
    <Sheet open={abierto} onOpenChange={setAbierto}>
      <SheetContent side="right" className="w-full gap-0 p-0 sm:max-w-md">
        <SheetHeader className="border-b p-4">
          <SheetTitle className="text-lg">Tu carrito</SheetTitle>
          <SheetDescription className="sr-only">Productos que vas a comprar</SheetDescription>
        </SheetHeader>

        {vacio ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-3 p-6 text-center">
            <ShoppingBag className="size-10 text-muted-foreground" aria-hidden />
            <p className="font-medium">Tu carrito está vacío</p>
            <Button nativeButton={false} render={<Link href="/celulares" onClick={() => setAbierto(false)} />}>
              Ver celulares
            </Button>
          </div>
        ) : (
          <>
            <div className="flex-1 overflow-y-auto p-4">
              <ul className="space-y-4" aria-busy={cargando}>
                {(resumen?.lineas ?? []).map((l) => (
                  <li key={l.varianteId} className="flex gap-3">
                    <Link
                      href={`/producto/${l.slug}`}
                      onClick={() => setAbierto(false)}
                      className="relative size-20 shrink-0 overflow-hidden rounded-lg border bg-white"
                    >
                      {l.imagen ? <Image src={l.imagen.url} alt={l.imagen.alt} fill sizes="80px" className="object-contain p-1" /> : null}
                    </Link>
                    <div className="min-w-0 flex-1">
                      <p className="leading-snug font-medium">{l.nombreProducto}</p>
                      {l.detalle ? <p className="text-xs text-muted-foreground">{l.detalle}</p> : null}
                      <div className="mt-2 flex items-center justify-between gap-2">
                        <div className="flex items-center rounded-lg border">
                          <button
                            type="button"
                            className="flex size-9 items-center justify-center"
                            onClick={() => cambiarCantidad(l.varianteId, l.cantidad - 1)}
                            aria-label="Uno menos"
                          >
                            {l.cantidad === 1 ? <Trash2 className="size-4" /> : <Minus className="size-4" />}
                          </button>
                          <span className="w-6 text-center text-sm font-medium" aria-live="polite">
                            {l.cantidad}
                          </span>
                          <button
                            type="button"
                            className="flex size-9 items-center justify-center disabled:opacity-40"
                            onClick={() => cambiarCantidad(l.varianteId, l.cantidad + 1)}
                            disabled={l.cantidad >= MAX_POR_PRODUCTO}
                            aria-label="Uno más"
                          >
                            <Plus className="size-4" />
                          </button>
                        </div>
                        <p className="text-right font-semibold">
                          {l.precioRegular ? (
                            <span className="block text-xs font-normal text-muted-foreground line-through">
                              {usd2(l.precioRegular * l.cantidad)}
                            </span>
                          ) : null}
                          {usd2(l.total)}
                        </p>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>

              {resumen?.combosSugeridos.length ? (
                <section className="mt-6 space-y-2" aria-label="Combos">
                  {resumen.combosSugeridos.slice(0, 2).map((c) => (
                    <div key={c.id} className="rounded-xl border-2 border-dashed border-marca/50 bg-marca/5 p-3">
                      <p className="text-sm font-semibold">
                        Combo {c.nombre}: ahorrás {usd2(c.ahorro)}
                      </p>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        Agregá {c.faltan.map((f) => `${f.cantidad > 1 ? `${f.cantidad} × ` : ""}${f.nombre}`).join(" + ")}
                      </p>
                      <Button
                        size="sm"
                        className="mt-2"
                        onClick={() => {
                          c.faltan.forEach((f) => agregarAlCarrito(f.varianteId, f.cantidad));
                          medir("clic_bundle", { nombre: c.nombre, combo: c.id, desde: "carrito" });
                        }}
                      >
                        Agregar combo
                      </Button>
                    </div>
                  ))}
                </section>
              ) : null}

              {sugeridos.length ? (
                <section className="mt-6 rounded-xl bg-muted/50 p-3" aria-labelledby="t-completa-carrito">
                  <h3 id="t-completa-carrito" className="mb-2 text-sm font-semibold">
                    Completá tu equipo
                  </h3>
                  <ul className="space-y-2">
                    {sugeridos.map((a) => (
                      <li key={a.id} className="flex items-center gap-3">
                        <span className="relative size-12 shrink-0 overflow-hidden rounded-md bg-white">
                          {a.imagen ? <Image src={a.imagen.url} alt="" fill sizes="48px" className="object-contain p-1" /> : null}
                        </span>
                        <span className="min-w-0 flex-1 text-sm leading-tight">
                          {a.nombre}
                          <span className="block text-xs text-muted-foreground">{usd(a.precioDesde)}</span>
                        </span>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            agregarAlCarrito(a.varianteDestacada!);
                            medir("agregar_carrito", { productoId: a.id, varianteId: a.varianteDestacada, nombre: a.nombre, valor: a.precioDesde, desde: "completa_tu_equipo" });
                          }}
                        >
                          Agregar
                        </Button>
                      </li>
                    ))}
                  </ul>
                </section>
              ) : null}
            </div>

            <div className="space-y-3 border-t p-4">
              {resumen ? (
                <dl className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <dt>Subtotal</dt>
                    <dd>{usd2(resumen.subtotal)}</dd>
                  </div>
                  {resumen.combos.map((c) => (
                    <div key={c.id} className="flex justify-between text-green-700">
                      <dt>
                        Combo {c.nombre}
                        {c.veces > 1 ? ` ×${c.veces}` : ""}
                      </dt>
                      <dd className="font-medium">−{usd2(c.descuento)}</dd>
                    </div>
                  ))}
                  <div className="flex justify-between">
                    <dt>Envío</dt>
                    <dd>{resumen.envio === 0 ? <span className="font-medium text-green-700">Gratis</span> : usd2(resumen.envio)}</dd>
                  </div>
                  {resumen.faltaParaEnvioGratis !== null && resumen.faltaParaEnvioGratis > 0 ? (
                    <p className="text-xs text-muted-foreground">Te faltan {usd2(resumen.faltaParaEnvioGratis)} para envío gratis.</p>
                  ) : null}
                  <div className="flex justify-between pt-1 text-base font-bold">
                    <dt>Total</dt>
                    <dd>{usd2(resumen.total)}</dd>
                  </div>
                </dl>
              ) : (
                <div className="h-16 animate-pulse rounded bg-muted" aria-hidden />
              )}
              <Button
                size="lg"
                className="h-12 w-full text-base"
                nativeButton={false}
                render={<Link href="/checkout" onClick={() => setAbierto(false)} />}
              >
                Ir a pagar
              </Button>
              <p className="text-center text-xs text-muted-foreground">Sin crear cuenta · Podés pagar al recibir</p>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
