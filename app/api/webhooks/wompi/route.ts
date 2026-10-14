// Wompi avisa aquí cada pago aprobado (aunque el cliente cierre el navegador antes de regresar).
// Se valida el encabezado wompi_hash (HMAC-SHA256 del cuerpo con el API Secret) y el monto.
import { NextResponse, type NextRequest } from "next/server";
import { marcarPagado, pedidoDeIntentoWompi } from "@/lib/tienda/pedidos";
import { hashWebhookValido } from "@/lib/wompi";

type AvisoWompi = {
  IdTransaccion?: string;
  Monto?: number | string;
  ResultadoTransaccion?: string;
  CodigoAutorizacion?: string;
  FormaPagoUtilizada?: string;
  EsProductiva?: boolean;
  EnlacePago?: { Id?: number; IdentificadorEnlaceComercio?: string };
};

export async function POST(request: NextRequest) {
  const cuerpo = await request.text();
  if (!hashWebhookValido(cuerpo, request.headers.get("wompi_hash"))) {
    return NextResponse.json({ ok: false, error: "hash" }, { status: 401 });
  }
  let aviso: AvisoWompi;
  try {
    aviso = JSON.parse(cuerpo);
  } catch {
    return NextResponse.json({ ok: false, error: "json" }, { status: 400 });
  }

  const identificador = aviso.EnlacePago?.IdentificadorEnlaceComercio ?? "";
  const intento = identificador ? await pedidoDeIntentoWompi(identificador) : null;
  // Si no es nuestro, respondemos 200 para que Wompi no reintente sin fin
  if (!intento) return NextResponse.json({ ok: true, ignorado: true });

  const monto = Number(aviso.Monto);
  const aprobada = !aviso.ResultadoTransaccion || /aprobad/i.test(aviso.ResultadoTransaccion);
  if (!aprobada || Math.abs(monto - intento.total) >= 0.01) {
    console.error("Wompi webhook: no aprobada o monto distinto", { identificador, monto, total: intento.total });
    return NextResponse.json({ ok: true, revisar: true });
  }

  await marcarPagado({
    pedidoId: intento.pedidoId,
    metodo: "wompi",
    monto,
    pagoReferencia: identificador,
    payload: { origen: "webhook", ...aviso },
    usuario: "wompi",
    nota: `Pago con tarjeta aprobado (Wompi, transacción ${aviso.IdTransaccion ?? "?"}${
      aviso.CodigoAutorizacion ? `, autorización ${aviso.CodigoAutorizacion}` : ""
    })`,
  });
  return NextResponse.json({ ok: true });
}
