import Link from "next/link";
import { Suspense } from "react";
import { AlertTriangle, ChevronRight } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { DIAS_LENTO, leerInventario, porPagar, textoVencimiento, diasParaVencer } from "@/lib/admin/inventario";
import { superAdmin } from "@/lib/admin/sesion";
import { minimoSinPerdida } from "@/lib/pricing";
import { preciosDeOferta } from "@/lib/tienda/calculo";
import { configTienda } from "@/lib/tienda/datos";
import { fechaCorta, usd2 } from "@/lib/tienda/formato";
import { CONDICION } from "@/lib/inventario/identificadores";

// Inventario (solo administradores): lo que hay en bodega con su costo, lo que se mueve lento,
// lo que falta identificar (IMEI / serie) y las facturas de proveedor por pagar.

function Cifra({ titulo, valor, detalle, alerta }: { titulo: string; valor: string; detalle?: string; alerta?: boolean }) {
  return (
    <div className={`rounded-lg border p-3 ${alerta ? "border-amber-300 bg-amber-50" : ""}`}>
      <p className="text-xs text-muted-foreground">{titulo}</p>
      <p className="text-xl font-semibold tabular-nums">{valor}</p>
      {detalle ? <p className="text-xs text-muted-foreground">{detalle}</p> : null}
    </div>
  );
}

