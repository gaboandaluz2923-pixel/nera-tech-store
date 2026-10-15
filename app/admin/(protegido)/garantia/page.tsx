import Link from "next/link";
import { Suspense } from "react";
import { CheckCircle2, ShieldAlert, XCircle } from "lucide-react";
import { FilaEditable } from "@/components/admin/editable";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { equipo } from "@/lib/admin/sesion";
import { nombresEquipo, quien } from "@/lib/admin/historial";
import { CONDICION, ESTADO_UNIDAD, type Condicion, type EstadoUnidad } from "@/lib/inventario/identificadores";
import { fechaCorta } from "@/lib/tienda/formato";
import { cambiarEstadoUnidad } from "../inventario/actions";

// Garantía: con el IMEI o el número de serie se sabe si el equipo es nuestro, cuándo y a quién se vendió,
// de qué compra salió y si sigue en garantía. También lo usa el operador.

type Resultado = {
  id: string;
  identificador: string;
  identificador2: string | null;
  tipo: string;
  condicion: Condicion;
  estado: EstadoUnidad;
  notas: string | null;
  producto: string;
  producto_id: string;
  registrada_en: string;
  registrada_por: string | null;
  compra_numero: string | null;
  compra_fecha: string | null;
  proveedor: string | null;
  pedido_id: string | null;
  pedido_numero: number | null;
  pedido_estado: string | null;
  cliente_id: string | null;
  cliente: string | null;
  cliente_telefono: string | null;
  vendida_en: string | null;
  garantia_hasta: string | null;
};

