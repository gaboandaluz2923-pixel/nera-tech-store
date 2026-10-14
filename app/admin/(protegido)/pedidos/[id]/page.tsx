import Link from "next/link";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { ExternalLink, FileText } from "lucide-react";
import { BotonGuardar, FormularioAccion } from "@/components/admin/formulario-accion";
import { IconoWhatsApp } from "@/components/tienda/icono-whatsapp";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { COLUMNAS_DESCUENTOS, lineasDescuento } from "@/lib/tienda/descuentos";
import { SIGUIENTES, esperandoPago, porFacturar, type EstadoPedido, type PedidoBase } from "@/lib/admin/pedidos";
import { createClient } from "@/lib/supabase/server";
import { ESTADO_PEDIDO, FORMA_PAGO, fechaHora, usd2 } from "@/lib/tienda/formato";
import { enlaceWhatsAppA } from "@/lib/whatsapp";
import {
  agregarNota,
  cambiarCorreoCliente,
  cambiarEstadoPedido,
  facturaNoAplica,
  guardarFactura,
  registrarPago,
} from "../actions";

type Pedido = PedidoBase & {
  id: string;
  numero: number;
  token: string;
  subtotal: number;
  envio: number;
  descuento: number;
  descuento_combos: number;
  descuento_cupon: number;
  puntos_usados: number;
  descuento_puntos: number;
  combos: { nombre: string; veces: number; descuento: number }[] | null;
  cupones: { codigo: string } | null;
  total: number;
  notas: string | null;
  created_at: string;
  entrega: {
    nombre: string;
    telefono: string;
    telefono_alterno?: string | null;
    correo: string;
    municipio: string;
    departamento: string | null;
    direccion: string;
    referencia: string | null;
    repartidor?: { nombre: string; telefono: string } | null;
    mensaje?: string | null;
  };
  facturacion: { tipo: string; nit?: string; nrc?: string; nombre?: string; giro?: string };
  factura_numero: string | null;
  factura_archivo: string | null;
  factura_emitida_en: string | null;
  cliente_id: string | null;
  clientes: {
    correo: string | null;
    auth_user_id: string | null;
    telefono_alterno: string | null;
    cumple_dia: number | null;
    cumple_mes: number | null;
    acepta_correo: boolean;
    acepta_whatsapp: boolean;
  } | null;
  lineas_pedido: { id: string; nombre: string; cantidad: number; precio_unitario: number; precio_regular: number | null }[];
  pagos: { id: string; metodo: string; monto: number; estado: string; referencia_externa: string | null; created_at: string }[];
  pedido_eventos: { id: string; estado_anterior: string | null; estado_nuevo: string; nota: string | null; usuario: string | null; created_at: string }[];
};

function Dato({ etiqueta, children }: { etiqueta: string; children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-[8rem_1fr] gap-2 py-1 text-sm">
      <dt className="text-muted-foreground">{etiqueta}</dt>
      <dd>{children}</dd>
    </div>
  );
}