async function Contenido() {
  const { supabase } = await superAdmin();
  const [filas, cuentas, config] = await Promise.all([leerInventario(supabase), porPagar(supabase), configTienda()]);
  const ofertas = await preciosDeOferta(filas.map((f) => f.varianteId));
  const pct = config.descuentoSinTarjeta;

  const unidades = filas.reduce((s, f) => s + f.enBodega, 0);
  const valor = filas.reduce((s, f) => s + f.valor, 0);
  const sinCosto = filas.reduce((s, f) => s + f.sinCosto, 0);
  const faltanId = filas.reduce((s, f) => s + f.faltanId, 0);
  const lentos = filas.filter((f) => f.lento);
  const conPerdida = filas
    .map((f) => {
      const precio = Math.min(f.precio, ofertas.get(f.varianteId)?.precio ?? Infinity);
      const piso = f.costoProximo !== null ? minimoSinPerdida(f.costoProximo, pct) : null;
      return { ...f, precioVigente: precio, piso };
    })
    .filter((f) => f.piso !== null && f.precioVigente > 0 && f.precioVigente < f.piso);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <Cifra titulo="Unidades en bodega" valor={String(unidades)} detalle={`${filas.length} variantes`} />
        <Cifra
          titulo="Valor al costo"
          valor={usd2(valor)}
          detalle={sinCosto ? `${sinCosto} ${sinCosto === 1 ? "unidad" : "unidades"} sin costo` : "Todo con costo"}
          alerta={sinCosto > 0}
        />
        <Cifra
          titulo="Por pagar a proveedores"
          valor={usd2(cuentas.total)}
          detalle={cuentas.vencidas ? `${cuentas.vencidas} vencidas` : `${cuentas.estaSemana} vencen esta semana`}
          alerta={cuentas.vencidas > 0}
        />
        <Cifra titulo={`Lento (más de ${DIAS_LENTO} días)`} valor={String(lentos.reduce((s, f) => s + f.enBodega, 0))} alerta={lentos.length > 0} />
      </div>

      {faltanId || conPerdida.length ? (
        <div className="space-y-2">
          {faltanId ? (
            <p className="flex items-start gap-2 rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm">
              <AlertTriangle className="mt-0.5 size-4 shrink-0 text-amber-700" aria-hidden />
              <span>
                Faltan <b>{faltanId}</b> IMEI o números de serie por registrar. Sin ellos no se puede comprobar en una garantía que el
                equipo es nuestro. Tocá la variante marcada abajo y registralos.
              </span>
            </p>
          ) : null}
          {conPerdida.map((f) => (
            <p key={f.varianteId} className="flex items-start gap-2 rounded-lg border border-red-300 bg-red-50 p-3 text-sm">
              <AlertTriangle className="mt-0.5 size-4 shrink-0 text-red-700" aria-hidden />
              <span>
                <b>
                  {f.producto} {f.variante}
                </b>{" "}
                se vende a {usd2(f.precioVigente)} y lo que tenés en bodega costó {usd2(f.costoProximo ?? 0)}: con el {pct}% de
                descuento en efectivo, el envío y la comisión se pierde. Mínimo sin pérdida: {usd2(f.piso ?? 0)}.{" "}
                <Link href={`/admin/precios?q=${encodeURIComponent(f.producto)}`} className="font-medium underline">
                  Revisar precio
                </Link>
              </span>
            </p>
          ))}
        </div>
      ) : null}

      <Card>
        <CardHeader className="flex items-start justify-between gap-3">
          <div className="space-y-1">
            <CardTitle>Facturas por pagar</CardTitle>
            <CardDescription>De la que vence primero a la última.</CardDescription>
          </div>
          <Link href="/admin/inventario/compras" className="shrink-0 text-sm font-medium text-primary hover:underline">
            Todas las compras
          </Link>
        </CardHeader>
        <CardContent>
          {cuentas.compras.length ? (
            <ul className="divide-y rounded-lg border text-sm">
              {cuentas.compras.map((c) => {
                const d = diasParaVencer(c.vence_en);
                return (
                  <li key={c.id}>
                    <Link href={`/admin/inventario/compras/${c.id}`} className="flex flex-wrap items-center gap-x-4 gap-y-1 p-3 hover:bg-muted/50">
                      <span className="min-w-40 flex-1">
                        <span className="block font-medium">{c.proveedores?.nombre ?? "Sin proveedor"}</span>
                        <span className="block text-xs text-muted-foreground">
                          Factura {c.numero || "sin número"} · {fechaCorta(`${c.fecha}T12:00:00`)} ·{" "}
                          {c.condicion === "credito" ? `crédito ${c.dias_credito} días` : "contado"}
                          {c.estado === "borrador" ? " · sin recibir" : ""}
                        </span>
                      </span>
                      <span className={`text-xs font-medium ${d < 0 ? "text-red-700" : d <= 3 ? "text-amber-700" : "text-muted-foreground"}`}>
                        {textoVencimiento(c)}
                      </span>
                      <span className="w-24 text-right font-semibold tabular-nums">{usd2(Number(c.total))}</span>
                      <ChevronRight className="size-4 text-muted-foreground" aria-hidden />
                    </Link>
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="text-sm text-muted-foreground">No hay facturas pendientes de pago.</p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>En bodega</CardTitle>
          <CardDescription>
            Lo más viejo primero: es lo que conviene vender antes. Lento = más de {DIAS_LENTO} días en bodega y sin ventas en {DIAS_LENTO}{" "}
            días. Tocá una fila para ver su kardex, sus unidades e IMEI.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {filas.length ? (
            <ul className="divide-y rounded-lg border text-sm">
              {filas.map((f) => (
                <li key={f.varianteId}>
                  <Link
                    href={`/admin/inventario/variante/${f.varianteId}`}
                    className="flex flex-wrap items-center gap-x-4 gap-y-1 p-3 hover:bg-muted/50"
                  >
                    <span className="min-w-48 flex-1">
                      <span className="block font-medium">
                        {f.producto} <span className="font-normal text-muted-foreground">{f.variante}</span>
                      </span>
                      <span className="mt-0.5 flex flex-wrap gap-1 text-[11px]">
                        {f.condicion !== "nuevo" ? (
                          <span className="rounded-full bg-amber-100 px-2 py-0.5 text-amber-900">{CONDICION[f.condicion]}</span>
                        ) : null}
                        {f.lento ? <span className="rounded-full bg-red-100 px-2 py-0.5 text-red-800">Lento</span> : null}
                        {f.faltanId ? (
                          <span className="rounded-full bg-amber-100 px-2 py-0.5 text-amber-900">
                            Faltan {f.faltanId} {f.tipoId === "imei" ? "IMEI" : "series"}
                          </span>
                        ) : null}
                        {f.sinCosto ? <span className="rounded-full bg-muted px-2 py-0.5">Sin costo: {f.sinCosto}</span> : null}
                      </span>
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {f.diasEnBodega} {f.diasEnBodega === 1 ? "día" : "días"}
                      <span className="block">{f.ultimaVenta ? `Última venta ${fechaCorta(f.ultimaVenta)}` : "Sin ventas recientes"}</span>
                    </span>
                    <span className="w-28 text-right">
                      <span className="block font-semibold tabular-nums">{f.enBodega} u.</span>
                      <span className="block text-xs text-muted-foreground tabular-nums">
                        {f.costoProximo !== null ? `${usd2(f.costoProximo)} c/u` : "sin costo"}
                      </span>
                    </span>
                    <ChevronRight className="size-4 text-muted-foreground" aria-hidden />
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted-foreground">No hay nada en bodega. Registrá una compra para empezar.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default function Inventario() {
  return (
    <div className="max-w-5xl space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold">Inventario</h1>
          <p className="text-sm text-muted-foreground">
            Lo que está en bodega sale en menos de 24 horas; lo demás se pide al proveedor (menos de 48 horas). Lo primero que entra es
            lo primero que sale.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href="/admin/garantia" className="rounded-md border px-3 py-2 text-sm font-medium hover:bg-muted">
            Buscar IMEI
          </Link>
          <Link href="/admin/inventario/compras/nueva" className="rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground">
            + Nueva compra
          </Link>
        </div>
      </div>
      <Suspense fallback={<p className="text-sm text-muted-foreground">Cargando…</p>}>
        <Contenido />
      </Suspense>
    </div>
  );
}
