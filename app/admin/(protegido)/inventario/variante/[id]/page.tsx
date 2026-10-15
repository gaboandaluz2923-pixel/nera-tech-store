import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { Editable, FilaEditable } from "@/components/admin/editable";
import { Dato, Datos } from "@/components/admin/vista";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { nombresEquipo, quien } from "@/lib/admin/historial";
import { superAdmin } from "@/lib/admin/sesion";
import { CONDICION, ESTADO_UNIDAD, TIPO_MOVIMIENTO, type Condicion, type EstadoUnidad } from "@/lib/inventario/identificadores";
import { fechaCorta, fechaHora, usd2 } from "@/lib/tienda/formato";
import { ajustarStock, cambiarEstadoUnidad, moverUnidad, registrarIdentificadores } from "../../actions";

// Una variante en bodega: sus lotes (costo y fecha), sus unidades con IMEI / serie y su kardex.

type Variante = {
  id: string;
  nombre: string;
  stock: number;
  precio: number;
  producto_id: string;
  productos: {
    nombre: string;
    condicion: Condicion | null;
    producto_base_id: string | null;
    categorias: { identificador: "imei" | "serie" | null } | null;
  } | null;
};
type Lote = { id: string; origen: string; fecha: string; cantidad_inicial: number; cantidad: number; costo_unitario: number | null };
type Unidad = {
  id: string;
  identificador: string;
  identificador2: string | null;
  tipo: string;
  condicion: Condicion;
  estado: EstadoUnidad;
  lote_id: string | null;
  pedido_id: string | null;
  notas: string | null;
  created_at: string;
  pedidos: { numero: number } | null;
};
type Movimiento = {
  id: number;
  tipo: string;
  cantidad: number;
  costo_unitario: number | null;
  nota: string | null;
  usuario: string | null;
  created_at: string;
  pedido_id: string | null;
  compra_id: string | null;
};

const SELECT = "h-9 w-full rounded-md border bg-background px-2 text-sm";

