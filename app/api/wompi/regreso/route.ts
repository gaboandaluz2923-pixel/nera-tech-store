// Wompi manda aquí al cliente después de pagar con el enlace de pago.
// 1) Se valida el hash de los parámetros. 2) Se confirma con la API de Wompi que la transacción
// esté aprobada y sea por el total del pedido. 3) Se marca pagado y se manda al cliente a su pedido.
import { NextResponse, type NextRequest } from "next/server";
import { marcarPagado, pedidoDeIntentoWompi } from "@/lib/tienda/pedidos";
import { consultarTransaccion, hashRegresoValido } from "@/lib/wompi";

export async function GET(request: NextRequest) {
  const q = request.nextUrl.searchParams;
  const p = {
    identificadorEnlaceComercio: q.get("identificadorEnlaceComercio") ?? "",
    idTransaccion: q.get("idTransaccion") ?? "",
    idEnlace: q.get("idEnlace") ?? "",
    monto: q.get("monto") ?? "",
    hash: q.get("hash") ?? "",
  };
  const intento = p.identificadorEnlaceComercio ? await pedidoDeIntentoWompi(p.identificadorEnlaceComercio) : null;
  if (!intento) return NextResponse.redirect(new URL("/mis-pedidos", request.url));

  const destino = new URL(`/pedido/${intento.token}`, request.url);
  try {
    if (!p.idTransaccion || !hashRegresoValido(p)) {
      destino.searchParams.set("pago", "revisando");
      return NextResponse.redirect(destino);
    }
    const t = await consultarTransaccion(p.idTransaccion);
    const monto = Number(t.monto ?? t.montoOriginal ?? p.monto);
    if (t.esAprobada && Math.abs(monto - intento.total) < 0.01) {
      await marcarPagado({
        pedidoId: intento.pedidoId,
        metodo: "wompi",
        monto,
        pagoReferencia: p.identificadorEnlaceComercio,
        payload: { origen: "regreso", ...t },
        usuario: "wompi",
        sitio: request.nextUrl.origin,
        nota: `Pago con tarjeta aprobado (Wompi, transacción ${t.idTransaccion}${t.codigoAutorizacion ? `, autorización ${t.codigoAutorizacion}` : ""})`,
      });
      destino.searchParams.set("pago", "aprobado");
    } else {
      destino.searchParams.set("pago", t.esAprobada ? "revisando" : "rechazado");
    }
  } catch (e) {
    console.error("Wompi regreso", e);
    destino.searchParams.set("pago", "revisando");
  }
  return NextResponse.redirect(destino);
}
