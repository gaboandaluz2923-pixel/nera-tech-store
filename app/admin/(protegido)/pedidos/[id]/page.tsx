import Link from "next/link";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { ExternalLink, FileText } from "lucide-react";
import { Editable, FilaEditable } from "@/components/admin/editable";
import { BotonGuardar, FormularioAccion } from "@/components/admin/formulario-accion";
import { IconoWhatsApp } from "@/components/tienda/icono-whatsapp";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { COLUMNAS_DESCUENTOS, lineasDescuento, textoEnvio } from "@/lib/tienda/descuentos";
import { ProductosPedido } from "@/components/admin/editar-pedido";
import { bloqueoEdicion, ESTADOS_PRODUCTOS, pagadoDe } from "@/lib/admin/editar-pedido";
import { variantesVendibles } from "@/lib/admin/pedido-manual";
import { configTienda } from "@/lib/tienda/datos";
import { CANAL, SIGUIENTES, esperandoPago, porFacturar, type EstadoPedido, type PedidoBase } from "@/lib/admin/pedidos";
import { nombresEquipo, quien } from "@/lib/admin/historial";
import { asignarUnidad } from "../../inventario/actions";
import { createClient } from "@/lib/supabase/server";
import { FacturaPedido, facturacionPropiaActiva } from "@/components/admin/factura-pedido";
import { rolActual } from "@/lib/admin/sesion";
import { ESTADO_PEDIDO, FORMA_PAGO, fechaHora, usd2 } from "@/lib/tienda/formato";
import { enlaceWhatsAppA } from "@/lib/whatsapp";
import {
  agregarNota,
  cambiarCorreoCliente,
  cambiarEstadoPedido,
  facturaNoAplica,
  guardarEntrega,
  guardarFactura,
  registrarPago,
} from "../actions";
import { registrarDevolucion, registrarPagoSaldo } from "../editar-actions";

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
  descuento_extra: number;
  descuento_extra_motivo: string | null;
  envio_motivo: string | null;
  combos: { nombre: string; veces: number; descuento: number }[] | null;
  cupones: { codigo: string } | null;
  total: number;
  notas: string | null;
  created_at: string;
  canal: string;
  creado_por: string | null;
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
  lineas_pedido: {
    id: string;
    nombre: string;
    cantidad: number;
    precio_unitario: number;
    precio_regular: number | null;
    variante_id: string | null;
  }[];
  inventario_descontado?: boolean;
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
      `id, numero, token, estado, forma_pago, subtotal, envio, total, notas, ${COLUMNAS_DESCUENTOS}, created_at, canal, creado_por, entrega, facturacion,
       pagado_en, confirmado_en, entregado_en, factura_estado, factura_numero, factura_archivo, factura_emitida_en,
       cliente_id, clientes(correo, auth_user_id, telefono_alterno, cumple_dia, cumple_mes, acepta_correo, acepta_whatsapp),
       inventario_descontado, lineas_pedido(id, nombre, cantidad, precio_unitario, precio_regular, variante_id),
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
  const [dtePropio, { rol }] = await Promise.all([facturacionPropiaActiva(), rolActual()]);
  const { count: pedidosCliente } = p.cliente_id
    ? await supabase
        .from("pedidos")
        .select("id", { count: "exact", head: true })
        .eq("cliente_id", p.cliente_id)
        .not("estado", "in", "(cancelado,devuelto)")
    : { count: 0 };
  const alterno = p.entrega.telefono_alterno || p.clientes?.telefono_alterno;
  const [nombres, { data: unidadesData }] = await Promise.all([
    nombresEquipo(supabase),
    supabase.from("unidades").select("id, identificador, identificador2, linea_pedido_id, estado").eq("pedido_id", p.id),
  ]);
  const unidadesDe = (lineaId: string) =>
    ((unidadesData ?? []) as { id: string; identificador: string; identificador2: string | null; linea_pedido_id: string | null }[]).filter(
      (u) => u.linea_pedido_id === lineaId
    );
  const conInventario = Boolean(p.inventario_descontado);
  // Editar el pedido (solo administradores) y saldo de pagos
  const esAdmin = rol === "super_admin";
  const bloqueo = esAdmin ? await bloqueoEdicion({ id: p.id, estado: p.estado, factura_estado: p.factura_estado }) : null;
  const puedeProductos = (ESTADOS_PRODUCTOS as readonly string[]).includes(p.estado);
  const [vendibles, config] = await Promise.all([
    esAdmin && !bloqueo && puedeProductos ? variantesVendibles().catch(() => []) : Promise.resolve([]),
    configTienda(),
  ]);
  const pagadoTotal = pagadoDe(p);
  const saldo = Math.round((Number(p.total) - pagadoTotal) * 100) / 100;
  const esEnPersona = p.entrega.municipio === "Entrega en persona";

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
            {fechaHora(p.created_at)} · {FORMA_PAGO[p.forma_pago]} · {usd2(Number(p.total))} · {CANAL[p.canal] ?? p.canal}
            {p.creado_por ? ` · lo creó ${quien(p.creado_por, nombres)}` : ""}
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
            {pagadoTotal > 0 ? (
              <Dato etiqueta="Saldo">
                {saldo > 0.004 ? (
                  <strong className="text-amber-700">Pendiente {usd2(saldo)}</strong>
                ) : saldo < -0.004 ? (
                  <strong className="text-blue-700">A favor del cliente {usd2(-saldo)} (devolver)</strong>
                ) : (
                  <span className="text-green-700">Al día</span>
                )}
                <span className="text-muted-foreground"> · pagó {usd2(pagadoTotal)} de {usd2(Number(p.total))}</span>
              </Dato>
            ) : null}
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
          {esAdmin && pagadoTotal > 0 && saldo > 0.004 && !["cancelado", "devuelto"].includes(p.estado) ? (
            <FormularioAccion accion={registrarPagoSaldo} className="flex flex-wrap items-end gap-2 border-t pt-3">
              <input type="hidden" name="id" value={p.id} />
              <div className="w-28 space-y-1">
                <Label htmlFor="saldo-monto">Monto</Label>
                <Input id="saldo-monto" name="monto" type="number" step="0.01" min="0.01" defaultValue={saldo.toFixed(2)} />
              </div>
              <div className="min-w-48 flex-1 space-y-1">
                <Label htmlFor="saldo-ref">Referencia (opcional)</Label>
                <Input id="saldo-ref" name="referencia" placeholder="Núm. de transferencia o de autorización" />
              </div>
              <BotonGuardar variant="outline">Registrar pago del saldo</BotonGuardar>
            </FormularioAccion>
          ) : null}
          {esAdmin && pagadoTotal > 0 && saldo < -0.004 ? (
            <FormularioAccion accion={registrarDevolucion} className="flex flex-wrap items-end gap-2 border-t pt-3">
              <input type="hidden" name="id" value={p.id} />
              <div className="w-28 space-y-1">
                <Label htmlFor="dev-monto">Monto</Label>
                <Input id="dev-monto" name="monto" type="number" step="0.01" min="0.01" defaultValue={(-saldo).toFixed(2)} />
              </div>
              <div className="min-w-48 flex-1 space-y-1">
                <Label htmlFor="dev-ref">Referencia (opcional)</Label>
                <Input id="dev-ref" name="referencia" placeholder="Transferencia o reembolso en Wompi" />
              </div>
              <BotonGuardar variant="outline">Registrar devolución</BotonGuardar>
              <p className="w-full text-xs text-muted-foreground">
                Primero devolvé el dinero (en Wompi → Transacciones → Reembolsar, o por transferencia) y después registralo aquí.
              </p>
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
                      ? dtePropio
                        ? "Se emite al entregar y cobrar"
                        : "Se emite el día siguiente a la entrega"
                      : "Se emite cuando esté confirmado y pagado"}
            </Dato>
          </dl>
          {dtePropio ? <FacturaPedido p={p} admin={rol === "super_admin"} /> : null}
          {dtePropio ? (
            <details className="rounded-md border p-3">
              <summary className="cursor-pointer text-sm text-muted-foreground">¿La emitiste en otro sistema? Anotala aquí</summary>
              <div className="mt-3 space-y-3">
          {facturaUrl ? (
            <a href={facturaUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-sm font-medium text-primary hover:underline">
              <FileText className="size-4" /> Ver PDF subido
            </a>
          ) : null}
          <div className="border-t pt-3">
            <FilaEditable
              accion={guardarFactura}
              className=""
              vista={
                <p className="text-sm text-muted-foreground">
                  {p.factura_estado === "emitida" ? "Para corregir el número o subir otro PDF, tocá Editar." : "Cuando la emitás, tocá Editar y cargá el código y el PDF."}
                </p>
              }
            >
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
            </FilaEditable>
          </div>
              </div>
            </details>
          ) : (
            <>
          {facturaUrl ? (
            <a href={facturaUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-sm font-medium text-primary hover:underline">
              <FileText className="size-4" /> Ver PDF subido
            </a>
          ) : null}
          <div className="border-t pt-3">
            <FilaEditable
              accion={guardarFactura}
              className=""
              vista={
                <p className="text-sm text-muted-foreground">
                  {p.factura_estado === "emitida" ? "Para corregir el número o subir otro PDF, tocá Editar." : "Cuando la emitás, tocá Editar y cargá el código y el PDF."}
                </p>
              }
            >
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
            </FilaEditable>
          </div>
            </>
          )}
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
        {/* Productos (con "Editar pedido" para administradores) */}
        <ProductosPedido
          pedidoId={p.id}
          puedeEditar={esAdmin}
          bloqueo={bloqueo}
          puedeProductos={puedeProductos}
          lineasActuales={p.lineas_pedido.map((l) => ({
            id: l.id,
            varianteId: l.variante_id,
            nombre: l.nombre,
            cantidad: l.cantidad,
            precio: Number(l.precio_unitario),
          }))}
          variantes={vendibles}
          envio={{ monto: Number(p.envio), motivo: p.envio_motivo }}
          costoEnvio={Number(config.envio.costo) || 0}
          descuentoExtra={{ monto: Number(p.descuento_extra) || 0, motivo: p.descuento_extra_motivo }}
          descuentoCombos={Number(p.descuento_combos) || 0}
          correoCliente={p.entrega.correo || p.clientes?.correo || null}
          vista={
            <>
            <ul className="space-y-2 text-sm">
              {p.lineas_pedido.map((l) => {
                const unidades = unidadesDe(l.id);
                return (
                  <li key={l.id} className="space-y-1.5">
                    <div className="flex justify-between gap-3">
                      <span>
                        {l.cantidad} × {l.nombre}
                      </span>
                      <span className="text-right">
                        {l.precio_regular ? (
                          <span className="block text-xs text-muted-foreground line-through">{usd2(Number(l.precio_regular) * l.cantidad)}</span>
                        ) : null}
                        {usd2(Number(l.precio_unitario) * l.cantidad)}
                      </span>
                    </div>
                    {/* El equipo que sale: IMEI o serie (sirve para la garantía) */}
                    {l.variante_id && conInventario ? (
                      <div className="space-y-1 rounded-md bg-muted/40 p-2 text-xs">
                        {unidades.map((u) => (
                          <FilaEditable
                            key={u.id}
                            accion={asignarUnidad}
                            className="rounded border bg-background p-2"
                            textoEditar="Cambiar"
                            textoGuardar="Cambiar equipo"
                            vista={
                              <span className="font-mono">
                                {u.identificador}
                                {u.identificador2 ? ` · ${u.identificador2}` : ""}
                              </span>
                            }
                          >
                            <input type="hidden" name="linea_id" value={l.id} />
                            <input type="hidden" name="pedido_id" value={p.id} />
                            <input type="hidden" name="quitar" value={u.id} />
                            <p className="text-xs text-muted-foreground">Sale otro equipo en vez de {u.identificador}:</p>
                            <Input name="identificador" required autoComplete="off" className="font-mono" placeholder="IMEI o serie del que sale" />
                          </FilaEditable>
                        ))}
                        {unidades.length < l.cantidad ? (
                          <FilaEditable
                            accion={asignarUnidad}
                            className="rounded border border-dashed bg-background p-2"
                            textoEditar={`+ IMEI / serie (${unidades.length} de ${l.cantidad})`}
                            textoGuardar="Asignar"
                            vista={
                              <span className="text-amber-700">
                                {unidades.length ? "Falta" : "Sin"} identificar el equipo que sale
                              </span>
                            }
                          >
                            <input type="hidden" name="linea_id" value={l.id} />
                            <input type="hidden" name="pedido_id" value={p.id} />
                            <Input name="identificador" required autoComplete="off" className="font-mono" placeholder="IMEI o serie (escaneá la caja)" />
                            <p className="text-xs text-muted-foreground">Tiene que estar registrado en bodega (Inventario).</p>
                          </FilaEditable>
                        ) : null}
                      </div>
                    ) : null}
                  </li>
                );
              })}
            </ul>
            {!conInventario && p.lineas_pedido.some((l) => l.variante_id) && !["cancelado", "devuelto"].includes(p.estado) ? (
              <p className="mt-2 text-xs text-muted-foreground">Al confirmar el pedido se apartan de bodega los equipos (con su IMEI o serie).</p>
            ) : null}
            <dl className="mt-3 border-t pt-2 text-sm">
              <Dato etiqueta="Subtotal">{usd2(Number(p.subtotal))}</Dato>
              <Dato etiqueta="Envío">{textoEnvio(p.envio, p.envio_motivo)}</Dato>
              {lineasDescuento(p).map((d) => (
                <Dato key={d.texto} etiqueta={d.texto}>
                  <span className="text-green-700">−{usd2(d.monto)}</span>
                </Dato>
              ))}
              <Dato etiqueta="Total">
                <strong>{usd2(Number(p.total))}</strong>
              </Dato>
            </dl>
                      </>
          }
        />

        {/* Cliente y entrega */}
        <Editable
          titulo="Cliente y entrega"
          accion={guardarEntrega}
          extra={
            p.cliente_id ? (
              <Link href={`/admin/clientes/${p.cliente_id}`} className="inline-flex h-8 items-center rounded-md border px-3 text-sm font-medium hover:bg-muted">
                Ver cliente
              </Link>
            ) : null
          }
          vista={
            <div className="space-y-3">
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
                <Dato etiqueta="Correo">{p.entrega.correo || "—"}</Dato>
                {p.clientes && !(p.clientes.acepta_correo && p.clientes.acepta_whatsapp) ? (
                  <Dato etiqueta="Publicidad">
                    No quiere por {[!p.clientes.acepta_whatsapp && "WhatsApp", !p.clientes.acepta_correo && "correo"].filter(Boolean).join(" ni ")}
                  </Dato>
                ) : null}
                <Dato etiqueta="Entrega">
                  {esEnPersona
                    ? "En persona (sin envío)"
                    : `${p.entrega.direccion}, ${[p.entrega.municipio, p.entrega.departamento].filter(Boolean).join(", ")}`}
                </Dato>
                {p.entrega.referencia ? <Dato etiqueta="Referencia">{p.entrega.referencia}</Dato> : null}
                {p.notas ? <Dato etiqueta="Nota del pedido">{p.notas}</Dato> : null}
                {p.entrega.repartidor ? (
                  <Dato etiqueta="Repartidor">{[p.entrega.repartidor.nombre, p.entrega.repartidor.telefono].filter(Boolean).join(" · ")}</Dato>
                ) : null}
              </dl>
              <div className="border-t pt-3">
                <FilaEditable
                  accion={cambiarCorreoCliente}
                  className=""
                  vista={
                    <dl>
                      <Dato etiqueta="Cuenta">
                        {p.clientes?.auth_user_id
                          ? `Enlazado a ${p.clientes.correo}`
                          : p.clientes?.correo || p.entrega.correo
                            ? `Sin cuenta (se enlaza si entra con ${p.clientes?.correo ?? p.entrega.correo})`
                            : "Sin correo: no puede ver el pedido en Mis pedidos"}
                      </Dato>
                    </dl>
                  }
                >
                  <input type="hidden" name="id" value={p.id} />
                  <div className="space-y-1">
                    <Label htmlFor="correo-cuenta">Enlazar a otro correo de Google</Label>
                    <Input id="correo-cuenta" name="correo" type="email" placeholder="correo@gmail.com" />
                  </div>
                </FilaEditable>
              </div>
            </div>
          }
        >
          <input type="hidden" name="id" value={p.id} />
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1">
              <Label htmlFor="ent-nombre">Nombre</Label>
              <Input id="ent-nombre" name="nombre" defaultValue={p.entrega.nombre} />
            </div>
            <div className="space-y-1">
              <Label htmlFor="ent-tel">Teléfono</Label>
              <Input id="ent-tel" name="telefono" inputMode="tel" defaultValue={p.entrega.telefono} />
            </div>
            <div className="space-y-1">
              <Label htmlFor="ent-alterno">Teléfono alterno</Label>
              <Input id="ent-alterno" name="telefono_alterno" inputMode="tel" defaultValue={p.entrega.telefono_alterno ?? ""} />
            </div>
            <div className="space-y-1">
              <Label htmlFor="ent-municipio">Municipio</Label>
              <Input id="ent-municipio" name="municipio" defaultValue={p.entrega.municipio} />
            </div>
            <div className="space-y-1 sm:col-span-2">
              <Label htmlFor="ent-direccion">Dirección</Label>
              <Input id="ent-direccion" name="direccion" defaultValue={p.entrega.direccion} />
            </div>
            <div className="space-y-1 sm:col-span-2">
              <Label htmlFor="ent-ref">Referencia</Label>
              <Input id="ent-ref" name="referencia" defaultValue={p.entrega.referencia ?? ""} />
            </div>
          </div>
          <p className="text-xs text-muted-foreground">Cambia los datos de este pedido; queda anotado en el historial.</p>
        </Editable>
      </div>

      {/* Historial */}
      <Card>
        <CardHeader>
          <CardTitle>Historial</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <FormularioAccion accion={agregarNota} className="flex flex-wrap items-end gap-2" limpiar>
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
                  {fechaHora(ev.created_at)} · {quien(ev.usuario ?? "tienda", nombres)}
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
