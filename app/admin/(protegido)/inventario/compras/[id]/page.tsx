import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { AlertTriangle } from "lucide-react";
import { Editable, FilaEditable } from "@/components/admin/editable";
import { BotonGuardar, FormularioAccion } from "@/components/admin/formulario-accion";
import { BuscadorProducto } from "@/components/admin/buscador-producto";
import { VerArchivo } from "@/components/admin/ver-archivo";
import { Dato, Datos } from "@/components/admin/vista";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { DOCUMENTO, type Documento } from "@/lib/admin/compras";
import { textoVencimiento, variantesParaElegir } from "@/lib/admin/inventario";
import { nombresEquipo, quien } from "@/lib/admin/historial";
import { superAdmin } from "@/lib/admin/sesion";
import { CONDICION, revisarIdentificadores, type Condicion, type Item, type TipoIdentificador } from "@/lib/inventario/identificadores";
import { fechaCorta, fechaHora, usd2 } from "@/lib/tienda/formato";
import {
  anularCompra,
  guardarCompra,
  guardarLineaCompra,
  pagarCompra,
  quitarLineaCompra,
  recibirCompra,
  subirArchivoCompra,
  verArchivoCompra,
} from "../../actions";

type Compra = {
  id: string;
  numero: string | null;
  codigo_generacion: string | null;
  fecha: string;
  condicion: "contado" | "credito";
  dias_credito: number;
  vence_en: string;
  documento: Documento;
  otros_costos: number;
  subtotal: number;
  iva: number;
  total: number;
  estado: "borrador" | "recibida" | "anulada";
  pagada_en: string | null;
  archivo: string | null;
  notas: string | null;
  creado_por: string | null;
  recibida_por: string | null;
  recibida_en: string | null;
  proveedor_id: string | null;
  proveedores: { nombre: string } | null;
};

type Linea = {
  id: string;
  variante_id: string | null;
  descripcion: string;
  sku_proveedor: string | null;
  cantidad: number;
  costo_unitario: number;
  condicion: Condicion;
  identificadores: Item[];
  variantes: {
    nombre: string;
    productos: { nombre: string; condicion: Condicion | null; categorias: { identificador: TipoIdentificador | null } | null } | null;
  } | null;
};

const SELECT = "h-9 w-full rounded-md border bg-background px-2 text-sm";
const ESTADO = { borrador: "Sin recibir (todavía no entra a bodega)", recibida: "Recibida en bodega", anulada: "Anulada" } as const;

/** Cómo está guardado el costo de las líneas según el documento */
const IVA_DEL_COSTO: Record<Documento, string> = { ccf: "sin IVA", factura: "con IVA", sin_iva: "sin IVA (no lleva)" };

