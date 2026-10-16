import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";
import { COLUMNAS_DESCUENTOS, lineasDescuento } from "@/lib/tienda/descuentos";
import { MedirEvento } from "@/components/tienda/medir-evento";
import { Check, CircleAlert, Clock, FileText, Landmark, Truck } from "lucide-react";
import { BotonGoogle } from "@/components/tienda/boton-google";
import { IconoWhatsApp } from "@/components/tienda/icono-whatsapp";
import { PagarConTarjeta } from "@/components/tienda/pagar-tarjeta";
import { Button } from "@/components/ui/button";
import { createServiceClient } from "@/lib/supabase/server";
import { configTienda } from "@/lib/tienda/datos";
import { ESTADO_PEDIDO, FORMA_PAGO, cuota, fechaHora, usd2 } from "@/lib/tienda/formato";
import { enlaceWhatsAppA } from "@/lib/whatsapp";

export const metadata: Metadata = { title: "Tu pedido", robots: { index: false, follow: false } };

type Pedido = {
  id: string;
  numero: number;
  token: string;
  estado: string;
  forma_pago: "contra_entrega" | "transferencia" | "wompi" | "tasa_cero";
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
  entrega: {
    nombre: string;
    telefono: string;
    correo: string;
    municipio: string;
    departamento: string | null;
    direccion: string;
    referencia: string | null;
    repartidor?: { nombre: string; telefono: string } | null;
    mensaje?: string | null;
  };
  facturacion: { tipo: string; nombre?: string; nit?: string };
  pagado_en: string | null;
  confirmado_en: string | null;
  entregado_en: string | null;
  factura_estado: string;
  factura_numero: string | null;
  factura_archivo: string | null;
  created_at: string;
  clientes: { auth_user_id: string | null } | null;
  lineas_pedido: { nombre: string; cantidad: number; precio_unitario: number; precio_regular: number | null }[];
};

const PASOS = [
  { estado: "pendiente_confirmar", texto: "Recibido" },
  { estado: "confirmado", texto: "Confirmado" },
  { estado: "en_camino", texto: "En camino" },
  { estado: "entregado", texto: "Entregado" },
];

