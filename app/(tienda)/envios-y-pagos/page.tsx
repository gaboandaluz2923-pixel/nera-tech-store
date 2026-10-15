import type { Metadata } from "next";
import { Banknote, CreditCard, Landmark, Percent, Truck, Wallet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { IconoWhatsApp } from "@/components/tienda/icono-whatsapp";
import { configTienda } from "@/lib/tienda/datos";
import { dondeContraEntrega, textoDescuento, usd } from "@/lib/tienda/formato";
import { enlaceWhatsAppA } from "@/lib/whatsapp";

export async function generateMetadata(): Promise<Metadata> {
  const c = await configTienda();
  return {
    title: "Envíos y formas de pago",
    description: `${textoDescuento(c.descuentoSinTarjeta)}. Pagá al recibir, con transferencia, tarjeta o tasa 0%. Envíos a todo El Salvador en menos de 48 horas.`,
    alternates: { canonical: "/envios-y-pagos" },
  };
}

export default async function PaginaEnvios() {
  const c = await configTienda();
  const { envio, tasaCero } = c;

  const insignia = `${c.descuentoSinTarjeta}% de descuento`;
  const pagos: { icono: typeof Wallet; titulo: string; texto: string; insignia?: string }[] = [
    {
      icono: Wallet,
      titulo: "Efectivo al recibir",
      texto: `Pagás en efectivo al repartidor cuando lo recibís, ${dondeContraEntrega(c.contraEntrega)}.${c.contraEntrega.maximo !== null ? ` Para montos mayores, escribinos por WhatsApp y lo coordinamos.` : ""}`,
      insignia,
    },
    {
      icono: Landmark,
      titulo: "Transferencia bancaria",
      texto: "Te damos los datos de la cuenta al confirmar tu pedido.",
      insignia,
    },
    { icono: CreditCard, titulo: "Tarjeta de crédito o débito", texto: "Pago seguro con Wompi (Banco Agrícola). Visa y Mastercard." },
    {
      icono: Percent,
      titulo: `Tasa 0% hasta ${tasaCero.meses} meses`,
      texto: `Pagá en cuotas sin intereses con tarjeta de crédito${tasaCero.banco ? ` ${tasaCero.banco}` : ""}. Se procesa por WhatsApp.`,
    },
  ];

  return (
    <div className="mx-auto max-w-3xl px-4 pt-6 pb-16">
      <h1 className="text-2xl font-bold sm:text-3xl">Envíos y formas de pago</h1>
      <p className="mt-2 text-muted-foreground">
        {textoDescuento(c.descuentoSinTarjeta)}. El descuento es sobre los productos; el envío no cambia. Sin crear cuenta.
      </p>

      <section aria-labelledby="t-envios" className="mt-8">
        <h2 id="t-envios" className="mb-4 flex items-center gap-2 text-xl font-bold">
          <Truck className="size-6 text-marca" aria-hidden /> Envíos
        </h2>
        <dl className="divide-y rounded-xl border">
          <div className="grid grid-cols-[1fr_auto] gap-3 p-4">
            <dt>Costo de envío</dt>
            <dd className="font-semibold">{usd(envio.costo)}</dd>
          </div>
          {envio.gratis_desde ? (
            <div className="grid grid-cols-[1fr_auto] gap-3 p-4">
              <dt>Envío gratis</dt>
              <dd className="font-semibold">En compras desde {usd(envio.gratis_desde)}</dd>
            </div>
          ) : null}
          {envio.gratis_con_accesorio ? (
            <div className="grid grid-cols-[1fr_auto] gap-3 p-4">
              <dt>Envío gratis</dt>
              <dd className="font-semibold">Si agregás un accesorio</dd>
            </div>
          ) : null}
          <div className="grid grid-cols-[1fr_auto] gap-3 p-4">
            <dt>Producto en bodega</dt>
            <dd className="font-semibold">Entrega en menos de 24 horas</dd>
          </div>
          <div className="grid grid-cols-[1fr_auto] gap-3 p-4">
            <dt>Producto que pedimos al proveedor</dt>
            <dd className="font-semibold">Recibilo en menos de 48 horas</dd>
          </div>
        </dl>
      </section>

      <section aria-labelledby="t-pagos" className="mt-10">
        <h2 id="t-pagos" className="mb-4 flex items-center gap-2 text-xl font-bold">
          <Banknote className="size-6 text-marca" aria-hidden /> Formas de pago
        </h2>
        <ul className="grid gap-3 sm:grid-cols-2">
          {pagos.map(({ icono: Icono, titulo, texto, insignia }) => (
            <li key={titulo} className="flex gap-3 rounded-xl border p-4">
              <Icono className="mt-0.5 size-5 shrink-0 text-marca" aria-hidden />
              <span>
                <span className="flex flex-wrap items-center gap-x-2 gap-y-1 font-semibold">
                  {titulo}
                  {insignia ? (
                    <span className="rounded-md bg-green-100 px-1.5 py-0.5 text-xs font-semibold text-green-800">{insignia}</span>
                  ) : null}
                </span>
                <span className="block text-sm text-muted-foreground">{texto}</span>
              </span>
            </li>
          ))}
        </ul>
      </section>

      <div className="mt-10">
        <Button
          size="lg"
          className="h-12 w-full text-base sm:w-auto"
          nativeButton={false}
          render={
            <a
              href={enlaceWhatsAppA(c.whatsapp, "Hola, tengo una pregunta sobre envíos o formas de pago. [envios]")}
              target="_blank"
              rel="noopener noreferrer"
            />
          }
        >
          <IconoWhatsApp className="size-5" />
          Preguntar por WhatsApp
        </Button>
      </div>
    </div>
  );
}
