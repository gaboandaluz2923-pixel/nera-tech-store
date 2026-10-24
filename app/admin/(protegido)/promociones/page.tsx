import Link from "next/link";
import { Suspense } from "react";
import { FilaEditable } from "@/components/admin/editable";
import { BotonGuardar, FormularioAccion } from "@/components/admin/formulario-accion";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { superAdmin } from "@/lib/admin/sesion";
import { campanasBrevo } from "@/lib/brevo-campanas";
import { createClient } from "@/lib/supabase/server";
import { fechaHora, usd2 } from "@/lib/tienda/formato";
import { cambiarCupon, crearCampanaEnvio, crearCombo, crearCupon, crearOferta, guardarCombo, guardarComboPrecios } from "./actions";
import { tablaPrecios } from "@/lib/admin/precios-tabla";
import { CamposCombo, TablaCombo, type DatosCombo } from "@/components/admin/combo-precios";
import { estadoOferta } from "./util";

// Promociones: campañas de correo de Brevo, ofertas con fecha, combos "Completá tu equipo" y cupones.

type Oferta = { id: string; nombre: string; inicio: string | null; fin: string | null; activa: boolean; promocion_precios: { variante_id: string }[] };
type Combo = {
  id: string;
  nombre: string;
  descuento: number;
  activo: boolean;
  producto_principal_id: string;
  productos: { nombre: string } | null;
  bundle_items: {
    cantidad: number;
    variantes: {
      precio: number;
      color: string | null;
      producto_id: string;
      ram_gb: number | null;
      almacenamiento_gb: number | null;
      productos: { nombre: string } | null;
    } | null;
  }[];
};
type Cupon = {
  id: string;
  codigo: string;
  tipo: string;
  valor: number;
  tope: number | null;
  min_pedido: number;
  usos_max: number | null;
  por_cliente: number | null;
  inicio: string | null;
  fin: string | null;
  activo: boolean;
  solo_accesorios: boolean;
  descripcion: string | null;
  origen: string;
};
type Producto = {
  id: string;
  nombre: string;
  estado: string;
  categorias: { slug: string } | null;
  variantes: { id: string; color: string | null; precio: number; activo: boolean }[];
};

const ESTADO_CLASE = {
  activa: "bg-green-100 text-green-800",
  programada: "bg-blue-100 text-blue-800",
  terminada: "bg-muted text-muted-foreground",
  apagada: "bg-muted text-muted-foreground",
} as const;

const describirCupon = (c: Cupon) =>
  c.tipo === "porcentaje"
    ? `${Number(c.valor)}%${c.tope ? ` (máx. ${usd2(Number(c.tope))})` : ""}`
    : c.tipo === "monto"
      ? usd2(Number(c.valor))
      : "Envío gratis";

