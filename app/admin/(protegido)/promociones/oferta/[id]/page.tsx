import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { BotonGuardar, FormularioAccion } from "@/components/admin/formulario-accion";
import { RellenarPorcentaje } from "@/components/admin/rellenar-porcentaje";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { tablaPrecios } from "@/lib/admin/precios-tabla";
import { createClient } from "@/lib/supabase/server";
import { usd2 } from "@/lib/tienda/formato";
import { configTienda } from "@/lib/tienda/datos";
import { minimoSinPerdida as minimoSinPerdidaBase } from "@/lib/pricing";
import { formatoAlmacenamiento } from "@/lib/listas/normalizar";
import { guardarOferta } from "../../actions";
import { aLocalSV, estadoOferta } from "../../util";

// Editar una oferta: nombre, fechas, encendido y precio de oferta por variante.

type Variante = {
  id: string;
  producto_id: string;
  color: string | null;
  ram_gb: number | null;
  almacenamiento_gb: number | null;
  precio: number;
  activo: boolean;
  productos: { nombre: string; estado: string; orden: number; categorias: { nombre: string } | null } | null;
};


async function Editor({ params }: { params: PageProps<"/admin/promociones/oferta/[id]">["params"] }) {
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/.test(id)) notFound();
  const supabase = await createClient();
  const pct = (await configTienda()).descuentoSinTarjeta;
  const minimoSinPerdida = (costo: number) => minimoSinPerdidaBase(costo, pct);
  const [{ data: oferta }, { data: precios }, { data: vs, error }, filas] = await Promise.all([
    supabase.from("promociones").select("id, nombre, inicio, fin, activa").eq("id", id).maybeSingle(),
    supabase.from("promocion_precios").select("variante_id, precio").eq("promocion_id", id),
    supabase
      .from("variantes")
      .select("id, producto_id, color, ram_gb, almacenamiento_gb, precio, activo, productos(nombre, estado, orden, categorias(nombre))")
      .eq("activo", true)
      .gt("precio", 0),
    tablaPrecios(supabase).catch(() => []),
  ]);
  if (error) throw error;
  if (!oferta) notFound();
  const precioOferta = new Map((precios ?? []).map((p) => [p.variante_id as string, Number(p.precio)]));
  const costo = new Map(filas.map((f) => [`${f.productoId}|${f.ramGb ?? "-"}|${f.almacenamientoGb ?? "-"}`, f.mejor?.costo ?? null]));

  // Agrupar por producto, en el orden de la tienda
  const grupos = new Map<string, { nombre: string; categoria: string; orden: number; variantes: Variante[] }>();
  for (const v of (vs ?? []) as unknown as Variante[]) {
    if (!v.productos || v.productos.estado === "oculto") continue;
    const g = grupos.get(v.producto_id) ?? { nombre: v.productos.nombre, categoria: v.productos.categorias?.nombre ?? "", orden: v.productos.orden, variantes: [] };
    g.variantes.push(v);
    grupos.set(v.producto_id, g);
  }
  const lista = [...grupos.entries()].sort(
    ([, a], [, b]) => a.categoria.localeCompare(b.categoria) || a.orden - b.orden || a.nombre.localeCompare(b.nombre)
  );
  const estado = estadoOferta(oferta);

  return (
    <FormularioAccion accion={guardarOferta} className="space-y-6">
      <input type="hidden" name="id" value={oferta.id} />
      <Card>
        <CardHeader>
          <CardTitle>Datos de la oferta</CardTitle>
          <CardDescription>Estado ahora: {estado}. Horas de El Salvador.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-[2fr_1fr_1fr]">
          <div className="space-y-1">
            <Label htmlFor="of-nombre">Nombre (se ve en la tienda)</Label>
            <Input id="of-nombre" name="nombre" defaultValue={oferta.nombre} />
          </div>
          <div className="space-y-1">
            <Label htmlFor="of-inicio">Empieza</Label>
            <Input id="of-inicio" name="inicio" type="datetime-local" defaultValue={aLocalSV(oferta.inicio)} />
          </div>
          <div className="space-y-1">
            <Label htmlFor="of-fin">Termina</Label>
            <Input id="of-fin" name="fin" type="datetime-local" defaultValue={aLocalSV(oferta.fin)} />
          </div>
          <label className="flex items-center gap-2 text-sm font-medium sm:col-span-3">
            <input type="checkbox" name="activa" defaultChecked={oferta.activa} className="size-4" />
            Oferta activa (se muestra en la tienda dentro de sus fechas)
          </label>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Precios de oferta</CardTitle>
          <CardDescription>
            Dejá vacío lo que no entra en la oferta. &quot;Mínimo sin pérdida&quot; es el precio más bajo que no pierde dinero aunque el
            cliente pague en efectivo con {pct}% y sin cobrar envío.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {lista.map(([productoId, g]) => (
            <section key={productoId} className="space-y-2">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h3 className="font-semibold">
                  {g.nombre} <span className="text-xs font-normal text-muted-foreground">{g.categoria}</span>
                </h3>
                <RellenarPorcentaje producto={productoId} />
              </div>
              <div className="overflow-x-auto rounded-lg border">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50 text-left text-xs text-muted-foreground">
                    <tr>
                      <th className="p-2">Opción</th>
                      <th className="p-2 text-right">Normal</th>
                      <th className="p-2 text-right">Costo puesto</th>
                      <th className="p-2 text-right">Mínimo sin pérdida</th>
                      <th className="w-36 p-2">Precio de oferta</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {g.variantes
                      .sort((a, b) => (a.almacenamiento_gb ?? 0) - (b.almacenamiento_gb ?? 0) || (a.color ?? "").localeCompare(b.color ?? ""))
                      .map((v) => {
                        const c = costo.get(`${v.producto_id}|${v.ram_gb ?? "-"}|${v.almacenamiento_gb ?? "-"}`) ?? null;
                        const actual = precioOferta.get(v.id);
                        const memoria =
                          v.almacenamiento_gb === null
                            ? null
                            : v.ram_gb === null
                              ? formatoAlmacenamiento(v.almacenamiento_gb)
                              : `${v.ram_gb} + ${formatoAlmacenamiento(v.almacenamiento_gb)}`;
                        return (
                          <tr key={v.id}>
                            <td className="p-2">{[memoria, v.color].filter(Boolean).join(" · ") || "Única"}</td>
                            <td className="p-2 text-right">{usd2(Number(v.precio))}</td>
                            <td className="p-2 text-right text-muted-foreground">{c === null ? "—" : usd2(c)}</td>
                            <td className="p-2 text-right text-muted-foreground">{c === null ? "—" : usd2(minimoSinPerdida(c))}</td>
                            <td className="p-2">
                              <Input
                                name={`precio_${v.id}`}
                                inputMode="decimal"
                                defaultValue={actual === undefined ? "" : actual.toFixed(2)}
                                data-producto={productoId}
                                data-normal={Number(v.precio)}
                                data-minimo={c === null ? "" : minimoSinPerdida(c)}
                                aria-label={`Precio de oferta ${g.nombre} ${[memoria, v.color].filter(Boolean).join(" ")}`}
                                className="h-8"
                              />
                            </td>
                          </tr>
                        );
                      })}
                  </tbody>
                </table>
              </div>
            </section>
          ))}
        </CardContent>
      </Card>
      <div className="sticky bottom-0 flex items-center gap-3 border-t bg-background py-3">
        <BotonGuardar>Guardar oferta</BotonGuardar>
        <Link href="/admin/promociones" className="text-sm text-muted-foreground hover:underline">
          Volver a Promociones
        </Link>
      </div>
    </FormularioAccion>
  );
}

export default function EditarOferta({ params }: PageProps<"/admin/promociones/oferta/[id]">) {
  return (
    <div className="max-w-5xl space-y-4">
      <div>
        <Link href="/admin/promociones" className="text-sm text-muted-foreground hover:underline">
          ← Promociones
        </Link>
        <h1 className="text-xl font-semibold">Oferta con fecha</h1>
      </div>
      <Suspense fallback={<p className="text-sm text-muted-foreground">Cargando…</p>}>
        <Editor params={params} />
      </Suspense>
    </div>
  );
}