async function Resultados({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const { q = "" } = await searchParams;
  const { supabase, esSuperAdmin } = await equipo();
  const busca = q.trim();
  if (!busca) {
    return (
      <p className="text-sm text-muted-foreground">
        Escribí o escaneá el IMEI (está en la caja o marcando *#06# en el teléfono) o el número de serie. Con 6 o más números también
        busca coincidencias parciales.
      </p>
    );
  }
  const [{ data, error }, nombres] = await Promise.all([supabase.rpc("inv_buscar_unidad", { p_texto: busca }), nombresEquipo(supabase)]);
  if (error) return <p className="text-sm text-red-700">No se pudo buscar: {error.message}</p>;
  const lista = (data ?? []) as Resultado[];
  if (!lista.length) {
    return (
      <Card className="border-red-300">
        <CardContent className="flex items-start gap-3 pt-6 text-sm">
          <XCircle className="mt-0.5 size-5 shrink-0 text-red-700" aria-hidden />
          <p>
            <b>{busca}</b> no está registrado en Nera Tech. Si el cliente dice que lo compró con nosotros, pedile la factura y buscalo en
            Pedidos por su nombre o teléfono (los equipos vendidos antes del control por IMEI no aparecen aquí).
          </p>
        </CardContent>
      </Card>
    );
  }
  const hoy = new Date().toLocaleDateString("en-CA", { timeZone: "America/El_Salvador" });
  return (
    <div className="space-y-3">
      {lista.map((r) => {
        const vigente = r.garantia_hasta ? r.garantia_hasta.slice(0, 10) >= hoy : null;
        return (
          <Card key={r.id}>
            <CardContent className="space-y-3 pt-6 text-sm">
              <div className="flex items-start gap-3">
                {r.estado === "vendida" || r.estado === "garantia" ? (
                  vigente ? (
                    <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-green-700" aria-hidden />
                  ) : (
                    <ShieldAlert className="mt-0.5 size-5 shrink-0 text-amber-700" aria-hidden />
                  )
                ) : (
                  <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-muted-foreground" aria-hidden />
                )}
                <div className="min-w-0 flex-1">
                  <p className="font-mono text-base">
                    {r.identificador}
                    {r.identificador2 ? <span className="text-muted-foreground"> · {r.identificador2}</span> : null}
                  </p>
                  <p className="font-medium">{r.producto}</p>
                  <p className="text-muted-foreground">
                    Es nuestro · {CONDICION[r.condicion]} · {ESTADO_UNIDAD[r.estado]}
                  </p>
                </div>
              </div>
              <dl className="grid gap-x-6 gap-y-2 sm:grid-cols-2">
                <div>
                  <dt className="text-xs text-muted-foreground">Vendido</dt>
                  <dd>
                    {r.pedido_numero ? (
                      <>
                        <Link href={`/admin/pedidos/${r.pedido_id}`} className="text-primary underline">
                          Pedido #{r.pedido_numero}
                        </Link>
                        {r.vendida_en ? ` · ${fechaCorta(r.vendida_en)}` : ""}
                      </>
                    ) : r.estado === "historial" ? (
                      "Antes del sistema (la venta no quedó registrada aquí: buscala en Clientes por nombre o teléfono)"
                    ) : (
                      "No (está en bodega o de baja)"
                    )}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs text-muted-foreground">Cliente</dt>
                  <dd>
                    {r.cliente_id ? (
                      <Link href={`/admin/clientes/${r.cliente_id}`} className="text-primary underline">
                        {r.cliente || "Sin nombre"}
                      </Link>
                    ) : (
                      "—"
                    )}
                    {r.cliente_telefono ? ` · ${r.cliente_telefono}` : ""}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs text-muted-foreground">Garantía</dt>
                  <dd className={vigente === false ? "font-medium text-amber-700" : vigente ? "font-medium text-green-700" : ""}>
                    {r.garantia_hasta
                      ? `${vigente ? "Vigente" : "Vencida"} · hasta ${fechaCorta(`${r.garantia_hasta.slice(0, 10)}T12:00:00`)}`
                      : r.estado === "historial"
                        ? "12 meses desde la fecha de su factura"
                        : "Empieza al venderse"}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs text-muted-foreground">Entró a bodega</dt>
                  <dd>
                    {r.compra_fecha ? fechaCorta(`${r.compra_fecha.slice(0, 10)}T12:00:00`) : fechaCorta(r.registrada_en)}
                    {r.proveedor ? ` · ${r.proveedor}` : ""}
                    {r.compra_numero ? ` · factura ${r.compra_numero}` : ""}
                    {!r.proveedor ? ` · registró ${quien(r.registrada_por, nombres)}` : ""}
                  </dd>
                </div>
              </dl>
              {r.notas ? <p className="rounded-md bg-muted/50 p-2 text-xs">{r.notas}</p> : null}

              {r.estado === "vendida" || r.estado === "garantia" ? (
                <FilaEditable
                  accion={cambiarEstadoUnidad}
                  className="rounded-md border p-3"
                  textoEditar={r.estado === "vendida" ? "Entra a garantía" : "Sale de garantía (se entregó)"}
                  textoGuardar="Guardar"
                >
                  <input type="hidden" name="unidad_id" value={r.id} />
                  <input type="hidden" name="estado" value={r.estado === "vendida" ? "garantia" : "vendida"} />
                  <Input
                    name="nota"
                    required
                    placeholder={r.estado === "vendida" ? "Qué falla reporta el cliente" : "Qué se hizo (reparado, cambiado por…)"}
                  />
                </FilaEditable>
              ) : r.estado === "en_bodega" && esSuperAdmin ? (
                <FilaEditable accion={cambiarEstadoUnidad} className="rounded-md border p-3" textoEditar="Dar de baja" textoGuardar="Dar de baja">
                  <input type="hidden" name="unidad_id" value={r.id} />
                  <input type="hidden" name="estado" value="baja" />
                  <Input name="nota" required placeholder="Por qué sale de bodega (dañado, perdido…)" />
                  <p className="text-xs text-muted-foreground">Sale una unidad del stock en bodega y queda en el kardex.</p>
                </FilaEditable>
              ) : null}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

export default function Garantia(props: PageProps<"/admin/garantia">) {
  return (
    <div className="max-w-3xl space-y-4">
      <div>
        <h1 className="text-xl font-semibold">Garantía: buscar IMEI o serie</h1>
        <p className="text-sm text-muted-foreground">Para saber si un equipo es nuestro antes de recibirlo por garantía.</p>
      </div>
      <Suspense fallback={null}>
        <Buscador searchParams={props.searchParams as Promise<{ q?: string }>} />
      </Suspense>
      <Suspense fallback={<p className="text-sm text-muted-foreground">Buscando…</p>}>
        <Resultados searchParams={props.searchParams as Promise<{ q?: string }>} />
      </Suspense>
    </div>
  );
}

async function Buscador({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const { q = "" } = await searchParams;
  return (
    <form action="/admin/garantia" className="flex flex-wrap gap-2">
      <input
        name="q"
        defaultValue={q}
        inputMode="text"
        autoComplete="off"
        autoFocus
        placeholder="IMEI o número de serie"
        aria-label="IMEI o número de serie"
        className="h-10 w-80 max-w-full rounded-md border px-3 font-mono text-sm"
      />
      <button type="submit" className="h-10 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground">
        Buscar
      </button>
    </form>
  );
}
