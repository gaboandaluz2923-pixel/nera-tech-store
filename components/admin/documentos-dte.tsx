import Link from "next/link";
import { BotonGuardar, FormularioAccion } from "@/components/admin/formulario-accion";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { anularDte, descartarDte, notaDeCredito, reenviarDte, reintentarDte } from "@/app/admin/(protegido)/facturacion/actions";
import { TIPO_DTE, TIPO_INVALIDACION, type TipoDte } from "@/lib/dte/catalogos";
import { fechaHora, usd2 } from "@/lib/tienda/formato";

// Lista de documentos electrónicos con sus descargas y acciones (Facturación y detalle del pedido).

export type DocDte = {
  id: string;
  ambiente: string;
  tipo_dte: TipoDte;
  numero_control: string;
  codigo_generacion: string;
  fec_emi: string;
  hor_emi: string;
  estado: string;
  total: number;
  receptor_nombre: string | null;
  receptor_correo: string | null;
  sello_recibido: string | null;
  mensaje: string | null;
  observaciones: string[] | null;
  pedido_id: string | null;
  relacionado_id: string | null;
  prueba: boolean;
  correo_enviado_en: string | null;
  created_at: string;
  json: { cuerpoDocumento?: { numItem: number; descripcion: string; cantidad: number; ventaGravada: number }[] } | null;
  pedidos?: { numero: number } | null;
};

export const COLUMNAS_DTE =
  "id, ambiente, tipo_dte, numero_control, codigo_generacion, fec_emi, hor_emi, estado, total, receptor_nombre, receptor_correo, sello_recibido, mensaje, observaciones, pedido_id, relacionado_id, prueba, correo_enviado_en, created_at, json, pedidos(numero)";

export const ESTADO_DTE: Record<string, { texto: string; clase: string }> = {
  pendiente: { texto: "Enviando", clase: "bg-amber-100 text-amber-900" },
  procesado: { texto: "Recibido por Hacienda", clase: "bg-green-100 text-green-900" },
  rechazado: { texto: "Rechazado", clase: "bg-red-100 text-red-900" },
  contingencia: { texto: "Contingencia (sin sello aún)", clase: "bg-orange-100 text-orange-900" },
  invalidado: { texto: "Anulado", clase: "bg-zinc-200 text-zinc-700" },
  descartado: { texto: "Descartado", clase: "bg-zinc-100 text-zinc-500" },
};

const SELECT = "h-9 w-full rounded-md border bg-background px-2 text-sm";