async function Detalle({ params }: { params: PageProps<"/admin/inventario/variante/[id]">["params"] }) {
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/.test(id)) notFound();
  const { supabase } = await superAdmin();
  const [{ data: vData }, { data: lotesData }, { data: unidadesData }, { data: movData }, nombres] = await Promise.all([
    supabase
      .from("variantes")
      .select("id, nombre, stock, precio, producto_id, productos(nombre, condicion, producto_base_id, categorias(identificador))")
      .eq("id", id)
      .maybeSingle(),
    supabase.from("lotes").select("id, origen, fecha, cantidad_inicial, cantidad, costo_unitario").eq("variante_id", id).order("fecha").order("created_at"),
    supabase
      .from("unidades")
      .select("id, identificador, identificador2, tipo, condicion, estado, lote_id, pedido_id, notas, created_at, pedidos(numero)")
      .eq("variante_id", id)
      .order("created_at", { ascending: false })
      .limit(500),
    supabase
      .from("movimientos_inventario")
      .select("id, tipo, cantidad, costo_unitario, nota, usuario, created_at, pedido_id, compra_id")
      .eq("variante_id", id)
      .order("created_at", { ascending: false })
      .limit(150),
    nombresEquipo(supabase),
  ]);
  if (!vData) notFound();
  const v = vData as unknown as Variante;
  const lotes = (lotesData ?? []) as Lote[];
  const unidades = (unidadesData ?? []) as unknown as Unidad[];
  const movimientos = (movData ?? []) as Movimiento[];
  const tipo = v.productos?.categorias?.identificador ?? "serie";
  const condicion = v.productos?.condicion ?? "nuevo";
  const enBodega = unidades.filter((u) => u.estado === "en_bodega");
  const faltan = Math.max(0, v.stock - enBodega.length);
  const conCosto = lotes.filter((l) => l.cantidad > 0 && l.costo_unitario !== null);
  const valor = conCosto.reduce((s, l) => s + l.cantidad * Number(l.costo_unitario), 0);

  // A dónde puede pasar una unidad: las fichas Open Box / usado de este modelo (o el modelo nuevo, si esta es Open Box)
  const baseId = condicion === "nuevo" ? v.producto_id : v.productos?.producto_base_id;
  const { data: destinosData } = baseId
    ? await supabase
        .from("variantes")
        .select("id, nombre, productos!inner(id, nombre, condicion, producto_base_id)")
        .or(`producto_base_id.eq.${baseId},id.eq.${baseId}`, { referencedTable: "productos" })
        .neq("id", id)
    : { data: [] };
  const destinos = ((destinosData ?? []) as unknown as {
    id: string;
    nombre: string;
    productos: { nombre: string; condicion: Condicion };
  }[]).filter((d) => d.productos);

  return (
    <div className="space-y-4">
      <div>
        <Link href="/admin/inventario" className="text-sm text-muted-foreground hover:underline">
          ← Inventario
        </Link>
        <h1 className="text-xl font-semibold">
          {v.productos?.nombre} <span className="font-normal text-muted-foreground">{v.nombre}</span>
        </h1>
        <p className="text-sm">
          <Link href={`/admin/catalogo/${v.producto_id}`} className="text-primary underline">
            Ver en Catálogo
          </Link>
        </p>
      </div>

      <Card>
        <CardContent className="pt-6">
          <Datos columnas={3}>
            <Dato etiqueta="En bodega">
              <span className="text-lg font-semibold">{v.stock}</span>
            </Dato>
            <Dato etiqueta="Valor al costo">{usd2(valor)}</Dato>
            <Dato etiqueta="Precio de venta">{usd2(Number(v.precio))}</Dato>
            <Dato etiqueta="Condición">{CONDICION[condicion]}</Dato>
            <Dato etiqueta="Identificador">{tipo === "imei" ? "IMEI (obligatorio)" : "Número de serie o código Nera"}</Dato>
            <Dato etiqueta="Sin identificar">
              <span className={faltan ? "font-medium text-amber-700" : ""}>{faltan}</span>
            </Dato>
          </Datos>
        </CardContent>
      </Card>

      {/* Registrar identificadores del stock que no los tiene */}
      {faltan ? (
        <Editable
          titulo={`Registrar ${tipo === "imei" ? "IMEI" : "números de serie"} (faltan ${faltan})`}
          descripcion="Para el stock que ya estaba en bodega antes del control por unidad. Uno por línea; doble SIM: los dos IMEI en la misma línea separados por coma."
          accion={registrarIdentificadores}
          textoEditar="+ Registrar"
          vista={<p className="text-sm text-muted-foreground">Sin identificador no se puede comprobar en una garantía que la unidad es nuestra.</p>}
        >
          <input type="hidden" name="variante_id" value={v.id} />
          <Textarea name="identificadores" rows={Math.min(8, faltan + 1)} className="font-mono text-sm" placeholder="356789012345607" />
          {tipo === "serie" ? (
            <div className="space-y-1">
              <Label htmlFor="codigos_nera">Códigos Nera para las que no traen número de serie</Label>
              <Input id="codigos_nera" name="codigos_nera" type="number" min="0" max={faltan} defaultValue={0} className="w-28" />
              <p className="text-xs text-muted-foreground">El sistema crea NT-000123, NT-000124…: escribilos o pegalos como etiqueta en cada caja.</p>
            </div>
          ) : null}
        </Editable>
      ) : null}

      {/* Ajuste */}
      <Editable
        titulo="Ajuste por conteo"
        descripcion="Solo si al contar la bodega hay una diferencia. Las compras y las ventas mueven el stock solas."
        accion={ajustarStock}
        textoEditar="Ajustar"
        vista={<p className="text-sm text-muted-foreground">Último conteo: el kardex de abajo muestra cada ajuste con quién y por qué.</p>}
      >
        <input type="hidden" name="variante_id" value={v.id} />
        <div className="grid gap-3 sm:grid-cols-3">
          <div className="space-y-1">
            <Label htmlFor="aj-total">Unidades contadas</Label>
            <Input id="aj-total" name="total" type="number" min="0" defaultValue={v.stock} />
          </div>
          <div className="space-y-1">
            <Label htmlFor="aj-costo">Costo c/u de las que sobran (si sube)</Label>
            <Input id="aj-costo" name="costo" inputMode="decimal" placeholder="Último costo" />
          </div>
          <div className="space-y-1">
            <Label htmlFor="aj-nota">Motivo</Label>
            <Input id="aj-nota" name="nota" required placeholder="Conteo de bodega" />
          </div>
        </div>
        {tipo === "imei" ? (
          <p className="text-xs text-muted-foreground">
            Si sale un celular por daño o pérdida, mejor usá «Dar de baja» en la unidad (abajo): así queda claro cuál IMEI salió.
          </p>
        ) : null}
      </Editable>

      {/* Lotes */}
      <Card>
        <CardHeader>
          <CardTitle>Lotes (lo más viejo sale primero)</CardTitle>
        </CardHeader>
        <CardContent>
          {lotes.length ? (
            <ul className="divide-y rounded-lg border text-sm">
              {lotes.map((l) => (
                <li key={l.id} className={`flex flex-wrap items-center gap-x-4 gap-y-1 p-3 ${l.cantidad === 0 ? "text-muted-foreground" : ""}`}>
                  <span className="flex-1">
                    {fechaCorta(`${l.fecha}T12:00:00`)} · {TIPO_MOVIMIENTO[l.origen] ?? l.origen}
                  </span>
                  <span className="tabular-nums">
                    {l.cantidad} de {l.cantidad_inicial}
                  </span>
                  <span className="w-28 text-right tabular-nums">{l.costo_unitario !== null ? `${usd2(Number(l.costo_unitario))} c/u` : "sin costo"}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted-foreground">Nunca hubo stock en bodega.</p>
          )}
        </CardContent>
      </Card>

      {/* Unidades */}
      <Card>
        <CardHeader>
          <CardTitle>Unidades ({unidades.length})</CardTitle>
          <CardDescription>Cada una con su IMEI o serie. Si un cliente devolvió un equipo abierto, pasalo a su ficha Open Box.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          {unidades.length ? (
            unidades.map((u) => (
              <FilaEditable
                key={u.id}
                accion={u.estado === "en_bodega" && destinos.length ? moverUnidad : cambiarEstadoUnidad}
                puedeEditar={u.estado === "en_bodega"}
                textoEditar={destinos.length ? "Mover / dar de baja" : "Dar de baja"}
                vista={
                  <div className="text-sm">
                    <p className="font-mono">
                      {u.identificador}
                      {u.identificador2 ? <span className="text-muted-foreground"> · {u.identificador2}</span> : null}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {ESTADO_UNIDAD[u.estado]}
                      {u.pedidos ? (
                        <>
                          {" · "}
                          <Link href={`/admin/pedidos/${u.pedido_id}`} className="text-primary underline">
                            pedido #{u.pedidos.numero}
                          </Link>
                        </>
                      ) : null}
                      {u.condicion !== condicion ? ` · ${CONDICION[u.condicion]}` : ""} · registrada {fechaCorta(u.created_at)}
                    </p>
                    {u.notas ? <p className="text-xs text-muted-foreground">{u.notas}</p> : null}
                  </div>
                }
              >
                <input type="hidden" name="unidad_id" value={u.id} />
                <input type="hidden" name="variante_id" value={v.id} />
                <p className="font-mono text-sm">{u.identificador}</p>
                {destinos.length ? (
                  <>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <div className="space-y-1">
                        <Label htmlFor={`dest-${u.id}`}>Pasa a</Label>
                        <select id={`dest-${u.id}`} name="variante_destino" className={SELECT}>
                          {destinos.map((d) => (
                            <option key={d.id} value={d.id}>
                              {d.productos.nombre} · {d.nombre}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className="space-y-1">
                        <Label htmlFor={`cond-${u.id}`}>Condición</Label>
                        <select id={`cond-${u.id}`} name="condicion" defaultValue="open_box" className={SELECT}>
                          {Object.entries(CONDICION).map(([k, t]) => (
                            <option key={k} value={k}>
                              {t}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                    <Input name="nota" placeholder="Por qué (devuelto con caja abierta, revisado…)" />
                    <p className="text-xs text-muted-foreground">
                      La condición tiene que ser la del producto de destino. Para darla de baja (dañada o perdida), andá a «Buscar IMEI».
                    </p>
                  </>
                ) : (
                  <>
                    <input type="hidden" name="estado" value="baja" />
                    <Input name="nota" required placeholder="Por qué sale (dañado, perdido…)" />
                  </>
                )}
              </FilaEditable>
            ))
          ) : (
            <p className="text-sm text-muted-foreground">Todavía no hay unidades registradas.</p>
          )}
        </CardContent>
      </Card>

      {/* Kardex */}
      <Card>
        <CardHeader>
          <CardTitle>Kardex</CardTitle>
          <CardDescription>Todo lo que entró y salió, con quién y por qué.</CardDescription>
        </CardHeader>
        <CardContent>
          {movimientos.length ? (
            <ul className="divide-y rounded-lg border text-sm">
              {movimientos.map((m) => (
                <li key={m.id} className="flex flex-wrap items-center gap-x-4 gap-y-1 p-3">
                  <span className="w-32 text-xs text-muted-foreground">{fechaHora(m.created_at)}</span>
                  <span className="min-w-40 flex-1">
                    <span className="font-medium">{TIPO_MOVIMIENTO[m.tipo] ?? m.tipo}</span>
                    {m.nota ? <span className="text-muted-foreground"> · {m.nota}</span> : null}
                    {m.compra_id ? (
                      <>
                        {" · "}
                        <Link href={`/admin/inventario/compras/${m.compra_id}`} className="text-primary underline">
                          compra
                        </Link>
                      </>
                    ) : null}
                    {m.pedido_id ? (
                      <>
                        {" · "}
                        <Link href={`/admin/pedidos/${m.pedido_id}`} className="text-primary underline">
                          pedido
                        </Link>
                      </>
                    ) : null}
                    <span className="block text-xs text-muted-foreground">{quien(m.usuario, nombres)}</span>
                  </span>
                  <span className={`w-12 text-right font-semibold tabular-nums ${m.cantidad < 0 ? "text-red-700" : "text-green-700"}`}>
                    {m.cantidad > 0 ? `+${m.cantidad}` : m.cantidad}
                  </span>
                  <span className="w-24 text-right text-xs text-muted-foreground tabular-nums">
                    {m.costo_unitario !== null ? `${usd2(Number(m.costo_unitario))} c/u` : ""}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted-foreground">Sin movimientos.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default function VarianteInventario(props: PageProps<"/admin/inventario/variante/[id]">) {
  return (
    <div className="max-w-4xl">
      <Suspense fallback={<p className="text-sm text-muted-foreground">Cargando…</p>}>
        <Detalle params={props.params} />
      </Suspense>
    </div>
  );
}
