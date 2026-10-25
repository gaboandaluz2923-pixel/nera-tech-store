import type { Metadata } from "next";
import Link from "next/link";
import { configTienda } from "@/lib/tienda/datos";
import { textoPlazos } from "@/lib/tienda/garantia";
import { usd2 } from "@/lib/tienda/formato";
import { enlaceWhatsAppA } from "@/lib/whatsapp";

// Términos y condiciones de compra (24 oct 2026). Texto base para que Gabriel lo revise con su abogado.

export const metadata: Metadata = {
  title: "Términos y condiciones",
  description: "Condiciones de compra en Nera Tech: precios, formas de pago, envíos y tiempos de entrega, garantía.",
  alternates: { canonical: "/terminos" },
};

export default async function Terminos() {
  const c = await configTienda();
  const negocio = c.negocio.nombre || "Nera Tech";
  const maximo = c.contraEntrega.maximo;
  return (
    <article className="mx-auto max-w-3xl space-y-6 px-4 pt-6 pb-16 leading-relaxed [&_h2]:mt-8 [&_h2]:text-lg [&_h2]:font-bold [&_li]:ml-5 [&_li]:list-disc">
      <h1 className="text-2xl font-bold sm:text-3xl">Términos y condiciones</h1>
      <p className="text-sm text-muted-foreground">Última actualización: 24 de octubre de 2026</p>
      <p>
        Al comprar en esta tienda aceptás estas condiciones. La tienda es de Nera Tech SV, S.A.S. de C.V. ({negocio}), San
        Salvador, El Salvador{c.negocio.nit ? `, NIT ${c.negocio.nit}` : ""}.
      </p>

      <h2>Precios</h2>
      <ul>
        <li>Los precios están en dólares (USD) e incluyen IVA.</li>
        <li>
          El precio publicado es el precio con tarjeta o tasa 0%. Si pagás en efectivo al recibir o por transferencia, tenés un
          {c.descuentoSinTarjeta ? ` ${c.descuentoSinTarjeta}%` : ""} de descuento sobre los productos (no sobre el envío).
        </li>
        <li>El envío cuesta {usd2(c.envio.costo)} por pedido, salvo en las promociones que digan envío gratis.</li>
        <li>Las ofertas y combos valen en las fechas que se indican y mientras haya existencias.</li>
      </ul>

      <h2>Formas de pago</h2>
      <ul>
        <li>
          Efectivo al recibir (contra entrega){maximo ? ` en pedidos de hasta ${usd2(maximo)}` : ""}; para montos mayores
          lo coordinamos por WhatsApp.
        </li>
        <li>Transferencia bancaria a las cuentas que se muestran en tu pedido.</li>
        <li>Tarjeta de crédito o débito en línea (Wompi).</li>
        <li>Tasa 0% en cuotas con tarjetas participantes, procesada por WhatsApp.</li>
      </ul>

      <h2>Envíos y tiempos de entrega</h2>
      <ul>
        <li>Enviamos a todo El Salvador.</li>
        <li>
          Lo que está en bodega se entrega normalmente en menos de 24 horas y lo que pedimos al proveedor en menos de 48 horas. No
          hay entregas los domingos.
        </li>
        <li>
          <strong>
            Los tiempos y las fechas de entrega que mostramos son aproximados y no están garantizados: dependemos de aliados
            logísticos (empresas de envío y repartidores) para cumplirlos.
          </strong>
        </li>
      </ul>

      <h2>Garantía</h2>
      <p>
        Garantía Nera Tech de {textoPlazos(c.garantia)}, por defectos de fábrica. Qué cubre, qué no y cómo reclamarla está en{" "}
        <Link href="/garantia" className="text-primary underline">
          Garantía
        </Link>
        .
      </p>

      <h2>Tus datos</h2>
      <p>
        Cómo usamos tus datos está en la{" "}
        <Link href="/privacidad" className="text-primary underline">
          Política de privacidad
        </Link>
        .
      </p>

      <h2>Contacto</h2>
      <p>
        Para cualquier duda sobre tu compra,{" "}
        <a href={enlaceWhatsAppA(c.whatsapp, "Hola, tengo una consulta sobre los términos de compra. [terminos]")} className="text-primary underline">
          escribinos por WhatsApp
        </a>
        {c.negocio.correo ? (
          <>
            {" "}
            o a{" "}
            <a href={`mailto:${c.negocio.correo}`} className="text-primary underline">
              {c.negocio.correo}
            </a>
          </>
        ) : null}
        .
      </p>
    </article>
  );
}