function Acciones({ d, admin, reemplazos }: { d: DocDte; admin: boolean; reemplazos: DocDte[] }) {
  const ocultos = (
    <>
      <input type="hidden" name="id" value={d.id} />
      <input type="hidden" name="pedido_id" value={d.pedido_id ?? ""} />
    </>
  );
  const posiblesReemplazos = reemplazos.filter((r) => r.id !== d.id && r.estado === "procesado" && (r.tipo_dte === d.tipo_dte || d.tipo_dte !== "05"));
  return (
    <div className="mt-3 space-y-4 border-t pt-3">
      {d.estado === "procesado" || d.estado === "contingencia" ? (
        <FormularioAccion accion={reenviarDte} className="flex flex-wrap items-end gap-2">
          {ocultos}
          <div className="min-w-56 flex-1 space-y-1">
            <Label htmlFor={`para-${d.id}`}>Enviar por correo (PDF y JSON)</Label>
            <Input id={`para-${d.id}`} name="para" type="email" placeholder={d.receptor_correo ?? "correo@cliente.com"} />
          </div>
          <BotonGuardar variant="outline" size="sm">
            {d.correo_enviado_en ? "Reenviar" : "Enviar"}
          </BotonGuardar>
        </FormularioAccion>
      ) : null}

      {d.estado === "rechazado" ? (
        <div className="flex flex-wrap items-start gap-2">
          <FormularioAccion accion={reintentarDte}>
            {ocultos}
            <BotonGuardar size="sm">Corregir y reenviar</BotonGuardar>
            <p className="mt-1 max-w-xs text-xs text-muted-foreground">
              Se arma de nuevo con los datos actuales del pedido y del cliente (corregí primero lo que dice Hacienda) y se envía con el mismo número.
            </p>
          </FormularioAccion>
          {admin ? (
            <FormularioAccion accion={descartarDte} className="space-y-1">
              {ocultos}
              <label className="flex items-center gap-2 text-xs">
                <input type="checkbox" name="confirmo" className="size-4" /> No lo voy a corregir
              </label>
              <BotonGuardar variant="outline" size="sm">
                Descartar
              </BotonGuardar>
            </FormularioAccion>
          ) : null}
        </div>
      ) : null}

      {admin && d.estado === "procesado" && d.tipo_dte === "03" && d.json?.cuerpoDocumento ? (
        <details className="rounded-md border p-3">
          <summary className="cursor-pointer text-sm font-medium">Nota de crédito (devolución o rebaja)</summary>
          <FormularioAccion accion={notaDeCredito} className="mt-3 space-y-3">
            {ocultos}
            <p className="text-xs text-muted-foreground">Cuántas unidades se devuelven de cada línea. Se emite con los mismos precios del crédito fiscal.</p>
            <ul className="space-y-2">
              {d.json.cuerpoDocumento.map((it) => (
                <li key={it.numItem} className="flex items-center gap-2 text-sm">
                  <Input name={`cant_${it.numItem}`} type="number" min={0} max={it.cantidad} step="1" defaultValue={0} className="w-20" aria-label={`Unidades de ${it.descripcion}`} />
                  <span className="min-w-0 flex-1">
                    {it.descripcion} <span className="text-muted-foreground">(de {it.cantidad})</span>
                  </span>
                </li>
              ))}
            </ul>
            <div className="space-y-1">
              <Label htmlFor={`motivo-nc-${d.id}`}>Motivo</Label>
              <Input id={`motivo-nc-${d.id}`} name="motivo" placeholder="Devolución de 1 unidad por falla" />
            </div>
            <BotonGuardar size="sm">Emitir nota de crédito</BotonGuardar>
          </FormularioAccion>
        </details>
      ) : null}

      {admin && d.estado === "procesado" ? (
        <details className="rounded-md border border-red-200 p-3">
          <summary className="cursor-pointer text-sm font-medium text-red-800">Anular ante Hacienda</summary>
          <FormularioAccion accion={anularDte} className="mt-3 space-y-3">
            {ocultos}
            <div className="space-y-1">
              <Label htmlFor={`tipo-${d.id}`}>Motivo</Label>
              <select id={`tipo-${d.id}`} name="tipo" className={SELECT} defaultValue="2">
                {Object.entries(TIPO_INVALIDACION).map(([k, v]) => (
                  <option key={k} value={k}>
                    {v}
                  </option>
                ))}
              </select>
            </div>
            {d.tipo_dte !== "05" ? (
              <div className="space-y-1">
                <Label htmlFor={`reemplazo-${d.id}`}>Documento que lo reemplaza (solo para error u otro)</Label>
                <select id={`reemplazo-${d.id}`} name="reemplazo" className={SELECT} defaultValue="">
                  <option value="">Ninguno (rescindir)</option>
                  {posiblesReemplazos.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.numero_control} · {r.receptor_nombre ?? ""} · {usd2(Number(r.total))}
                    </option>
                  ))}
                </select>
                <p className="text-xs text-muted-foreground">
                  Para corregir un error: emití primero el documento correcto y elegilo aquí. Para una devolución total o venta anulada, “Rescindir”.
                </p>
              </div>
            ) : null}
            <div className="space-y-1">
              <Label htmlFor={`motivo-${d.id}`}>Explicación (la ve Hacienda y el cliente)</Label>
              <Textarea id={`motivo-${d.id}`} name="motivo" rows={2} maxLength={200} placeholder="El cliente devolvió el equipo y se le reintegró el dinero." />
            </div>
            <p className="text-xs text-muted-foreground">
              Plazos: factura, 3 meses desde el sello; crédito fiscal y nota de crédito, lo antes posible (Hacienda acepta hasta el día 10 hábil del mes siguiente). No se puede deshacer.
            </p>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" name="confirmo" className="size-4" /> Confirmo que quiero anular {d.numero_control}
            </label>
            <BotonGuardar variant="destructive" size="sm">
              Anular documento
            </BotonGuardar>
          </FormularioAccion>
        </details>
      ) : null}
    </div>
  );
}