function CamposLinea({
  compraId,
  linea,
  variantes,
  documento,
}: {
  compraId: string;
  linea?: Linea;
  variantes: Awaited<ReturnType<typeof variantesParaElegir>>;
  documento: Documento;
}) {
  const sufijo = linea?.id ?? "nueva";
  return (
    <>
      <input type="hidden" name="compra_id" value={compraId} />
      {linea ? <input type="hidden" name="linea_id" value={linea.id} /> : null}
      <div className="space-y-1">
        <Label htmlFor={`var-${sufijo}`}>Producto del catálogo</Label>
        <BuscadorProducto
          id={`var-${sufijo}`}
          name="variante_id"
          valor={linea?.variante_id}
          opciones={variantes.map((v) => ({
            id: v.id,
            texto: v.texto,
            detalle: v.condicion !== "nuevo" ? CONDICION[v.condicion] : undefined,
          }))}
        />
        <p className="text-xs text-muted-foreground">
          ¿No está?{" "}
          <Link href="/admin/catalogo/nuevo" className="text-primary underline">
            Crealo con + Nuevo producto
          </Link>{" "}
          (o agregale la variante en su ficha) y volvé.
        </p>
      </div>
      <div className="space-y-1">
        <Label htmlFor={`desc-${sufijo}`}>Descripción en la factura</Label>
        <Input id={`desc-${sufijo}`} name="descripcion" defaultValue={linea?.descripcion ?? ""} />
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <div className="space-y-1">
          <Label htmlFor={`cant-${sufijo}`}>Cantidad</Label>
          <Input id={`cant-${sufijo}`} name="cantidad" type="number" min="1" required defaultValue={linea?.cantidad ?? 1} />
        </div>
        <div className="space-y-1">
          <Label htmlFor={`costo-${sufijo}`}>Costo c/u</Label>
          <Input
            id={`costo-${sufijo}`}
            name="costo_unitario"
            inputMode="decimal"
            required
            defaultValue={linea ? String(Number(linea.costo_unitario)) : ""}
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor={`iva-${sufijo}`}>El costo que escribiste</Label>
          {documento === "sin_iva" ? (
            <p className="flex h-9 items-center text-sm text-muted-foreground">Sin IVA (no lleva)</p>
          ) : (
            <select id={`iva-${sufijo}`} name="costo_iva" defaultValue={documento === "factura" ? "con" : "sin"} className={SELECT}>
              <option value="sin">SIN IVA (+IVA)</option>
              <option value="con">CON IVA incluido</option>
            </select>
          )}
        </div>
        <div className="space-y-1">
          <Label htmlFor={`cond-${sufijo}`}>Condición</Label>
          <select id={`cond-${sufijo}`} name="condicion" defaultValue={linea?.condicion ?? "nuevo"} className={SELECT}>
            {Object.entries(CONDICION).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-1">
          <Label htmlFor={`sku-${sufijo}`}>Código del proveedor</Label>
          <Input id={`sku-${sufijo}`} name="sku_proveedor" defaultValue={linea?.sku_proveedor ?? ""} />
        </div>
      </div>
      <div className="space-y-1">
        <Label htmlFor={`ids-${sufijo}`}>IMEI o números de serie (uno por línea)</Label>
        <Textarea
          id={`ids-${sufijo}`}
          name="identificadores"
          rows={4}
          className="font-mono text-sm"
          defaultValue={(linea?.identificadores ?? []).map((i) => [i.identificador, i.identificador2].filter(Boolean).join(", ")).join("\n")}
          placeholder={"356789012345607\n356789012345615, 356789012345623   ← doble SIM: los dos IMEI en la misma línea"}
        />
        <p className="text-xs text-muted-foreground">
          Celulares: el IMEI de cada unidad es obligatorio (está en la caja; con un lector de código de barras se escanea directo aquí).
          Accesorios: el número de serie si trae; los que no traen reciben un código Nera (NT-000123) para etiquetarlos.
        </p>
      </div>
    </>
  );
}

async function Detalle({
  params,
  searchParams,
}: {
  params: PageProps<"/admin/inventario/compras/[id]">["params"];
  searchParams: Promise<{ aviso?: string; nueva?: string }>;
}) {
  const { id } = await params;
  const { aviso } = await searchParams;
  if (!/^[0-9a-f-]{36}$/.test(id)) notFound();
  const { supabase } = await superAdmin();
  const [{ data, error }, { data: lineasData }, { data: proveedores }, variantes, nombres] = await Promise.all([
    supabase
      .from("compras")
      .select(
        "id, numero, codigo_generacion, fecha, condicion, dias_credito, vence_en, documento, otros_costos, subtotal, iva, total, estado, pagada_en, archivo, notas, creado_por, recibida_por, recibida_en, proveedor_id, proveedores(nombre)"
      )
      .eq("id", id)
      .maybeSingle(),
    supabase
      .from("compra_lineas")
      .select(
        "id, variante_id, descripcion, sku_proveedor, cantidad, costo_unitario, condicion, identificadores, variantes(nombre, productos(nombre, condicion, categorias(identificador)))"
      )
      .eq("compra_id", id)
      .order("created_at")
      .order("id"),
    supabase.from("proveedores").select("id, nombre").order("nombre"),
    variantesParaElegir(supabase),
    nombresEquipo(supabase),
  ]);
  if (error) throw error;
  if (!data) notFound();
  const c = data as unknown as Compra;
  const lineas = (lineasData ?? []) as unknown as Linea[];
  const borrador = c.estado === "borrador";
  const archivos = (c.archivo ?? "").split("\n").filter(Boolean);
  const sumaLineas = lineas.reduce((s, l) => s + l.cantidad * Number(l.costo_unitario), 0);
  const factor = sumaLineas > 0 && Number(c.otros_costos) > 0 ? 1 + Number(c.otros_costos) / sumaLineas : 1;

  const problemas = lineas.flatMap((l) => {
    const tipo = l.variantes?.productos?.categorias?.identificador ?? "serie";
    const nombre = l.variantes ? `${l.variantes.productos?.nombre ?? ""} ${l.variantes.nombre}` : l.descripcion;
    const lista = [
      !l.variante_id ? `«${l.descripcion}» no tiene producto del catálogo.` : "",
      l.variante_id && (l.variantes?.productos?.condicion ?? "nuevo") !== l.condicion
        ? `${nombre}: la condición (${CONDICION[l.condicion]}) no coincide con el producto (${CONDICION[l.variantes?.productos?.condicion ?? "nuevo"]}).`
        : "",
      ...revisarIdentificadores(l.identificadores ?? [], tipo, l.cantidad).map((a) => `${nombre}: ${a}`),
    ];
    return lista.filter(Boolean);
  });
  const sinIdAccesorios = lineas
    .filter((l) => (l.variantes?.productos?.categorias?.identificador ?? "serie") === "serie")
    .reduce((s, l) => s + Math.max(0, l.cantidad - (l.identificadores?.length ?? 0)), 0);

  return (
    <div className="space-y-4">
      <div>
        <Link href="/admin/inventario/compras" className="text-sm text-muted-foreground hover:underline">
          ← Compras
        </Link>
        <h1 className="text-xl font-semibold">
          {c.proveedores?.nombre ?? "Compra sin proveedor"} · {c.numero || "sin número"}
        </h1>
      </div>

      {aviso ? (
        <p className="flex items-start gap-2 rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm">
          <AlertTriangle className="mt-0.5 size-4 shrink-0 text-amber-700" aria-hidden />
          {aviso}
        </p>
      ) : null}

      {/* Estado y acciones */}
      <Card>
        <CardHeader>
          <CardTitle>{ESTADO[c.estado]}</CardTitle>
          <CardDescription>
            {c.estado === "recibida" && c.recibida_en
              ? `Recibida por ${quien(c.recibida_por, nombres)} el ${fechaHora(c.recibida_en)}.`
              : borrador
                ? "Revisá las líneas y los IMEI. Al tocar Recibir, las unidades entran a bodega con su costo y se ven en la tienda."
                : null}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Datos columnas={3}>
            <Dato etiqueta="Total a pagar al proveedor">
              <span className="text-lg font-semibold tabular-nums">{usd2(Number(c.total))}</span>
            </Dato>
            <Dato etiqueta="Pago">
              {c.condicion === "credito" ? `Crédito ${c.dias_credito} días · vence ${fechaCorta(`${c.vence_en}T12:00:00`)}` : "Contado"}
            </Dato>
            <Dato etiqueta="Estado del pago">
              <span className={!c.pagada_en && c.estado !== "anulada" ? "font-medium" : ""}>
                {c.pagada_en ? `Pagada el ${fechaCorta(`${c.pagada_en}T12:00:00`)}` : textoVencimiento(c)}
              </span>
            </Dato>
          </Datos>

          {borrador && problemas.length ? (
            <ul className="space-y-1 rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm">
              {problemas.map((p) => (
                <li key={p} className="flex items-start gap-2">
                  <AlertTriangle className="mt-0.5 size-4 shrink-0 text-amber-700" aria-hidden />
                  {p}
                </li>
              ))}
            </ul>
          ) : null}

          <div className="flex flex-wrap items-end gap-3">
            {borrador ? (
              <FormularioAccion accion={recibirCompra}>
                <input type="hidden" name="id" value={c.id} />
                <BotonGuardar>Recibir en bodega</BotonGuardar>
              </FormularioAccion>
            ) : null}
            {c.estado !== "anulada" && !c.pagada_en ? (
              <FormularioAccion accion={pagarCompra} className="flex flex-wrap items-end gap-2">
                <input type="hidden" name="id" value={c.id} />
                <div className="space-y-1">
                  <Label htmlFor="pagada_en" className="text-xs">
                    Fecha de pago
                  </Label>
                  <Input
                    id="pagada_en"
                    name="pagada_en"
                    type="date"
                    defaultValue={new Date().toLocaleDateString("en-CA", { timeZone: "America/El_Salvador" })}
                    className="w-40"
                  />
                </div>
                <BotonGuardar variant="outline">Marcar pagada</BotonGuardar>
              </FormularioAccion>
            ) : c.pagada_en ? (
              <FormularioAccion accion={pagarCompra}>
                <input type="hidden" name="id" value={c.id} />
                <input type="hidden" name="quitar" value="1" />
                <BotonGuardar variant="ghost" size="sm">
                  Quitar el pago
                </BotonGuardar>
              </FormularioAccion>
            ) : null}
          </div>
          {borrador && sinIdAccesorios ? (
            <p className="text-xs text-muted-foreground">
              {sinIdAccesorios} {sinIdAccesorios === 1 ? "unidad" : "unidades"} sin número de serie recibirán un código Nera al recibir.
            </p>
          ) : null}
        </CardContent>
      </Card>

      {/* Líneas */}
      <Card>
        <CardHeader>
          <CardTitle>Productos</CardTitle>
          <CardDescription>
            {DOCUMENTO[c.documento]}.
            {Number(c.otros_costos) > 0 ? ` Otros costos ${usd2(Number(c.otros_costos))}: cada unidad sube un ${((factor - 1) * 100).toFixed(1)}%.` : ""}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {lineas.map((l) => {
            const tipo = l.variantes?.productos?.categorias?.identificador ?? "serie";
            const ids = l.identificadores ?? [];
            return (
              <FilaEditable
                key={l.id}
                accion={guardarLineaCompra}
                puedeEditar={borrador}
                vista={
                  <div className="space-y-1 text-sm">
                    <p className="font-medium">
                      {l.variantes ? (
                        `${l.variantes.productos?.nombre ?? ""} · ${l.variantes.nombre}`
                      ) : (
                        <span className="text-amber-700">Sin producto del catálogo</span>
                      )}
                      {l.condicion !== "nuevo" ? (
                        <span className="ml-2 rounded-full bg-amber-100 px-2 py-0.5 text-[11px] text-amber-900">{CONDICION[l.condicion]}</span>
                      ) : null}
                    </p>
                    <p className="text-xs text-muted-foreground">{l.descripcion}</p>
                    <p className="tabular-nums">
                      {l.cantidad} × {usd2(Number(l.costo_unitario))} {IVA_DEL_COSTO[c.documento]} = <b>{usd2(l.cantidad * Number(l.costo_unitario))}</b>
                      {factor !== 1 ? (
                        <span className="text-xs text-muted-foreground"> · costo puesto {usd2(Number(l.costo_unitario) * factor)} c/u</span>
                      ) : null}
                    </p>
                    <p className="text-xs">
                      {tipo === "imei" ? "IMEI" : "Series"}: {ids.length} de {l.cantidad}
                      {ids.length ? (
                        <span className="ml-1 font-mono text-muted-foreground">
                          {ids
                            .slice(0, 3)
                            .map((i) => i.identificador)
                            .join(", ")}
                          {ids.length > 3 ? "…" : ""}
                        </span>
                      ) : null}
                    </p>
                  </div>
                }
              >
                <CamposLinea compraId={c.id} linea={l} variantes={variantes} documento={c.documento} />
              </FilaEditable>
            );
          })}
          {borrador ? (
            <FilaEditable accion={guardarLineaCompra} textoEditar="+ Agregar producto" textoGuardar="Agregar" className="rounded-md border border-dashed p-3">
              <CamposLinea compraId={c.id} variantes={variantes} documento={c.documento} />
            </FilaEditable>
          ) : null}
          {borrador && lineas.length ? (
            <details className="text-sm">
              <summary className="cursor-pointer text-muted-foreground">Quitar un producto</summary>
              <div className="mt-2 flex flex-wrap gap-2">
                {lineas.map((l) => (
                  <FormularioAccion key={l.id} accion={quitarLineaCompra}>
                    <input type="hidden" name="compra_id" value={c.id} />
                    <input type="hidden" name="linea_id" value={l.id} />
                    <BotonGuardar variant="outline" size="sm">
                      Quitar {l.variantes?.productos?.nombre ?? l.descripcion.slice(0, 30)}
                    </BotonGuardar>
                  </FormularioAccion>
                ))}
              </div>
            </details>
          ) : null}
          <dl className="ml-auto grid max-w-xs grid-cols-2 gap-1 text-sm tabular-nums">
            <dt className="text-muted-foreground">Subtotal</dt>
            <dd className="text-right">{usd2(Number(c.subtotal))}</dd>
            <dt className="text-muted-foreground">IVA</dt>
            <dd className="text-right">{usd2(Number(c.iva))}</dd>
            <dt className="font-semibold">Total</dt>
            <dd className="text-right font-semibold">{usd2(Number(c.total))}</dd>
          </dl>
        </CardContent>
      </Card>

      {/* Datos */}
      <Editable
        titulo="Datos de la factura"
        accion={guardarCompra}
        vista={
          <Datos>
            <Dato etiqueta="Proveedor">{c.proveedores?.nombre ?? "—"}</Dato>
            <Dato etiqueta="Número">{c.numero || "—"}</Dato>
            <Dato etiqueta="Fecha">{fechaCorta(`${c.fecha}T12:00:00`)}</Dato>
            <Dato etiqueta="Documento">{DOCUMENTO[c.documento]}</Dato>
            <Dato etiqueta="Otros costos (flete, aduana…)">{usd2(Number(c.otros_costos))}</Dato>
            <Dato etiqueta="Código de generación">{c.codigo_generacion ?? "—"}</Dato>
            <Dato etiqueta="Registrada por">{quien(c.creado_por, nombres)}</Dato>
            <Dato etiqueta="Notas">{c.notas || "—"}</Dato>
          </Datos>
        }
      >
        <input type="hidden" name="id" value={c.id} />
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1">
            <Label htmlFor="e-proveedor">Proveedor</Label>
            <select id="e-proveedor" name="proveedor_id" defaultValue={c.proveedor_id ?? ""} className={SELECT}>
              <option value="">— Sin proveedor —</option>
              {(proveedores ?? []).map((p) => (
                <option key={p.id} value={p.id}>
                  {p.nombre}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1">
            <Label htmlFor="e-numero">Número</Label>
            <Input id="e-numero" name="numero" defaultValue={c.numero ?? ""} />
          </div>
          <div className="space-y-1">
            <Label htmlFor="e-fecha">Fecha</Label>
            <Input id="e-fecha" name="fecha" type="date" defaultValue={c.fecha} />
          </div>
          <div className="space-y-1">
            <Label htmlFor="e-condicion">Pago</Label>
            <select id="e-condicion" name="condicion" defaultValue={c.condicion} className={SELECT}>
              <option value="contado">Contado</option>
              <option value="credito">Crédito</option>
            </select>
          </div>
          <div className="space-y-1">
            <Label htmlFor="e-dias">Días de crédito</Label>
            <Input id="e-dias" name="dias_credito" type="number" min="0" max="180" defaultValue={c.dias_credito} list="dias-comunes" />
            <datalist id="dias-comunes">
              <option value="10" />
              <option value="14" />
              <option value="15" />
              <option value="30" />
            </datalist>
          </div>
          {borrador ? (
            <>
              <div className="space-y-1">
                <Label htmlFor="e-documento">Documento</Label>
                <select id="e-documento" name="documento" defaultValue={c.documento} className={SELECT}>
                  {Object.entries(DOCUMENTO).map(([k, v]) => (
                    <option key={k} value={k}>
                      {v}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-1">
                <Label htmlFor="e-otros">Otros costos (USD)</Label>
                <Input id="e-otros" name="otros_costos" inputMode="decimal" defaultValue={String(Number(c.otros_costos))} />
              </div>
            </>
          ) : null}
        </div>
        <div className="space-y-1">
          <Label htmlFor="e-notas">Notas</Label>
          <Textarea id="e-notas" name="notas" rows={2} defaultValue={c.notas ?? ""} />
        </div>
      </Editable>

      {/* Archivos */}
      <Card>
        <CardHeader>
          <CardTitle>Factura (archivos)</CardTitle>
          <CardDescription>Privados: solo los administradores los pueden abrir.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {archivos.length ? (
            <div className="flex flex-wrap gap-2">
              {archivos.map((r) => (
                <VerArchivo key={r} ruta={r} pedirEnlace={verArchivoCompra.bind(null, c.id)} />
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">Sin archivos.</p>
          )}
          <FormularioAccion accion={subirArchivoCompra} className="flex flex-wrap items-center gap-2" limpiar>
            <input type="hidden" name="id" value={c.id} />
            <Input name="archivo" type="file" accept=".pdf,.json,image/*" className="max-w-xs" />
            <BotonGuardar variant="outline" size="sm">
              Subir archivo
            </BotonGuardar>
          </FormularioAccion>
        </CardContent>
      </Card>

      {c.estado !== "anulada" ? (
        <details className="rounded-lg border p-3 text-sm">
          <summary className="cursor-pointer text-muted-foreground">Anular esta compra</summary>
          <FormularioAccion accion={anularCompra} className="mt-3 space-y-2">
            <input type="hidden" name="id" value={c.id} />
            <p>
              {c.estado === "recibida"
                ? "Las unidades de esta compra salen de bodega. Solo se puede si ninguna se vendió."
                : "La compra queda anulada y no entra nada a bodega."}
            </p>
            <label className="flex items-center gap-2">
              <input type="checkbox" name="confirmar" className="size-4" /> Sí, quiero anularla
            </label>
            <BotonGuardar variant="destructive" size="sm">
              Anular
            </BotonGuardar>
          </FormularioAccion>
        </details>
      ) : null}
    </div>
  );
}

export default function DetalleCompra(props: PageProps<"/admin/inventario/compras/[id]">) {
  return (
    <div className="max-w-4xl">
      <Suspense fallback={<p className="text-sm text-muted-foreground">Cargando…</p>}>
        <Detalle params={props.params} searchParams={props.searchParams as Promise<{ aviso?: string }>} />
      </Suspense>
    </div>
  );
}
