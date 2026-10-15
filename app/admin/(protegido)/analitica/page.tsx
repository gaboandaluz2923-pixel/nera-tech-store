import Link from "next/link";
import { Suspense } from "react";
import { BotonGuardar, FormularioAccion } from "@/components/admin/formulario-accion";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { datosAnalitica, type FilaSemana } from "@/lib/admin/analitica";
import { createClient } from "@/lib/supabase/server";
import { usd2 } from "@/lib/tienda/formato";
import { guardarGasto } from "./actions";

// Analítica: embudo de la tienda, productos, de dónde vienen las visitas, WhatsApp,
// ventas y contribución por semana, y el gasto de pauta con costo por pedido y ROAS.

const pct = (a: number, b: number) => (b > 0 ? `${((a / b) * 100).toFixed(1)}%` : "—");
const semanaCorta = (s: string) =>
  new Date(`${s}T12:00:00Z`).toLocaleDateString("es-SV", { day: "numeric", month: "short", timeZone: "UTC" });
const roas = (f: FilaSemana) => (f.gasto > 0 ? (f.ventas / f.gasto).toFixed(1) : "—");

function Dato({ titulo, valor, antes, ayuda }: { titulo: string; valor: string; antes?: string; ayuda?: string }) {
  return (
    <div className="rounded-lg border p-3">
      <p className="text-xs text-muted-foreground">{titulo}</p>
      <p className="text-xl font-bold">{valor}</p>
      {antes ? <p className="text-xs text-muted-foreground">Semana pasada: {antes}</p> : null}
      {ayuda ? <p className="text-xs text-muted-foreground">{ayuda}</p> : null}
    </div>
  );
}

const th = "p-2 text-right font-medium";
const td = "p-2 text-right tabular-nums";

