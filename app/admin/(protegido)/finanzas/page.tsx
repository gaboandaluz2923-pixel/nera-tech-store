import Link from "next/link";
import { Suspense } from "react";
import { AlertTriangle } from "lucide-react";
import { Editable, FilaEditable } from "@/components/admin/editable";
import { BotonGuardar, FormularioAccion } from "@/components/admin/formulario-accion";
import { Dato, Datos } from "@/components/admin/vista";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  CATEGORIAS_GASTO,
  DOCUMENTO_GASTO,
  costoGasto,
  estadoResultados,
  flujoCaja,
  indicadores,
  ivaDelMes,
  leerMes,
  mesesAtras,
  nombreMes,
  rangoMes,
  type Gasto,
} from "@/lib/admin/finanzas";
import { superAdmin } from "@/lib/admin/sesion";
import { createServiceClient } from "@/lib/supabase/server";
import { fechaCorta, usd2 } from "@/lib/tienda/formato";
import { borrarGasto, copiarFijos, guardarGasto, guardarSaldoInicial } from "./actions";

// Finanzas (solo administradores): estado de resultados, indicadores, flujo de caja, gastos e IVA del mes.

const VISTAS = { resumen: "Resultados e indicadores", flujo: "Flujo de caja", gastos: "Gastos", iva: "IVA del mes" } as const;
type Vista = keyof typeof VISTAS;
type Params = { mes?: string; vista?: string };
const SELECT = "h-9 w-full rounded-md border bg-background px-2 text-sm";
const mayuscula = (t: string) => t.charAt(0).toUpperCase() + t.slice(1);

function Fila({ etiqueta, valor, fuerte, negativo, nota }: { etiqueta: string; valor: number; fuerte?: boolean; negativo?: boolean; nota?: string }) {
  return (
    <div className={`flex items-baseline justify-between gap-3 py-1.5 ${fuerte ? "border-t font-semibold" : ""}`}>
      <span>
        {etiqueta}
        {nota ? <span className="block text-xs font-normal text-muted-foreground">{nota}</span> : null}
      </span>
      <span className={`tabular-nums ${valor < 0 ? "text-red-700" : ""}`}>
        {negativo ? "−" : ""}
        {usd2(Math.abs(valor))}
      </span>
    </div>
  );
}