async function Detalle({ params }: { params: PageProps<"/admin/pedidos/[id]">["params"] }) {
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/.test(id)) notFound();
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("pedidos")
    .select(
      `id, numero, token, estado, forma_pago, subtotal, envio, total, notas, ${COLUMNAS_DESCUENTOS}, created_at, entrega, facturacion,
       pagado_en, confirmado_en, entregado_en, factura_estado, factura_numero, factura_archivo, factura_emitida_en,
       cliente_id, clientes(correo, auth_user_id, telefono_alterno, cumple_dia, cumple_mes, acepta_correo, acepta_whatsapp),
       lineas_pedido(id, nombre, cantidad, precio_unitario, precio_regular),
       pagos(id, metodo, monto, estado, referencia_externa, created_at),
       pedido_eventos(id, estado_anterior, estado_nuevo, nota, usuario, created_at)`
    )
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  if (!data) notFound();
  const p = data as unknown as Pedido;
  const h = await headers();
  const sitio = `${h.get("x-forwarded-proto") ?? "https"}://${h.get("x-forwarded-host") ?? h.get("host")}`;
  const enlacePedido = `${sitio}/pedido/${p.token}`;
  const facturaUrl = p.factura_archivo
    ? (await supabase.storage.from("facturas").createSignedUrl(p.factura_archivo, 600)).data?.signedUrl
    : null;

  const e = ESTADO_PEDIDO[p.estado] ?? ESTADO_PEDIDO.pendiente_confirmar;
  const siguientes = SIGUIENTES[p.estado as EstadoPedido] ?? [];
  const tel = `503${p.entrega.telefono}`;
  const waCliente = (m: string) => enlaceWhatsAppA(tel, m);
  const eventos = [...p.pedido_eventos].sort((a, b) => b.created_at.localeCompare(a.created_at));
  const facturar = porFacturar(p);
  const { count: pedidosCliente } = p.cliente_id
    ? await supabase
        .from("pedidos")
        .select("id", { count: "exact", head: true })
        .eq("cliente_id", p.cliente_id)
        .not("estado", "in", "(cancelado,devuelto)")
    : { count: 0 };
  const alterno = p.entrega.telefono_alterno || p.clientes?.telefono_alterno;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <Link href="/admin/pedidos" className="text-sm text-muted-foreground hover:underline">
            ← Pedidos
          </Link>
          <h1 className="flex flex-wrap items-center gap-2 text-xl font-semibold">
            Pedido #{p.numero}
            <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${e.clase}`}>{e.texto}</span>
            {p.pagado_en ? (
              <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-800">Pagado</span>
            ) : esperandoPago(p) ? (
              <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-900">Sin pagar</span>
            ) : null}
          </h1>
          <p className="text-sm text-muted-foreground">
            {fechaHora(p.created_at)} · {FORMA_PAGO[p.forma_pago]} · {usd2(Number(p.total))}
          </p>
        </div>
        <a href={enlacePedido} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-sm font-medium text-primary hover:underline">
          Ver como el cliente <ExternalLink className="size-4" />
        </a>
      </div>

      {/* Acciones de estado */}
      <Card>
        <CardHeader>
          <CardTitle>Siguiente paso</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {siguientes.length ? (
            <FormularioAccion key={p.estado} accion={cambiarEstadoPedido} className="space-y-3">
              <input type="hidden" name="id" value={p.id} />
              {siguientes.some((s) => s.estado === "en_camino") || p.estado === "en_camino" ? (
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-1">
                    <Label htmlFor="rep-nombre">Repartidor (nombre)</Label>
                    <Input id="rep-nombre" name="repartidor_nombre" defaultValue={p.entrega.repartidor?.nombre ?? ""} placeholder="Ej. Carlos" />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="rep-tel">Teléfono del repartidor</Label>
                    <Input id="rep-tel" name="repartidor_telefono" inputMode="tel" defaultValue={p.entrega.repartidor?.telefono ?? ""} placeholder="7123 4567" />
                  </div>
                  <p className="text-xs text-muted-foreground sm:col-span-2">Se le muestra al cliente en el correo de &quot;Va en camino&quot; y en su pedido.</p>
                </div>
              ) : null}
              <div className="space-y-1">
                <Label htmlFor="mensaje-cliente">Mensaje para el cliente (opcional; sale en el correo)</Label>
                <Input id="mensaje-cliente" name="mensaje_cliente" maxLength={500} placeholder="Ej. Llegamos entre 2 y 4 pm, tené el efectivo listo" />
              </div>
              <div className="space-y-1">
                <Label htmlFor="nota-estado">Nota interna (solo el equipo; obligatoria para cancelar)</Label>
                <Input id="nota-estado" name="nota" placeholder="Ej. cliente pidió cancelar por WhatsApp" />
              </div>
              <div className="flex flex-wrap gap-2">
                {siguientes.map((s) => (
                  <BotonGuardar key={s.estado} name="estado" value={s.estado} variant={s.peligro ? "outline" : "default"} className={s.peligro ? "text-destructive" : ""}>
                    {s.texto}
                  </BotonGuardar>
                ))}
              </div>
            </FormularioAccion>
          ) : (
            <p className="text-sm text-muted-foreground">Este pedido está cerrado.</p>
          )}
          <div className="flex flex-wrap gap-2 border-t pt-4">
            <a
              href={waCliente(`Hola ${p.entrega.nombre.split(" ")[0]}, te escribimos de Nera Tech por tu pedido #${p.numero}. `)}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium hover:bg-muted"
            >
              <IconoWhatsApp className="size-4 text-[#25D366]" /> Escribirle al cliente
            </a>
          </div>
        </CardContent>
      </Card>

      {/* Pago */}
      <Card>
        <CardHeader>
          <CardTitle>Pago</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <dl>
            <Dato etiqueta="Forma">{FORMA_PAGO[p.forma_pago]}</Dato>
            <Dato etiqueta="Estado">{p.pagado_en ? `Pagado el ${fechaHora(p.pagado_en)}` : "Sin pagar"}</Dato>
          </dl>
          {p.pagos.length ? (
            <ul className="space-y-1 text-xs text-muted-foreground">
              {p.pagos.map((x) => (
                <li key={x.id}>
                  {fechaHora(x.created_at)} · {FORMA_PAGO[x.metodo]} · {usd2(Number(x.monto))} · {x.estado}
                  {x.referencia_externa ? ` · ref. ${x.referencia_externa}` : ""}
                </li>
              ))}
            </ul>
          ) : null}
          {!p.pagado_en && p.estado !== "cancelado" ? (
            <FormularioAccion accion={registrarPago} className="flex flex-wrap items-end gap-2 border-t pt-3">
              <input type="hidden" name="id" value={p.id} />
              <div className="min-w-56 flex-1 space-y-1">
                <Label htmlFor="ref-pago">Referencia (opcional)</Label>
                <Input id="ref-pago" name="referencia" placeholder="Núm. de transferencia o de autorización" />
              </div>
              <BotonGuardar variant="outline">Marcar como pagado</BotonGuardar>
            </FormularioAccion>
          ) : null}
          {p.forma_pago === "contra_entrega" && !p.pagado_en ? (
            <p className="text-xs text-muted-foreground">Al marcarlo como entregado se registra cobrado en efectivo.</p>
          ) : null}
        </CardContent>
      </Card>

      {/* Factura */}
      <Card>
        <CardHeader>
          <CardTitle>Factura electrónica</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <dl>
            <Dato etiqueta="Tipo">{p.facturacion.tipo === "credito_fiscal" ? "Crédito fiscal" : "Consumidor final"}</Dato>
            {p.facturacion.tipo === "credito_fiscal" ? (
              <>
                <Dato etiqueta="Razón social">{p.facturacion.nombre}</Dato>
                <Dato etiqueta="NIT">{p.facturacion.nit}</Dato>
                <Dato etiqueta="NRC">{p.facturacion.nrc}</Dato>
                <Dato etiqueta="Giro">{p.facturacion.giro}</Dato>
              </>
            ) : (
              <Dato etiqueta="A nombre de">{p.entrega.nombre}</Dato>
            )}
            <Dato etiqueta="Correo">{p.entrega.correo}</Dato>
            <Dato etiqueta="Estado">
              {p.factura_estado === "emitida"
                ? `Emitida${p.factura_emitida_en ? ` el ${fechaHora(p.factura_emitida_en)}` : ""}${p.factura_numero ? ` · ${p.factura_numero}` : ""}`
                : p.factura_estado === "no_aplica"
                  ? "No lleva factura"
                  : facturar
                    ? "Toca emitirla"
                    : p.forma_pago === "contra_entrega"
                      ? "Se emite el día siguiente a la entrega"
                      : "Se emite cuando esté confirmado y pagado"}
            </Dato>
          </dl>
          {facturaUrl ? (
            <a href={facturaUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-sm font-medium text-primary hover:underline">
              <FileText className="size-4" /> Ver PDF subido
            </a>
          ) : null}
          <FormularioAccion key={`${p.factura_estado}-${p.factura_numero}`} accion={guardarFactura} className="space-y-3 border-t pt-3">
            <input type="hidden" name="id" value={p.id} />
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1">
                <Label htmlFor="factura-numero">Código de generación o número de control</Label>
                <Input id="factura-numero" name="factura_numero" defaultValue={p.factura_numero ?? ""} />
              </div>
              <div className="space-y-1">
                <Label htmlFor="factura-pdf">PDF de la factura</Label>
                <Input id="factura-pdf" name="archivo" type="file" accept="application/pdf,.pdf" />
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <BotonGuardar>{p.factura_estado === "emitida" ? "Actualizar factura" : "Guardar factura"}</BotonGuardar>
            </div>
          </FormularioAccion>
          <div className="flex flex-wrap gap-2">
            {p.factura_estado === "emitida" ? (
              <a
                href={waCliente(`Hola ${p.entrega.nombre.split(" ")[0]}, tu factura del pedido #${p.numero} ya está lista. La podés descargar aquí: ${enlacePedido}`)}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium hover:bg-muted"
              >
                <IconoWhatsApp className="size-4 text-[#25D366]" /> Avisarle por WhatsApp
              </a>
            ) : null}
            {p.factura_estado === "pendiente" ? (
              <FormularioAccion accion={facturaNoAplica}>
                <input type="hidden" name="id" value={p.id} />
                <BotonGuardar variant="ghost" size="sm">
                  No lleva factura
                </BotonGuardar>
              </FormularioAccion>
            ) : null}
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Productos */}
        <Card>
          <CardHeader>
            <CardTitle>Productos</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2 text-sm">
              {p.lineas_pedido.map((l) => (
                <li key={l.id} className="flex justify-between gap-3">
                  <span>
                    {l.cantidad} × {l.nombre}
                  </span>
                  <span className="text-right">
                    {l.precio_regular ? (
                      <span className="block text-xs text-muted-foreground line-through">{usd2(Number(l.precio_regular) * l.cantidad)}</span>
                    ) : null}
                    {usd2(Number(l.precio_unitario) * l.cantidad)}
                  </span>
                </li>
              ))}
            </ul>
            <dl className="mt-3 border-t pt-2 text-sm">
              <Dato etiqueta="Subtotal">{usd2(Number(p.subtotal))}</Dato>
              <Dato etiqueta="Envío">{Number(p.envio) ? usd2(Number(p.envio)) : "Gratis"}</Dato>
              {lineasDescuento(p).map((d) => (
                <Dato key={d.texto} etiqueta={d.texto}>
                  <span className="text-green-700">−{usd2(d.monto)}</span>
                </Dato>
              ))}
              <Dato etiqueta="Total">
                <strong>{usd2(Number(p.total))}</strong>
              </Dato>
            </dl>
          </CardContent>
        </Card>

        {/* Cliente y entrega */}
        <Card>
          <CardHeader>
            <CardTitle>Cliente y entrega</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <dl>
              <Dato etiqueta="Nombre">{p.entrega.nombre}</Dato>
              <Dato etiqueta="Teléfono">{p.entrega.telefono}</Dato>
              {alterno ? <Dato etiqueta="Teléfono alterno">{alterno}</Dato> : null}
              {(pedidosCliente ?? 0) > 1 ? (
                <Dato etiqueta="Cliente">
                  <span className="rounded-full bg-marca/10 px-2 py-0.5 text-xs font-medium text-marca">Frecuente · {pedidosCliente} pedidos</span>
                </Dato>
              ) : null}
              {p.clientes?.cumple_dia && p.clientes?.cumple_mes ? (
                <Dato etiqueta="Cumpleaños">{`${p.clientes.cumple_dia}/${p.clientes.cumple_mes}`}</Dato>
              ) : null}
              <Dato etiqueta="Correo">{p.entrega.correo}</Dato>
              {p.clientes && !(p.clientes.acepta_correo && p.clientes.acepta_whatsapp) ? (
                <Dato etiqueta="Publicidad">
                  No quiere por {[!p.clientes.acepta_whatsapp && "WhatsApp", !p.clientes.acepta_correo && "correo"].filter(Boolean).join(" ni ")}
                </Dato>
              ) : null}
              <Dato etiqueta="Dirección">
                {p.entrega.direccion}, {[p.entrega.municipio, p.entrega.departamento].filter(Boolean).join(", ")}
              </Dato>
              {p.entrega.referencia ? <Dato etiqueta="Referencia">{p.entrega.referencia}</Dato> : null}
              {p.notas ? <Dato etiqueta="Nota del cliente">{p.notas}</Dato> : null}
              {p.entrega.repartidor ? (
                <Dato etiqueta="Repartidor">{[p.entrega.repartidor.nombre, p.entrega.repartidor.telefono].filter(Boolean).join(" · ")}</Dato>
              ) : null}
              <Dato etiqueta="Cuenta">
                {p.clientes?.auth_user_id ? `Enlazado a ${p.clientes.correo}` : `Sin cuenta (se enlaza si entra con ${p.clientes?.correo ?? p.entrega.correo})`}
              </Dato>
            </dl>
            <FormularioAccion accion={cambiarCorreoCliente} className="flex flex-wrap items-end gap-2 border-t pt-3">
              <input type="hidden" name="id" value={p.id} />
              <div className="min-w-56 flex-1 space-y-1">
                <Label htmlFor="correo-cuenta">Enlazar a otro correo de Google</Label>
                <Input id="correo-cuenta" name="correo" type="email" placeholder="correo@gmail.com" />
              </div>
              <BotonGuardar variant="outline" size="sm">
                Enlazar
              </BotonGuardar>
            </FormularioAccion>
          </CardContent>
        </Card>
      </div>

      {/* Historial */}
      <Card>
        <CardHeader>
          <CardTitle>Historial</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <FormularioAccion accion={agregarNota} className="flex flex-wrap items-end gap-2">
            <input type="hidden" name="id" value={p.id} />
            <div className="min-w-56 flex-1 space-y-1">
              <Label htmlFor="nota-libre">Agregar nota interna</Label>
              <Input id="nota-libre" name="nota" placeholder="Solo la ve el equipo" />
            </div>
            <BotonGuardar variant="outline" size="sm">
              Agregar
            </BotonGuardar>
          </FormularioAccion>
          <ol className="space-y-2 text-sm">
            {eventos.map((ev) => (
              <li key={ev.id} className="border-l-2 pl-3">
                <span className="text-xs text-muted-foreground">
                  {fechaHora(ev.created_at)} · {ev.usuario ?? "sistema"}
                </span>
                <span className="block">
                  {ev.estado_anterior && ev.estado_anterior !== ev.estado_nuevo
                    ? `${ESTADO_PEDIDO[ev.estado_anterior]?.texto ?? ev.estado_anterior} → ${ESTADO_PEDIDO[ev.estado_nuevo]?.texto ?? ev.estado_nuevo}. `
                    : ""}
                  {ev.nota}
                </span>
              </li>
            ))}
          </ol>
        </CardContent>
      </Card>
    </div>
  );
}

export default function DetallePedido({ params }: PageProps<"/admin/pedidos/[id]">) {
  return (
    <div className="max-w-4xl">
      <Suspense fallback={<p className="text-sm text-muted-foreground">Cargando…</p>}>
        <Detalle params={params} />
      </Suspense>
    </div>
  );
}