async function Detalle({ params, searchParams }: PageProps<"/pedido/[token]">) {
  await connection();
  const [{ token }, sp] = await Promise.all([params, searchParams]);
  if (!/^[0-9a-f]{64}$/.test(token)) notFound();
  const sb = createServiceClient();
  const [{ data }, c, { data: cuentasFila }] = await Promise.all([
    sb
      .from("pedidos")
      .select(
        `id, numero, token, estado, forma_pago, subtotal, envio, total, entrega, ${COLUMNAS_DESCUENTOS}, facturacion, pagado_en, confirmado_en, entregado_en, factura_estado, factura_numero, factura_archivo, created_at, clientes(auth_user_id), lineas_pedido(nombre, cantidad, precio_unitario, precio_regular)`
      )
      .eq("token", token)
      .maybeSingle(),
    configTienda(),
    sb.from("configuracion").select("valor").eq("clave", "cuentas_bancarias").maybeSingle(),
  ]);
  if (!data) notFound();
  const p = data as unknown as Pedido;
  const cuentas = (Array.isArray(cuentasFila?.valor) ? cuentasFila.valor : []) as {
    banco: string;
    tipo: string;
    numero: string;
    titular: string;
  }[];
  // Factura electrónica propia (fase 10): PDF y JSON con el enlace secreto del pedido
  const { data: dtes } = await sb
    .from("dte_documentos")
    .select("id, tipo_dte, numero_control, estado")
    .eq("pedido_id", p.id)
    .eq("prueba", false)
    .eq("ambiente", "01")
    .in("estado", ["procesado", "contingencia", "invalidado"])
    .order("created_at", { ascending: false });
  const factura =
    p.factura_estado === "emitida" && p.factura_archivo
      ? (await sb.storage.from("facturas").createSignedUrl(p.factura_archivo, 3600, { download: `factura-pedido-${p.numero}.pdf` })).data?.signedUrl
      : null;

  const total = Number(p.total);
  const pagado = Boolean(p.pagado_en);
  const cancelado = p.estado === "cancelado" || p.estado === "devuelto";
  const nombre = p.entrega.nombre.split(" ")[0];
  const pasoActual = Math.max(0, PASOS.findIndex((x) => x.estado === (p.estado === "pagado" ? "confirmado" : p.estado)));
  const wa = (m: string) => enlaceWhatsAppA(c.whatsapp, `${m} [pedido]`);
  const mensajeConfirmar = wa(`Hola, soy ${p.entrega.nombre}. Hice el pedido #${p.numero} en la web por ${usd2(total)}.`);
  const aviso = typeof sp.pago === "string" ? sp.pago : null;

  return (
    <div className="space-y-6">
      {sp.nuevo === "1" || aviso === "aprobado" ? (
        <MedirEvento
          tipo="compra"
          unaVez={`compra-${p.numero}`}
          datos={{ pedido: String(p.numero), valor: total, forma: p.forma_pago, productos: p.lineas_pedido.length }}
        />
      ) : null}
      {/* Encabezado */}
      <div>
        <p className="text-sm text-muted-foreground">
          Pedido #{p.numero} · {fechaHora(p.created_at)}
        </p>
        <h1 className="mt-1 text-2xl font-bold">
          {cancelado ? `Pedido ${ESTADO_PEDIDO[p.estado].texto.toLowerCase()}` : `¡Gracias, ${nombre}! Recibimos tu pedido`}
        </h1>
      </div>

      {aviso === "aprobado" || (pagado && p.forma_pago === "wompi" && aviso) ? (
        <p className="flex items-center gap-2 rounded-xl bg-green-50 p-4 font-medium text-green-800">
          <Check className="size-5" aria-hidden /> Pago aprobado. Te escribimos para coordinar la entrega.
        </p>
      ) : aviso === "rechazado" && !pagado ? (
        <p className="flex items-center gap-2 rounded-xl bg-destructive/10 p-4 font-medium text-destructive">
          <CircleAlert className="size-5" aria-hidden /> El banco no aprobó el pago. Podés intentar con otra tarjeta.
        </p>
      ) : aviso === "revisando" && !pagado ? (
        <p className="flex items-center gap-2 rounded-xl bg-amber-50 p-4 font-medium text-amber-900">
          <Clock className="size-5" aria-hidden /> Estamos confirmando tu pago con Wompi. Recargá esta página en un minuto.
        </p>
      ) : aviso === "error" && !pagado ? (
        <p className="flex items-center gap-2 rounded-xl bg-amber-50 p-4 font-medium text-amber-900">
          <CircleAlert className="size-5" aria-hidden /> Tu pedido quedó guardado, pero no pudimos abrir el pago con tarjeta.
        </p>
      ) : null}

      {/* Pasos */}
      {!cancelado ? (
        <ol className="grid grid-cols-4 gap-1 text-center text-xs">
          {PASOS.map((x, i) => (
            <li key={x.estado} className="space-y-1.5">
              <span className={`block h-1.5 rounded-full ${i <= pasoActual ? "bg-marca" : "bg-muted"}`} />
              <span className={i <= pasoActual ? "font-semibold" : "text-muted-foreground"}>{x.texto}</span>
            </li>
          ))}
        </ol>
      ) : null}

      {/* Repartidor y mensaje del equipo */}
      {p.estado === "en_camino" && (p.entrega.repartidor?.nombre || p.entrega.repartidor?.telefono) ? (
        <div className="flex items-center gap-3 rounded-2xl border-2 border-marca/40 bg-marca/5 p-4">
          <Truck className="size-6 shrink-0 text-marca" aria-hidden />
          <div className="text-sm">
            <p className="font-bold">Te lo lleva {p.entrega.repartidor?.nombre || "nuestro repartidor"}</p>
            {p.entrega.repartidor?.telefono ? (
              <a href={`tel:+503${p.entrega.repartidor.telefono}`} className="font-medium text-marca underline">
                Tel. {p.entrega.repartidor.telefono}
              </a>
            ) : null}
          </div>
        </div>
      ) : null}
      {p.entrega.mensaje && !cancelado ? (
        <div className="rounded-2xl bg-muted/60 p-4 text-sm">
          <p className="font-semibold">Mensaje de Nera Tech</p>
          <p className="mt-1">{p.entrega.mensaje}</p>
        </div>
      ) : null}

      {/* Qué sigue: el paso que le toca al cliente */}
      {!cancelado ? (
        <section aria-labelledby="t-pago" className="space-y-3 rounded-2xl border p-4">
          <h2 id="t-pago" className="font-bold">
            Pago: {FORMA_PAGO[p.forma_pago]}
            {pagado ? <span className="ml-2 rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-800">Pagado</span> : null}
          </h2>

          {p.forma_pago === "wompi" && !pagado ? (
            <PagarConTarjeta token={p.token} texto={`Pagar ${usd2(total)} con tarjeta`} />
          ) : null}

          {p.forma_pago === "contra_entrega" && !pagado ? (
            <p className="text-sm">
              Pagás <strong>{usd2(total)}</strong> en efectivo cuando lo recibís. Te escribimos por WhatsApp para coordinar la hora.
            </p>
          ) : null}

          {p.forma_pago === "transferencia" && !pagado ? (
            <div className="space-y-3 text-sm">
              <p>
                Transferí <strong>{usd2(total)}</strong> a una de estas cuentas y mandanos el comprobante por WhatsApp:
              </p>
              {cuentas.length ? (
                <ul className="space-y-2">
                  {cuentas.map((k) => (
                    <li key={k.numero} className="flex gap-3 rounded-lg bg-muted/50 p-3">
                      <Landmark className="mt-0.5 size-5 shrink-0 text-marca" aria-hidden />
                      <span>
                        <span className="block font-semibold">{k.banco}</span>
                        <span className="block">
                          {k.tipo} · <span className="font-mono">{k.numero}</span>
                        </span>
                        <span className="block text-muted-foreground">{k.titular}</span>
                      </span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-muted-foreground">Te mandamos los datos de la cuenta por WhatsApp.</p>
              )}
              <Button
                size="lg"
                className="h-12 w-full text-base"
                nativeButton={false}
                render={
                  <a
                    href={wa(`Hola, envío el comprobante de transferencia del pedido #${p.numero} por ${usd2(total)}.`)}
                    target="_blank"
                    rel="noopener noreferrer"
                  />
                }
              >
                <IconoWhatsApp className="size-5" />
                Enviar comprobante por WhatsApp
              </Button>
            </div>
          ) : null}

          {p.forma_pago === "tasa_cero" && !pagado ? (
            <div className="space-y-3 text-sm">
              <p>
                Escribinos para procesar tu pago en {c.tasaCero.meses} cuotas de{" "}
                <strong>{usd2(cuota(total, c.tasaCero.meses))}</strong> sin intereses.
              </p>
              <Button
                size="lg"
                className="h-12 w-full text-base"
                nativeButton={false}
                render={
                  <a
                    href={wa(
                      `Hola, quiero pagar el pedido #${p.numero} (${usd2(total)}) con tasa 0% en ${c.tasaCero.meses} cuotas.`
                    )}
                    target="_blank"
                    rel="noopener noreferrer"
                  />
                }
              >
                <IconoWhatsApp className="size-5" />
                Pagar con tasa 0% por WhatsApp
              </Button>
            </div>
          ) : null}

          {pagado ? <p className="text-sm text-muted-foreground">Recibimos tu pago. Gracias.</p> : null}
        </section>
      ) : null}

      {/* Confirmar por WhatsApp (siempre disponible, salvo cuando ese ya es el paso principal) */}
      {!cancelado && (p.forma_pago === "contra_entrega" || pagado) ? (
        <Button
          size="lg"
          variant={p.forma_pago === "contra_entrega" && !pagado ? "default" : "outline"}
          className="h-12 w-full text-base"
          nativeButton={false}
          render={<a href={mensajeConfirmar} target="_blank" rel="noopener noreferrer" />}
        >
          <IconoWhatsApp className="size-5" />
          Confirmar mi pedido por WhatsApp
        </Button>
      ) : null}

      {/* Productos */}
      <section aria-labelledby="t-productos" className="rounded-2xl border p-4">
        <h2 id="t-productos" className="mb-3 font-bold">
          Productos
        </h2>
        <ul className="space-y-2 text-sm">
          {p.lineas_pedido.map((l) => (
            <li key={l.nombre} className="flex justify-between gap-3">
              <span>
                {l.cantidad > 1 ? `${l.cantidad} × ` : ""}
                {l.nombre}
              </span>
              <span className="text-right font-medium">
                {l.precio_regular ? (
                  <span className="block text-xs font-normal text-muted-foreground line-through">
                    {usd2(Number(l.precio_regular) * l.cantidad)}
                  </span>
                ) : null}
                {usd2(Number(l.precio_unitario) * l.cantidad)}
              </span>
            </li>
          ))}
        </ul>
        <dl className="mt-3 space-y-1 border-t pt-3 text-sm">
          <div className="flex justify-between">
            <dt>Envío</dt>
            <dd>{Number(p.envio) === 0 ? "Gratis" : usd2(Number(p.envio))}</dd>
          </div>
          {lineasDescuento(p).map((d) => (
            <div key={d.texto} className="flex justify-between text-green-700">
              <dt>{d.texto}</dt>
              <dd className="font-medium">−{usd2(d.monto)}</dd>
            </div>
          ))}
          <div className="flex justify-between text-base font-bold">
            <dt>Total</dt>
            <dd>{usd2(total)}</dd>
          </div>
        </dl>
      </section>

      {/* Entrega y factura */}
      <div className="grid gap-4 sm:grid-cols-2">
        <section aria-labelledby="t-entrega" className="rounded-2xl border p-4 text-sm">
          <h2 id="t-entrega" className="mb-2 font-bold">
            Entrega
          </h2>
          <p>{p.entrega.nombre}</p>
          <p>{p.entrega.direccion}</p>
          <p>{[p.entrega.municipio, p.entrega.departamento].filter(Boolean).join(", ")}</p>
          {p.entrega.referencia ? <p className="text-muted-foreground">Ref.: {p.entrega.referencia}</p> : null}
          <p className="mt-1 text-muted-foreground">Tel. {p.entrega.telefono}</p>
        </section>
        <section aria-labelledby="t-factura" className="rounded-2xl border p-4 text-sm">
          <h2 id="t-factura" className="mb-2 font-bold">
            Factura electrónica
          </h2>
          <p className="text-muted-foreground">
            {p.facturacion.tipo === "credito_fiscal"
              ? `Crédito fiscal a nombre de ${p.facturacion.nombre} (NIT ${p.facturacion.nit}).`
              : "Consumidor final."}{" "}
            Te llega a {p.entrega.correo}.
          </p>
          {dtes?.length ? (
            <ul className="mt-3 space-y-2">
              {dtes.map((d) => (
                <li key={d.id}>
                  <p className="font-medium">
                    {d.tipo_dte === "03" ? "Crédito fiscal" : d.tipo_dte === "05" ? "Nota de crédito" : "Factura"} {d.numero_control}
                    {d.estado === "invalidado" ? <span className="ml-1 text-xs font-normal text-muted-foreground">(anulada)</span> : null}
                  </p>
                  <p className="flex flex-wrap gap-4">
                    <a href={`/api/dte/${d.id}/pdf?t=${p.token}`} className="flex items-center gap-1.5 font-medium text-primary hover:underline">
                      <FileText className="size-4" aria-hidden /> PDF
                    </a>
                    <a href={`/api/dte/${d.id}/json?t=${p.token}`} className="font-medium text-primary hover:underline">
                      Archivo JSON
                    </a>
                  </p>
                </li>
              ))}
            </ul>
          ) : factura ? (
            <a href={factura} className="mt-3 flex items-center gap-2 font-medium text-primary hover:underline">
              <FileText className="size-4" aria-hidden />
              Descargar factura{p.factura_numero ? ` (${p.factura_numero})` : ""}
            </a>
          ) : (
            <p className="mt-2 text-xs text-muted-foreground">
              {p.forma_pago === "contra_entrega"
                ? "Te la enviamos después de la entrega."
                : "Se emite cuando confirmamos el pedido y el pago."}
            </p>
          )}
        </section>
      </div>

      {/* Cuenta */}
      {p.clientes?.auth_user_id ? (
        <p className="text-center text-sm text-muted-foreground">
          Este pedido está en tu cuenta.{" "}
          <Link href="/mis-pedidos" className="font-medium text-primary underline">
            Ver mis pedidos
          </Link>
        </p>
      ) : (
        <section aria-labelledby="t-cuenta" className="space-y-3 rounded-2xl bg-muted/50 p-4">
          <h2 id="t-cuenta" className="font-bold">
            Guardá tus datos
          </h2>
          <p className="text-sm text-muted-foreground">
            Entrá con Google y vas a ver este y tus próximos pedidos, con sus facturas, en “Mis pedidos”. Es opcional.
          </p>
          <BotonGoogle volver={`/pedido/${p.token}`} enlazar={p.token} />
        </section>
      )}
      <p className="text-center text-xs text-muted-foreground">
        Guardá esta página: es el enlace privado de tu pedido.
      </p>
    </div>
  );
}

export default function PaginaPedido(props: PageProps<"/pedido/[token]">) {
  return (
    <div className="mx-auto max-w-2xl px-4 pt-6 pb-16">
      <Suspense fallback={<div className="h-96 animate-pulse rounded-2xl bg-muted" />}>
        <Detalle {...props} />
      </Suspense>
    </div>
  );
}