async function Contenido() {
  const supabase = await createClient();
  const [ofertasR, combosR, cuponesR, usosR, productosR, cumpleR, campanasR] = await Promise.all([
    supabase
      .from("promociones")
      .select("id, nombre, inicio, fin, activa, promocion_precios(variante_id)")
      .eq("tipo", "descuento_fecha")
      .order("created_at", { ascending: false }),
    supabase
      .from("bundles")
      .select(
        "id, nombre, descuento, activo, producto_principal_id, productos(nombre), bundle_items(cantidad, variantes(precio, color, producto_id, ram_gb, almacenamiento_gb, productos(nombre)))"
      )
      .order("created_at", { ascending: false }),
    supabase
      .from("cupones")
      .select("id, codigo, tipo, valor, tope, min_pedido, usos_max, por_cliente, inicio, fin, activo, solo_accesorios, descripcion, origen")
      .eq("origen", "panel")
      .order("created_at", { ascending: false }),
    supabase.from("pedidos").select("cupon_id").not("cupon_id", "is", null).not("estado", "in", "(cancelado,devuelto)").limit(5000),
    supabase.from("productos").select("id, nombre, estado, categorias(slug), variantes(id, color, precio, activo)").neq("estado", "oculto").order("nombre"),
    supabase.from("cupones").select("id", { count: "exact", head: true }).eq("origen", "cumple"),
    supabase
      .from("promociones")
      .select("id, nombre, inicio, fin, activa, config, promocion_productos(producto_id)")
      .eq("tipo", "envio_gratis")
      .order("created_at", { ascending: false }),
  ]);
  const campanas = (campanasR.data ?? []) as unknown as (Omit<Oferta, "promocion_precios"> & {
    config: { banner?: boolean } | null;
    promocion_productos: { producto_id: string }[];
  })[];
  for (const r of [ofertasR, combosR, cuponesR, productosR]) if (r.error) throw r.error;
  const ofertas = (ofertasR.data ?? []) as unknown as Oferta[];
  const combos = (combosR.data ?? []) as unknown as Combo[];
  // Precio y margen de cada combo: costos con IVA y precios por memoria, igual que en Precios
  const filasPrecio = combos.length ? await tablaPrecios(supabase) : [];
  const fila = (productoId: string, ram: number | null, alm: number | null) =>
    filasPrecio.find((f) => f.productoId === productoId && f.ramGb === ram && f.almacenamientoGb === alm);
  const datosCombo = (c: Combo): DatosCombo | null => {
    const base = filasPrecio[0];
    if (!base) return null;
    const configs = filasPrecio
      .filter((f) => f.productoId === c.producto_principal_id && (f.precioVenta ?? 0) > 0)
      .map((f) => ({ productoId: f.productoId, ram: f.ramGb, alm: f.almacenamientoGb, memoria: f.memoria, precio: f.precioVenta ?? 0, costo: f.mejor?.costo ?? null }));
    if (!configs.length) return null;
    return {
      id: c.id,
      nombre: c.nombre,
      activo: c.activo,
      ahorro: Number(c.descuento),
      principal: { nombre: c.productos?.nombre ?? "", configs },
      items: c.bundle_items
        .filter((i) => i.variantes)
        .map((i) => {
          const v = i.variantes!;
          const f = fila(v.producto_id, v.ram_gb, v.almacenamiento_gb);
          return {
            productoId: v.producto_id,
            ram: v.ram_gb,
            alm: v.almacenamiento_gb,
            memoria: f?.memoria ?? "",
            nombre: [v.productos?.nombre, v.color].filter(Boolean).join(" "),
            cantidad: i.cantidad,
            precio: Number(v.precio),
            costo: f?.mejor?.costo ?? null,
          };
        }),
      envioCobrado: base.envioCobrado,
      descuentoPct: base.descuentoSinTarjetaPct,
      cobro: base.cobro,
    };
  };
  const cupones = (cuponesR.data ?? []) as unknown as Cupon[];
  const productos = (productosR.data ?? []) as unknown as Producto[];
  const usos = new Map<string, number>();
  for (const u of usosR.data ?? []) usos.set(u.cupon_id as string, (usos.get(u.cupon_id as string) ?? 0) + 1);
  const equipos = productos.filter((p) => ["celulares", "tablets"].includes(p.categorias?.slug ?? ""));
  const accesorios = productos
    .filter((p) => !["celulares", "tablets"].includes(p.categorias?.slug ?? ""))
    .flatMap((p) =>
      p.variantes
        .filter((v) => v.activo && Number(v.precio) > 0)
        .map((v) => ({ id: v.id, nombre: [p.nombre, v.color].filter(Boolean).join(" · "), precio: Number(v.precio) }))
    );

  return (
    <div className="space-y-6">
      {/* CAMPAÑAS CON ENVÍO GRATIS */}
      <Card>
        <CardHeader>
          <CardTitle>Campañas con envío gratis</CardTitle>
          <CardDescription>
            Por fechas (ej. Octubre Naranja): los pedidos que llevan uno de sus productos no pagan envío, las fichas lo dicen y el inicio muestra
            un banner con el producto destacado. Al terminar, todo vuelve solo a la normalidad.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {campanas.length ? (
            <ul className="divide-y rounded-lg border">
              {campanas.map((o) => {
                const e = estadoOferta(o);
                return (
                  <li key={o.id}>
                    <Link href={`/admin/promociones/envio-gratis/${o.id}`} className="flex flex-wrap items-center gap-x-3 gap-y-1 p-3 hover:bg-muted/50">
                      <span className="font-medium">{o.nombre}</span>
                      <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${ESTADO_CLASE[e]}`}>{e}</span>
                      <span className="text-sm text-muted-foreground">
                        {o.inicio ? fechaHora(o.inicio) : "Desde ya"} → {o.fin ? fechaHora(o.fin) : "sin fin"} · {o.promocion_productos.length}{" "}
                        {o.promocion_productos.length === 1 ? "producto" : "productos"}
                        {o.config?.banner !== false ? " · con banner" : ""}
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="text-sm text-muted-foreground">Todavía no hay campañas.</p>
          )}
          <FilaEditable accion={crearCampanaEnvio} className="rounded-lg bg-muted/40 p-3" textoEditar="+ Nueva campaña" textoGuardar="Crear y elegir productos">
            <div className="grid gap-3 sm:grid-cols-[2fr_1fr_1fr]">
              <div className="space-y-1">
                <Label htmlFor="ca-nombre">Nueva campaña</Label>
                <Input id="ca-nombre" name="nombre" placeholder="Ej. Octubre Naranja" />
              </div>
              <div className="space-y-1">
                <Label htmlFor="ca-inicio">Empieza</Label>
                <Input id="ca-inicio" name="inicio" type="datetime-local" />
              </div>
              <div className="space-y-1">
                <Label htmlFor="ca-fin">Termina</Label>
                <Input id="ca-fin" name="fin" type="datetime-local" />
              </div>
            </div>
          </FilaEditable>
        </CardContent>
      </Card>

      {/* OFERTAS */}
      <Card>
        <CardHeader>
          <CardTitle>Ofertas con fecha</CardTitle>
          <CardDescription>
            Precio rebajado por unos días. La ficha muestra el precio tachado y cuándo termina; al terminar, el precio vuelve solo.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {ofertas.length ? (
            <ul className="divide-y rounded-lg border">
              {ofertas.map((o) => {
                const e = estadoOferta(o);
                return (
                  <li key={o.id}>
                    <Link href={`/admin/promociones/oferta/${o.id}`} className="flex flex-wrap items-center gap-x-3 gap-y-1 p-3 hover:bg-muted/50">
                      <span className="font-medium">{o.nombre}</span>
                      <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${ESTADO_CLASE[e]}`}>{e}</span>
                      <span className="text-sm text-muted-foreground">
                        {o.inicio ? fechaHora(o.inicio) : "Desde ya"} → {o.fin ? fechaHora(o.fin) : "sin fin"} · {o.promocion_precios.length}{" "}
                        {o.promocion_precios.length === 1 ? "precio" : "precios"}
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="text-sm text-muted-foreground">Todavía no hay ofertas.</p>
          )}
          <FilaEditable accion={crearOferta} className="rounded-lg bg-muted/40 p-3" textoEditar="+ Nueva oferta" textoGuardar="Crear y poner precios">
            <div className="grid gap-3 sm:grid-cols-[2fr_1fr_1fr]">
            <div className="space-y-1">
              <Label htmlFor="of-nombre">Nueva oferta</Label>
              <Input id="of-nombre" name="nombre" placeholder="Ej. Quincena de octubre" />
            </div>
            <div className="space-y-1">
              <Label htmlFor="of-inicio">Empieza</Label>
              <Input id="of-inicio" name="inicio" type="datetime-local" />
            </div>
            <div className="space-y-1">
              <Label htmlFor="of-fin">Termina</Label>
              <Input id="of-fin" name="fin" type="datetime-local" />
            </div>
            </div>
            <p className="text-xs text-muted-foreground">Si dejás &quot;Empieza&quot; vacío, empieza en cuanto la actives. Horas de El Salvador.</p>
          </FilaEditable>
        </CardContent>
      </Card>

      {/* COMBOS */}
      <Card>
        <CardHeader>
          <CardTitle>Combos &quot;Completá tu equipo&quot;</CardTitle>
          <CardDescription>
            Cuando el carrito lleva el producto principal (cualquier color o memoria) y todos los accesorios, se descuenta el ahorro. La ficha y el
            carrito los ofrecen con un toque.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {combos.length ? (
            <ul className="divide-y rounded-lg border">
              {combos.map((c) => {
                const valor = c.bundle_items.reduce((s, i) => s + Number(i.variantes?.precio ?? 0) * i.cantidad, 0);
                const d = datosCombo(c);
                const resumen = (
                  <div className="space-y-2">
                    <p className="font-medium">
                      {c.nombre}
                      {!c.activo ? <span className="ml-2 rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">apagado</span> : null}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {c.productos?.nombre} +{" "}
                      {c.bundle_items
                        .map((i) => `${i.cantidad > 1 ? `${i.cantidad} × ` : ""}${[i.variantes?.productos?.nombre, i.variantes?.color].filter(Boolean).join(" ")}`)
                        .join(" + ")}
                    </p>
                    <p className="text-sm">
                      Ahorro <strong>{usd2(Number(c.descuento))}</strong>
                      <span className="text-xs text-muted-foreground">
                        {" "}
                        · accesorios a precio normal: {usd2(valor)}
                        {Number(c.descuento) >= valor - 0.004 ? " (de regalo)" : ""}
                      </span>
                    </p>
                    {d ? <TablaCombo d={d} /> : <p className="text-xs text-amber-700">El celular no tiene precio de venta: ponéselo en Precios para ver el margen.</p>}
                  </div>
                );
                return (
                  <li key={c.id} className="p-3">
                    {d ? (
                      <FilaEditable accion={guardarComboPrecios} className="" vista={resumen}>
                        <CamposCombo d={d} />
                      </FilaEditable>
                    ) : (
                      <FilaEditable accion={guardarCombo} className="" vista={resumen}>
                        <input type="hidden" name="id" value={c.id} />
                        <p className="font-medium">{c.nombre}</p>
                        <div className="flex flex-wrap items-end gap-3">
                          <div className="w-28 space-y-1">
                            <Label htmlFor={`cb-${c.id}`}>Ahorro ($)</Label>
                            <Input id={`cb-${c.id}`} name="descuento" inputMode="decimal" defaultValue={Number(c.descuento).toFixed(2)} />
                          </div>
                          <label className="flex h-9 items-center gap-2 text-sm">
                            <input type="checkbox" name="activo" defaultChecked={c.activo} className="size-4" /> Activo
                          </label>
                        </div>
                      </FilaEditable>
                    )}
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="text-sm text-muted-foreground">Todavía no hay combos.</p>
          )}
          <FilaEditable accion={crearCombo} className="rounded-lg bg-muted/40 p-3" textoEditar="+ Nuevo combo" textoGuardar="Crear combo">
            <p className="text-sm font-semibold">Nuevo combo</p>
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="space-y-1">
                <Label htmlFor="cb-nombre">Nombre</Label>
                <Input id="cb-nombre" name="nombre" placeholder="Ej. Kit protección A27" />
              </div>
              <div className="space-y-1">
                <Label htmlFor="cb-principal">Producto principal</Label>
                <select id="cb-principal" name="producto_principal_id" defaultValue="" className="h-9 w-full rounded-md border bg-background px-2 text-sm">
                  <option value="" disabled>
                    Elegí un celular o tablet
                  </option>
                  {equipos.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.nombre}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-1">
                <Label htmlFor="cb-ahorro">Ahorro para el cliente ($)</Label>
                <Input id="cb-ahorro" name="descuento" inputMode="decimal" placeholder="Ej. 5" />
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="space-y-1">
                  <Label htmlFor={`cb-item-${i}`}>Accesorio {i}{i > 1 ? " (opcional)" : ""}</Label>
                  <div className="flex gap-1">
                    <select id={`cb-item-${i}`} name={`item_${i}`} defaultValue="" className="h-9 min-w-0 flex-1 rounded-md border bg-background px-2 text-sm">
                      <option value="">—</option>
                      {accesorios.map((a) => (
                        <option key={a.id} value={a.id}>
                          {a.nombre} · {usd2(a.precio)}
                        </option>
                      ))}
                    </select>
                    <Input name={`cantidad_${i}`} defaultValue="1" inputMode="numeric" className="w-12" aria-label={`Cantidad del accesorio ${i}`} />
                  </div>
                </div>
              ))}
            </div>
          </FilaEditable>
        </CardContent>
      </Card>

      {/* CUPONES */}
      <Card>
        <CardHeader>
          <CardTitle>Cupones</CardTitle>
          <CardDescription>
            El cliente escribe el código en el checkout. Se usa un cupón o los Puntos Nera, no los dos, y nunca deja el pedido bajo costo (si
            haría falta, el descuento se recorta solo). Cupones de cumpleaños enviados: {cumpleR.count ?? 0} (ver Correos).
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {cupones.length ? (
            <div className="overflow-x-auto rounded-lg border">
              <table className="w-full text-sm">
                <thead className="bg-muted/50 text-left text-xs text-muted-foreground">
                  <tr>
                    <th className="p-2">Código</th>
                    <th className="p-2">Descuento</th>
                    <th className="p-2">Condiciones</th>
                    <th className="p-2">Usos</th>
                    <th className="p-2">Vigencia</th>
                    <th className="p-2" />
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {cupones.map((c) => (
                    <tr key={c.id} className={c.activo ? "" : "text-muted-foreground"}>
                      <td className="p-2 font-mono font-semibold">
                        {c.codigo}
                        {c.descripcion ? <span className="block font-sans text-xs font-normal text-muted-foreground">{c.descripcion}</span> : null}
                      </td>
                      <td className="p-2">{describirCupon(c)}</td>
                      <td className="p-2 text-xs">
                        {Number(c.min_pedido) > 0 ? `Desde ${usd2(Number(c.min_pedido))}` : "Sin mínimo"}
                        {c.solo_accesorios ? " · solo accesorios" : ""}
                        {c.por_cliente ? ` · ${c.por_cliente} por cliente` : " · sin límite por cliente"}
                      </td>
                      <td className="p-2">
                        {usos.get(c.id) ?? 0}
                        {c.usos_max ? ` / ${c.usos_max}` : ""}
                      </td>
                      <td className="p-2 text-xs">
                        {c.inicio ? fechaHora(c.inicio) : "Ya"} → {c.fin ? fechaHora(c.fin) : "sin fin"}
                      </td>
                      <td className="p-2">
                        <FormularioAccion accion={cambiarCupon}>
                          <input type="hidden" name="id" value={c.id} />
                          <input type="hidden" name="activo" value={c.activo ? "0" : "1"} />
                          <BotonGuardar size="sm" variant="outline">
                            {c.activo ? "Apagar" : "Activar"}
                          </BotonGuardar>
                        </FormularioAccion>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">Todavía no hay cupones.</p>
          )}
          <FilaEditable accion={crearCupon} className="rounded-lg bg-muted/40 p-3" textoEditar="+ Nuevo cupón" textoGuardar="Crear cupón">
            <p className="text-sm font-semibold">Nuevo cupón</p>
            <div className="grid gap-3 sm:grid-cols-4">
              <div className="space-y-1">
                <Label htmlFor="cu-codigo">Código</Label>
                <Input id="cu-codigo" name="codigo" placeholder="QUINCENA10" className="uppercase" />
              </div>
              <div className="space-y-1">
                <Label htmlFor="cu-tipo">Tipo</Label>
                <select id="cu-tipo" name="tipo" defaultValue="porcentaje" className="h-9 w-full rounded-md border bg-background px-2 text-sm">
                  <option value="porcentaje">% de descuento</option>
                  <option value="monto">Monto fijo ($)</option>
                  <option value="envio_gratis">Envío gratis</option>
                </select>
              </div>
              <div className="space-y-1">
                <Label htmlFor="cu-valor">Valor (% o $)</Label>
                <Input id="cu-valor" name="valor" inputMode="decimal" placeholder="10" />
              </div>
              <div className="space-y-1">
                <Label htmlFor="cu-tope">Máximo a descontar ($)</Label>
                <Input id="cu-tope" name="tope" inputMode="decimal" placeholder="Solo para %" />
              </div>
              <div className="space-y-1">
                <Label htmlFor="cu-min">Compra mínima ($)</Label>
                <Input id="cu-min" name="min_pedido" inputMode="decimal" placeholder="0" />
              </div>
              <div className="space-y-1">
                <Label htmlFor="cu-usos">Usos en total</Label>
                <Input id="cu-usos" name="usos_max" inputMode="numeric" placeholder="Sin límite" />
              </div>
              <div className="space-y-1">
                <Label htmlFor="cu-cliente">Usos por cliente</Label>
                <Input id="cu-cliente" name="por_cliente" inputMode="numeric" defaultValue="1" />
              </div>
              <label className="flex items-center gap-2 self-end pb-2 text-sm">
                <input type="checkbox" name="solo_accesorios" className="size-4" /> Solo accesorios
              </label>
              <div className="space-y-1">
                <Label htmlFor="cu-inicio">Empieza</Label>
                <Input id="cu-inicio" name="inicio" type="datetime-local" />
              </div>
              <div className="space-y-1">
                <Label htmlFor="cu-fin">Termina</Label>
                <Input id="cu-fin" name="fin" type="datetime-local" />
              </div>
              <div className="space-y-1 sm:col-span-2">
                <Label htmlFor="cu-desc">Nota interna (opcional)</Label>
                <Input id="cu-desc" name="descripcion" placeholder="Ej. Para seguidores de Instagram" />
              </div>
            </div>
            <p className="text-xs text-muted-foreground">Usos por cliente: 0 = sin límite. Fechas vacías = vale desde ya y no vence.</p>
          </FilaEditable>
        </CardContent>
      </Card>
    </div>
  );
}

const pct = (n: number | null, de: number | null) => (n !== null && de ? `${Math.round((n / de) * 100)}%` : "—");

/** Campañas de correo en Brevo: agendadas, borradores y las últimas enviadas (solo lectura) */
async function CampanasCorreo() {
  await superAdmin();
  let datos: Awaited<ReturnType<typeof campanasBrevo>> | null = null;
  let error = "";
  try {
    datos = await campanasBrevo();
  } catch (e) {
    error = e instanceof Error ? e.message : "Brevo no respondió.";
  }
  return (
    <Card>
      <CardHeader className="flex items-start justify-between gap-3">
        <div className="space-y-1">
          <CardTitle>Campañas de correo (Brevo)</CardTitle>
          <CardDescription>
            Lo que está agendado para salir y cómo les fue a las últimas. Las campañas se arman y agendan en Brevo → Campañas.
          </CardDescription>
        </div>
        <div className="flex shrink-0 flex-wrap gap-2">
        <Link
          href="/admin/promociones/campana"
          className="rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground"
        >
          + Preparar campaña
        </Link>
        <a
          href="https://app.brevo.com/marketing-campaign/list"
          target="_blank"
          rel="noopener noreferrer"
          className="rounded-md border px-3 py-2 text-sm font-medium hover:bg-muted"
        >
          Abrir Brevo
        </a>
        </div>
      </CardHeader>
      <CardContent className="space-y-4 text-sm">
        {error ? <p className="text-red-700">No se pudieron leer las campañas: {error}</p> : null}
        {datos ? (
          <>
            <div className="space-y-2">
              <p className="font-medium">Agendadas</p>
              {datos.agendadas.length ? (
                <ul className="divide-y rounded-lg border">
                  {datos.agendadas.map((c) => (
                    <li key={c.id} className="flex flex-wrap items-center gap-x-4 gap-y-1 p-3">
                      <span className="min-w-48 flex-1">
                        <span className="block font-medium">{c.nombre}</span>
                        <span className="block text-xs text-muted-foreground">{c.asunto}</span>
                      </span>
                      <span className="font-medium">{c.agendadaPara ? fechaHora(c.agendadaPara) : "Sin fecha"}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-muted-foreground">No hay campañas agendadas.</p>
              )}
            </div>
            {datos.borradores.length ? (
              <div className="space-y-2">
                <p className="font-medium">Borradores (sin agendar)</p>
                <ul className="divide-y rounded-lg border">
                  {datos.borradores.map((c) => (
                    <li key={c.id} className="p-3">
                      <span className="block font-medium">{c.nombre}</span>
                      <span className="block text-xs text-muted-foreground">{c.asunto || "Sin asunto"}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
            <div className="space-y-2">
              <p className="font-medium">Últimas enviadas</p>
              {datos.enviadas.length ? (
                <ul className="divide-y rounded-lg border">
                  {datos.enviadas.map((c) => (
                    <li key={c.id} className="flex flex-wrap items-center gap-x-4 gap-y-1 p-3">
                      <span className="min-w-48 flex-1">
                        <span className="block font-medium">{c.nombre}</span>
                        <span className="block text-xs text-muted-foreground">
                          {c.enviadaEl ? fechaHora(c.enviadaEl) : ""} · {c.asunto}
                        </span>
                      </span>
                      <span className="text-xs tabular-nums">
                        {c.entregados ?? "—"} entregados · abrieron {pct(c.abiertos, c.entregados)} · clic {pct(c.clics, c.entregados)}
                      </span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-muted-foreground">Todavía no se ha enviado ninguna campaña.</p>
              )}
            </div>
          </>
        ) : null}
      </CardContent>
    </Card>
  );
}

export default function Promociones() {
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold">Promociones</h1>
        <p className="text-sm text-muted-foreground">Ofertas, combos y cupones. Los Puntos Nera y el regalo de cumpleaños se ajustan en Configuración.</p>
      </div>
      <Suspense fallback={<p className="text-sm text-muted-foreground">Cargando campañas de correo…</p>}>
        <CampanasCorreo />
      </Suspense>
      <Suspense fallback={<p className="text-sm text-muted-foreground">Cargando…</p>}>
        <Contenido />
      </Suspense>
    </div>
  );
}