async function Contenido() {
  const supabase = await createClient();
  const d = await datosAnalitica(supabase, 8);
  const [esta, pasada] = d.semanas;
  const hayDatos = d.semanas.some((s) => s.sesiones || s.pedidos);

  return (
    <div className="space-y-6">
      {!hayDatos ? (
        <p className="rounded-lg bg-amber-50 p-3 text-sm text-amber-900">
          Todavía no hay datos: se empiezan a juntar desde que la medición está publicada. Volvé en unos días.
        </p>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>Esta semana</CardTitle>
          <CardDescription>De lunes a hoy, hora de El Salvador.</CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Dato titulo="Visitas (personas)" valor={String(esta.sesiones)} antes={String(pasada.sesiones)} />
          <Dato titulo="Pedidos" valor={String(esta.pedidos)} antes={String(pasada.pedidos)} />
          <Dato titulo="Conversión" valor={pct(esta.pedidos, esta.sesiones)} antes={pct(pasada.pedidos, pasada.sesiones)} />
          <Dato titulo="Clics a WhatsApp" valor={String(esta.whatsapp)} antes={String(pasada.whatsapp)} />
          <Dato titulo="Ventas" valor={usd2(esta.ventas)} antes={usd2(pasada.ventas)} />
          <Dato titulo="Contribución" valor={usd2(esta.contribucion)} antes={usd2(pasada.contribucion)} ayuda="Ventas − costo − envío − comisión" />
          <Dato titulo="Gasto en pauta" valor={usd2(esta.gasto)} antes={usd2(pasada.gasto)} />
          <Dato
            titulo="Ganancia después de pauta"
            valor={usd2(esta.contribucion - esta.gasto)}
            antes={usd2(pasada.contribucion - pasada.gasto)}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Embudo por semana</CardTitle>
          <CardDescription>
            Cuántas personas llegaron a cada paso. Si un paso cae mucho respecto al anterior, ahí se está perdiendo la venta.
          </CardDescription>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-sm">
            <thead className="border-b text-xs text-muted-foreground">
              <tr>
                <th className="p-2 text-left font-medium">Semana del</th>
                <th className={th}>Visitas</th>
                <th className={th}>Vieron un producto</th>
                <th className={th}>Agregaron al carrito</th>
                <th className={th}>Fueron a pagar</th>
                <th className={th}>Pedidos</th>
                <th className={th}>Conversión</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {d.semanas.map((f) => (
                <tr key={f.semana}>
                  <td className="p-2">{semanaCorta(f.semana)}</td>
                  <td className={td}>{f.sesiones}</td>
                  <td className={td}>
                    {f.vieronProducto} <span className="text-xs text-muted-foreground">{pct(f.vieronProducto, f.sesiones)}</span>
                  </td>
                  <td className={td}>
                    {f.agregaron} <span className="text-xs text-muted-foreground">{pct(f.agregaron, f.vieronProducto)}</span>
                  </td>
                  <td className={td}>
                    {f.checkout} <span className="text-xs text-muted-foreground">{pct(f.checkout, f.agregaron)}</span>
                  </td>
                  <td className={td}>
                    {f.pedidos} <span className="text-xs text-muted-foreground">{pct(f.pedidos, f.checkout)}</span>
                  </td>
                  <td className={`${td} font-semibold`}>{pct(f.pedidos, f.sesiones)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="mt-2 text-xs text-muted-foreground">El porcentaje chico es contra el paso anterior.</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Ventas y pauta por semana</CardTitle>
          <CardDescription>
            Costo por pedido = gasto ÷ pedidos. ROAS = ventas ÷ gasto (cuánto vendés por cada dólar de pauta). Si la ganancia después de pauta es
            negativa, la pauta está costando más de lo que deja.
          </CardDescription>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-sm">
            <thead className="border-b text-xs text-muted-foreground">
              <tr>
                <th className="p-2 text-left font-medium">Semana del</th>
                <th className={th}>Pedidos</th>
                <th className={th}>Ventas</th>
                <th className={th}>Contribución</th>
                <th className={th}>Pauta</th>
                <th className={th}>Costo por pedido</th>
                <th className={th}>ROAS</th>
                <th className={th}>Después de pauta</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {d.semanas.map((f) => (
                <tr key={f.semana}>
                  <td className="p-2">{semanaCorta(f.semana)}</td>
                  <td className={td}>{f.pedidos}</td>
                  <td className={td}>{usd2(f.ventas)}</td>
                  <td className={td}>{usd2(f.contribucion)}</td>
                  <td className={td}>{f.gasto ? usd2(f.gasto) : "—"}</td>
                  <td className={td}>{f.gasto && f.pedidos ? usd2(f.gasto / f.pedidos) : "—"}</td>
                  <td className={td}>{roas(f)}</td>
                  <td className={`${td} font-semibold ${f.contribucion - f.gasto < 0 ? "text-destructive" : "text-green-700"}`}>
                    {usd2(f.contribucion - f.gasto)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Gasto de pauta</CardTitle>
          <CardDescription>
            Anotá cada semana lo que gastaste en anuncios (lo ves en el Administrador de anuncios de Meta). Si ya hay un gasto en esa semana y canal,
            se corrige.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <FormularioAccion accion={guardarGasto} className="grid gap-3 sm:grid-cols-[1fr_1fr_1fr_1fr_auto] sm:items-end">
            <div className="space-y-1">
              <Label htmlFor="gp-semana">Un día de esa semana</Label>
              <Input id="gp-semana" name="semana" type="date" />
            </div>
            <div className="space-y-1">
              <Label htmlFor="gp-canal">Canal</Label>
              <select id="gp-canal" name="canal" defaultValue="meta" className="h-9 w-full rounded-md border bg-background px-2 text-sm">
                <option value="meta">Meta (Facebook e Instagram)</option>
                <option value="google">Google</option>
                <option value="tiktok">TikTok</option>
                <option value="otro">Otro</option>
              </select>
            </div>
            <div className="space-y-1">
              <Label htmlFor="gp-monto">Gasto ($)</Label>
              <Input id="gp-monto" name="monto" inputMode="decimal" placeholder="Ej. 35" />
            </div>
            <div className="space-y-1">
              <Label htmlFor="gp-conv">Conversaciones (opcional)</Label>
              <Input id="gp-conv" name="conversaciones" inputMode="numeric" placeholder="Chats de WhatsApp" />
            </div>
            <BotonGuardar>Guardar gasto</BotonGuardar>
            <div className="space-y-1 sm:col-span-5">
              <Label htmlFor="gp-notas">Nota (opcional)</Label>
              <Input id="gp-notas" name="notas" placeholder="Ej. campaña Galaxy A17" />
            </div>
          </FormularioAccion>
          {d.gastos.length ? (
            <ul className="divide-y rounded-lg border text-sm">
              {d.gastos.map((g) => (
                <li key={g.id} className="flex flex-wrap justify-between gap-2 p-2.5">
                  <span>
                    Semana del {semanaCorta(g.semana)} · {g.canal}
                    {g.notas ? <span className="text-muted-foreground"> · {g.notas}</span> : null}
                  </span>
                  <span className="font-medium">
                    {usd2(Number(g.monto))}
                    {g.conversaciones !== null ? <span className="font-normal text-muted-foreground"> · {g.conversaciones} conversaciones</span> : null}
                  </span>
                </li>
              ))}
            </ul>
          ) : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Productos (últimos 30 días)</CardTitle>
          <CardDescription>
            Personas que vieron cada ficha, que lo agregaron al carrito y unidades vendidas. &quot;Mucho interés, pocas ventas&quot; marca los que
            conviene revisar: precio, fotos o descripción.
          </CardDescription>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          {d.productos.length ? (
            <table className="w-full min-w-[560px] text-sm">
              <thead className="border-b text-xs text-muted-foreground">
                <tr>
                  <th className="p-2 text-left font-medium">Producto</th>
                  <th className={th}>Vistas</th>
                  <th className={th}>Al carrito</th>
                  <th className={th}>Vendidos</th>
                  <th className={th}>Vista → venta</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {d.productos.slice(0, 30).map((p) => (
                  <tr key={p.id}>
                    <td className="p-2">
                      <Link href={`/producto/${p.slug}`} target="_blank" className="hover:underline">
                        {p.nombre}
                      </Link>
                      {p.vistas >= 15 && p.vendidos === 0 ? (
                        <span className="ml-2 rounded-full bg-amber-100 px-2 py-0.5 text-xs text-amber-900">Mucho interés, pocas ventas</span>
                      ) : null}
                    </td>
                    <td className={td}>{p.vistas}</td>
                    <td className={td}>{p.agregados}</td>
                    <td className={td}>{p.vendidos}</td>
                    <td className={td}>{pct(p.vendidos, p.vistas)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p className="text-sm text-muted-foreground">Sin datos todavía.</p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Lo que más buscan (30 días)</CardTitle>
          <CardDescription>
            Lo que escriben en el buscador de la tienda. &quot;No encontró nada&quot; son productos que te piden y no tenés publicados: ideas para
            agregar al catálogo.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 text-sm md:grid-cols-2">
          <div>
            <p className="mb-2 font-medium">Más buscado</p>
            <ul className="divide-y rounded-lg border">
              {d.busquedas.length ? (
                d.busquedas.slice(0, 15).map((b) => (
                  <li key={b.termino} className="flex justify-between gap-2 p-2">
                    <Link href={`/buscar?q=${encodeURIComponent(b.termino)}`} target="_blank" className="hover:underline">
                      {b.termino}
                    </Link>
                    <span className="font-medium">{b.veces}</span>
                  </li>
                ))
              ) : (
                <li className="p-2 text-muted-foreground">Sin búsquedas todavía.</li>
              )}
            </ul>
          </div>
          <div>
            <p className="mb-2 font-medium">Buscaron y no encontraron nada</p>
            <ul className="divide-y rounded-lg border">
              {d.busquedas.filter((b) => b.sinResultados > 0).length ? (
                d.busquedas
                  .filter((b) => b.sinResultados > 0)
                  .sort((a, b) => b.sinResultados - a.sinResultados)
                  .slice(0, 15)
                  .map((b) => (
                    <li key={b.termino} className="flex justify-between gap-2 p-2">
                      <span>{b.termino}</span>
                      <span className="font-medium text-amber-700">{b.sinResultados}</span>
                    </li>
                  ))
              ) : (
                <li className="p-2 text-muted-foreground">Nada por ahora.</li>
              )}
            </ul>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>De dónde vienen (30 días)</CardTitle>
            <CardDescription>Visitas por origen: Facebook, Google, directo (escribieron la dirección o WhatsApp) u otro sitio.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <ul className="divide-y rounded-lg border">
              {d.origenes.length ? (
                d.origenes.map((o) => (
                  <li key={o.origen} className="flex justify-between p-2">
                    <span>{o.origen}</span>
                    <span className="font-medium">{o.sesiones}</span>
                  </li>
                ))
              ) : (
                <li className="p-2 text-muted-foreground">Sin datos todavía.</li>
              )}
            </ul>
            {d.pedidosPorOrigen.length ? (
              <p className="text-xs text-muted-foreground">
                Pedidos por origen (8 semanas): {d.pedidosPorOrigen.map(([o, n]) => `${o} ${n}`).join(" · ")}
              </p>
            ) : null}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Clics a WhatsApp (30 días)</CardTitle>
            <CardDescription>Desde qué parte de la tienda escriben.</CardDescription>
          </CardHeader>
          <CardContent className="text-sm">
            <ul className="divide-y rounded-lg border">
              {d.whatsapp.length ? (
                d.whatsapp.map((w) => (
                  <li key={w.codigo} className="flex justify-between p-2">
                    <span>{w.codigo}</span>
                    <span className="font-medium">{w.clics}</span>
                  </li>
                ))
              ) : (
                <li className="p-2 text-muted-foreground">Sin datos todavía.</li>
              )}
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default function Analitica() {
  return (
    <div className="max-w-5xl space-y-4">
      <div>
        <h1 className="text-xl font-semibold">Analítica</h1>
        <p className="text-sm text-muted-foreground">
          Datos propios de la tienda (no dependen de Google ni de Meta). Las últimas 8 semanas, de lunes a domingo.
        </p>
      </div>
      <Suspense fallback={<p className="text-sm text-muted-foreground">Cargando…</p>}>
        <Contenido />
      </Suspense>
    </div>
  );
}