export function ListaDte({ docs, admin, conPedido = true, todos }: { docs: DocDte[]; admin: boolean; conPedido?: boolean; todos?: DocDte[] }) {
  if (!docs.length) return <p className="text-sm text-muted-foreground">Todavía no hay documentos.</p>;
  return (
    <ul className="divide-y rounded-lg border">
      {docs.map((d) => {
        const e = ESTADO_DTE[d.estado] ?? { texto: d.estado, clase: "bg-muted" };
        const descargable = d.estado !== "descartado";
        return (
          <li key={d.id} className="p-3 text-sm">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div className="min-w-0 space-y-0.5">
                <p className="font-medium">
                  {TIPO_DTE[d.tipo_dte]} <span className="font-mono text-xs">{d.numero_control}</span>
                  {d.ambiente === "00" ? <span className="ml-2 rounded bg-amber-100 px-1.5 py-0.5 text-xs text-amber-900">Pruebas</span> : null}
                </p>
                <p className="text-muted-foreground">
                  {fechaHora(`${d.fec_emi}T${d.hor_emi}-06:00`)} · {d.receptor_nombre ?? "Consumidor final"} · {usd2(Number(d.total))}
                  {conPedido && d.pedidos?.numero ? (
                    <>
                      {" · "}
                      <Link href={`/admin/pedidos/${d.pedido_id}` as "/admin"} className="text-primary hover:underline">
                        Pedido #{d.pedidos.numero}
                      </Link>
                    </>
                  ) : null}
                </p>
              </div>
              <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${e.clase}`}>{e.texto}</span>
            </div>
            {d.mensaje && ["rechazado", "pendiente", "contingencia"].includes(d.estado) ? (
              <p className={`mt-1 text-xs ${d.estado === "rechazado" ? "text-red-800" : "text-amber-800"}`}>{d.mensaje}</p>
            ) : null}
            {d.observaciones?.length ? <p className="mt-1 text-xs text-amber-800">Observaciones de Hacienda: {d.observaciones.join("; ")}</p> : null}
            {descargable ? (
              <p className="mt-1 flex flex-wrap gap-3 text-xs">
                <a href={`/api/dte/${d.id}/pdf?ver=1`} target="_blank" rel="noreferrer" className="text-primary hover:underline">
                  Ver PDF
                </a>
                <a href={`/api/dte/${d.id}/json`} className="text-primary hover:underline">
                  Descargar JSON
                </a>
                <a
                  href={`https://admin.factura.gob.sv/consultaPublica?ambiente=${d.ambiente}&codGen=${d.codigo_generacion}&fechaEmi=${d.fec_emi}`}
                  target="_blank"
                  rel="noreferrer"
                  className="text-primary hover:underline"
                >
                  Consultar en Hacienda
                </a>
                {d.correo_enviado_en ? <span className="text-muted-foreground">Enviado al cliente {fechaHora(d.correo_enviado_en)}</span> : null}
              </p>
            ) : null}
            {["procesado", "rechazado", "contingencia"].includes(d.estado) ? (
              <details className="mt-2">
                <summary className="cursor-pointer text-xs text-muted-foreground">Acciones</summary>
                <Acciones d={d} admin={admin} reemplazos={todos ?? docs} />
              </details>
            ) : null}
          </li>
        );
      })}
    </ul>
  );
}