async function Resumen({ mes }: { mes: string }) {
  const sb = createServiceClient();
  const er = await estadoResultados(sb, mes);
  const kpis = await indicadores(sb, mes, er);
  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_1.2fr]">
      <Card>
        <CardHeader>
          <CardTitle>Estado de resultados</CardTitle>
          <CardDescription>Ventas entregadas en {nombreMes(mes)}. Los precios incluyen IVA.</CardDescription>
        </CardHeader>
        <CardContent className="text-sm">
          <Fila etiqueta="Ventas (con IVA)" valor={er.ventasBrutas} nota={`${er.pedidos} pedidos entregados`} />
          <Fila etiqueta="IVA de las ventas" valor={er.ivaDebito} negativo />
          <Fila etiqueta="Ventas netas" valor={er.ventasNetas} fuerte />
          <Fila
            etiqueta="Costo de lo vendido"
            valor={er.costoVentas}
            negativo
            nota={er.lineasSinCosto ? `${er.lineasSinCosto} productos vendidos sin costo anotado (cuentan como $0)` : "Lo que costó cada unidad (lotes o proveedor)"}
          />
          <Fila etiqueta="Utilidad bruta" valor={er.utilidadBruta} fuerte />
          <Fila
            etiqueta="Envío y cobro"
            valor={er.envioCobro}
            negativo
            nota={er.envioCobroEstimado ? "Estimado: $5.25 por pedido (envío + paquetería) + 2.5% (anotalo en Gastos para el real)" : "Lo anotado en Gastos"}
          />
          <Fila etiqueta="Pauta (anuncios)" valor={er.pauta} negativo nota="Lo anotado cada semana en Analítica" />
          {er.gastosPorCategoria.map((g) => (
            <Fila key={g.categoria} etiqueta={CATEGORIAS_GASTO[g.categoria]} valor={g.monto} negativo />
          ))}
          {!er.gastosPorCategoria.length ? (
            <p className="py-1.5 text-xs text-amber-700">Todavía no hay gastos anotados este mes (alquiler, sueldos, servicios…).</p>
          ) : null}
          <Fila etiqueta="Utilidad antes de impuesto sobre la renta" valor={er.utilidadOperativa} fuerte />
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Indicadores</CardTitle>
          <CardDescription>Cada número con lo que significa.</CardDescription>
        </CardHeader>
        <CardContent>
          <ul className="divide-y text-sm">
            {kpis.map((k) => (
              <li key={k.nombre} className="flex items-start justify-between gap-3 py-2">
                <span className="min-w-0">
                  <span className="block font-medium">{k.nombre}</span>
                  <span className="block text-xs text-muted-foreground">{k.explicacion}</span>
                </span>
                <span className={`shrink-0 font-semibold tabular-nums ${k.alerta ? "text-red-700" : ""}`}>{k.valor}</span>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}

async function Flujo({ mes }: { mes: string }) {
  const { filas, saldoInicial, saldoFecha } = await flujoCaja(createServiceClient(), mes, 6);
  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Flujo de caja (6 meses)</CardTitle>
          <CardDescription>
            Lo que entró (pedidos cobrados) y salió de verdad (compras pagadas, gastos pagados y pauta). El saldo arranca del saldo inicial.
          </CardDescription>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <table className="w-full min-w-[560px] text-sm tabular-nums">
            <thead className="text-left text-xs text-muted-foreground">
              <tr>
                <th className="py-2">Mes</th>
                <th className="py-2 text-right">Cobrado</th>
                <th className="py-2 text-right">Compras</th>
                <th className="py-2 text-right">Gastos</th>
                <th className="py-2 text-right">Pauta</th>
                <th className="py-2 text-right">Neto</th>
                <th className="py-2 text-right">Saldo</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {filas.map((f) => (
                <tr key={f.mes} className={f.mes === mes ? "font-medium" : ""}>
                  <td className="py-2">{mayuscula(nombreMes(f.mes))}</td>
                  <td className="py-2 text-right">{usd2(f.cobrado)}</td>
                  <td className="py-2 text-right">−{usd2(f.compras)}</td>
                  <td className="py-2 text-right">−{usd2(f.gastos)}</td>
                  <td className="py-2 text-right">−{usd2(f.pauta)}</td>
                  <td className={`py-2 text-right ${f.neto < 0 ? "text-red-700" : "text-green-700"}`}>{usd2(f.neto)}</td>
                  <td className={`py-2 text-right ${f.saldo !== null && f.saldo < 0 ? "text-red-700" : ""}`}>
                    {f.saldo === null ? "—" : usd2(f.saldo)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
      <Editable
        titulo="Saldo inicial de caja y bancos"
        descripcion="Cuánto había en caja y bancos en una fecha. Desde ahí se calcula el saldo de cada mes."
        accion={guardarSaldoInicial}
        vista={
          <Datos>
            <Dato etiqueta="Saldo">{usd2(saldoInicial)}</Dato>
            <Dato etiqueta="Al día">{fechaCorta(`${saldoFecha}T12:00:00`)}</Dato>
          </Datos>
        }
      >
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1">
            <Label htmlFor="saldo_inicial">Saldo en caja y bancos (USD)</Label>
            <Input id="saldo_inicial" name="saldo_inicial" inputMode="decimal" defaultValue={String(saldoInicial)} />
          </div>
          <div className="space-y-1">
            <Label htmlFor="saldo_fecha">Al día</Label>
            <Input id="saldo_fecha" name="saldo_fecha" type="date" defaultValue={saldoFecha} />
          </div>
        </div>
      </Editable>
    </div>
  );
}

function CamposGasto({ g, mes }: { g?: Gasto; mes: string }) {
  const id = g?.id ?? "nuevo";
  const hoy = new Date().toLocaleDateString("en-CA", { timeZone: "America/El_Salvador" });
  const fechaInicial = g?.fecha ?? (hoy.startsWith(mes) ? hoy : `${mes}-01`);
  return (
    <>
      {g ? <input type="hidden" name="id" value={g.id} /> : null}
      <div className="grid gap-3 sm:grid-cols-3">
        <div className="space-y-1">
          <Label htmlFor={`g-fecha-${id}`}>Fecha</Label>
          <Input id={`g-fecha-${id}`} name="fecha" type="date" defaultValue={fechaInicial} />
        </div>
        <div className="space-y-1">
          <Label htmlFor={`g-cat-${id}`}>Categoría</Label>
          <select id={`g-cat-${id}`} name="categoria" defaultValue={g?.categoria ?? "otros"} className={SELECT}>
            {Object.entries(CATEGORIAS_GASTO).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-1">
          <Label htmlFor={`g-doc-${id}`}>Documento</Label>
          <select id={`g-doc-${id}`} name="documento" defaultValue={g?.documento ?? "sin"} className={SELECT}>
            {Object.entries(DOCUMENTO_GASTO).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-1 sm:col-span-2">
          <Label htmlFor={`g-desc-${id}`}>Qué es</Label>
          <Input id={`g-desc-${id}`} name="descripcion" required defaultValue={g?.descripcion ?? ""} placeholder="Alquiler de bodega octubre" />
        </div>
        <div className="space-y-1">
          <Label htmlFor={`g-ben-${id}`}>A quién</Label>
          <Input id={`g-ben-${id}`} name="beneficiario" defaultValue={g?.beneficiario ?? ""} />
        </div>
        <div className="space-y-1">
          <Label htmlFor={`g-monto-${id}`}>Monto (sin IVA si es crédito fiscal)</Label>
          <Input id={`g-monto-${id}`} name="monto" inputMode="decimal" required defaultValue={g ? String(Number(g.monto)) : ""} />
        </div>
        <div className="space-y-1">
          <Label htmlFor={`g-iva-${id}`}>IVA (solo crédito fiscal; vacío = 13%)</Label>
          <Input id={`g-iva-${id}`} name="iva" inputMode="decimal" defaultValue={g && Number(g.iva) ? String(Number(g.iva)) : ""} />
        </div>
        <div className="space-y-1">
          <Label htmlFor={`g-num-${id}`}>Número de documento</Label>
          <Input id={`g-num-${id}`} name="numero" defaultValue={g?.numero ?? ""} />
        </div>
        <div className="space-y-1">
          <Label htmlFor={`g-nit-${id}`}>NIT de quien factura</Label>
          <Input id={`g-nit-${id}`} name="nit" defaultValue={g?.nit ?? ""} />
        </div>
        <div className="space-y-1">
          <Label htmlFor={`g-forma-${id}`}>Forma de pago</Label>
          <select id={`g-forma-${id}`} name="forma_pago" defaultValue={g?.forma_pago ?? ""} className={SELECT}>
            <option value="">—</option>
            <option value="efectivo">Efectivo</option>
            <option value="transferencia">Transferencia</option>
            <option value="tarjeta">Tarjeta</option>
            <option value="otro">Otro</option>
          </select>
        </div>
        <div className="space-y-1">
          <Label htmlFor={`g-pagado-en-${id}`}>Pagado el</Label>
          <Input id={`g-pagado-en-${id}`} name="pagado_en" type="date" defaultValue={g?.pagado_en ?? fechaInicial} />
        </div>
      </div>
      <div className="flex flex-wrap gap-4 text-sm">
        <label className="flex items-center gap-2">
          <input type="checkbox" name="pagado" defaultChecked={g ? Boolean(g.pagado_en) : true} className="size-4" /> Ya se pagó
        </label>
        <label className="flex items-center gap-2">
          <input type="checkbox" name="fijo" defaultChecked={g?.fijo ?? false} className="size-4" /> Gasto fijo (se repite cada mes)
        </label>
      </div>
    </>
  );
}

async function Gastos({ mes }: { mes: string }) {
  const { supabase } = await superAdmin();
  const { desde, hasta } = rangoMes(mes);
  const { data, error } = await supabase.from("gastos").select("*").gte("fecha", desde).lt("fecha", hasta).order("fecha", { ascending: false });
  if (error) {
    return (
      <p className="flex items-start gap-2 rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm">
        <AlertTriangle className="mt-0.5 size-4 shrink-0 text-amber-700" aria-hidden />
        Falta correr la migración 0010 en Supabase ({error.message}).
      </p>
    );
  }
  const gastos = (data ?? []) as Gasto[];
  const total = gastos.reduce((s, g) => s + costoGasto(g), 0);
  const sinPagar = gastos.filter((g) => !g.pagado_en);
  return (
    <Card>
      <CardHeader className="flex items-start justify-between gap-3">
        <div className="space-y-1">
          <CardTitle>Gastos de {nombreMes(mes)}</CardTitle>
          <CardDescription>
            {gastos.length} gastos · {usd2(total)} en resultados (con crédito fiscal cuenta sin IVA)
            {sinPagar.length ? ` · ${sinPagar.length} sin pagar` : ""}
          </CardDescription>
        </div>
        <FormularioAccion accion={copiarFijos} className="shrink-0">
          <input type="hidden" name="mes" value={mes} />
          <BotonGuardar variant="outline" size="sm">
            Copiar fijos del mes anterior
          </BotonGuardar>
        </FormularioAccion>
      </CardHeader>
      <CardContent className="space-y-2">
        <FilaEditable accion={guardarGasto} textoEditar="+ Nuevo gasto" textoGuardar="Agregar" className="rounded-md border border-dashed p-3">
          <CamposGasto mes={mes} />
        </FilaEditable>
        {gastos.map((g) => (
          <FilaEditable
            key={g.id}
            accion={guardarGasto}
            vista={
              <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 text-sm">
                <span className="min-w-48 flex-1">
                  <span className="block font-medium">{g.descripcion}</span>
                  <span className="block text-xs text-muted-foreground">
                    {fechaCorta(`${g.fecha}T12:00:00`)} · {CATEGORIAS_GASTO[g.categoria]} · {DOCUMENTO_GASTO[g.documento]}
                    {g.beneficiario ? ` · ${g.beneficiario}` : ""}
                    {g.fijo ? " · fijo" : ""}
                  </span>
                </span>
                <span className="text-right">
                  <span className="block font-semibold tabular-nums">{usd2(Number(g.total))}</span>
                  <span className={`block text-xs ${g.pagado_en ? "text-muted-foreground" : "font-medium text-amber-700"}`}>
                    {g.pagado_en ? `Pagado ${fechaCorta(`${g.pagado_en}T12:00:00`)}` : "Sin pagar"}
                  </span>
                </span>
              </div>
            }
          >
            <CamposGasto g={g} mes={mes} />
          </FilaEditable>
        ))}
        {gastos.length ? (
          <details className="text-sm">
            <summary className="cursor-pointer text-muted-foreground">Borrar un gasto</summary>
            <div className="mt-2 space-y-2">
              {gastos.map((g) => (
                <FormularioAccion key={g.id} accion={borrarGasto} className="flex flex-wrap items-center gap-2">
                  <input type="hidden" name="id" value={g.id} />
                  <span className="flex-1">
                    {g.descripcion} · {usd2(Number(g.total))}
                  </span>
                  <label className="flex items-center gap-1 text-xs">
                    <input type="checkbox" name="confirmar" className="size-4" /> Sí, borrar
                  </label>
                  <BotonGuardar variant="ghost" size="sm">
                    Borrar
                  </BotonGuardar>
                </FormularioAccion>
              ))}
            </div>
          </details>
        ) : null}
      </CardContent>
    </Card>
  );
}

async function Iva({ mes }: { mes: string }) {
  const d = await ivaDelMes(createServiceClient(), mes);
  const tabla = (filas: typeof d.ventas, vacio: string) =>
    filas.length ? (
      <div className="overflow-x-auto">
        <table className="w-full min-w-[620px] text-sm tabular-nums">
          <thead className="text-left text-xs text-muted-foreground">
            <tr>
              <th className="py-2">Fecha</th>
              <th className="py-2">Documento</th>
              <th className="py-2">Nombre</th>
              <th className="py-2 text-right">Gravado</th>
              <th className="py-2 text-right">IVA</th>
              <th className="py-2 text-right">Total</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {filas.map((f, i) => (
              <tr key={`${f.numero}-${i}`}>
                <td className="py-1.5">{fechaCorta(`${f.fecha}T12:00:00`)}</td>
                <td className="py-1.5">
                  {f.documento}
                  <span className="block text-xs text-muted-foreground">{f.numero}</span>
                </td>
                <td className="py-1.5">
                  {f.nombre}
                  {f.nit ? <span className="block text-xs text-muted-foreground">{f.nit}</span> : null}
                </td>
                <td className="py-1.5 text-right">{usd2(f.gravado)}</td>
                <td className="py-1.5 text-right">{usd2(f.iva)}</td>
                <td className="py-1.5 text-right">{usd2(f.total)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    ) : (
      <p className="text-sm text-muted-foreground">{vacio}</p>
    );
  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>IVA de {nombreMes(mes)}</CardTitle>
          <CardDescription>
            Estimado para revisar con tu contador antes de declarar (F-07). Ventas por fecha de entrega; compras recibidas y gastos con crédito fiscal.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Datos columnas={3}>
            <Dato etiqueta="IVA de las ventas (débito)">{usd2(d.debito)}</Dato>
            <Dato etiqueta="IVA de compras y gastos (crédito)">{usd2(d.credito)}</Dato>
            <Dato etiqueta={d.aPagar >= 0 ? "IVA a pagar" : "Remanente a favor"}>
              <span className="text-lg font-semibold">{usd2(Math.abs(d.aPagar))}</span>
            </Dato>
          </Datos>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="flex items-start justify-between gap-3">
          <div className="space-y-1">
            <CardTitle>Libro de ventas</CardTitle>
            <CardDescription>{d.ventas.length} ventas entregadas.</CardDescription>
          </div>
          <a href={`/admin/finanzas/libro?mes=${mes}&libro=ventas`} download className="shrink-0 rounded-md border px-3 py-2 text-sm font-medium hover:bg-muted">
            Descargar CSV
          </a>
        </CardHeader>
        <CardContent>{tabla(d.ventas, "No hay ventas entregadas este mes.")}</CardContent>
      </Card>
      <Card>
        <CardHeader className="flex items-start justify-between gap-3">
          <div className="space-y-1">
            <CardTitle>Libro de compras</CardTitle>
            <CardDescription>Compras al proveedor y gastos con crédito fiscal.</CardDescription>
          </div>
          <a href={`/admin/finanzas/libro?mes=${mes}&libro=compras`} download className="shrink-0 rounded-md border px-3 py-2 text-sm font-medium hover:bg-muted">
            Descargar CSV
          </a>
        </CardHeader>
        <CardContent>{tabla(d.libroCompras, "No hay compras con crédito fiscal este mes.")}</CardContent>
      </Card>
    </div>
  );
}

async function Contenido({ searchParams }: { searchParams: Promise<Params> }) {
  await superAdmin();
  const sp = await searchParams;
  const mes = leerMes(sp.mes);
  const vista: Vista = sp.vista && sp.vista in VISTAS ? (sp.vista as Vista) : "resumen";
  const [anterior] = mesesAtras(mes, 2);
  const [a, m] = mes.split("-").map(Number);
  const siguiente = m === 12 ? `${a + 1}-01` : `${a}-${String(m + 1).padStart(2, "0")}`;
  const enlace = (cambio: Partial<{ mes: string; vista: string }>) => `/admin/finanzas?${new URLSearchParams({ mes, vista, ...cambio })}`;
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <Link href={enlace({ mes: anterior }) as "/admin/finanzas"} className="rounded-md border px-3 py-1.5 text-sm hover:bg-muted">
          ←
        </Link>
        <span className="min-w-36 text-center font-medium">{mayuscula(nombreMes(mes))}</span>
        <Link href={enlace({ mes: siguiente }) as "/admin/finanzas"} className="rounded-md border px-3 py-1.5 text-sm hover:bg-muted">
          →
        </Link>
        <nav className="ml-2 flex flex-wrap gap-1" aria-label="Vista">
          {(Object.keys(VISTAS) as Vista[]).map((v) => (
            <Link
              key={v}
              href={enlace({ vista: v }) as "/admin/finanzas"}
              className={`rounded-full border px-3 py-1.5 text-sm ${v === vista ? "border-marca bg-marca text-white" : "hover:bg-muted"}`}
            >
              {VISTAS[v]}
            </Link>
          ))}
        </nav>
      </div>
      {vista === "resumen" ? <Resumen mes={mes} /> : null}
      {vista === "flujo" ? <Flujo mes={mes} /> : null}
      {vista === "gastos" ? <Gastos mes={mes} /> : null}
      {vista === "iva" ? <Iva mes={mes} /> : null}
    </div>
  );
}

export default function Finanzas(props: PageProps<"/admin/finanzas">) {
  return (
    <div className="max-w-6xl space-y-4">
      <div>
        <h1 className="text-xl font-semibold">Finanzas</h1>
        <p className="text-sm text-muted-foreground">
          Cuánto se vendió, cuánto costó, cuánto quedó, cuánta plata entró y salió y el IVA del mes. Solo administradores.
        </p>
      </div>
      <Suspense fallback={<p className="text-sm text-muted-foreground">Calculando…</p>}>
        <Contenido searchParams={props.searchParams as Promise<Params>} />
      </Suspense>
    </div>
  );
}
